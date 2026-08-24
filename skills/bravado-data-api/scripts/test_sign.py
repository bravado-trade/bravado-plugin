import sys; sys.path.insert(0, ".")
from sign import canonical_path, sign_headers

VECTORS = [
    ("/v1/trade/account", None, "/v1/trade/account"),
    ("/v1/trade/account/", None, "/v1/trade/account"),
    ("/v1/trade/orders/open", {"token_id": 42}, "/v1/trade/orders/open?token_id=42"),
    ("/v1/trade/orders/open", {"b": 2, "a": "hello world"}, "/v1/trade/orders/open?a=hello%20world&b=2"),
    ("/v1/trade/positions", {"status": "open", "limit": 50}, "/v1/trade/positions?limit=50&status=open"),
    ("/v1/trade/orders/0x%C2%A9", {"z": 1}, "/v1/trade/orders/0x©?z=1"),
    ("/", None, "/"),
    ("/x", {"a": None, "b": 1}, "/x?b=1"),
    ("/x", {"f": True}, "/x?f=true"),
]
fail = 0
for path, q, want in VECTORS:
    got = canonical_path(path, q)
    ok = got == want
    fail += 0 if ok else 1
    print(("PASS " if ok else "FAIL ") + repr(got) + ("" if ok else "  want " + repr(want)))

h = sign_headers("pk", "s3cr3t", "GET", "/trader-analytics/leaderboard", {"window": "30d"}, timestamp_ms=1714838400123)
print("SIG", h["X-BRAVADO-SIGNATURE"])
sys.exit(1 if fail else 0)
