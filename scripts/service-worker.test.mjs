import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const handlers = new Map();
const cachedNames = new Set(['pricereport-shell-v49', 'bauman-offline-v1', 'other-app-assets']);
const cachedResponse = new Response('current application');
const unrelatedResponse = new Response('unrelated application');
const appCache = {
  match: async () => cachedResponse,
  put: async () => {},
  addAll: async () => {},
};
let activeCache;
let claimed = false;
let skipped = false;
vm.runInNewContext(source + '\nactiveCache = CACHE;', {
  set activeCache(value) { activeCache = value; cachedNames.add(value); },
  self: {
    location: { href: 'https://example.test/app/', origin: 'https://example.test' },
    addEventListener: (name, handler) => handlers.set(name, handler),
    skipWaiting: async () => { skipped = true; },
    clients: { claim: async () => { claimed = true; } },
  },
  caches: {
    keys: async () => [...cachedNames],
    delete: async name => cachedNames.delete(name),
    open: async name => {
      assert.equal(name, activeCache, 'fetch must use the active application cache');
      return appCache;
    },
    match: async () => unrelatedResponse,
  },
  fetch: async () => { throw new Error('offline'); },
  Response,
  URL,
});

let install;
handlers.get('install')({ waitUntil: promise => { install = promise; } });
await install;
assert.equal(skipped, true, 'install must await skipWaiting');
assert.equal(activeCache, 'pricereport-shell-v68-flow-navigator', 'V6.8 flow-navigator release must rotate the application shell cache');

let activation;
handlers.get('activate')({ waitUntil: promise => { activation = promise; } });
await activation;
assert.equal(cachedNames.has('pricereport-shell-v49'), false, 'old PriceReport cache should be removed');
assert.equal(cachedNames.has(activeCache), true, 'current PriceReport cache should survive');
assert.equal(cachedNames.has('bauman-offline-v1'), true, 'other applications on the same origin must keep offline data');
assert.equal(cachedNames.has('other-app-assets'), true);
assert.equal(claimed, true, 'activation must await client claim');

let navigationResponse;
handlers.get('fetch')({
  request: { method: 'GET', mode: 'navigate' },
  respondWith: promise => { navigationResponse = promise; },
  waitUntil: () => {},
});
assert.equal(await navigationResponse, cachedResponse, 'navigation fallback must read this application cache only');

let assetResponse;
let backgroundRefresh;
handlers.get('fetch')({
  request: { method: 'GET', mode: 'cors' },
  respondWith: promise => { assetResponse = promise; },
  waitUntil: promise => { backgroundRefresh = promise; },
});
assert.equal(await assetResponse, cachedResponse, 'cached assets must read this application cache only');
assert.ok(backgroundRefresh, 'cached assets must attach revalidation to event.waitUntil');
await backgroundRefresh;

assert.match(source, /event\.waitUntil\(network\.then\(\(\) => undefined\)\)/, 'stale-while-revalidate lifetime guard is missing');
assert.match(source, /if \(cacheable\) await cache\.put\(event\.request, response\.clone\(\)\)/, 'background refresh must await cache write');
assert.match(source, /event\.waitUntil\(caches\.open\(CACHE\)\.then\(cache => cache\.put\('\.\/index\.html', copy\)\)\)/, 'navigation cache write must stay alive');

console.log('SERVICE WORKER CACHE OWNERSHIP/LIFETIME PASS');
