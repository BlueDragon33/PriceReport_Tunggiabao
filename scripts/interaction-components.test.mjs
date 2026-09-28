import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('../src/studio-v59.css', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../src/content-workspace-v63.css', import.meta.url), 'utf8');

for (const token of [
  '--control-focus-border','--control-focus-shadow',
  '--control-disabled-bg','--control-disabled-text',
  '--icon-button-size','--icon-button-radius','--icon-button-bg',
  '--icon-button-bg-hover','--icon-button-border','--icon-button-text',
  '--component-disabled-opacity'
]) {
  assert.ok(ui.includes(token + ':'), 'interaction component token missing: ' + token);
}

for (const token of [
  '--control-focus-border','--control-focus-shadow',
  '--icon-button-size','--icon-button-radius','--icon-button-bg',
  '--icon-button-border','--icon-button-text','--component-disabled-opacity'
]) {
  assert.ok(studio.includes(token + ':'), 'Studio interaction override missing: ' + token);
}

assert.ok(ui.includes('body.v5-ui .mini-action'), 'canonical mini-action IconButton primitive missing');
assert.ok(ui.includes('opacity:var(--component-disabled-opacity)'), 'disabled opacity contract missing');
assert.ok(studio.includes('width:var(--icon-button-size)'), 'Studio IconButton size must use shared contract');
assert.ok(workspace.includes('width:var(--icon-button-size)'), 'Workspace close button must use shared IconButton contract');
assert.ok(workspace.includes('border-color:var(--control-focus-border)!important'), 'Workspace focus state must consume shared focus token');
assert.ok(workspace.includes('background:var(--control-disabled-bg)'), 'Workspace disabled state must consume shared disabled token');

for (const source of [ui, studio, workspace]) {
  assert.equal(source.includes('outline:none!important'), false, 'Do not suppress accessible focus with !important');
}

console.log('INTERACTION COMPONENT STATES PASS');
