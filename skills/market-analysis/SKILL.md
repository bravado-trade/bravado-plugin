---
name: market-analysis
description: Read a prediction market itself rather than a wallet — price history, holder concentration, volume and flow on Polymarket. Use when asked about a specific market, event or outcome, who is on each side of it, whether the money is smart or new, or how a price moved. Covers the two different identifiers both named "market", and how to say something useful without predicting the outcome.
---

# Reading a prediction market

Wallet analysis asks "is this trader good". This asks "what is this market's
positioning telling me". They use different endpoints and different judgement.

## Be honest about what is differentiated

Price, holders, volume and trade flow are **Polymarket's data**, served through
Bravado's proxy. Any Polymarket client has them. Presenting them as proprietary
insight is both wrong and obvious to anyone who checks.

What is actually ours is one step further out: **we can score the participants.**
A holder list is commodity. A holder list where you know which of those wallets
have a real record, which are market makers, and which showed up last week is
not, and that is the analysis worth doing.

So the shape of a good market read is: pull the commodity data, then ask the
trader-analytics side who these people are.

## The identifier trap

Three market endpoints take a parameter literally named `market`, and they do
**not** take the same identifier:

| endpoint | `market` is |
|---|---|
| `/clob-proxy/holders` | the **condition id** (`0x…`, 66 chars) |
| `/clob-proxy/volume-history` | the **condition id** |
| `/clob-proxy/prices-history` | the **token id** (long decimal string) |

A condition id identifies the market. A token id identifies **one outcome** of
it — Yes and No are different token ids under the same condition id.

Passing the wrong one fails in two different ways, and neither is obvious
(verified against production 2026-08-30):

- a **well-formed id for the wrong thing** returns an empty success —
  `prices-history` given a condition id answers `200 {"history":[]}`, and
  `holders` given an unknown condition id answers `200 []`
- a **wrong-shaped id** fails upstream and, because the hosting edge rewrites
  `5xx` bodies, arrives as an HTML page rather than JSON — `holders` given a
  token id answers `504` with `text/html` (origin `502`)

So an empty result and a parse error can both mean "you passed the wrong
identifier". Both ids appear on a trade row as `conditionId` and `asset`, so
grab both when you have either.

`prices-history` also requires `startTs` (unix **seconds**) and `fidelity`
(minutes per bucket). It is per-outcome, so a two-outcome market needs two calls
if you want both sides.

## What to look at, in order

1. **Price and its path.** The level matters less than how it got there. A
   market at 60c that walked there over a month is a different object from one
   that gapped there yesterday.
2. **Volume by bucket.** Where the volume clusters tells you when the market
   actually formed an opinion. Flat volume with a moving price is thin
   conviction.
3. **Holder concentration.** Compute it explicitly — top holder share of the
   position, and how many holders make up the top half. A market held by five
   addresses moves on five decisions.
4. **Who the holders are.** This is the step that matters and the one most
   analyses skip. Screen the significant holders in **one query** rather than
   looping over them — `run_sql` against `mcp_trader_score` with
   `WHERE wallet IN (…)` ranks them all at once. Pull the full profile only for
   the few that survive.
5. **Recent flow.** New addresses entering versus known wallets adding.

## Judging the participants

For each meaningful holder, the questions are the same as in
`trader-due-diligence`, and the answers change the read of the market:

- **Is it a market maker?** Check `is_mm_bot`. A large MM position is inventory,
  not an opinion, and reading it as conviction is a straightforward error.
- **Does this wallet have a record?** A concentrated position from a wallet with
  no decided markets is not smart money; it is one person with an opinion.
- **Is this their category?** A trader whose record is entirely in sports taking
  a large political position is outside their demonstrated competence.

Say which of these you checked. "Held by wallets with real records in this
category" and "held by three wallets nobody has heard of" are different
statements and only one of them can be supported without doing the work.

## Splits and merges distort holder lists

A wallet that splits collateral holds **both** outcomes at once. It appears as a
large holder on each side while being directionally flat. Heavy split and merge
activity in a market usually means market making or arbitrage, and the holder
list should be read as inventory rather than as sides taken.

## Do not predict the outcome

State what the positioning shows and what would have to be true for the current
price to be wrong. Do not produce a forecast, a probability of your own, or a
recommendation to buy or sell.

This is not only a house style. A confident-sounding forecast built on a holder
list is the exact failure mode that makes this kind of analysis worthless, and
the honest version — "here is who is on each side and how good they are" — is
more useful anyway.

## Presenting a market read

- price now, and the path that produced it, with the window stated
- where volume clustered
- holder concentration as a number, not an adjective
- who the significant holders are and whether they have records
- flag market-maker inventory separately from directional positions
- what would change the picture
