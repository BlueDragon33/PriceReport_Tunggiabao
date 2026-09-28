import assert from 'node:assert/strict';
import fs from 'node:fs';

const legacy = fs.readFileSync(new URL('../src/responsive-v69.css', import.meta.url), 'utf8');
const current = fs.readFileSync(new URL('../src/responsive-v610.css', import.meta.url), 'utf8');

const importantCount = source => (source.match(/!important/g) || []).length;
assert.ok(importantCount(current) <= 145, 'V6.10 responsive !important debt increased');
assert.ok(current.split('\n').length <= 451, 'V6.10 responsive file grew beyond cleanup baseline');

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

for (const media of [
  '@media screen',
  '@media screen and (max-width:599px)',
  '@media screen and (min-width:1024px) and (orientation:landscape)'
]) {
  assert.ok(current.includes(media), 'Required responsive capability range missing: ' + media);
}

console.log('RESPONSIVE OWNERSHIP CLEANUP PASS', {
  v610Important: importantCount(current),
  v610Lines: current.split('\n').length,
  duplicateOwnedDeclarations: redundant.length
});
