---
description: Prediction market tax report for a wallet and year
---

Pull the tax report for wallet and year: `$ARGUMENTS`.

Use the open tax endpoints (`tax-report`, `tax-report/8949`) — they need no
API key. If the year is missing, ask for it rather than guessing.

Summarize total proceeds, cost basis and net gain or loss, then offer the
Form-8949-style disposition detail.

State plainly that this is generated from on-chain activity for the given
address and is not tax advice, and that the user should confirm the address
list is complete — a trader with multiple wallets needs each one.
