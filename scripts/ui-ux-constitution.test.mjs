import assert from 'node:assert/strict';
import fs from 'node:fs';

const constitutionPath = new URL('../docs/UI_UX_CONSTITUTION.md', import.meta.url);
const changelogPath = new URL('../docs/UI_UX_CHANGELOG.md', import.meta.url);
const auditPath = new URL('../docs/UI_UX_COMPLIANCE_AUDIT.md', import.meta.url);
const agentsPath = new URL('../AGENTS.md', import.meta.url);

for (const [label, path] of [
  ['UI/UX Constitution', constitutionPath],
  ['UI/UX changelog', changelogPath],
  ['UI/UX compliance audit', auditPath],
  ['repository agent instructions', agentsPath]
]) {
  assert.equal(fs.existsSync(path), true, label + ' must exist');
}

const constitution = fs.readFileSync(constitutionPath, 'utf8');
const changelog = fs.readFileSync(changelogPath, 'utf8');
const audit = fs.readFileSync(auditPath, 'utf8');
const agents = fs.readFileSync(agentsPath, 'utf8');

for (const required of [
  '**Document:** UI/UX Constitution',
  '**Status:** Active',
  '**Version:** 1.0',
  'Permanent Product Design Governance',
  'Product North Star',
  'Decision Priority',
  'Semantic Design Tokens',
  'Application Shell',
  'Responsive Constitution',
  'Accessibility',
  'Application / Report / Print Boundary',
  'CSS Ownership',
  'Prohibited Anti-patterns',
  'Design Source of Truth',
  'Exception Policy',
  'Future Agent Protocol',
  'UI/UX Compliance Checklist',
  'Existing UI Migration Policy',
  'Preserve Working Features'
]) {
  assert.ok(constitution.includes(required), 'Constitution missing required section/contract: ' + required);
}

for (const phrase of [
  'Read `docs/UI_UX_CONSTITUTION.md`',
  'Do not introduce a parallel design system',
  'Validate desktop',
  'Validate tablet',
  'Validate mobile',
  'Validate accessibility',
  'Run regression tests'
]) {
  assert.ok(constitution.includes(phrase), 'Future Agent Protocol missing: ' + phrase);
}

assert.ok(agents.includes('docs/UI_UX_CONSTITUTION.md'), 'AGENTS.md must point to UI/UX Constitution');
assert.ok(agents.includes('Do not introduce a parallel design system'), 'AGENTS.md must prohibit parallel design systems');
assert.ok(changelog.includes('## 1.0'), 'UI/UX changelog must record Constitution 1.0');
assert.ok(audit.includes('PASS'), 'UI audit must use compliance classifications');
assert.ok(audit.includes('MINOR DEBT'), 'UI audit must include minor debt classification');
assert.ok(audit.includes('MAJOR DEBT'), 'UI audit must include major debt classification');
assert.ok(audit.includes('Migration Roadmap'), 'UI audit must include an incremental migration roadmap');
assert.ok(audit.includes('No big-bang rewrite') || audit.includes('Do not perform a full UI rewrite'), 'UI audit must forbid big-bang migration');

console.log('UI/UX CONSTITUTION GOVERNANCE PASS');
