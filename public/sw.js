const CACHE_NAME = 'night-modes-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Check for scheduled notifications
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { time } = event.data;
    scheduleNotification(time);
  }
});

function scheduleNotification(scheduledTime) {
  const now = Date.now();
  const delay = new Date(scheduledTime).getTime() - now;

  if (delay > 0) {
    setTimeout(() => {
      self.registration.showNotification('Night Modes', {
        body: "Choose tonight's mode.",
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        tag: 'mode-reminder',
        requireInteraction: true
      });
    }, delay);
  }
}

// Check on startup
self.addEventListener('activate', () => {
  const nextNotification = self.registration.scope + 'night-modes-next-notification';
});
