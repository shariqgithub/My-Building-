// Building Sub-Meter Electricity Tracker - PWA Service Worker
const CACHE_NAME = 'submeter-pwa-v3';

function getScopePath(relativePath) {
  return new URL(relativePath, self.registration.scope).pathname;
}

const OFFLINE_PATH = getScopePath('offline.html');

const PRECACHE_ASSETS = [
  getScopePath('./'),
  getScopePath('index.html'),
  OFFLINE_PATH,
  getScopePath('manifest.json'),
  getScopePath('manifest.webmanifest'),
  getScopePath('icon.svg'),
  getScopePath('apple-touch-icon.png'),
  getScopePath('pwa-192x192.png'),
  getScopePath('pwa-512x512.png'),
  getScopePath('pwa-maskable-512x512.png'),
  getScopePath('screenshot-mobile.png'),
  getScopePath('screenshot-mobile-2.png'),
  getScopePath('screenshot-desktop.png'),
  getScopePath('screenshot-desktop-2.png')
];

// Handle skipWaiting message from PWA builders / update prompts
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// 1. Install Event - Precache critical shell assets & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('PWA precache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean up stale caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event - Network-first for dynamic navigation, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Bypass Firebase API and auth endpoints
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // Navigation requests (HTML pages) -> Network-first with cache fallback and offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          const cachedRoot = await caches.match(getScopePath('./'));
          if (cachedRoot) return cachedRoot;
          const cachedOffline = await caches.match(OFFLINE_PATH);
          if (cachedOffline) return cachedOffline;
          return new Response('Network error and no cached content available.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        })
    );
    return;
  }

  // Static assets (scripts, styles, images, fonts) -> Stale-while-revalidate or Cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
