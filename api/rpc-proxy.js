// Thin, watch-only forwarder for Tachi's hosted POST endpoints. Exists
// purely to work around a CORS gap on Tachi's side: their GET /tachi_*
// routes send Access-Control-Allow-Origin, but POST routes don't answer
// their preflight with one, so a browser blocks them directly. Covers two
// distinct POST routes so far — the raw Bitcoin JSON-RPC proxy (POST /,
// used by depositToVault's internal RPC calls) and /tachi_txBroadcastSync
// (used by broadcastTachiTx for ledger registration/transfers) — via an
// optional ?path= query param, default "/". This function does nothing but
// relay the already-signed/raw request body to Tachi and hand back the
// response — it never sees a private key, never signs anything, and holds
// no state. All signing happens client-side before a request ever reaches
// this route. See PROGRESS.md (2026-08-15) for the CORS investigation.

const UPSTREAM_BY_NETWORK = {
  signet: "https://rpc-signet.tachibtc.com/",
  regtest: "https://rpc-regtest.tachibtc.com/",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const network = typeof req.query.network === "string" ? req.query.network : "";
  const upstream = UPSTREAM_BY_NETWORK[network];
  if (!upstream) {
    res.status(400).json({ error: "unknown or missing ?network= (expected 'signet' or 'regtest')" });
    return;
  }

  const path = typeof req.query.path === "string" && req.query.path ? req.query.path : "/";
  const target = new URL(path, upstream).toString();

  try {
    const upstreamRes = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const text = await upstreamRes.text();
    res.status(upstreamRes.status);
    res.setHeader("Content-Type", upstreamRes.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: "upstream request failed", message: err.message });
  }
}
