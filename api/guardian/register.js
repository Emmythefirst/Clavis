// Registers a vault for Vault Watch — the always-on half of Guardian (see
// PROGRESS.md's "Real Vault Watch backend" entry). Only ever receives public
// data the client already derived: the vault's own P2TR address, its output
// script, and its exit leaf's CSV block count. No mnemonic, no keys, no
// signing — this route (and everything it calls) is watch-only.
//
// Runs an immediate first check on registration rather than waiting for the
// next hourly cron tick, so the user sees real status right away instead of
// an empty "not checked yet" state for up to an hour.

import { registerVault, saveCheckResult } from "./_store.js";
import { checkVault } from "./_check.js";

// Loose but real: a signet or regtest Taproot address, bech32m, P2TR ("p")
// witness version. Rejects obvious junk without pretending to fully validate
// bech32m checksums — the daemon itself will simply return empty/zero
// results for a well-formed-but-wrong address, which is harmless.
const VAULT_ADDRESS_RE = /^(tb1p|bcrt1p)[a-z0-9]{20,90}$/;

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

  const { address, scriptPubKey, csvBlocks, network } = req.body ?? {};
  if (typeof address !== "string" || !VAULT_ADDRESS_RE.test(address)) {
    res.status(400).json({ error: "address must be a valid-looking signet/regtest Taproot address" });
    return;
  }
  if (typeof scriptPubKey !== "string" || !/^51[0-9a-f]{2}[0-9a-f]{64}$/.test(scriptPubKey)) {
    res.status(400).json({ error: "scriptPubKey must be a hex-encoded P2TR output script" });
    return;
  }
  const csv = Number(csvBlocks);
  if (!Number.isInteger(csv) || csv <= 0 || csv > 65535) {
    res.status(400).json({ error: "csvBlocks must be a positive integer" });
    return;
  }
  const net = network === "regtest" ? "regtest" : "signet";

  try {
    await registerVault(address, { scriptPubKey, csvBlocks: csv, network: net });
    const result = await checkVault({ address, csvBlocks: csv, network: net });
    const record = await saveCheckResult(address, result);
    res.status(200).json(record);
  } catch (err) {
    res.status(502).json({ error: "registration or initial check failed", message: err.message });
  }
}
