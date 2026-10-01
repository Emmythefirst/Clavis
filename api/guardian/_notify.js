// Real push notifications for Vault Watch's most urgent signals — the
// delivery half the design review flagged as deliberately deferred (see
// PROGRESS.md's "Vault Watch alert delivery" note). Standard Web Push, no
// third-party SDK or paid service: the browser's own push service (Chrome,
// Firefox, Safari all operate their own) delivers the message once we sign
// it with our VAPID keypair.
//
// VAPID_PUBLIC_KEY is not secret by design — it's handed to every browser's
// push service as part of every subscription, so committing it here is the
// same as committing a vault address. VAPID_PRIVATE_KEY is the one secret,
// and lives only in the VAPID_PRIVATE_KEY Vercel env var (see README).
// Missing it disables push sending the same way a missing Upstash credential
// disables persistence: the feature degrades, the app doesn't.

import webpush from "web-push";

export const VAPID_PUBLIC_KEY = "BG3iRPGVyW0PqOQrtVT4vURTuCnLOpTtcfZoXNyl17J5_IA9hZKac4LTWSZ5trZNnO57Bs-M-x-ZZRMX4QYaInA";
const VAPID_SUBJECT = "https://clavis-wallet.vercel.app";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  if (!process.env.VAPID_PRIVATE_KEY) {
    console.warn("guardian: VAPID_PRIVATE_KEY is not set — push notifications are disabled until it is.");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

// Which real transition (if any) between the previous and current check is
// worth interrupting someone for. Ordered most to least urgent — fires at
// most one notification per check, not one per signal that happens to have
// changed, and never fires on a routine re-confirmation of an already-known
// state (oldCheck undefined, e.g. a vault's very first check, can't be a
// transition from anything — correctly produces no alert).
function describeTransition(oldCheck, newCheck) {
  if (newCheck.breachDetected && !oldCheck?.breachDetected) {
    return {
      title: "Clavis: watchtower flagged a spend",
      body: "Tachi's watchtower detected a spend of your vault's funding outpoint. Open Clavis to review.",
    };
  }
  if (!newCheck.settled && (oldCheck?.settled ?? true)) {
    return {
      title: "Clavis: vault balance diverged",
      body: "Your vault's on-chain and spendable balances no longer match. A full exit isn't safe right now.",
    };
  }
  if (newCheck.exitReady && !oldCheck?.exitReady) {
    return {
      title: "Clavis: exit timelock matured",
      body: "Your vault's timelock has cleared — you can withdraw to mainnet unilaterally, any time.",
    };
  }
  return null;
}

// Sends to every subscription stored on this vault's record (one per
// device/browser that opted in). Best-effort and per-subscription: a dead
// endpoint (410/404 — the browser unsubscribed, or the subscription expired)
// is reported back for the caller to prune, never retried, and never blocks
// another subscriber's real notification from going out.
export async function notifyIfTransitioned(oldCheck, newCheck, subscriptions) {
  if (!subscriptions?.length) return { sent: 0, staleEndpoints: [] };
  if (!ensureConfigured()) return { sent: 0, staleEndpoints: [] };
  const alert = describeTransition(oldCheck, newCheck);
  if (!alert) return { sent: 0, staleEndpoints: [] };

  const payload = JSON.stringify(alert);
  let sent = 0;
  const staleEndpoints = [];
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) staleEndpoints.push(subscription.endpoint);
      else console.warn("guardian: push send failed:", err.message);
    }
  }
  return { sent, staleEndpoints };
}
