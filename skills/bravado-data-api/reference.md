# Bravado Data API — endpoint reference

Host `https://partner-api.bravadotrade.com`. Every path below is prefixed with
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
| `GET /traders/batch` | **Screen up to 50 wallets in one call.** `addresses=a,b,c`. Realized PnL, volume, decided markets, win rate, MM flag. |
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

- There is a real **share-level FIFO lot engine**. `realized_pnl` comes from the
  fills ledger and **includes synthetic resolution closes**, so settlement at
  market resolution counts. `unrealized_pnl` is `shares x mark - cost` over open
  lots. `overall_pnl` is the sum.
- **Leaderboard rows are not the same view as the wallet summary.** The
  leaderboard envelope carries `mode: "pnl_v1_cashflow"` and omits unrealized;
  `traders/{address}` computes it. The same wallet legitimately differs between
  the two.
- **Wins and losses are market-level** (`markets_won` / `markets_lost` /
  `markets_traded`), not per trade. On `categories` the unit is a token: a win is
  a token with positive realized PnL. `win_rate` is a fraction 0-1.
- **Windowed leaderboards return 0 for `wins`, `losses`, `total_positions` and
  therefore `win_rate`** — those are all-time rollups only. Not real zeros.
- **`unrealized_pnl`, `active_positions`, `open_position_value` are 0 on
  leaderboard rows unless live stats are enabled.** Not real zeros.
- `active_positions` **excludes dust** — under 1 whole share is not counted.
- **Amounts are micro-USDC, shares are micro, prices are probabilities in
  [0,1].** Divide by 1e6, divide by 1e6, multiply by 100.
- `is_mm_bot` flags likely market makers, and is **always false on predict.fun**
  because the flag table is empty there. Leaderboards exclude ~31 operator and
  exchange **contracts** by bytecode size — that is a contract denylist, not a
  bot filter.
- **Identity enrichment (username, avatar) is Polymarket-only.**
