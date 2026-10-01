// Registers (POST) or removes (DELETE) one browser's push subscription for
// a vault already registered with Vault Watch. Only ever receives the
// subscription object the browser's own PushManager generated (an endpoint
// URL plus the two public encryption keys it embeds) — never a key, never a
// mnemonic. The actual sending happens later, from check.js's cron run; this
// route only ever stores or removes where to send.

import { addPushSubscription, removePushSubscription } from "./_store.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "POST") {
    const { address, subscription } = req.body ?? {};
    if (typeof address !== "string" || !address) {
      res.status(400).json({ error: "address is required" });
      return;
    }
    if (!subscription?.endpoint || typeof subscription.endpoint !== "string") {
      res.status(400).json({ error: "subscription (a real PushSubscription.toJSON()) is required" });
      return;
    }
    try {
      await addPushSubscription(address, subscription);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(err.message === "vault not registered for Vault Watch" ? 404 : 502).json({ error: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    const { address, endpoint } = req.body ?? {};
    if (typeof address !== "string" || !address || typeof endpoint !== "string" || !endpoint) {
      res.status(400).json({ error: "address and endpoint are required" });
      return;
    }
    await removePushSubscription(address, endpoint);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}
