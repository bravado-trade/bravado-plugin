---
name: prediction-market-tax
description: Produce and interpret tax reports for prediction market activity — realized gain/loss by year, Form-8949-style disposition detail, cost basis, short vs long term, income, and reconciliation. Use when asked about taxes, capital gains, cost basis, an 8949, a statement, or "what do I owe" on Polymarket or predict.fun activity. These endpoints are open and need no API key.
---

# Prediction market tax reporting

This surface is **open** — `tax-report`, `tax-report/8949` and `event-graph`
need no credential. It is also the part of the API where being wrong costs the
user the most, so the standard for care is higher than elsewhere.

## Say this, and mean it

Everything here is generated from on-chain activity for the addresses given. It
is **not tax advice**, it does not know the user's jurisdiction, and it cannot
know about activity on wallets it was not given.

That last one is not boilerplate — it is the single most common way a report
comes out wrong. Ask before computing anything:

> Is this every address you traded from? A separate signing EOA, a proxy or Safe
> wallet, a second account, an old wallet — each one needs its own report, and a
> missing one misstates the year.

Use `GET /entity/{owner}` when several wallets belong to one owner: it
aggregates across them with inter-wallet netting, which is not the same as
adding two reports together.

## The statement set

`GET /traders/{address}/statements` returns eight related documents. Knowing
which one answers the question saves pulling all of them:

| | what it is |
|---|---|
| R1 | disposition rows — the line items |
| R2 | income (rewards, rebates, referrals) |
| R3 | open positions |
| R4 | capital flows in and out |
| R5 | realized summary |
| R6 | fee breakdown by role |
| R7 | performance metrics (NAV, ROI, TWR, MWR) |
| R8 | reconciliation certificate |

For a single figure use `GET /traders/{address}/metrics` — it serves R5/R6/R7
without assembling R1 and is much faster.

**R1 is paginated and will mislead you if you ignore that.** It arrives via
`r1_limit` / `r1_offset` inside `/statements`, or alone at `/statements/r1` with
`limit` (default 500, max 5000) / `offset`. Check **`has_more_r1`**. Summing the
first page and calling it the year is a silent, confident undercount.

## Reading an R1 row

Each disposition carries gain/loss, `term`, `disposal_kind`, `cost_basis_method`
and `evidence_level`.

- **`term`** is `SHORT` or `LONG`. It decides which section of an 8949 the row
  belongs to, so never aggregate across terms into a single total.
- **`disposal_kind`** separates a sale from a resolution payout from a merge.
  Those are economically different events that all reduce a position, and a
  report that flattens them is hard to defend.
- **`evidence_level`** is how well supported that row's basis is. Weak-evidence
  rows are the ones to surface to the user, not to average away.

## The tax report and the 8949

`GET /traders/{address}/tax-report?year=YYYY` gives the per-year statement:
short and long-term realized, fees, disposal-kind breakdown, income by kind,
external deposits and withdrawals, net taxable for the year, an open-positions
summary, grand totals, and a `combo` block where the wallet used Combos.
`format=json|html`.

`GET /traders/{address}/tax-report/8949?year=YYYY` gives per-lot detail with
proceeds, cost basis, gain/loss and term per row. It accepts `quarter=1-4` and
serves CSV as well as JSON — offer the CSV when this is going to an accountant
or into other software.

`GET /traders/{address}/event-graph` traces acquisition to disposal as a lot
lineage. Reach for it when a specific number is being questioned: it shows how a
basis was arrived at, per market, and `market_id` drills to lot level.

## Reconciliation is the credibility check

`GET /traders/{address}/reconciliation` returns the R8 certificate (I1–I4 and
`all_zero`) plus a capital-conservation gate, and that block appears **only for
conformant wallets**.

If `all_zero` does not hold, say so before presenting totals. A report that does
not reconcile is not a report; it is a draft with an unexplained difference in
it, and the user needs to know that before filing anything.

## Basis and income switches

`?basis=net` (default) or `gross`, and `?income=total` (default), `detail` or
`none`. State which you used — a net figure and a gross figure for the same year
are both correct and are not the same number.

**On predict.fun the switch does nothing.** Fees are charged in the proceeds
asset and realized PnL is already fee-net, so `net` and `gross` return the same
value, and subtracting the reported `fees` again double-counts. That venue's
`fees` field is informational only.

## A 404 means not processed yet

These reports come from a batch job. A wallet the job has not covered returns
**404** with `available: false` and a reason — the service is healthy and the
data does not exist yet.

That is neither zero nor an outage. Do not report a $0 year for it, and do not
retry in a loop; retrying does not make the batch run.

## Producing a report

1. confirm the full address list before computing anything
2. pull the per-year `tax-report`
3. check reconciliation before quoting totals
4. keep short and long term separate
5. offer the 8949 detail, and the CSV if it is going onward
6. name the basis and the year on every figure
7. state plainly that this comes from chain activity and is not advice
