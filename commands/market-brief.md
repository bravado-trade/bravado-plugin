---
description: Positioning brief on a prediction market — who is in it and are they any good
---

Brief me on the prediction market `$ARGUMENTS`.

Delegate to the `market-scout` agent. It needs both identifiers — the condition
id for holders and volume, the token id for price — so if you only have one,
find the other from a recent trade row before dispatching.

If you were given a market name or slug rather than an id, resolve it first and
confirm which market you resolved to.

The brief must not contain a forecast. If it comes back with one, strip it and
say what the positioning shows instead.
