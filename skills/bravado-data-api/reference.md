# Bravado Data API — endpoint reference

Host `https://api.bravado.io`. Every path below is prefixed with
`/trader-analytics`. `{address}` is a Polygon wallet address, matched
case-insensitively. Windows: `1h`, `4h`, `24h`, `7d`, `30d`, `90d`, `365d`, `all`.

**Open** = no auth. Everything else needs HMAC + scope `analytics.read`.

## Leaderboards

| endpoint | notes |
|---|---|
| `GET /leaderboard` | Traders ranked by cashflow PnL. `window` (default `24h`), `limit` (default 50, max 500), `offset`. |
| `GET /leaderboard/volume` | Same shape, ranked by traded USDC volume. |

## Wallet performance

| endpoint | notes |
|---|---|
| `GET /traders/{address}` | Performance summary. `basis=net` (default) or `gross`. |
| `GET /traders/{address}/pnl` | Cumulative PnL series. |
| `GET /traders/{address}/categories` | PnL and volume by category. |
| `GET /traders/{address}/usdc-balance` | Current Polygon collateral balance. |
| `GET /traders/{address}/combo-markets` | Per-market Combos (Positions Framework) PnL. |

## Positions and fills

| endpoint | notes |
|---|---|
| `GET /traders/{address}/positions` | Open + closed. |
| `GET /traders/{address}/positions/active` | Open outcome-token positions only. |
| `GET /traders/{address}/positions/closed` | Closed only. |
| `GET /traders/{address}/trades` | Paginated fill history. |
| `GET /trades` | Wallet activity rows. `address`, and `type` one of `TRADE`, `REDEEM`, `REWARD`, `MAKER_REBATE`, `REFERRAL_REWARD`, `SPLIT`, `MERGE`, `CONVERSION`, `DEPOSIT`, `WITHDRAW`. |

Activity rows are **not** all trades. Filtering on `type=TRADE` when you meant
"everything that moved the balance" silently drops redemptions, splits and
merges, which is how a reconstructed balance ends up wrong.

## Statements (PMWAS)

| endpoint | notes |
|---|---|
| `GET /traders/{address}/statements` | Full R1–R8 set. R1 paginated via `r1_limit` / `r1_offset`. |
| `GET /traders/{address}/statements/r1` | R1 disposition rows. `limit` / `offset`. |
| `GET /traders/{address}/metrics` | Performance metrics R5/R6/R7. |
| `GET /traders/{address}/reconciliation` | R8 reconciliation certificate + capital-conservation gate. |
| `GET /entity/{owner}` | Multi-wallet entity rollup. |

## Tax (open, no auth)

| endpoint | notes |
|---|---|
| `GET /traders/{address}/tax-report` | Per-year tax report. `year`, `format=json\|html`. **Open.** |
| `GET /traders/{address}/tax-report/8949` | Form-8949-style disposition detail. `year`, `quarter`, CSV or JSON. **Open.** |
| `GET /traders/{address}/event-graph` | Lot-lineage event graph. `market_id` drills to lot level. **Open.** |

## Venue

Every request maps to one venue: paths under `/predict/*` resolve to
`predictfun`, everything else to `polymarket`. The key must carry that venue in
its entitlements or the response is `403 VENUE_NOT_ENABLED`. A key scoped to one
venue is normal, not a misconfiguration.

## Pagination

`limit` / `offset` throughout, `limit` capped at 500 on leaderboards. There is
no cursor. Deep offsets get slower; prefer narrowing the window over paging far.

## Model caveats that belong in your code, not your head

- `pnl = sell_usdc - buy_usdc`, `volume = buy_usdc + sell_usdc`. Cashflow, not
  mark-to-market.
- Wins, losses and win rate use an **outcome-level closed-position cost basis**.
  Close to FIFO for fully closed outcomes; not a chronological lot replay.
- Mark-to-market fields only appear while the observed price is fresher than
  `MARK_PRICE_MAX_AGE_DAYS` (30 default). Absent means unknown, not zero.
- `basis=net` (default) and `basis=gross` are different questions. Do not
  compare a `net` number from one call against a `gross` number from another.
