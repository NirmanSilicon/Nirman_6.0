/* eslint-disable no-undef */
/**
 * JanmaSaathi Hospital Dashboard — Minimal FCM Background Notification Service Worker.
 *
 * Strictly limited to Firebase Cloud Messaging Web Push delivery.
 * No PWA manifest, no Add-to-Home-Screen prompts, and no offline caching / fetch interception.
 */

importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyApivsKXxGwZXbQxjvaVleKONQYz2ExiBY',
  authDomain: 'outr-janmasaathi.firebaseapp.com',
  projectId: 'outr-janmasaathi',
  storageBucket: 'outr-janmasaathi.firebasestorage.app',
  messagingSenderId: '12503123299',
  appId: '1:12503123299:web:1ec9775245e417f1d2ff56',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

/**
 * Receives background FCM messages from the trusted notification backend.
 * Privacy guarantee: never renders patient names, medical history, or symptoms
 * in OS-level system notifications — displays generic text and alert routing metadata only.
 */
messaging.onBackgroundMessage((payload) => {
  const data = (payload && payload.data) || {};
  const alertId = typeof data.alertId === 'string' ? data.alertId.trim() : '';
  const rawPriority = String(data.priority || '').toLowerCase();

  const title = rawPriority.includes('critical')
    ? 'Critical Maternal Alert — JanmaSaathi'
    : 'JanmaSaathi Emergency Alert';

  const body = 'New maternal health alert requires attention.';
  const tag = alertId ? `janmasaathi-alert-${alertId}` : 'janmasaathi-alert-general';
  const targetUrl = alertId ? `/?alertId=${encodeURIComponent(alertId)}` : '/';

  return self.registration.showNotification(title, {
    body,
    icon: '/assets/aistudio/JanmaSaathi_593643c1.png',
    badge: '/assets/aistudio/JanmaSaathi_593643c1.png',
    tag,
    renotify: false,
    requireInteraction: rawPriority.includes('critical'),
    data: {
      alertId,
      url: targetUrl,
    },
  });
});

/**
 * Opens or focuses the Hospital Dashboard directly on the referenced alert when clicked.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = (event.notification && event.notification.data) || {};
  const alertId = typeof data.alertId === 'string' ? data.alertId : '';
  const targetUrl = typeof data.url === 'string' && data.url ? data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'JANMASAATHI_OPEN_ALERT',
            alertId,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
