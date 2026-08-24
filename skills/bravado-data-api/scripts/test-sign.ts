import { canonicalPath, signHeaders } from "./sign.ts";
const V: [string, Record<string, unknown>, string][] = [
  ["/v1/trade/account", {}, "/v1/trade/account"],
  ["/v1/trade/account/", {}, "/v1/trade/account"],
  ["/v1/trade/orders/open", { token_id: 42 }, "/v1/trade/orders/open?token_id=42"],
  ["/v1/trade/orders/open", { b: 2, a: "hello world" }, "/v1/trade/orders/open?a=hello%20world&b=2"],
  ["/v1/trade/positions", { status: "open", limit: 50 }, "/v1/trade/positions?limit=50&status=open"],
  ["/v1/trade/orders/0x%C2%A9", { z: 1 }, "/v1/trade/orders/0x©?z=1"],
  ["/", {}, "/"],
  ["/x", { a: null, b: 1 }, "/x?b=1"],
  ["/x", { f: true }, "/x?f=true"],
];
let fail = 0;
for (const [p, q, want] of V) {
  const got = canonicalPath(p, q);
  const ok = got === want;
  if (!ok) fail++;
  console.log((ok ? "PASS " : "FAIL ") + JSON.stringify(got) + (ok ? "" : "  want " + JSON.stringify(want)));
}
const h = signHeaders({ publicKey: "pk", secret: "s3cr3t", method: "GET", pathname: "/trader-analytics/leaderboard", query: { window: "30d" }, timestampMs: 1714838400123 });
console.log("SIG", h["X-BRAVADO-SIGNATURE"]);
process.exit(fail ? 1 : 0);
