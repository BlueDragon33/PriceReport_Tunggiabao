import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('../src/studio-v59.css', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../src/content-workspace-v63.css', import.meta.url), 'utf8');

const required = [
  '--control-height','--control-radius','--control-border','--control-bg','--control-bg-hover','--control-text',
  '--button-secondary-bg','--button-secondary-bg-hover','--button-secondary-border','--button-secondary-text',
  '--button-primary-bg','--button-primary-bg-hover','--button-primary-text',
  '--button-danger-bg','--button-danger-border','--button-danger-text'
];
for (const token of required) assert.ok(ui.includes(token + ':'), 'component token missing: ' + token);

for (const token of [
  '--control-radius','--control-border','--control-bg','--control-text',
  '--button-secondary-bg','--button-secondary-border','--button-secondary-text',
  '--button-primary-bg','--button-primary-text'
]) {
  assert.ok(studio.includes(token + ':'), 'Studio component override missing: ' + token);
}

const componentUses = source => (source.match(/var\(--(?:control|button)-(?:[a-z-]+)\)/g) || []).length;
assert.ok(componentUses(ui) >= 15, 'base UI component-token adoption regressed');
assert.ok(componentUses(studio) >= 20, 'Studio component-token adoption regressed');
assert.ok(componentUses(workspace) >= 10, 'Workspace component-token adoption regressed');

for (const raw of [
  'border-color:#1677ff;\n  background:#1677ff;',
  'border-color:#e3b9be;\n  background:#fff3f4;\n  color:#a63643;'
]) {
  assert.equal(workspace.includes(raw), false, 'Workspace reintroduced a duplicated button variant');
}

assert.ok(ui.includes('body.v5-ui .btn.primary'), 'canonical Primary button variant missing');
assert.ok(ui.includes('body.v5-ui .btn.danger'), 'canonical Danger button variant missing');
assert.ok(ui.includes('body.v5-ui input,'), 'canonical form control contract missing');

console.log('COMPONENT CONTRACT FOUNDATION PASS', {
  uiUses: componentUses(ui),
  studioUses: componentUses(studio),
  workspaceUses: componentUses(workspace)
});
