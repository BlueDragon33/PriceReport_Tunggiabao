import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('../src/studio-v59.css', import.meta.url), 'utf8');

const navMatch = html.match(/<nav class="nav"[\s\S]*?<div class="spacer">/);
assert.ok(navMatch, 'Primary navigation markup missing');
const nav = navMatch[0];
const primaryTabs = [...nav.matchAll(/<button[^>]*data-tab="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(
  primaryTabs,
  ['dashboard', 'general', 'history', 'master', 'export', 'settings', 'system'],
  'Primary navigation must contain destinations only and preserve canonical order'
);

for (const child of ['customer','products','payment','terms','design','view','presets']) {
  assert.equal(nav.includes('data-tab="' + child + '"'), false, 'Workflow child leaked back into primary navigation: ' + child);
}

for (const child of ['customer','products','payment','terms']) {
  assert.ok(html.includes('data-content-block="' + child + '"'), 'Content Navigator lost workflow access: ' + child);
}
for (const action of ['design','view','presets']) {
  assert.ok(html.includes('data-open-tab="' + action + '"'), 'Action access lost after navigation cleanup: ' + action);
}

for (const section of ['Tổng quan','Công việc','Dữ liệu','Thiết kế & xuất bản','Hệ thống']) {
  assert.ok(nav.includes(section), 'Canonical navigation section missing: ' + section);
}

assert.ok(main.includes("let activeTabId = 'dashboard';"), 'Explicit active workflow state is missing');
assert.ok(main.includes('function primaryNavigationDestination(tab)'), 'Workflow-to-destination mapping is missing');
assert.ok(main.includes("['general', 'customer', 'products', 'payment', 'terms', 'design', 'view', 'presets', 'signature', 'custom-text']"), 'Quotation workflow destination mapping regressed');
assert.ok(main.includes('const navDestination = primaryNavigationDestination(tab);'), 'Primary navigation highlight mapping is not applied');
assert.ok(main.includes('syncStudioContext(activeTabId);'), 'Studio context must use actual workflow state, not active nav DOM');

for (const child of ['customer','products','payment','terms','design','view','presets']) {
  assert.equal(studio.includes('.nav button[data-tab="' + child + '"]'), false, 'Obsolete hidden child-nav CSS returned: ' + child);
}

console.log('DESTINATION NAVIGATION GOVERNANCE PASS', { primaryTabs });
