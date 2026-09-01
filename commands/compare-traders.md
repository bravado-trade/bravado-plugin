---
description: Compare prediction market wallets on the same basis
---

Compare these wallets: `$ARGUMENTS`.

Screen all of them in one query first. Comparing is exactly what `run_sql`
against `mcp_trader_score` is for: one `WHERE wallet IN (…)` returns realized
PnL, decided markets and win rate for every address at once, on one consistent
basis.

Then dispatch a `trader-analyst` agent only for the addresses where the screen
leaves a real question — concurrently, since they are independent. Running a
full dossier on a wallet the screen already settled is spending the user's
credits to reach the same answer.

Then compare on a **single consistent basis**. This is where comparisons go
wrong:

- the same window for everyone, stated once
- the same metric — realized against realized, never one trader's realized
  against another's overall
- decided-market counts beside every win rate, because a 70% rate over 8 markets
  and over 200 are not comparable numbers
- concentration for each, since the trader with the higher PnL is often the one
  with the single lucky market

Rank them, and say plainly when two are not distinguishable on the evidence. A
forced ordering between wallets whose records overlap is worse than saying they
are close.

Flag any market makers separately rather than ranking them against directional
traders — their records are not the same kind of object.
