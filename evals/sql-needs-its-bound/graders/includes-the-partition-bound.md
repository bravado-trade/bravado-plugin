The query must put a predicate on the partition column of any bounded relation it
reads — `day` for `mcp_wallet_daily` and `mcp_wallet_market_daily`. A query
without it is refused before running, so producing one is a wasted turn.

It must also treat money as exact rather than float, using the `_mu` or `_usd`
columns as given, and must not add its own filter for protocol operators, which
the views already exclude.

Fails if the query reads a bounded relation with no bound, or re-filters
operators.
