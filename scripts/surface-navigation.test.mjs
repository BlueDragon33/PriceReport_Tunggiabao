import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('../src/studio-v59.css', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../src/content-workspace-v63.css', import.meta.url), 'utf8');

for (const token of [
  '--panel-bg','--panel-border','--panel-radius','--panel-shadow',
  '--toolbar-bg','--toolbar-border',
  '--tab-bg','--tab-bg-hover','--tab-bg-active','--tab-text','--tab-text-active',
  '--overlay-backdrop','--dialog-bg','--dialog-border','--dialog-radius'
]) {
  assert.ok(ui.includes(token + ':'), 'surface/navigation token missing: ' + token);
  assert.ok(studio.includes(token + ':'), 'Studio surface/navigation override missing: ' + token);
}

assert.ok(ui.includes('background:var(--panel-bg)'), 'Base card must consume shared panel token');
assert.ok(studio.includes('background:var(--toolbar-bg)'), 'Studio toolbar must consume toolbar contract');
assert.ok(studio.includes('background:var(--tab-bg-active)'), 'Inspector active tab must consume tab contract');
assert.ok(studio.includes('background:var(--panel-bg)'), 'Studio card must consume panel contract');
assert.ok(studio.includes('background:var(--overlay-backdrop)'), 'Product modal backdrop must consume overlay contract');
assert.ok(studio.includes('background:var(--dialog-bg)'), 'Product modal dialog must consume dialog contract');
assert.ok(workspace.includes('background:var(--overlay-backdrop)'), 'Workspace overlays must consume overlay contract');
assert.ok(workspace.includes('background:var(--dialog-bg)'), 'Workspace dialogs must consume dialog contract');

console.log('SURFACE NAVIGATION COMPONENTS PASS');
