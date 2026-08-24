---
name: bravado-data-api
description: Write correct code against the Bravado Data API (prediction market analytics — wallet PnL, leaderboards, positions, trade history, tax reports for Polymarket and predict.fun). Use when the user is building, scripting, or debugging anything that reads prediction market trader data, when they mention the Bravado API or partner-api.bravadotrade.com, or when they need HMAC request signing for it. Covers auth, endpoints, units and the mistakes that cost the most time.
---

# Building with the Bravado Data API

Base URL: `https://partner-api.bravadotrade.com`

The Data API serves trader analytics computed from a full index of prediction
market activity: per-wallet PnL, leaderboards, positions, trade history,
category breakdowns, and tax-grade statements. It covers Polymarket and
predict.fun.

## Before writing code, pick the tier

| | endpoint shape | auth |
|---|---|---|
| **Open** | `/trader-analytics/traders/{address}/tax-report`, `.../tax-report/8949`, `.../event-graph` | none |
| **Keyed** | everything else under `/trader-analytics/*` | HMAC, scope `analytics.read` |

Write the open endpoints first when prototyping — they need no account and
return the same shapes, so the client code is identical apart from headers.

Keys are minted self-serve in the Bravado portal after enabling the
**`analytics`** product. Note the naming trap: the product is `analytics`, not
`data` (`data` is a read-only tier of the *Trade* API and grants nothing here).

## Auth: HMAC-SHA256

Three headers on every keyed request:

| header | content |
|---|---|
| `X-BRAVADO-API-KEY` | public key, 64 hex chars |
| `X-BRAVADO-TIMESTAMP` | unix **milliseconds**, decimal string |
| `X-BRAVADO-SIGNATURE` | lowercase hex `HMAC_SHA256(secret, payload)` |

The payload is four lines joined by `\n`:

```
payload = timestamp + "\n" + METHOD + "\n" + canonical_path + "\n" + sha256_hex(rawBody)
```

This surface is **GET-only**, so the last line is always the empty-string
SHA-256 constant:

```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

### canonical_path is where implementations break

This is the part that fails silently and returns `401 INVALID_SIGNATURE` with
no hint about which rule you missed. Build it in this exact order:

1. URL-decode the path **once**.
2. Strip a trailing `/` unless the path is just `/`.
3. No querystring? Done — the canonical path is the trimmed pathname.
4. Otherwise build the canonical querystring:
   - drop entries whose value is `undefined` or `null`
   - coerce the rest to string (`true` → `"true"`, `42` → `"42"`)
   - **sort by key in lexicographic byte order**, then by value for equal keys
   - percent-encode key and value against the RFC 3986 unreserved set
     (`A-Z a-z 0-9 - _ . ~`); everything else becomes `%XX` with **uppercase**
     hex, including space (`%20`, never `+`)
   - join as `k=v` with `&`, append after `?`

```
/trader-analytics/traders/0xabc/positions?status=open&limit=50
  -> /trader-analytics/traders/0xabc/positions?limit=50&status=open

/trader-analytics/leaderboard?window=30d&q=hello world
  -> /trader-analytics/leaderboard?q=hello%20world&window=30d
```

Ready-to-use signing helpers are in `scripts/` next to this file:
`sign.ts` (Node 18+, no dependencies) and `sign.py` (stdlib only). Prefer
copying one of those over re-deriving the rules.

### Four rules that are not obvious

- **Milliseconds, not seconds.** Seconds parse fine and then fail the window
  check as ~55 years stale.
- **Tight clock tolerance.** The published analytics spec states **±30s** of
  server time (the Trade API default is looser, 5 min — do not assume the loose
  one here). A drifted container clock produces `401 STALE_TIMESTAMP`, which
  reads like a bad key. Sync the clock before debugging the signature.
- **The key needs scope `analytics.read`** and the partner account needs the
  request's venue enabled — `polymarket` for the main routes, `predictfun` for
  `/predict/*`. Otherwise `403 VENUE_NOT_ENABLED`.
- **50 auth failures in 60s from one IP returns `429 RATE_LIMITED`** before the
  key is even looked up. While debugging a signature, back off between attempts
  or you will start debugging the wrong error.
- A legacy `Authorization: Bearer <token>` still works during the key-migration
  window and is deprecated. New integrations use partner keys.

## Endpoints

Full list with parameters and response fields: see `reference.md` next to this
file. The ones that carry most of the value:

| endpoint | returns |
|---|---|
| `GET /trader-analytics/leaderboard` | top traders by realized PnL |
| `GET /trader-analytics/leaderboard/volume` | top traders by traded USDC |
| `GET /trader-analytics/traders/{address}` | wallet performance summary |
| `GET /trader-analytics/traders/{address}/pnl` | cumulative PnL series |
| `GET /trader-analytics/traders/{address}/positions/active` | open positions |
| `GET /trader-analytics/traders/{address}/categories` | PnL and volume by category |
| `GET /trader-analytics/traders/{address}/trades` | paginated fill history |
| `GET /trader-analytics/traders/{address}/tax-report` | tax report (open) |

`{address}` is a Polygon wallet address, matched case-insensitively.
Time windows are `1h`, `4h`, `24h`, `7d`, `30d`, `90d`, `365d`, `all`.

## Units and encodings — check these before anything else

Every one of these has produced a wrong number in production:

- **Amounts are micro-USDC.** Divide by `1e6` to get dollars.
- **Shares are micro.** 1 share = `1000000`.
- **Prices and marks are probabilities in `[0,1]`.** Multiply by 100 for cents.
  `price_per_share` is signed — take the absolute value first.
- **Numbers arrive as JSON strings** to preserve precision. Parse as decimal.
  `parseFloat` and then summing is how a reconciliation ends up off by cents.
- **`*_at` fields are RFC3339 strings; `*_ts` fields are unix seconds.** Both
  appear in the same response.
- **Addresses are case-insensitive** and the `0x` prefix is optional — bare
  40-hex, as returned in leaderboard rows, is accepted on input.

## Several fields return 0 when they were not computed

This is the highest-cost trap in the API and it does not surface as an error:

- On a **windowed** leaderboard (`window=30d` etc), `wins`, `losses`,
  `total_positions` are `0` and therefore `win_rate` is `0`. Those fields only
  exist for `window=all`.
- `unrealized_pnl`, `active_positions` and `open_position_value` on leaderboard
  rows are `0` unless live stats are enabled.

Neither means the trader has no wins and no open positions. Code that treats
them as real zeros produces a plausible wrong answer. Branch on the request
shape and render "not computed" instead. The `prediction-market-pnl` skill
covers how to present this.

## Errors

Errors return `{"error": "message"}` with a matching non-2xx status. Handle
these distinctly, because retrying the wrong one wastes the rate budget:

| status | meaning | retry? |
|---|---|---|
| `400 MISSING_AUTH_HEADERS` | a header is absent or empty | no, fix the client |
| `401 STALE_TIMESTAMP` | clock drift over 5 min | no, fix the clock |
| `401 INVALID_SIGNATURE` | canonical path or body hash wrong | no, fix canonicalization |
| `401 KEY_DISABLED` | key revoked or expired | no |
| `403 VENUE_NOT_ENABLED` | key lacks that venue entitlement | no |
| `429 RATE_LIMITED` | per-key bucket or brute-force guard | yes, with backoff |
| `5xx` | upstream | yes, with backoff and a cap |

**Error bodies are not always JSON.** The hosting edge replaces the body of
`5xx` responses with an HTML page, so a client that assumes `res.json()` on a
failure path throws a parse error instead of surfacing the real status. Always
branch on the status code before parsing, and keep the raw text for the log.
The original status survives in the `x-do-orig-status` header when the edge has
rewritten it.

**A wallet with no indexed activity currently returns `504` + HTML** on the
open tax endpoints rather than an empty result — verified 2026-08-24 against
`/traders/{address}/tax-report`. Treat `504` on a lookup as "address unknown or
not indexed", not as an outage, and do not retry it in a tight loop.

## Rate limits and cost

Keyed traffic draws from a per-key token bucket dedicated to analytics — it is
**not** shared with trading endpoints, so hammering reads cannot starve order
placement. Usage is metered per hour and per route class.

Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining` and
`X-RateLimit-Reset`; a `429` carries `Retry-After`. Read those rather than
guessing a backoff.

Practical consequences when writing a client:

- Cache leaderboard responses. They are identical for every caller and change
  slowly; re-fetching per user request is pure waste.
- Per-wallet endpoints are unique per query and are the expensive ones. Batch
  by address where an endpoint supports it rather than looping.
- Backoff on `429` rather than retrying immediately.

## Checklist before shipping a client

- [ ] timestamps in milliseconds
- [ ] canonical querystring sorted and RFC-3986 encoded (space as `%20`)
- [ ] empty-body SHA-256 constant used for GET
- [ ] numeric strings parsed as decimals, not floats
- [ ] micro-USDC divided by 1e6; shares divided by 1e6; prices ×100 for cents
- [ ] windowed-leaderboard `win_rate` / `unrealized_pnl` rendered as
      "not computed", not as zero
- [ ] `429` backs off; `401` does not retry
- [ ] leaderboard cached, per-wallet calls not looped
