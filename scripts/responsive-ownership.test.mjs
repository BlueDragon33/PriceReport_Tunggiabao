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
assert.ok(importantCount(legacy) <= 269, 'V6.9 responsive !important debt increased');
assert.ok(importantCount(current) <= 117, 'V6.10 responsive !important debt increased');
assert.ok(current.split('\n').length <= 461, 'V6.10 responsive file grew beyond cleanup + pointer-safety baseline');
assert.equal(/[^{}@]+\{\s*\}/.test(legacy), false, 'V6.9 responsive layer must not retain empty legacy rules');
assert.ok(legacy.split('\n').length <= 933, 'V6.9 responsive file grew beyond V6.34 empty-rule retirement baseline');

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

for (const retired of [
  'left:8px!important',
  'right:8px!important',
  'bottom:calc(var(--touch-nav-h) + 7px)!important',
  'grid-template-columns:1fr 1.25fr 1fr!important',
  'min-height:46px!important',
  'grid-template-columns:minmax(0,1fr) 108px',
  'min-height:236px!important',
  'grid-template-rows:160px auto!important'
]) {
  assert.equal(legacy.includes(retired), false, 'Superseded phone ownership returned to V6.9: ' + retired);
}
assert.ok(current.includes('bottom:calc(var(--touch-nav-h) + 5px)!important'), 'Current phone More-menu ownership is missing');
assert.ok(current.includes('min-height:44px!important'), 'Current phone footer button ownership is missing');
assert.ok(current.includes('grid-template-columns:minmax(0,1fr) 88px!important'), 'Current phone quote-flow ownership is missing');
assert.ok(current.includes('min-height:190px!important'), 'Current phone template-card ownership is missing');

function extractMediaBlock(source, header) {
  const start = source.indexOf(header);
  assert.ok(start >= 0, 'Responsive media block missing: ' + header);
  const open = source.indexOf('{', start);
  let depth = 1;
  let cursor = open + 1;
  while (cursor < source.length && depth) {
    if (source[cursor] === '{') depth += 1;
    else if (source[cursor] === '}') depth -= 1;
    cursor += 1;
  }
  return source.slice(open + 1, cursor - 1);
}

function ruleHasDeclaration(source, selectorNeedle, property, value) {
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!match[1].includes(selectorNeedle)) continue;
    const declarations = match[2].split(';').map(item => item.trim());
    if (declarations.includes(property + ':' + value)) return true;
  }
  return false;
}

const phoneLegacy = extractMediaBlock(legacy, '@media screen and (max-width:599px)');
const phoneCurrent = extractMediaBlock(current, '@media screen and (max-width:599px)');
const tabletPortraitCurrent = extractMediaBlock(current, '@media screen and (orientation:portrait), screen and (max-width:1023px) and (orientation:landscape)');
const tabletLandscapeCurrent = extractMediaBlock(current, '@media screen and (min-width:1024px) and (orientation:landscape)');
assert.equal(ruleHasDeclaration(phoneLegacy, '.studio-topbar-doc', 'width', '34px'), false, 'Hidden phone Studio document sizing returned to V6.9');
assert.equal(ruleHasDeclaration(phoneLegacy, '.studio-topbar-doc', 'min-width', '34px'), false, 'Hidden phone Studio document min-width returned to V6.9');
assert.equal(ruleHasDeclaration(phoneLegacy, '.studio-topbar-doc', 'height', '34px'), false, 'Hidden phone Studio document height returned to V6.9');
assert.equal(ruleHasDeclaration(phoneLegacy, '.studio-topbar-doc', 'font-size', '15px'), false, 'Hidden phone Studio document font-size returned to V6.9');
assert.ok(current.includes('.studio-topbar-doc{\n    display:none!important;'), 'Current phone Studio document hide owner is missing');
for (const [selector, property, value] of [
  ['.studio-title-line>strong', 'font-size', '14.5px'],
  ['.studio-title-line>strong', 'line-height', '18px'],
  ['.studio-status-badge', 'max-width', '70px'],
  ['.studio-status-badge', 'font-size', '10px'],
  ['.studio-topbar-title>small', 'font-size', '10px'],
  ['.content-library-head', 'margin-bottom', '10px'],
  ['.content-library-head h2', 'font-size', '20px'],
  ['.quote-flow-card-copy small', 'line-height', '14px'],
  ['.content-block-row b', 'font-size', '13.5px'],
  ['.content-block-row small', 'font-size', '11.5px'],
  ['.content-block-row small', 'line-height', '15px']
]) {
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value), true, 'V6.36 current phone declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value + '!important'), false, 'V6.36 low-risk !important returned: ' + selector + ' :: ' + property);
}
assert.ok(legacy.split('\n').length <= 927, 'V6.9 responsive file grew beyond V6.35 hidden-owner retirement baseline');
for (const [selector, property, value] of [
  ['.shell>.nav .nav-glyph', 'font-size', '17px!important'],
  ['.content-library-home', 'padding', '12px 11px 22px'],
  ['.content-library-head h2', 'font-size', '18px'],
  ['.content-block-list', 'gap', '8px'],
  ['.content-block-row', 'min-height', '62px'],
  ['.content-block-row', 'padding', '9px 10px'],
  ['.content-block-row b', 'font-size', '13px'],
  ['.content-block-row small', 'font-size', '10px'],
  ['.content-template-grid', 'grid-template-columns', 'repeat(2,minmax(0,1fr))'],
  ['.content-template-grid', 'gap', '9px'],
  ['.content-template-grid button', 'min-height', '120px'],
  ['.content-workspace-dialog', 'grid-template-rows', '64px 42px minmax(0,1fr) 62px!important'],
  ['.product-workspace-dialog', 'grid-template-rows', '64px minmax(0,1fr) 62px!important'],
  ['.content-workspace-head', 'min-height', '64px!important'],
  ['.product-workspace-modal-head', 'min-height', '64px!important'],
  ['.content-workspace-head', 'padding', '8px 10px!important'],
  ['.product-workspace-modal-head', 'padding', '8px 10px!important'],
  ['.content-workspace-body', 'padding', '7px!important'],
  ['.product-workspace-modal-body', 'padding', '7px!important'],
  ['.content-workspace-body', 'gap', '6px!important'],
  ['.product-workspace-modal-body', 'gap', '6px!important'],
  ['.content-workspace-main', 'padding', '9px!important'],
  ['.product-workspace-main', 'padding', '9px!important'],
  ['.template-library-grid', 'grid-template-columns', '1fr 1fr!important'],
  ['.quote-review-footer', 'padding', '7px 8px max(7px,env(safe-area-inset-bottom))!important']
]) {
  assert.equal(
    ruleHasDeclaration(phoneLegacy, selector, property, value),
    false,
    'Same-breakpoint V6.9 declaration returned: ' + selector + ' :: ' + property + ':' + value
  );
}
assert.ok(current.includes('font-size:18px!important'), 'Current phone nav-glyph owner missing');
assert.ok(current.includes('grid-template-rows:58px 38px minmax(0,1fr) 58px!important'), 'Current phone content-workspace rows missing');
assert.ok(current.includes('grid-template-rows:58px minmax(0,1fr) 58px!important'), 'Current phone product-workspace rows missing');

for (const [source, selector, property, value] of [
  [current, '.product-workspace-toolbar', 'gap', '7px'],
  [current, '.product-workspace-toolbar', 'padding-bottom', '4px'],
  [current, '.product-workspace-toolbar .btn', 'min-width', '126px'],
  [current, '.product-workspace-toolbar .btn', 'min-height', '42px'],
  [current, '.quote-review-panel', 'border-radius', '12px'],
  [tabletPortraitCurrent, '.content-library-home', 'padding', '20px 22px 32px'],
  [tabletPortraitCurrent, '.content-block-list', 'gap', '10px'],
  [tabletPortraitCurrent, '.content-block-row', 'min-height', '76px'],
  [tabletPortraitCurrent, '.content-template-grid', 'gap', '10px'],
  [tabletPortraitCurrent, '.content-template-grid button', 'min-height', '112px'],
  [tabletLandscapeCurrent, '.content-library-home', 'padding', '16px 14px 26px'],
  [tabletLandscapeCurrent, '.content-block-row', 'min-height', '60px']
]) {
  assert.equal(ruleHasDeclaration(source, selector, property, value), true, 'V6.37 declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(source, selector, property, value + '!important'), false, 'V6.37 low-risk !important returned: ' + selector + ' :: ' + property);
}

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
