/* eslint-disable no-restricted-globals */
/**
 * JanmaSaathi Scoped Web Push Service Worker (/firebase-cloud-messaging-push-scope)
 * Isolated from Workbox offline caching (/sw.js) so offline sync and asset caching remain intact.
 * Enforces strictly generic, non-PII notification copy on background push delivery.
 */

const GENERIC_ALERT_TITLE = 'JanmaSaathi Maternal Alert';
const GENERIC_ALERT_BODY = 'New maternal health alert requires attention.';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json() || {};
  } catch {
    payload = {};
  }

  const data = payload.data || {};
  const notification = payload.notification || {};

  const alertId = typeof data.alertId === 'string' && data.alertId.trim() ? data.alertId.trim() : '';
  const eventType = typeof data.eventType === 'string' ? data.eventType : 'alert_created';
  const urgency = typeof data.urgency === 'string' ? data.urgency : 'urgent';
  const targetRoute =
    typeof data.targetRoute === 'string' && data.targetRoute.startsWith('/')
      ? data.targetRoute
      : alertId
      ? `/?alertId=${encodeURIComponent(alertId)}`
      : '/';

  // Strictly privacy-safe generic notification copy (no patient name, vitals, or symptoms)
  const title =
    typeof notification.title === 'string' && notification.title.trim()
      ? notification.title.trim()
      : eventType === 'escalated'
      ? 'JanmaSaathi Alert Escalated'
      : eventType === 'status_updated' || eventType === 'resolved'
      ? 'JanmaSaathi Alert Update'
      : GENERIC_ALERT_TITLE;

  const body =
    typeof notification.body === 'string' && notification.body.trim()
      ? notification.body.trim()
      : eventType === 'escalated'
      ? 'A maternal alert has been escalated for urgent hospital review.'
      : eventType === 'status_updated' || eventType === 'resolved'
      ? 'Maternal emergency alert status updated.'
      : GENERIC_ALERT_BODY;

  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: alertId || `janmasaathi-${eventType}`,
    renotify: true,
    requireInteraction: urgency === 'critical' || eventType === 'escalated',
    vibrate: urgency === 'critical' ? [250, 100, 250, 100, 250] : [200, 100, 200],
    data: {
      alertId,
      eventType,
      urgency,
      targetRoute,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl =
    typeof data.targetRoute === 'string' && data.targetRoute.startsWith('/')
      ? data.targetRoute
      : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'JANMASAATHI_NOTIFICATION_CLICK',
            alertId: data.alertId || null,
            targetRoute: targetUrl,
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
