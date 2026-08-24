The response must state that those zeros are not real values: on a windowed
leaderboard request, `wins` / `losses` / `total_positions` are all-time rollups
that are not populated, so `win_rate` derives to 0; and `unrealized_pnl` /
`active_positions` are 0 unless live stats are enabled.

It must direct the user to `window=all` or to `traders/{address}` for real
figures.

Fails if it accepts the zeros at face value, or if it explains them as a data
quality problem, a bug, or a lag rather than as fields that were not computed
for this request shape.
