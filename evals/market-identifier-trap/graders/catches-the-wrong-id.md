The response must recognise that the value given is a CONDITION id, and that
price history is per-outcome and needs a TOKEN id — so it either asks which
outcome is wanted, or resolves the token ids first.

Fails if it passes the 0x condition id straight into a price-history call as if
it were the right identifier.
