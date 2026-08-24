---
name: bravado-data-api
description: Write correct code against the Bravado Data API (prediction market analytics — wallet PnL, leaderboards, positions, trade history, tax reports for Polymarket and predict.fun). Use when the user is building, scripting, or debugging anything that reads prediction market trader data, when they mention the Bravado API, or when they need HMAC request signing for api.bravado.io. Covers auth, endpoints, field semantics and the mistakes that cost the most time.
---

# Building with the Bravado Data API

Base URL: `https://api.bravado.io`

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

For GET (no body) the last line is always the empty-string SHA-256 constant:

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
- **5 minute clock tolerance** (`|now - ts| <= 300000`). A container with a
  drifted clock produces `401 STALE_TIMESTAMP`, which reads like a bad key.
- **Sign the exact bytes you send.** If there is a body, serialize once, hash
  that buffer, and send that same buffer. Any middleware that re-serializes
  JSON in transit breaks the signature.
- **50 auth failures in 60s from one IP returns `429 RATE_LIMITED`** before the
  key is even looked up. While debugging a signature, back off between attempts
  or you will start debugging the wrong error.

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

## Field semantics that change your code

- **Numbers arrive as JSON strings** (PnL, volume, balances, shares, prices) to
  preserve precision. Parse them as decimals. `parseFloat` on a position size
  and then summing is how reconciliation reports end up off by cents.
- **`*_at` fields are RFC3339 strings; `*_ts` fields are unix seconds.** Both
  appear in the same response.
- **PnL is a cashflow model**, not mark-to-market: `pnl = sell_usdc - buy_usdc`.
  Open positions therefore do not contribute unrealized gains. This is the
  single most common misreading — see the `prediction-market-pnl` skill before
  presenting any PnL number to a user.
- **Mark-to-market fields go stale silently.** They use the latest observed
  token price only while it is fresher than `MARK_PRICE_MAX_AGE_DAYS`
  (30 by default). Past that they are omitted, not zeroed. Treat missing as
  unknown, never as zero.

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

## Rate limits and cost

Keyed traffic draws from a per-key token bucket dedicated to analytics — it is
**not** shared with trading endpoints, so hammering reads cannot starve order
placement. Usage is metered per hour and per route class.

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
- [ ] missing mark-to-market treated as unknown, not zero
- [ ] `429` backs off; `401` does not retry
- [ ] leaderboard cached, per-wallet calls not looped
