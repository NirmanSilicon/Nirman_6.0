// SmartPPE — Warden's Eye: Service Worker for Web Push Notifications & Offline Asset Caching
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: "SmartPPE — Warden's Eye Safety Alert",
    body: 'New workplace safety incident requires review.',
  };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (_e) {
    // Fallback to default notification payload
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Warden's Eye Alert", {
      body: payload.body || 'Safety event detected.',
      tag: payload.incidentId || 'smartppe-alert',
      renotify: true,
      data: payload,
    })
  );
});
