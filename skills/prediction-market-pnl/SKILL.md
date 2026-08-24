---
name: prediction-market-pnl
description: Read Bravado prediction market numbers correctly before presenting them — PnL, win rate, unrealized, positions, win counts. Use whenever interpreting or explaining trader performance from Polymarket or predict.fun data, and whenever a figure disagrees with another dashboard. The dominant hazard is that several fields return a literal 0 when the value was simply not computed; this skill says which ones and how to tell.
---

# Reading Bravado analytics without getting it wrong

Prediction market accounting is not stock accounting, and this API has a
specific trap: **several fields return `0` when the value was not computed**,
not when it is genuinely zero. A consumer that trusts those zeros produces a
confidently wrong answer rather than an error.

Learn the zero traps first. Everything else is ordinary care.

## The zero traps

### Windowed leaderboard rows have no win/loss data

`wins`, `losses`, `total_positions` come from all-time rollups. On any
**windowed** leaderboard request (`window=24h`, `30d`, …) they are **`0`**, and
`win_rate` is derived as `wins/(wins+losses)`, so it reads `0` too.

A 30d leaderboard row showing `win_rate: 0` and `total_positions: 0` alongside
a large positive PnL is not a trader who lost every market. It is a field that
only exists for `window=all`.

**Rule:** never quote win rate from a windowed leaderboard. Use `window=all`,
or pull `traders/{address}` for that wallet.

### `unrealized_pnl` on the leaderboard is `0` unless live stats are on

`unrealized_pnl`, `active_positions` and `open_position_value` on leaderboard
rows are `0` unless the request enables live stats (and the server has that
feature on). They are not "this trader has no open positions".

`traders/{address}` computes them properly from the FIFO lot state joined to
current marks.

### Missing marks

Unrealized value needs a current mark (`argMax(price_mid, ts)`). Where a mark
is absent the contribution is treated as zero. An illiquid position that has
not traded recently therefore quietly contributes nothing to unrealized.

**In all three cases: say "not computed", never "zero".**

## What PnL actually is

There is a real **share-level FIFO lot engine** (`pm_fifo_lot_state`), not a
naive cashflow difference.

- **`realized_pnl`** comes from the fills ledger and **includes synthetic
  resolution closes** — settlement at market resolution counts, so a position
  that resolved and paid out is realized whether or not the wallet did anything.
- **`unrealized_pnl`** = for each open lot, `shares × mark − cost`.
- **`overall_pnl`** = realized + unrealized.

So an open winning position **does** show up, in `unrealized_pnl`, on
`traders/{address}`. It does **not** show up on a leaderboard row (see above),
which is why the same wallet can look very different in the two places. That
difference is the API working as designed, not a bug.

The leaderboard response envelope carries `mode: "pnl_v1_cashflow"` — that tag
is telling you which of the two views you are holding. Check it.

## Win rate is market-level

`wins` / `losses` / `total_positions` are `markets_won` / `markets_lost` /
`markets_traded`. A win is a **market** the wallet came out of positive, not an
individual trade. On the per-category endpoint the unit is a **token**: a win is
a token whose realized PnL is positive.

Consequences:

- Win rate says nothing about size. 9 wins of $10 against 1 loss of $10k is a
  90% win rate and a disaster. **Never present win rate without PnL beside it.**
- Small denominators are common. Under ~20 decided markets, report the count,
  not the percentage.
- `win_rate` is a fraction 0–1, not a percentage. `0.61` is 61%.

## Units — every one of these has bitten someone

- **Amounts are micro-USDC.** Divide by `1e6` for dollars.
- **Shares are micro.** 1 share = `1000000`.
- **Prices and marks are probabilities in [0,1].** Multiply by 100 for cents.
  `price_per_share` is signed, so take the absolute value first.
- **Numeric fields arrive as JSON strings** to preserve precision. Parse as
  decimal, not float.
- `active_positions` **excludes dust** — positions under 1 whole share are not
  counted.

## Bots and excluded wallets

- `is_mm_bot` comes from a market-maker flag table. It is real signal: a
  flagged wallet is likely running market making, whose record does not
  transfer to a follower.
- Leaderboards exclude ~31 operator, relayer, exchange and collateral
  **contracts**, identified by bytecode size. This is a contract denylist, **not
  a bot filter** — ordinary bot wallets are still ranked. Do not describe
  leaderboards as bot-free.
- On predict.fun, `is_mm_bot` is always `false` because the flag table is
  empty there. That is absence of data, not absence of bots.

## Venue differences that change the answer

- **Identity enrichment (username, avatar) is Polymarket-only.** A predict.fun
  wallet with no username is not anonymous by choice; the enrichment sources
  do not cover that venue.
- **Fee handling differs.** On the predict.fun venue the engine's
  `realized_pnl` is already fee-net, so `basis=net` is a no-op and subtracting
  fees again double-counts. Treat the `fees` field there as informational.

## When our number disagrees with another dashboard

Work through this in order before calling anything a bug:

1. **Leaderboard vs wallet summary.** Leaderboard rows omit unrealized. The
   summary includes it. This alone explains most large gaps.
2. **Windowed vs all-time.** Win/loss fields only exist all-time.
3. **Different model.** Most venue interfaces show estimated mark-to-market
   portfolio value; `realized_pnl` is settled money.
4. **Different wallet.** Many traders hold a proxy or Safe wallet distinct from
   their signing EOA. Confirm which address is being measured.
5. **Timing.** Realized updates on settlement, not on price movement.

When you do escalate, cite the endpoint, the window and the `mode` in the
envelope, so the disagreement is about data rather than definitions.

## Presenting a number

- name the field you used and the window
- pair win rate with PnL and with the decided-market count
- state realized and unrealized separately when both exist
- say "not computed" for the zero traps above, never "zero"
- give dollars, not micro-USDC
