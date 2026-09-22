import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('src/main.js', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');

function fail(message) {
  console.error('SMOKE FAIL:', message);
  process.exitCode = 1;
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupIds.length) fail('Duplicate ids: ' + [...new Set(dupIds)].join(', '));

const requiredIds = [
  'paper','paperWrap','productEditor','qHead','qBody','summary',
  'companyName','customerName','addProduct','exportJson','importJson',
  'exportAllData','importAllData','quoteStatus','quoteStatusFilter',
  'designPanel','paymentPrint','pSlogan','pageEstimate',
  'customerLibraryList','productCatalogList','saveCurrentCustomer','saveCurrentProducts'
];
for (const id of requiredIds) {
  if (!ids.includes(id)) fail('Missing required id #' + id);
}

const binds = [...html.matchAll(/data-bind="([^"]+)"/g)].map(m => m[1]);
for (const key of new Set(binds)) {
  if (!js.includes(key + ':')) fail('data-bind key is missing from defaults/state schema: ' + key);
}

const targets = [...html.matchAll(/data-target="([^"]+)"/g)].map(m => m[1]);
for (const target of new Set(targets)) {
  if (!ids.includes(target)) fail('Preview data-target points to missing editor field: #' + target);
}

for (const file of ['public/manifest.webmanifest','public/sw.js','src/styles.css','src/main.js']) {
  if (!fs.existsSync(file)) fail('Missing required file: ' + file);
}

if (!js.includes("serviceWorker.register('./sw.js')")) fail('Service worker registration is missing');
if (!js.includes('window.print()')) fail('Print/PDF action is missing');
if (!js.includes('schemaVersion: 3')) fail('Full backup schema v3 is missing');
if (!js.includes('generateUniqueQuoteNo')) fail('Unique quote number generator is missing');
if (!js.includes('STATUS_LABELS')) fail('Quote lifecycle status mapping is missing');
if (!js.includes('updatePageEstimate')) fail('A4 page estimation logic is missing');
if (!js.includes('getCustomerLibrary')) fail('Customer master-data library is missing');
if (!js.includes('getProductCatalog')) fail('Product catalog is missing');
if (!js.includes('function safeStore')) fail('Safe local-storage wrapper is missing');
if (!js.includes('file.size > 1500000')) fail('Logo storage guard is missing');
if (!sw.includes("pricereport-shell-v5")) fail('Service-worker cache version was not upgraded');
if (!sw.includes("event.request.mode === 'navigate'")) fail('Navigation network-first strategy is missing');

if (!process.exitCode) {
  console.log('SMOKE PASS:', ids.length, 'ids,', new Set(binds).size, 'bindings,', new Set(targets).size, 'preview targets');
}
