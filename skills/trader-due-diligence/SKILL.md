---
name: trader-due-diligence
description: Evaluate whether a prediction market trader is actually good before following, copying or writing about them. Use when asked to analyze a wallet, assess a trader, judge a leaderboard entry, decide whether to copy someone, or when someone presents an impressive PnL number and wants to know if it is real. Provides the reading order, the red flags, and the standard for an honest verdict.
---

# Trader due diligence

A leaderboard rank is an outcome, not evidence. This skill is the method for
deciding whether a prediction market trader's record reflects skill, size,
luck, or a strategy that does not transfer.

Read `prediction-market-pnl` first if you have not. Every judgment here rests
on knowing which view you are holding and which fields are real zeros — a
windowed leaderboard reports `win_rate: 0` for every trader on it, and reading
that as a record rather than as an absent field invalidates the whole analysis.

## Reading order

Do not start from the summary. Start from what could invalidate it.

1. **`traders/{address}`** — headline PnL, volume, win rate. Note them, do not
   conclude from them.
2. **`traders/{address}/categories`** — where the money actually came from.
3. **`traders/{address}/positions/active`** — how much is still unsettled.
4. **`traders/{address}/pnl`** — the shape of the curve over time.
5. **`traders/{address}/trades`** — the largest individual fills.

The verdict is almost always decided at steps 2 and 5, not step 1.

## The red flags, in order of how often they matter

### Concentration

If one market or one category produced most of the PnL, the record is one
correct opinion, not a repeatable process. Compute it explicitly:

```
top_market_share = |pnl of best market| / |total pnl|
```

Above ~0.5 this dominates every other consideration. Say so plainly: "81% of
this PnL came from a single election market" is more useful than any adjective.

Check the second-order version too: strip the top market and re-read the rest.
A trader who is flat without their one win is a different proposition from one
who is solidly profitable with a single outlier on top.

### Thin sample

Wins and losses are counted per **market**, not per trade. Win rate over 4
decided markets is noise. Under ~20, report the count instead of the
percentage. A trader with 6 months and 12 decided markets has not demonstrated
much regardless of the numbers.

Check where the number came from first: on a windowed leaderboard the win/loss
fields are all-time rollups that are simply not populated, so they read `0`.
Pull `traders/{address}` for a real figure.

### Survivorship and selection

A PnL leaderboard is, by construction, the set of wallets that won. Ranking
high in a 30d window is partly evidence of skill and partly evidence that
somebody had to be at the top. Cross-check against a longer window: a trader
who appears in the 30d, 90d and 365d rankings is a different signal from one
who appears only in the 30d.

### Window shopping

If someone presents a window, ask what the other windows say. A record that
only looks good in exactly one lookback period is being framed, whether
deliberately or not. Report the window you used and at least one other.

### Size mismatch

Large absolute PnL on enormous volume can be a thin edge run at scale, which
does not transfer to a follower with 1/1000th the size — slippage eats it.
Conversely a huge return on tiny volume is not evidence of capacity. Read PnL
and volume together, never separately.

### Strategy that does not transfer

Check `is_mm_bot` first — it flags likely market makers directly. Note it is
**always false on predict.fun** because the flag table is empty there, so
absence of the flag on that venue means nothing.

Failing the flag, heavy `SPLIT` / `MERGE` / `CONVERSION` activity or large
maker rebates suggests market making or arbitrage rather than directional
betting. Those records are often genuinely skilled and still useless to copy,
because the edge is in infrastructure and speed rather than in opinion. Say
which kind of trader this is before saying whether to follow them.

Do not describe the leaderboard as bot-free. It excludes ~31 operator and
exchange **contracts** by bytecode size; ordinary bot wallets are still ranked.

### Unsettled exposure

Big open positions mean the record is not final. A wallet can look excellent
and be holding a loss it has not taken. State the open exposure alongside the
verdict.

## The verdict standard

An honest verdict names the thing that would change it.

Bad: "Strong trader, 61% win rate, $340k PnL. Worth following."

Good: "$340k realized cashflow PnL over 12 months, but 81% of it came from one
election market. Excluding that market the wallet is roughly flat. 23 closed
positions is a thin sample for a 61% win rate. There is $95k of open exposure
still unsettled. This is one correct large opinion rather than a demonstrated
process — the case for following depends on whether you think that opinion was
repeatable."

Rules:

- lead with the disqualifying fact if there is one
- give the number that would change your mind
- never present a recommendation without the concentration figure
- if the data is insufficient to judge, say that instead of hedging a verdict
- do not soften a weak record; the user is deciding where to put money

## When the answer is "cannot tell"

That is a legitimate and common result. Say it when:

- the wallet has under ~20 decided markets
- most exposure is still open
- the history is shorter than one full market cycle for its categories
- marks are missing on the positions that would decide it

"Not enough settled activity to judge" is more useful than a confident verdict
built on four data points.
