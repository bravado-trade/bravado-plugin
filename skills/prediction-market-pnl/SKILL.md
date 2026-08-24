---
name: prediction-market-pnl
description: Read prediction market PnL, win rate and position numbers correctly before presenting them. Use whenever interpreting or explaining trader performance from Polymarket or predict.fun data — PnL, win rate, ROI, open positions, realized vs unrealized — and whenever a number does not match what another dashboard shows. Explains the cashflow model, the outcome-level cost basis, mark staleness, and how to reconcile a disagreement.
---

# Reading prediction market PnL without getting it wrong

Prediction market accounting is not stock accounting. Positions resolve to
exactly 0 or 1, shares are minted and burned rather than only traded, and a
wallet can end a market with value it never sold. Numbers that look familiar
mean something different here.

Get this right before quoting any figure to a user.

## The model: cashflow, not mark-to-market

```
pnl    = sell_usdc - buy_usdc
volume = buy_usdc  + sell_usdc
```

Everything downstream follows from those two lines.

**What this means in practice:**

- **Open positions contribute nothing.** A wallet that bought $50k of a
  position now worth $200k shows PnL of **-$50k** until it sells or redeems.
  The trade is going well and the number is deeply negative.
- **A resolved-but-unredeemed win also shows negative** until the redemption
  lands, because redemption is what produces the inflow.
- **PnL is path-dependent in a good way**: it is real money that moved, not an
  estimate. It cannot be inflated by marking an illiquid position to a
  thin quote.

So "negative PnL" is not "losing". It is "has spent more than it has taken
back so far". Say it that way when the wallet has meaningful open exposure.

**Always check open exposure before calling a PnL number good or bad.** Pull
`positions/active` alongside `traders/{address}` and say which part of the
picture is still unsettled.

## Win rate: outcome-level closed-position cost basis

Wins, losses and win rate are computed per **outcome**, over **closed**
positions, on a cost-basis model. It is close to FIFO for fully closed
outcomes but is not a full chronological lot replay.

Consequences:

- A partially closed outcome is not counted as a win or a loss yet.
- Win rate says nothing about size. 9 wins of $10 and 1 loss of $10k is a 90%
  win rate and a disaster. **Never present win rate without PnL next to it.**
- Small denominators are common. 4 closed outcomes gives a win rate that is
  noise. Below roughly 20 closed positions, say the sample is thin rather
  than quoting a percentage as if it were a skill estimate.

## Mark-to-market fields go stale, then disappear

Where a mark-to-market figure is provided, it uses the latest observed token
price **only while that price is fresher than `MARK_PRICE_MAX_AGE_DAYS`**
(30 days by default). Past that the field is omitted.

**A missing mark means unknown, not zero.** An illiquid market that has not
traded in six weeks has no defensible mark; substituting zero silently
converts "we don't know" into "it's worthless", which is a specific wrong
answer rather than an absence of one.

If a mark is missing, say the position cannot be valued right now and give the
cost basis instead.

## net vs gross

`traders/{address}` accepts `basis=net` (default) or `basis=gross`. They
answer different questions. Never compare a `net` figure from one call with a
`gross` figure from another, and always state which basis a quoted number used.

## Activity types are not all trades

Wallet activity rows carry a `type`: `TRADE`, `REDEEM`, `REWARD`,
`MAKER_REBATE`, `REFERRAL_REWARD`, `SPLIT`, `MERGE`, `CONVERSION`, `DEPOSIT`,
`WITHDRAW`.

Reconstructing a balance from `type=TRADE` alone drops redemptions, rewards,
splits and merges, and the result will not tie out. If the question is "where
did the money go", you need all types.

Splits and merges in particular move value without being trades: a split turns
collateral into a full set of outcome tokens, a merge does the reverse. A
wallet doing a lot of both is likely running a market-making or arbitrage
strategy, not directional betting — which changes how every other number
should be read.

## When our number disagrees with another dashboard

This comes up constantly and is usually not a bug. Work through it in order:

1. **Different model.** Most venue interfaces show an estimated mark-to-market
   portfolio value. Ours shows realized cashflow. On a wallet with large open
   positions these will differ enormously and both are correct.
2. **Different basis.** `net` vs `gross`.
3. **Different window.** A 30d figure against an all-time figure.
4. **Different wallet.** Many traders hold a proxy or Safe wallet distinct
   from their signing EOA. Confirm which address is actually being measured.
5. **Timing.** Cashflow updates on settlement, not on price movement.

Only after those five is a discrepancy worth escalating. When it is, cite the
endpoint, the window and the basis you used, so the disagreement is about data
and not about definitions.

## Presenting a number

- state the model in a clause, not a footnote: "realized cashflow PnL"
- state the window and the basis
- pair win rate with PnL and with the number of closed positions
- flag open exposure explicitly when it is material
- say "unknown" when a mark is missing
