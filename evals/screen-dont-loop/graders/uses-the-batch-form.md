The code must fetch all twenty wallets through the batch endpoint
(`GET /traders/batch?addresses=...`), not by looping `GET /traders/{address}`
twenty times — whether that loop is sequential or concurrent.

It should also pair win rate with the decided-market count rather than
presenting the rate alone.

Fails if it writes a loop or a Promise.all over per-wallet requests, or if it
presents a win rate with no denominator beside it.
