The produced function must:

1. sort query entries by key (byte order), so the example yields
   `/trader-analytics/traders/0xABC/positions?limit=50&status=open`
2. drop entries whose value is null or undefined
3. percent-encode against the RFC 3986 unreserved set (A-Z a-z 0-9 - _ . ~)
   with uppercase hex, encoding a space as %20 and never as +
4. strip a trailing slash unless the path is exactly "/"

Fails if it uses a stock query-string serializer that leaves order unsorted or
encodes spaces as `+`.
