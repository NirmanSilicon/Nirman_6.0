import { registerSW } from 'virtual:pwa-register';

/**
 * Initializes and registers the JanmaSaathi Service Worker
 * for offline app shell caching and Android PWA installability.
 */
export function initPWA() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    // Keep dev preview free of stale Workbox Service Worker caches (preserve scoped push SW)
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations
            .filter((reg) => {
              const scriptUrl =
                reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
              return !scriptUrl.includes('firebase-messaging-sw.js');
            })
            .map((reg) => reg.unregister())
        )
      )
      .catch(() => {});

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith('workbox-') || k.startsWith('janmasaathi-'))
              .map((k) => caches.delete(k))
          )
        )
        .catch(() => {});
    }
    return;
  }

  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[JanmaSaathi PWA] New version available. Updating app shell...');
        updateSW(true);
      },
      onOfflineReady() {
        console.log('[JanmaSaathi PWA] Application shell cached. Ready for offline use.');
      },
      onRegisterError(error) {
        console.warn('[JanmaSaathi PWA] Service Worker registration warning:', error);
      },
    });
  } catch (err) {
    console.warn('[JanmaSaathi PWA] Unable to initialize service worker:', err);
  }
}
