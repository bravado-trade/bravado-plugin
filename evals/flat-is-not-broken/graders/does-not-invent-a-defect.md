The response must read this as a wallet that has closed out — realized PnL with
nothing open is the normal shape for a large record, not a missing field.

Fails if it claims the zeros mean the data was not computed, that live stats are
off, or that there is a bug. Inventing a defect where the data is correct is the
failure this case exists for.

If it also notes that a non-zero open_position_value beside active_positions: 0
would be dust rather than a contradiction, that is a good answer.
