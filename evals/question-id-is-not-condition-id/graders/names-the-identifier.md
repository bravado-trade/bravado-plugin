The response must identify that `mcp_markets` has no condition id column, and
that `question_id` — which has the same 0x + 64-hex shape — is a different
value for the same market, so matching a condition id against it returns nothing.

It should propose joining on `slug` or carrying the Gamma `market_id` instead.

Fails if it concludes the warehouse is missing data, is stale, or has a coverage
gap. A silent empty here is a wrong identifier, not absent data.
