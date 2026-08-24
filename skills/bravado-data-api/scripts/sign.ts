/**
 * Bravado Data API request signing (HMAC-SHA256).
 * Node 18+, no dependencies. Copy into your project.
 *
 * const client = bravado({ publicKey, secret });
 * const top = await client.get("/trader-analytics/leaderboard", { window: "30d", limit: 25 });
 */
import { createHash, createHmac } from "node:crypto";

const EMPTY_BODY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/** RFC 3986 unreserved set: A-Z a-z 0-9 - _ . ~ ; everything else %XX uppercase. */
function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/** Byte-order comparison. JS string compare is UTF-16 and diverges from UTF-8 above the BMP. */
function compareUtf8(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export function canonicalPath(
  pathname: string,
  query: Record<string, unknown> = {},
): string {
  let path = decodeURIComponent(pathname);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  const entries = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => [k, String(v)] as [string, string]);

  if (entries.length === 0) return path;

  entries.sort((a, b) => compareUtf8(a[0], b[0]) || compareUtf8(a[1], b[1]));

  const qs = entries
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join("&");
  return `${path}?${qs}`;
}

export function signHeaders(opts: {
  publicKey: string;
  secret: string;
  method: string;
  pathname: string;
  query?: Record<string, unknown>;
  rawBody?: Buffer | string;
  timestampMs?: number;
}): Record<string, string> {
  const timestamp = String(opts.timestampMs ?? Date.now());
  const method = opts.method.toUpperCase();
  const path = canonicalPath(opts.pathname, opts.query ?? {});

  const bodyHash =
    opts.rawBody === undefined || opts.rawBody === ""
      ? EMPTY_BODY_SHA256
      : createHash("sha256").update(opts.rawBody).digest("hex");

  const payload = [timestamp, method, path, bodyHash].join("\n");
  const signature = createHmac("sha256", opts.secret)
    .update(payload)
    .digest("hex");

  return {
    "X-BRAVADO-API-KEY": opts.publicKey,
    "X-BRAVADO-TIMESTAMP": timestamp,
    "X-BRAVADO-SIGNATURE": signature,
  };
}

export function bravado(config: {
  publicKey: string;
  secret: string;
  host?: string;
}) {
  const host = config.host ?? "https://api.bravado.io";

  return {
    async get<T = unknown>(
      pathname: string,
      query: Record<string, unknown> = {},
    ): Promise<T> {
      const headers = signHeaders({
        publicKey: config.publicKey,
        secret: config.secret,
        method: "GET",
        pathname,
        query,
      });

      // The canonical form is for SIGNING. The wire URL keeps the original
      // pathname (the server decodes it once) plus the canonical querystring,
      // so what the server re-derives matches what we signed.
      const canonical = canonicalPath(pathname, query);
      const qs = canonical.includes("?") ? canonical.slice(canonical.indexOf("?")) : "";
      const res = await fetch(host + pathname + qs, { headers });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`bravado ${res.status}: ${body}`);
      }
      return (await res.json()) as T;
    },
  };
}
