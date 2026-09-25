const CACHE = 'pricereport-shell-v65-product-entry-accelerator';
const CORE = [
  './index.html',
  './manifest.webmanifest',
  './management-contract.json',
  './device-control.json',
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
  event.waitUntil(Promise.all([precacheLinkedAssets(), self.skipWaiting()]));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key.startsWith('pricereport-shell-') && key !== CACHE).map(key => caches.delete(key)))
    ),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html', copy)));
          }
          return response;
        })
        .catch(() => caches.open(CACHE).then(cache => cache.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(cache => cache.match(event.request)).then(cached => {
      const network = fetch(event.request)
        .then(async response => {
          const cacheable = response.ok || response.type === 'opaque';
          if (cacheable) await cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached || Response.error());

      if (cached) {
        event.waitUntil(network.then(() => undefined));
        return cached;
      }
      return network;
    })
  );
});
