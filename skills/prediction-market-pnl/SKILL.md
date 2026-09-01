---
name: prediction-market-pnl
description: Read Bravado prediction market numbers correctly before presenting them — PnL, win rate, unrealized, positions, win counts. Use whenever interpreting or explaining trader performance from Polymarket or predict.fun data, and whenever a figure disagrees with another dashboard. The dominant hazard is that a window covers some fields and not others, so arithmetic across them describes no period at all.
---

# Reading Bravado analytics without getting it wrong

Prediction market accounting is not stock accounting, and this API has a
specific trap: **a window covers some fields and not others.** Arithmetic across
them produces a number that describes no period at all, and nothing in the
response says so.

Learn that first. Everything else is ordinary care.

## Windows are partial, and not every field respects them

This is the trap, and it is the opposite of what an earlier version of this skill
claimed. Windowed requests **do** return real win/loss data — verified against the
live surface:

```
window=7d    wins 6   losses 6   positions 12   win_rate 0.5000
window=30d   wins 10  losses 6   positions 16   win_rate 0.6250
```

But in the same two responses these were **byte-identical**:

```
total_fees      189412.87045
biggest_win     1912203.738698
max_drawdown    570536.077315
```

**Fee totals, streak metadata and drawdown are always all-time, whatever window
you asked for.** They are meaningless truncated, so the surface does not truncate
them.

The hazard is arithmetic across the two. A 30-day realized PnL minus an all-time
fee total is not a 30-day net figure, and nothing in the response says the two
numbers cover different spans. If you subtract, say which span each side came
from — or use `window=all`, where they agree by construction.

## Unknown is reported as unknown

A value the source cannot determine is reported as explicitly unknown. It is not
silently zeroed. So a `0` on this surface is a real zero, and the right reading of
a missing field is "not determined" rather than "none".

Two places where a zero is still worth a second look:

- `unrealized_pnl: "0"` with `active_positions: 0` is a wallet that is genuinely
  flat, and it is common — most large realized records belong to wallets that
  have closed out.
- `active_positions: 0` alongside a non-zero `open_position_value` is dust:
  positions under one whole share are excluded from the count but not from the
  value.

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

- **The unit changes with the tool.** `get_trader_profile` counts markets;
  `get_trader_categories` counts outcomes, and one market can carry several. The
  same wallet reads 336 and 354. Neither output says which it is, so a count
  from one tool and a rate from the other do not belong in the same sentence.
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
- name the span on both sides of any subtraction, or use `window=all`
- give dollars, not micro-USDC
