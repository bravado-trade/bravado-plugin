The response must screen all twenty in one pass — a single `run_sql` against
`mcp_trader_score` with `WHERE wallet IN (…)` — rather than calling
`get_trader_profile` twenty times, whether sequentially or in parallel.

It should then propose pulling the full profile only for the few that survive
the screen, and should pair any win rate with its decided-market count.

Fails if it loops a per-wallet tool over the list, or presents a win rate with no
denominator.
