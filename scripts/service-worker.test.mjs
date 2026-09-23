import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const handlers = new Map();
const cachedNames = new Set(['pricereport-shell-v49', 'bauman-offline-v1', 'other-app-assets']);
const cachedResponse = new Response('current application');
const unrelatedResponse = new Response('unrelated application');
const cacheWrites = [];
const appCache = {
  match: async () => cachedResponse,
  put: async (request, response) => {
    cacheWrites.push({ request, response });
  },
  addAll: async () => {},
};
let activeCache;
let claimed = false;
let skipped = false;
let fetchImpl = async () => { throw new Error('offline'); };
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
  fetch: (...args) => fetchImpl(...args),
  Response,
  URL,
});

let install;
handlers.get('install')({ waitUntil: promise => { install = promise; } });
await install;
assert.equal(skipped, true, 'install must await skipWaiting');

let activation;
handlers.get('activate')({ waitUntil: promise => { activation = promise; } });
await activation;
assert.equal(cachedNames.has('pricereport-shell-v49'), false, 'old PriceReport cache should be removed');
assert.equal(cachedNames.has(activeCache), true, 'current PriceReport cache should survive');
assert.equal(cachedNames.has('bauman-offline-v1'), true, 'other applications on the same origin must keep offline data');
assert.equal(cachedNames.has('other-app-assets'), true);
assert.equal(claimed, true, 'activation must await client claim');

for (const mode of ['navigate', 'cors']) {
  let response;
  handlers.get('fetch')({
    request: { method: 'GET', mode },
    respondWith: promise => { response = promise; },
    waitUntil: () => {},
  });
  assert.equal(await response, cachedResponse, `${mode} must read this application cache only`);
}

fetchImpl = async () => new Response('fresh application', { status: 200 });
let staleResponse;
let backgroundRefresh;
handlers.get('fetch')({
  request: { method: 'GET', mode: 'cors', url: 'https://example.test/app/asset.js' },
  respondWith: promise => { staleResponse = promise; },
  waitUntil: promise => { backgroundRefresh = promise; },
});
assert.equal(await staleResponse, cachedResponse, 'cached assets should respond immediately');
assert.ok(backgroundRefresh, 'cached responses must keep background revalidation alive');
await backgroundRefresh;
assert.ok(cacheWrites.length > 0, 'background revalidation must refresh the active cache');

let navigationResponse;
let navigationWrite;
handlers.get('fetch')({
  request: { method: 'GET', mode: 'navigate', url: 'https://example.test/app/' },
  respondWith: promise => { navigationResponse = promise; },
  waitUntil: promise => { navigationWrite = promise; },
});
assert.equal(await (await navigationResponse).text(), 'fresh application');
assert.ok(navigationWrite, 'successful navigation must keep index cache write alive');
await navigationWrite;
assert.equal(cacheWrites.at(-1)?.request, './index.html');

console.log('SERVICE WORKER CACHE OWNERSHIP/LIFETIME PASS');
