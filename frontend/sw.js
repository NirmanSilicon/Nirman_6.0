// SmartPPE — Warden's Eye: Service Worker for Web Push Notifications & Click Navigation
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
  } catch (_e) {}

  event.waitUntil(
    self.registration.showNotification(payload.title || "Warden's Eye Alert", {
      body: payload.body || 'Safety event detected.',
      tag: payload.incidentId || 'smartppe-alert',
      renotify: true,
      data: payload,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate('/#notifications');
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/#notifications');
      }
      return null;
    })
  );
});
