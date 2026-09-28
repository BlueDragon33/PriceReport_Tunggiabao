import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('../src/studio-v59.css', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../src/content-workspace-v63.css', import.meta.url), 'utf8');

for (const token of [
  '--feedback-neutral-bg','--feedback-neutral-text',
  '--feedback-info-bg','--feedback-info-text',
  '--feedback-success-bg','--feedback-success-text',
  '--feedback-warning-bg','--feedback-warning-text',
  '--feedback-danger-bg','--feedback-danger-text',
  '--feedback-radius','--feedback-border'
]) {
  assert.ok(ui.includes(token + ':'), 'feedback token missing: ' + token);
  assert.ok(studio.includes(token + ':'), 'Studio feedback override missing: ' + token);
}

assert.ok(ui.includes('background:var(--feedback-success-bg);color:var(--feedback-success-text)'), 'Success visual semantics must use feedback contract');
assert.ok(ui.includes('background:var(--feedback-warning-bg);color:var(--feedback-warning-text)'), 'Warning visual semantics must use feedback contract');
assert.ok(studio.includes('background:var(--feedback-neutral-bg)'), 'Studio status badge must use neutral feedback contract');
assert.ok(studio.includes('background:var(--feedback-info-bg)'), 'Studio quickfill chip must use info feedback contract');
assert.ok(workspace.includes('background:var(--feedback-neutral-bg)'), 'Workspace chip must use shared feedback contract');

for (const source of [ui, studio, workspace]) {
  assert.equal(source.includes('background:lime'), false, 'Uncontrolled status color detected');
}

console.log('STATUS FEEDBACK COMPONENTS PASS');
