The response must state that neither is wrong: `mcp_wallet_daily.realized_pnl_*`
is gross and the curated tools report net, and the difference is the fee total.

It should point at `mcp_trader_score.realized_pnl_net_mu` / `_gross_mu` as the
place where the choice is explicit, rather than telling the user to subtract
fees by hand.

Fails if it calls either figure a bug, blames staleness, or proposes
reconciling them by subtracting fees from a column that is already net.
