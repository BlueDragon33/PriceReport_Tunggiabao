import assert from 'node:assert/strict';
import fs from 'node:fs';

const legacy = fs.readFileSync(new URL('../src/responsive-v69.css', import.meta.url), 'utf8');
const current = fs.readFileSync(new URL('../src/responsive-v610.css', import.meta.url), 'utf8');

const allowedMediaQueries = new Set([
  'screen',
  'screen and (min-width:600px)',
  'screen and (max-width:599px)',
  'screen and (orientation:portrait), screen and (max-width:1023px) and (orientation:landscape)',
  'screen and (min-width:1024px) and (orientation:landscape)',
  'screen and (max-width:370px)'
]);
const mediaQueries = source => [...source.matchAll(/@media\s+([^\{]+)\{/g)].map(match => match[1].trim());
for (const query of [...mediaQueries(legacy), ...mediaQueries(current)]) {
  assert.ok(allowedMediaQueries.has(query), 'Undocumented responsive breakpoint/query: ' + query);
}
const responsiveArchitecture = fs.readFileSync(new URL('../docs/RESPONSIVE_ARCHITECTURE.md', import.meta.url), 'utf8');
for (const query of allowedMediaQueries) {
  assert.ok(responsiveArchitecture.includes(query), 'Responsive Architecture must document media query: ' + query);
}
assert.ok(responsiveArchitecture.includes('real-browser viewport evidence'), 'Breakpoint exception policy must require browser evidence');

const importantCount = source => (source.match(/!important/g) || []).length;
const subTenFonts = source => [...source.matchAll(/font-size:\s*([0-9.]+)px/g)]
  .filter(match => Number(match[1]) < 10)
  .map(match => match[0]);
assert.deepEqual(subTenFonts(legacy), [], 'Legacy responsive layer must not contain sub-10px text');
assert.deepEqual(subTenFonts(current), [], 'Current responsive layer must not contain sub-10px text');
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
