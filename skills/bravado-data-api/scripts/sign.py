"""
Bravado Data API request signing (HMAC-SHA256).
Python 3.9+, stdlib only. Copy into your project.

    client = Bravado(public_key, secret)
    top = client.get("/trader-analytics/leaderboard", {"window": "30d", "limit": 25})
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.parse
import urllib.request

EMPTY_BODY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
UNRESERVED = "-_.~"


def _encode(value: str) -> str:
    """RFC 3986 unreserved set; everything else %XX uppercase (quote() already uppercases)."""
    return urllib.parse.quote(value, safe=UNRESERVED)


def canonical_path(pathname: str, query: dict | None = None) -> str:
    path = urllib.parse.unquote(pathname)
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]

    items = [
        (str(k), str(v).lower() if isinstance(v, bool) else str(v))
        for k, v in (query or {}).items()
        if v is not None
    ]
    if not items:
        return path

    # Byte order, not codepoint order.
    items.sort(key=lambda kv: (kv[0].encode("utf-8"), kv[1].encode("utf-8")))
    qs = "&".join(f"{_encode(k)}={_encode(v)}" for k, v in items)
    return f"{path}?{qs}"


def sign_headers(
    public_key: str,
    secret: str,
    method: str,
    pathname: str,
    query: dict | None = None,
    raw_body: bytes | None = None,
    timestamp_ms: int | None = None,
) -> dict:
    timestamp = str(timestamp_ms if timestamp_ms is not None else int(time.time() * 1000))
    path = canonical_path(pathname, query)
    body_hash = (
        EMPTY_BODY_SHA256 if not raw_body else hashlib.sha256(raw_body).hexdigest()
    )

    payload = "\n".join([timestamp, method.upper(), path, body_hash])
    signature = hmac.new(
        secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    return {
        "X-BRAVADO-API-KEY": public_key,
        "X-BRAVADO-TIMESTAMP": timestamp,
        "X-BRAVADO-SIGNATURE": signature,
    }


class Bravado:
    def __init__(self, public_key: str, secret: str, host: str = "https://api.bravado.io"):
        self.public_key = public_key
        self.secret = secret
        self.host = host

    def get(self, pathname: str, query: dict | None = None):
        headers = sign_headers(self.public_key, self.secret, "GET", pathname, query)
        # Canonical form is for SIGNING only. The wire URL keeps the original
        # pathname (the server decodes it once) plus the canonical querystring.
        canonical = canonical_path(pathname, query)
        qs = canonical[canonical.index("?"):] if "?" in canonical else ""
        req = urllib.request.Request(self.host + pathname + qs, headers=headers)
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read())
