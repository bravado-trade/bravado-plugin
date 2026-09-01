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

**`mcp_markets` has no condition id, and has something that looks exactly like
one.** `market_id` is the Gamma id — a short decimal like `3824007`. Alongside it
sits `question_id`, a `0x` + 64-hex value with the same shape as a condition id
and a different value. Verified on one market:

```
slug          sol-updown-5m-1787610300
conditionId   0x7e0ed87e75841bbc682beb7b0012dcadc06efa43767659b573e02cbfa46707b9
question_id   0x957984f50afe0e4a6d77d886db5162db8700c28a9007f4c1c40a5aebd7955041
```

Filtering `mcp_markets` by a condition id returns **zero rows and zero bytes
read** — a silent empty, not an error. If a market lookup comes back empty and
you are sure the market exists, check that you are not matching a condition id
against `question_id`.

Join on `slug`, or carry the Gamma `market_id`, which is what the other
`mcp_*` relations use.

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

## Fees: one view names them, the other does not

The most likely way to conclude there is a bug when there is not.

`mcp_trader_score` gives you the choice, explicitly:

```
realized_pnl_net_mu      4327945704668   agrees with get_trader_profile
realized_pnl_gross_mu    4517358575118   before fees
total_fees_mu             189412870450   the difference, exactly
```

Pick `_net_` when the number has to agree with a curated tool, `_gross_` when
you want pre-fee. No arithmetic.

**`mcp_wallet_daily` does not offer the choice.** Its columns are
`realized_pnl_mu` and `realized_pnl_usd`, unqualified — and they are **gross**.
Verified: summing thirty days for one wallet gives `4517358575118`, matching
`realized_pnl_gross_mu` exactly and missing the tool's figure by the fee total.

Nothing in that column name says so. If you sum `mcp_wallet_daily` and compare
it to a tool, it will look like the tool is wrong. It is not.

On predict.fun there is nothing to reconcile — realized PnL is already fee-net
by construction there, and subtracting the reported fees double-counts.

## Columns worth knowing about

`mcp_trader_score` carries more than PnL: `archetype` (e.g. `Scalper`),
`is_bot`, `is_copyable`, `smart_score`, `pct_profitable_days`, streak lengths
and `avg_hold_sec`.

Treat the opinion columns — `is_copyable`, `smart_score`, `archetype` — as
inputs, not verdicts. How they are derived is not documented on this surface, so
a judgement that rests on them cannot be explained to the person receiving it.
The reasoning in `trader-due-diligence` is built from figures you can show your
work on; use these to sort, not to conclude.

## Cost is visible and it is charged## Cost is visible and it is charged

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
