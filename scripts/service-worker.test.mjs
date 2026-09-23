import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const handlers = new Map();
const cachedNames = new Set(['pricereport-shell-v49', 'bauman-offline-v1', 'other-app-assets']);
const cachedResponse = new Response('current application');
const unrelatedResponse = new Response('unrelated application');
const appCache = { match: async () => cachedResponse };
let activeCache;
let claimed = false;
vm.runInNewContext(source + '\nactiveCache = CACHE;', {
  set activeCache(value) { activeCache = value; cachedNames.add(value); },
  self: {
    addEventListener: (name, handler) => handlers.set(name, handler),
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
});
let activation;
handlers.get('activate')({ waitUntil: promise => { activation = promise; } });
await activation;
assert.equal(cachedNames.has('pricereport-shell-v49'), false, 'old PriceReport cache should be removed');
assert.equal(cachedNames.has(activeCache), true, 'current PriceReport cache should survive');
assert.equal(cachedNames.has('bauman-offline-v1'), true, 'other applications on the same origin must keep offline data');
assert.equal(cachedNames.has('other-app-assets'), true);
assert.equal(claimed, true);
for (const mode of ['navigate', 'cors']) {
  let response;
  handlers.get('fetch')({
    request: { method: 'GET', mode },
    respondWith: promise => { response = promise; },
  });
  assert.equal(await response, cachedResponse, `${mode} must read this application cache only`);
}
console.log('SERVICE WORKER CACHE OWNERSHIP PASS');
