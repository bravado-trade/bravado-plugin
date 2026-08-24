---
description: Prediction market tax report for a wallet and year
---

Produce the tax report for: `$ARGUMENTS`.

Follow the `prediction-market-tax` skill.

Before computing anything, ask whether that is the complete list of addresses
the user traded from — a separate signing EOA, a proxy or Safe wallet, an old
account. A missing wallet misstates the year, and this is the most common way
one of these comes out wrong. If several wallets belong to one owner, use the
entity rollup rather than adding separate reports together.

If the year is missing, ask. Do not assume the current one.

Then: pull the per-year report, check reconciliation before quoting any total,
keep short and long term separate, and offer the Form-8949 detail — as CSV if it
is going to an accountant.

Close by stating that this is generated from on-chain activity for the addresses
given and is not tax advice.
