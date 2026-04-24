// Service Worker for Philosophische Übersetzungswerkstatt
// Cache-first for assets, network-first for API calls and manifests

const CACHE_NAME = 'werkstatt-v62';

const PRECACHE_URLS = [
  'index.html',
  'manifest.json',
  'manifest-1.json',
  'manifest-2.json',
  'manifest-3.json',
  'manifest-4.json',
  'manifest-5.json',
  'German%20Icon%20I.jpeg',
  'German%20Icon%20II.jpeg',
  'German%20Icon%20III.jpeg',
  'German%20Icon%20IV.jpeg',
  'German%20Icon%20V.jpeg',
  'apple-touch-icon-1.png',
  'apple-touch-icon-2.png',
  'apple-touch-icon-3.png',
  'apple-touch-icon-4.png',
  'apple-touch-icon-5.png',
  'icon-1-192.png',
  'icon-1-512.png',
  'icon-1-favicon.png',
  'icon-1-192-maskable.png',
  'icon-1-512-maskable.png',
  'icon-2-192.png',
  'icon-2-512.png',
  'icon-2-favicon.png',
  'icon-2-192-maskable.png',
  'icon-2-512-maskable.png',
  'icon-3-192.png',
  'icon-3-512.png',
  'icon-3-favicon.png',
  'icon-3-192-maskable.png',
  'icon-3-512-maskable.png',
  'icon-4-192.png',
  'icon-4-512.png',
  'icon-4-favicon.png',
  'icon-4-192-maskable.png',
  'icon-4-512-maskable.png',
  'icon-5-192.png',
  'icon-5-512.png',
  'icon-5-favicon.png',
  'icon-5-192-maskable.png',
  'icon-5-512-maskable.png'
];

// Returns true for LLM inference endpoints whose response bodies must not be cached.
// Excludes /v1/audio/speech (OpenAI TTS) — load-bearing for offline second-listen.
function isLlmNonAudio(url) {
  if (url.hostname === 'api.anthropic.com') return true;
  if (url.hostname === 'generativelanguage.googleapis.com') return true;
  if (url.hostname === 'api.openai.com' && !url.pathname.startsWith('/v1/audio/speech')) return true;
  return false;
}

// Install: precache core assets and immediately take control
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for API calls and manifests
  if (url.pathname.endsWith('manifest.json') ||
      url.hostname !== location.hostname ||
      event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok && !isLlmNonAudio(url)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Message handler: SKIP_WAITING activates a waiting SW.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
