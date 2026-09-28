import assert from 'node:assert/strict';
import fs from 'node:fs';

const legacy = fs.readFileSync(new URL('../src/responsive-v69.css', import.meta.url), 'utf8');
const current = fs.readFileSync(new URL('../src/responsive-v610.css', import.meta.url), 'utf8');

const importantCount = source => (source.match(/!important/g) || []).length;
const subTenFonts = source => [...source.matchAll(/font-size:\s*([0-9.]+)px/g)]
  .filter(match => Number(match[1]) < 10)
  .map(match => match[0]);
assert.deepEqual(subTenFonts(legacy), [], 'Legacy responsive layer must not contain sub-10px text');
assert.deepEqual(subTenFonts(current), [], 'Current responsive layer must not contain sub-10px text');
assert.ok(importantCount(legacy) <= 292, 'V6.9 responsive !important debt increased');
assert.ok(importantCount(current) <= 145, 'V6.10 responsive !important debt increased');
assert.ok(current.split('\n').length <= 461, 'V6.10 responsive file grew beyond cleanup + pointer-safety baseline');

function ruleMap(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const map = new Map();
  for (const match of clean.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    if (!selector.includes('.')) continue;
    const declarations = new Map();
    for (const declaration of match[2].split(';')) {
      const colon = declaration.indexOf(':');
      if (colon < 0) continue;
      const property = declaration.slice(0, colon).trim();
      const value = declaration.slice(colon + 1).trim();
      if (property) declarations.set(property, value);
    }
    map.set(selector, declarations);
  }
  return map;
}

const legacyRules = ruleMap(legacy);
const currentRules = ruleMap(current);
const redundant = [];
for (const [selector, declarations] of currentRules) {
  const previous = legacyRules.get(selector);
  if (!previous) continue;
  for (const [property, value] of declarations) {
    if (previous.get(property) === value) redundant.push(selector + ' :: ' + property + ' => ' + value);
  }
}
assert.deepEqual(redundant, [], 'Later responsive layer repeats declarations already owned by V6.9: ' + redundant.join(' | '));

assert.equal(legacy.includes('grid-template-columns:1fr 1fr!important;\n    gap:6px!important;'), false, 'Legacy phone product-toolbar grid ownership must stay retired');
assert.equal(legacy.includes('.product-toolbar-spacer{\n    display:none!important;'), false, 'Legacy phone product-toolbar spacer ownership must stay retired');
assert.ok(current.includes('.product-workspace-toolbar .btn'), 'Current touch product-toolbar button ownership is missing');
assert.ok(current.includes('min-height:42px!important'), 'Current touch product-toolbar height contract is missing');

assert.ok(current.includes('.shell>.design:not(.open)'), 'Closed touch inspector pointer-safety rule missing');
assert.ok(current.includes('pointer-events:none'), 'Closed touch inspector must not intercept navigation');
assert.ok(current.includes('pointer-events:auto'), 'Open touch inspector must restore interaction');

for (const media of [
  '@media screen',
  '@media screen and (max-width:599px)',
  '@media screen and (min-width:1024px) and (orientation:landscape)'
]) {
  assert.ok(current.includes(media), 'Required responsive capability range missing: ' + media);
}

console.log('RESPONSIVE OWNERSHIP CLEANUP PASS', {
  v69Important: importantCount(legacy),
  v610Important: importantCount(current),
  v610Lines: current.split('\n').length,
  duplicateOwnedDeclarations: redundant.length
});
