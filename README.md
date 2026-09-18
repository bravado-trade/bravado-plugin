# Bravado Prediction Market Data — Claude plugin

Teaches Claude to build with, and reason correctly about, prediction market
trader data from [Bravado](https://bravadotrade.com): wallet PnL, leaderboards,
positions, trade history and tax reports across Polymarket and predict.fun.

## What's in it

### Skills

| skill | what it does |
|---|---|
| `bravado-data-api` | Write correct code against the Data API — HMAC signing, endpoints, units, pagination, rate limits, and the mistakes that cost time. Copy-ready signing helpers for TypeScript and Python. |
| `bravado-warehouse-sql` | Write correct read-only SQL through `run_sql` — the readable views, the two money forms, the partition bounds that refuse a query before it runs, and the identifier trap. |
| `prediction-market-pnl` | Read the numbers correctly. Prediction market accounting is not stock accounting, and several fields return a literal 0 when the value was simply not computed. |
| `trader-due-diligence` | Decide whether a trader is actually good before following or copying them. Reading order, red flags, and the standard for an honest verdict. |
| `market-analysis` | Read a market rather than a wallet: price path, volume, holder concentration, and whether the holders have real records. |
| `prediction-market-tax` | Realized gain/loss by year, Form-8949 detail, cost basis, short vs long term, and reconciliation. These endpoints are open. |

### Agents

| agent | |
|---|---|
| `trader-analyst` | Gathers a full wallet dossier across five endpoints and returns the verdict, not the rows. |
| `market-scout` | Analyses a market's positioning and scores its significant holders concurrently. |

### Commands

| command | |
|---|---|
| `/trader-report <address>` | Full due-diligence dossier |
| `/market-brief <market>` | Positioning brief — who is in it and are they any good |
| `/tax-report <address> <year>` | Tax report from the open endpoints |
| `/compare-traders <addresses>` | Several wallets on one consistent basis |

## Install

```
/plugin install bravado
```

## Connecting

```
claude mcp add --transport http bravado https://mcp.bravadotrade.com/mcp
```

Then `/mcp` to authenticate. The server registers your client itself, opens a
browser once for consent, and holds the token. It is read-only — it cannot place,
cancel or modify an order, and it cannot move funds.

Access is tied to a Bravado partner account. The skills themselves need no
credential and are useful without one.

## Verifying the signing helpers

```bash
python3 skills/bravado-data-api/scripts/test_sign.py
npx tsx  skills/bravado-data-api/scripts/test-sign.ts
```

Both run the canonical-path vectors from the API spec and assert that the two
implementations produce byte-identical signatures.

## Evals

```bash
claude plugin eval . --ablation with-without
```

Twelve cases under `evals/`. The ablation arm matters more than the absolute
score: these test whether the skills change Claude's answer, and a case that
scores the same with and without the plugin is a case the plugin is not earning.

## What has been verified against the live surface

The skills assert a lot of specific behaviour. This is what has actually been
run, and what has not — so the next person maintaining this knows which claims
carry evidence.

**Verified against production**

- every documented endpoint exists and is gated as described (32 checks)
- `run_sql` refuses an unbounded read of a partitioned relation, before running
- the warehouse reports gross where the curated tools report net, and they
  reconcile to the fee total exactly
- a window covers wins, losses and win rate, but never fees, streaks or drawdown
- `mcp_markets.question_id` is not a condition id — filtering by one returns a
  silent empty
- prices are probabilities in `[0,1]`

**Not verified**

- everything about the predict.fun venue — `is_mm_bot` always false, `basis`
  being a no-op, identity enrichment being Polymarket-only. That venue is not
  enabled for the account this was tested from. These come from the service's
  field-level documentation, which is generated from the handlers.
- the PMWAS statement claims — pagination via `has_more_r1`, the reconciliation
  gate. Those need a wallet in the batch roster.
- the eval cases themselves. `claude plugin eval` is in early access and was not
  enabled on the account these were written on.

Two claims in earlier versions of these skills turned out to be false when
finally run. Both came from prose documentation rather than a request. Prefer
the field-level docs, and prefer a request to both.

## Privacy Policy

See the [Bravado Privacy Policy](https://www.bravadotrade.com/privacy) for
information collected across Bravado services, its uses, service providers,
retention and your controls.

The plugin connects to Bravado's remote, read-only MCP server. When you connect
an account and use a tool, the client sends authorization and tool inputs to
Bravado and receives the requested results. Bravado processes account,
authorization, usage and operational records; this is not an offline-only
integration. Tool inputs can include public wallet addresses, market filters
and SQL queries. Do not include secrets or unrelated personal information.

You can revoke MCP access through the Bravado Console and disconnect the
integration in your AI client. These actions do not automatically delete
billing, security records or results already held by your AI provider.

For privacy requests, contact support@bravadotrade.com.

## License## License

MIT — see [LICENSE](./LICENSE).
