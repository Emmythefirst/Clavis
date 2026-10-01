// Client side of Vault Watch's real push notifications — standard Web Push,
// no third-party SDK or paid service. The browser's own push service
// (Chrome/Edge use Google's, Firefox Mozilla's, Safari Apple's) delivers the
// message once the server signs it with our VAPID keypair; see
// api/guardian/_notify.js for the sending side.
//
// VAPID_PUBLIC_KEY is non-secret by design (every subscription hands it to
// the browser's push service) and is duplicated from _notify.js's
// source-of-truth copy rather than imported — that file pulls in the
// `web-push` package (Node-only: uses Node's crypto/https directly), which
// must never end up in this browser bundle.
const VAPID_PUBLIC_KEY = "BG3iRPGVyW0PqOQrtVT4vURTuCnLOpTtcfZoXNyl17J5_IA9hZKac4LTWSZ5trZNnO57Bs-M-x-ZZRMX4QYaInA";

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

// PushManager.subscribe wants the application server key as a Uint8Array;
// the key itself is handed out base64url-encoded.
function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Null means "not currently subscribed" (never asked, permission denied, or
// unsubscribed elsewhere) — callers should treat that as the toggle's off
// state, not as an error.
export async function getExistingPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications(address) {
  const registration = await navigator.serviceWorker.register("/sw.js");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(permission === "denied" ? "Notification permission was denied." : "Notification permission wasn't granted.");
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  const res = await fetch("/api/guardian/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, subscription: subscription.toJSON() }),
  });
  if (!res.ok) {
    // Don't leave a subscription the backend doesn't know about — it would
    // show as "on" locally while silently never receiving an alert.
    await subscription.unsubscribe();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Couldn't register this device for push notifications.");
  }
  return subscription;
}

export async function disablePushNotifications(address) {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  // The local unsubscribe is what actually stops notifications reaching this
  // device; a failed server-side cleanup just leaves a harmless stale row
  // that the next send attempt prunes on its own (see _notify.js).
  await fetch("/api/guardian/push-subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, endpoint }),
  }).catch(() => {});
}
