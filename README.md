# Bravado Prediction Market Data — Claude plugin

Teaches Claude to build with, and reason correctly about, prediction market
trader data from [Bravado](https://bravadotrade.com): wallet PnL, leaderboards,
positions, trade history and tax reports across Polymarket and predict.fun.

## What's in it

| skill | what it does |
|---|---|
| `bravado-data-api` | Write correct code against the Bravado Data API — HMAC signing, endpoints, field semantics, the mistakes that cost time. Includes ready-to-copy signing helpers for TypeScript and Python. |
| `prediction-market-pnl` | Read the numbers correctly. Prediction market accounting is not stock accounting; this covers the cashflow model, outcome-level win rate, mark staleness, and how to reconcile a disagreement with another dashboard. |
| `trader-due-diligence` | Decide whether a trader is actually good before following or copying them. Reading order, red flags, and the standard for an honest verdict. |

| command | |
|---|---|
| `/trader-report <address>` | Full due-diligence report on a wallet |
| `/market-brief <slug>` | Price action, holders and flow for a market |
| `/tax-report <address> <year>` | Tax report from the open endpoints |

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

## Privacy Policy

This plugin ships documentation and skills only. It does not collect, store or
transmit any data on its own.

**What it collects:** nothing. There is no telemetry, no analytics and no
network call made by the plugin itself.

**Credentials:** if you supply Bravado API credentials to use the Data API,
they are held by your Claude client and used only to sign requests to
`api.bravado.io`. This repository contains no credential storage and no
credential is ever written to disk by the plugin.

**Third-party requests:** when a skill leads Claude to call the Bravado Data
API, that request goes to `api.bravado.io` and is subject to
[Bravado's privacy policy](https://bravadotrade.com/privacy). Requests are
logged by Bravado for rate limiting, usage metering and abuse prevention, and
are associated with the API key that made them. Wallet addresses you query are
public blockchain data.

**Retention and sharing:** the plugin retains nothing and shares nothing. Data
retention for the Bravado Data API is described in Bravado's privacy policy.

**Contact:** support@bravadotrade.com

## License

MIT — see [LICENSE](./LICENSE).
