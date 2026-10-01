// The scheduled half of Vault Watch — Vercel Cron hits this on the schedule
// in vercel.json (once daily — Vercel's Hobby plan only allows one cron run
// per day; a more frequent schedule needs the Pro plan. Exit windows move in
// blocks/days, not minutes, so daily is genuinely fine, not just a plan-
// forced compromise). Re-checks every registered vault's real on-chain/
// ledger state and stores the result, so status.js has something fresh to
// hand back the next time the app polls it — this is what makes Guardian's
// Vault Watch genuinely "while you're not using the app," not just "when you
// happen to open it."
//
// Protected by CRON_SECRET (Vercel's own convention: it sends
// `Authorization: Bearer $CRON_SECRET` when that env var is set on the
// project). Without it configured, this endpoint is open to anyone who finds
// the URL — harmless in the sense that it can only ever read public daemon
// data and re-run checks (never signs, never spends), but it could still be
// used to waste function invocations. Set CRON_SECRET before relying on this
// in production; logged loudly if it's missing so that's hard to miss.
//
// Also where push notifications actually fire (see _notify.js) — this is the
// one place in the app that sees both a vault's previous and newly-computed
// check result in the same request, which is exactly what "did anything
// change" requires. register.js's own immediate first check never notifies,
// correctly: there's no previous check for a brand-new registration to have
// transitioned from.

import { listRegisteredAddresses, getVaultRecord, saveCheckResult, removePushSubscription } from "./_store.js";
import { checkVault } from "./_check.js";
import { notifyIfTransitioned } from "./_notify.js";

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
  } else {
    console.warn("guardian/check: CRON_SECRET is not set — this endpoint is currently unauthenticated.");
  }

  try {
    const addresses = await listRegisteredAddresses();
    // Sequential, not Promise.all: checkVault calls Bitcoin Core's
    // scantxoutset, which only allows one scan at a time on the whole node —
    // confirmed live (see AppStateContext's refreshAllVaultState comment).
    // Checking every vault concurrently here would just make us race
    // ourselves for that same lock as the list of registered vaults grows.
    const results = [];
    for (const address of addresses) {
      const record = await getVaultRecord(address);
      if (!record) {
        results.push({ address, ok: false, error: "record missing" });
        continue;
      }
      try {
        const result = await checkVault({ address, csvBlocks: record.csvBlocks, network: record.network });
        await saveCheckResult(address, result);
        // Compares against the check this loop just fetched (record.lastCheck),
        // not the one it just wrote — that's the entire "did anything really
        // change" signal a push notification depends on.
        const { sent, staleEndpoints } = await notifyIfTransitioned(record.lastCheck, result, record.pushSubscriptions);
        for (const endpoint of staleEndpoints) await removePushSubscription(address, endpoint);
        results.push({ address, ok: true, notified: sent, ...result });
      } catch (err) {
        results.push({ address, ok: false, error: err.message });
      }
    }
    res.status(200).json({ checked: results.length, results });
  } catch (err) {
    res.status(502).json({ error: "check run failed", message: err.message });
  }
}
