import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('../src/studio-v59.css', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../src/content-workspace-v63.css', import.meta.url), 'utf8');
const report = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

const requiredTokens = [
  '--surface-app','--surface-panel','--surface-raised','--surface-muted',
  '--text-primary','--text-secondary','--text-muted','--text-inverse',
  '--border-default','--border-strong',
  '--accent-primary','--accent-primary-hover','--accent-primary-soft',
  '--state-success','--state-warning','--state-danger','--state-info',
  '--radius-small','--radius-medium','--radius-large','--radius-pill',
  '--space-1','--space-2','--space-3','--space-4','--space-5','--space-6'
];

for (const token of requiredTokens) {
  assert.ok(ui.includes(token + ':'), 'application semantic token missing: ' + token);
}

for (const token of [
  '--surface-app','--surface-panel','--surface-raised','--surface-muted',
  '--text-primary','--text-secondary','--text-muted',
  '--border-default','--border-strong','--accent-primary'
]) {
  assert.ok(studio.includes(token + ':'), 'Studio semantic override missing: ' + token);
}

const semanticUsage = source => (source.match(/var\(--(?:surface|text|border|accent|state)-/g) || []).length;
const componentUsage = source => (source.match(/var\(--(?:control|button|icon-button|component)-/g) || []).length;
const feedbackUsage = source => (source.match(/var\(--feedback-/g) || []).length;
const surfaceNavigationUsage = source => (source.match(/var\(--(?:panel|toolbar|tab|overlay|dialog)-/g) || []).length;
const searchFeedbackDrawerUsage = source => (source.match(/var\(--(?:search|toast|drawer)-/g) || []).length;
const designSystemUsage = source => semanticUsage(source) + componentUsage(source) + feedbackUsage(source) + surfaceNavigationUsage(source) + searchFeedbackDrawerUsage(source);
assert.ok(semanticUsage(ui) >= 70, 'App UI direct semantic-token foundation regressed');
assert.ok(semanticUsage(studio) >= 50, 'Studio direct semantic-token foundation regressed');
assert.ok(semanticUsage(workspace) >= 14, 'Content workspace direct semantic-token foundation regressed');
assert.ok(designSystemUsage(ui) >= 160, 'App UI design-system adoption regressed');
assert.ok(designSystemUsage(studio) >= 140, 'Studio design-system adoption regressed');
assert.ok(designSystemUsage(workspace) >= 63, 'Content workspace layered design-system adoption regressed');

const hexCount = source => (source.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
assert.ok(hexCount(studio) <= 451, 'Studio hard-coded color debt increased');
assert.ok(hexCount(workspace) <= 172, 'Content workspace hard-coded color debt increased');

for (const token of ['--surface-app','--accent-primary','--state-success']) {
  assert.equal(report.includes(token), false, 'Application semantic token leaked into report document CSS: ' + token);
}

console.log('SEMANTIC DESIGN TOKEN FOUNDATION PASS', {
  uiSemanticUses: semanticUsage(ui),
  studioSemanticUses: semanticUsage(studio),
  workspaceSemanticUses: semanticUsage(workspace),
  uiDesignSystemUses: designSystemUsage(ui),
  studioDesignSystemUses: designSystemUsage(studio),
  workspaceDesignSystemUses: designSystemUsage(workspace),
  uiFeedbackUses: feedbackUsage(ui),
  studioFeedbackUses: feedbackUsage(studio),
  workspaceFeedbackUses: feedbackUsage(workspace),
  uiSurfaceNavigationUses: surfaceNavigationUsage(ui),
  studioSurfaceNavigationUses: surfaceNavigationUsage(studio),
  workspaceSurfaceNavigationUses: surfaceNavigationUsage(workspace),
  uiSearchFeedbackDrawerUses: searchFeedbackDrawerUsage(ui),
  studioSearchFeedbackDrawerUses: searchFeedbackDrawerUsage(studio),
  workspaceSearchFeedbackDrawerUses: searchFeedbackDrawerUsage(workspace),
  studioHex: hexCount(studio),
  workspaceHex: hexCount(workspace)
});
