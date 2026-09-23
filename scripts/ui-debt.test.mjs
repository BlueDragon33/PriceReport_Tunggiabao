import fs from 'node:fs';

const legacy = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

function fail(message) {
  console.error('UI DEBT FAIL:', message);
  process.exitCode = 1;
}

if (!legacy.startsWith('/* Report document begins here.')) {
  fail('Legacy stylesheet must begin at the report-document boundary');
}

if (/V4\./.test(legacy)) {
  fail('V4 application-version blocks must not return to report CSS');
}

const bannedApplicationSelectors = [
  '.nav{',
  '.editor{',
  '.design{',
  '.card{',
  '.btn{',
  '.smart-import-dialog',
  '.price-report-device-gate',
  '.device-profile-chip',
  '.toast{',
  '.product-card{',
  '.history-workspace',
  '.master-workspace',
  '.settings-workspace',
  '.system-workspace',
  '.export-workspace'
];

for (const selector of bannedApplicationSelectors) {
  if (legacy.includes(selector)) fail('Application selector leaked back into report CSS: ' + selector);
}

const importantCount = (legacy.match(/!important/g) || []).length;
const mediaCount = (legacy.match(/@media/g) || []).length;
if (importantCount > 428) fail('Report !important debt increased: ' + importantCount);
if (mediaCount > 6) fail('Report media-query debt increased: ' + mediaCount);
if (legacy.length > 45000) fail('Report stylesheet grew beyond V5 cleanup ceiling: ' + legacy.length);

if (!legacy.includes('@media print')) fail('Report print layer is missing');
if (!legacy.includes('.paper{')) fail('Report document root is missing');
if (!legacy.includes('.qtable')) fail('Report table styling is missing');

if (!process.exitCode) {
  console.log('UI DEBT GUARD PASS:', legacy.length, 'chars,', importantCount, '!important,', mediaCount, 'media blocks');
}
