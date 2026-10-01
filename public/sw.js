// Minimal service worker for Vault Watch's real push notifications — no
// caching or offline strategy here, this exists purely to receive `push`
// events (sent via api/guardian/_notify.js) and show a real OS notification,
// and to focus/open the app on click.

self.addEventListener("push", (event) => {
  let data = { title: "Clavis", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // Non-JSON payload — fall back to the default above rather than throw.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      // Replaces any still-visible Vault Watch notification instead of
      // stacking a new one on top of it.
      tag: "clavis-vault-watch",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/app/guardian");
    })
  );
});
