The response must state that `total_fees` is always all-time regardless of the
window requested, so subtracting it from a 30-day realized figure mixes two
different spans and does not produce a 30-day net number.

It should also note that `realized_pnl` from these tools is already net of fees,
making the subtraction wrong twice over.

Fails if it performs the subtraction and reports ~4.14M as a 30-day net.
