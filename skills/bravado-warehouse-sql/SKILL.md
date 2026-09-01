---
name: bravado-warehouse-sql
description: Write correct read-only SQL against Bravado's prediction-market warehouse through the run_sql tool. Use when a question needs an aggregate, a ranking, a cohort or a join that the curated tools do not answer — screening many wallets at once, per-market flow, price history joined to positions. Covers the readable views, the two money forms, the partition bounds that refuse a query before it runs, and the identifier trap.
---

# Querying the warehouse

`run_sql` runs a read-only ClickHouse SELECT. It is the tool to reach for when a
question is an aggregate rather than a lookup — the curated tools answer "tell me
about this wallet", this answers "which wallets, out of all of them".

It cannot reach base tables. Only the `mcp_*` views are readable, and the boundary
is a ClickHouse grant rather than a SQL parser, so there is nothing to get around
and no point trying.

## What is readable

| view | one row per |
|---|---|
| `mcp_trader_score` | wallet — all-time realized PnL, volume, win rate, streaks, archetype |
| `mcp_wallet_open_state` | wallet — current open positions, marked to the latest mid |
| `mcp_wallet_first_seen` | wallet — first and last on-chain activity |
| `mcp_wallet_fees` | wallet — all-time maker fees |
| `mcp_wallet_daily` | wallet × day — volume and PnL |
| `mcp_wallet_market_daily` | wallet × market × day — PnL |
| `mcp_market_wallet` | market × wallet — lifetime totals |
| `mcp_market_outcome_daily` | market × outcome × day — flow |
| `mcp_token_price_history` | outcome token × hour — OHLCV |
| `mcp_token_mark_daily` | token × day — tax-grade mark with provenance |
| `mcp_markets` | market — metadata |
| `mcp_tokens` | outcome token — metadata |

## Four conventions, and each one is a wrong answer if you miss it

**Money arrives in two forms.** `*_mu` is exact integer micro-USDC; `*_usd` is
the same value as an exact Decimal. **Never parse either as a float.** Summing
floats over a few hundred thousand rows is how a reconciliation ends up off by
dollars and nobody can say where.

**Partitioned views refuse an unbounded query.** Anything marked with a bound —
`mcp_wallet_daily` and `mcp_wallet_market_daily` on `day`,
`mcp_market_outcome_daily` on `day`, `mcp_token_price_history` on `hour`,
`mcp_token_mark_daily` on `utc_day` — rejects a query with no predicate on that
column, *before running it*, because the unbounded read is a multi-terabyte scan.

Always put the bound in the WHERE clause first, then everything else:

```sql
SELECT wallet, sum(realized_pnl_mu) AS pnl_mu
FROM mcp_wallet_daily
WHERE day >= today() - 30          -- the bound, not optional
GROUP BY wallet
ORDER BY pnl_mu DESC
LIMIT 20
```

**Protocol operators are already excluded.** Do not filter them again. Adding
your own denylist on top removes wallets twice or, worse, removes the wrong ones
because your list and theirs disagree.

**`mcp_markets.market_id` is the Gamma id, not the condition id.** This is the
same identifier trap the REST surface has, in a different place. A condition id
(`0x` + 64 hex) will match nothing here and return an empty result rather than
an error.

## Screening many wallets

This is what the tool is best at and what the curated tools cannot do. Given a
holder list, one query ranks them all:

```sql
SELECT wallet, realized_pnl_usd, volume_usd, win_rate, markets_won, markets_lost
FROM mcp_trader_score
WHERE wallet IN ('0xabc…', '0xdef…')
ORDER BY realized_pnl_usd DESC
```

Twenty wallets is one query, not twenty tool calls. Then pull the full profile
with `get_trader_profile` for the few that survive the screen.

`markets_won` and `markets_lost` are returned alongside `win_rate` for the
reason the `prediction-market-pnl` skill gives — a rate without its denominator
is the most misread number on this surface.

## SQL is gross, the tools are net

The single most likely way to conclude there is a bug when there is not.

Verified against the live surface, same wallet, same 30-day window:

```
run_sql   sum(realized_pnl_mu) FROM mcp_wallet_daily   4,517,358.575118
get_leaderboard / get_trader_profile  realized_pnl     4,327,945.704668
                                            difference   189,412.870450
profile total_fees                                       189,412.870450
```

Exactly the fees. **The warehouse figure is before fees; the curated tools report
net.** Neither is wrong — they answer different questions, and they reconcile to
the last decimal once you know which is which.

So when a SQL result disagrees with a tool, subtract the fee total before
concluding anything. And when you present a warehouse number to a user, say it is
gross, because they will compare it against the app.

The same rule has a venue exception worth carrying: on predict.fun the engine's
realized PnL is already fee-net, so there is nothing to subtract there and doing
it anyway double-counts.

## Cost is visible and it is charged

Queries are billed on what they scan, not only on being made. A query with its
bound in place scans a partition; the same query without one is refused rather
than being allowed to become expensive.

Every response carries a `provenance` block with `clickhouse_read_bytes`,
`elapsed_ms`, the relations touched and the operator denylist size. Read it —
it is the honest cost of the query you just wrote, and it is how you find out
that a predicate you thought was selective was not.

Two habits that keep it cheap and are also just better SQL: select the columns
you need rather than `*`, and put the most selective predicate first.

## When not to use it

If a curated tool answers the question, use the curated tool. `get_trader_profile`
is one call against a warmed serving path; the equivalent SQL is a warehouse scan
that costs more and can disagree at the margins. Reach for SQL when the shape of
the question — a ranking, a cohort, a join across days — has no tool.
