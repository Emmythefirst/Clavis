// Returns Vault Watch's last computed status for one vault — what the app
// polls to show real always-on monitoring results. Pure read, no side
// effects; the actual checking happens in register.js (immediate first
// check) and check.js (the hourly cron).

import { getVaultRecord } from "./_store.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const address = typeof req.query.address === "string" ? req.query.address : "";
  if (!address) {
    res.status(400).json({ error: "?address= is required" });
    return;
  }

  try {
    const record = await getVaultRecord(address);
    if (!record) {
      res.status(404).json({ error: "vault not registered" });
      return;
    }
    res.status(200).json(record);
  } catch (err) {
    res.status(502).json({ error: "status lookup failed", message: err.message });
  }
}
