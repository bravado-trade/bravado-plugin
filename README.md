# Bravado Prediction Market Data — Claude plugin

Teaches Claude to build with, and reason correctly about, prediction market
trader data from [Bravado](https://bravadotrade.com): wallet PnL, leaderboards,
positions, trade history and tax reports across Polymarket and predict.fun.

## What's in it

### Skills

| skill | what it does |
|---|---|
| `bravado-data-api` | Write correct code against the Data API — HMAC signing, endpoints, units, pagination, rate limits, and the mistakes that cost time. Copy-ready signing helpers for TypeScript and Python. |
| `prediction-market-pnl` | Read the numbers correctly. Prediction market accounting is not stock accounting, and several fields return a literal 0 when the value was simply not computed. |
| `trader-due-diligence` | Decide whether a trader is actually good before following or copying them. Reading order, red flags, and the standard for an honest verdict. |
| `market-analysis` | Read a market rather than a wallet: price path, volume, holder concentration, and whether the holders have real records. |
| `prediction-market-tax` | Realized gain/loss by year, Form-8949 detail, cost basis, short vs long term, and reconciliation. These endpoints are open. |

### Agents

| agent | |
|---|---|
| `trader-analyst` | Gathers a full wallet dossier across five endpoints and returns the verdict, not the rows. |
| `market-scout` | Analyses a market's positioning and scores its significant holders concurrently. |

### Commands

| command | |
|---|---|
| `/trader-report <address>` | Full due-diligence dossier |
| `/market-brief <market>` | Positioning brief — who is in it and are they any good |
| `/tax-report <address> <year>` | Tax report from the open endpoints |
| `/compare-traders <addresses>` | Several wallets on one consistent basis |

## Install

```
/plugin install bravado
```

## Do you need an API key?

Not to start. The tax endpoints (`tax-report`, `tax-report/8949`,
`event-graph`) are open and need no account, and the skills themselves work
without any credential.

Deeper analytics — per-wallet PnL, positions, categories, leaderboards — are
part of the Bravado Data API. Keys are minted self-serve at
[bravadotrade.com](https://bravadotrade.com) after enabling the `analytics`
product.

## Verifying the signing helpers

```bash
python3 skills/bravado-data-api/scripts/test_sign.py
npx tsx  skills/bravado-data-api/scripts/test-sign.ts
```

Both run the canonical-path vectors from the API spec and assert that the two
implementations produce byte-identical signatures.

## Evals

```bash
claude plugin eval . --ablation with-without
```

Twelve cases under `evals/`. The ablation arm matters more than the absolute
score: these test whether the skills change Claude's answer, and a case that
scores the same with and without the plugin is a case the plugin is not earning.

## Privacy Policy

This plugin ships documentation and skills only. It does not collect, store or
transmit any data.

**What it collects:** nothing. There is no telemetry, no analytics, and the
plugin itself makes no network request.

**Credentials:** if you supply Bravado API credentials to reach the Data API,
they are held by your Claude client and used only to sign requests to
`partner-api.bravadotrade.com`. This repository contains no credential storage,
and no credential is written to disk by the plugin.

**Third-party requests:** when a skill leads Claude to call the Bravado Data
API, that request goes to `partner-api.bravadotrade.com`. Bravado logs those
requests for rate limiting, usage metering and abuse prevention, associated
with the API key that made them. Wallet addresses you query are public
blockchain data. The open tax endpoints require no credential and are not
associated with an account.

**Retention and sharing:** the plugin retains nothing and shares nothing with
anyone.

**Contact:** support@bravadotrade.com

## License## License

MIT — see [LICENSE](./LICENSE).
