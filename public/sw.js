const CACHE = 'pricereport-shell-v16';
const CORE = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-512.svg'
];

async function precacheLinkedAssets() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  const indexResponse = await cache.match('./index.html');
  if (!indexResponse) return;

  const html = await indexResponse.clone().text();
  const refs = [...html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)].map(match => match[1]);
  const urls = [...new Set(refs.map(ref => {
    try {
      return new URL(ref, self.location.href);
    } catch {
      return null;
    }
  }).filter(url => url && url.origin === self.location.origin).map(url => url.href))];

  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) await cache.put(url, response.clone());
    } catch {
      // CORE remains available even if one optional linked asset cannot be fetched.
    }
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(precacheLinkedAssets());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached || Response.error());

      return cached || network;
    })
  );
});
