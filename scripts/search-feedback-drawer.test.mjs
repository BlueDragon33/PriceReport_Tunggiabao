import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('../src/studio-v59.css', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../src/content-workspace-v63.css', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

for (const token of [
  '--search-bg','--search-border','--search-radius','--search-icon','--search-placeholder','--search-result-hover',
  '--toast-bg','--toast-text','--toast-border','--toast-radius',
  '--toast-info-bg','--toast-info-text','--toast-success-bg','--toast-success-text',
  '--toast-warning-bg','--toast-warning-text','--toast-danger-bg','--toast-danger-text',
  '--drawer-bg','--drawer-border','--drawer-radius','--drawer-shadow'
]) {
  assert.ok(ui.includes(token + ':'), 'Search/feedback/drawer token missing: ' + token);
}

for (const token of [
  '--search-bg','--search-border','--search-radius','--search-placeholder',
  '--toast-bg','--toast-text','--drawer-bg','--drawer-border','--drawer-radius'
]) {
  assert.ok(studio.includes(token + ':'), 'Studio Search/feedback/drawer override missing: ' + token);
}

assert.ok(ui.includes('border:1px solid var(--search-border)'), 'Base search surfaces must consume shared search border');
assert.ok(studio.includes('background:var(--search-bg)'), 'Studio search surfaces must consume shared search background');
assert.ok(workspace.includes('border:1px solid var(--search-border)'), 'Workspace customer search must consume shared search contract');

assert.ok(ui.includes('.toast[data-tone="info"]'), 'Toast Info variant missing');
assert.ok(ui.includes('.toast[data-tone="success"]'), 'Toast Success variant missing');
assert.ok(ui.includes('.toast[data-tone="warning"]'), 'Toast Warning variant missing');
assert.ok(ui.includes('.toast[data-tone="danger"]'), 'Toast Danger variant missing');
assert.ok(main.includes("el.dataset.tone = tone"), 'Toast runtime must expose semantic tone state');
assert.ok(main.includes("['neutral', 'info', 'success', 'warning', 'danger']"), 'Toast runtime must whitelist semantic tones');

assert.ok(ui.includes('background:var(--drawer-bg)'), 'Preview customizer must consume Drawer background contract');
assert.ok(ui.includes('border:1px solid var(--drawer-border)'), 'Preview customizer must consume Drawer border contract');
assert.ok(ui.includes('box-shadow:var(--drawer-shadow)'), 'Preview customizer must consume Drawer elevation contract');

assert.equal(/\.drawer-new|\.search-v2|\.toast-v2/.test(ui + studio + workspace), false, 'Parallel component system detected');

console.log('SEARCH FEEDBACK DRAWER CONTRACTS PASS');
