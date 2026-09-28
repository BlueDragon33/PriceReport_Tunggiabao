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
assert.ok(importantCount(legacy) <= 266, 'V6.9 responsive !important debt increased');
assert.ok(importantCount(current) <= 47, 'V6.10 responsive !important debt increased');
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
assert.equal(ruleHasDeclaration(current, '.product-workspace-toolbar .btn', 'min-height', '42px'), true, 'Current touch product-toolbar height contract is missing');
assert.equal(ruleHasDeclaration(current, '.product-workspace-toolbar .btn', 'min-height', '42px!important'), false, 'Touch product-toolbar height must no longer require !important');

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
assert.equal(ruleHasDeclaration(phoneCurrent, '.studio-topbar-doc', 'display', 'none'), true, 'Current phone Studio document hide owner is missing');
assert.equal(ruleHasDeclaration(phoneCurrent, '.studio-topbar-doc', 'display', 'none!important'), false, 'Current phone Studio document hide must stay on normal cascade');
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
assert.equal(ruleHasDeclaration(phoneCurrent, '.shell>.nav .nav-glyph', 'font-size', '18px'), true, 'Current phone nav-glyph owner missing');
assert.equal(ruleHasDeclaration(phoneCurrent, '.shell>.nav .nav-glyph', 'font-size', '18px!important'), false, 'Phone nav-glyph must stay on normal cascade');
for (const [source, selector, property, value] of [
  [legacy, '.shell>.nav>button[data-tab="dashboard"]', 'min-height', '0'],
  [legacy, '.shell>.nav>button[data-tab="dashboard"]', 'border-radius', '10px'],
  [phoneLegacy, '.shell>.nav', 'padding', '4px max(5px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(5px,env(safe-area-inset-left))'],
  [phoneCurrent, '.shell>.nav', 'gap', '2px'],
  [phoneCurrent, '.shell>.nav', 'padding-top', '5px'],
  [phoneCurrent, '.shell>.nav>button[data-tab]', 'min-height', '52px'],
  [phoneCurrent, '.shell>.nav>button[data-tab]', 'border-radius', '12px'],
  [phoneCurrent, '.shell>.nav>button[data-tab]', 'font-size', '10px']
]) {
  assert.equal(ruleHasDeclaration(source, selector, property, value), true, 'V6.40 phone navigation declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(source, selector, property, value + '!important'), false, 'V6.40 phone navigation !important returned: ' + selector + ' :: ' + property);
}

assert.ok(current.includes('grid-template-rows:58px 38px minmax(0,1fr) 58px!important'), 'Current phone content-workspace rows missing');
assert.ok(current.includes('grid-template-rows:58px minmax(0,1fr) 58px!important'), 'Current phone product-workspace rows missing');

for (const [source, selector, property, value] of [
  [current, '.content-completion-card', 'border-color', 'var(--touch-border)'],
  [current, '.content-completion-card', 'background', 'var(--touch-card)'],
  [current, '.content-completion-card', 'box-shadow', '0 5px 18px rgba(28,55,85,.06)'],
  [current, '.quote-flow-card', 'border-color', 'var(--touch-border)'],
  [current, '.quote-flow-card', 'background', 'var(--touch-card)'],
  [current, '.quote-flow-card', 'box-shadow', '0 5px 18px rgba(28,55,85,.06)'],
  [current, '.content-block-row', 'border', '1px solid var(--touch-border)'],
  [current, '.content-block-row', 'background', '#fff'],
  [current, '.content-block-row', 'box-shadow', '0 3px 12px rgba(28,55,85,.045)'],
  [current, '.content-block-row:active', 'background', '#f7faff'],
  [current, '.content-workspace-main>.card', 'box-shadow', 'none'],
  [current, '.content-workspace-main>.section-block', 'box-shadow', 'none']
]) {
  assert.equal(ruleHasDeclaration(source, selector, property, value), true, 'V6.38 touch surface declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(source, selector, property, value + '!important'), false, 'V6.38 touch surface !important returned: ' + selector + ' :: ' + property);
}

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

for (const [source, selector, property, value] of [
  [tabletPortraitCurrent, '.shell:not(.app-workspace):not(.report-view)>.editor', 'border-right', '0'],
  [tabletPortraitCurrent, '.content-block-list', 'display', 'grid'],
  [tabletPortraitCurrent, '.content-block-list', 'grid-template-columns', '1fr 1fr'],
  [tabletPortraitCurrent, '.content-template-grid', 'grid-template-columns', 'repeat(4,minmax(0,1fr))'],
  [tabletPortraitCurrent, '.dashboard-main-grid,', 'grid-template-columns', '1fr']
]) {
  assert.equal(ruleHasDeclaration(source, selector, property, value), true, 'V6.47 tablet layout declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(source, selector, property, value + '!important'), false, 'V6.47 tablet layout !important returned: ' + selector + ' :: ' + property);
}

for (const [selector, property, value] of [
  ['.product-workspace-toolbar', 'display', 'flex'],
  ['.product-workspace-toolbar', 'align-items', 'stretch'],
  ['.product-workspace-toolbar', 'overflow-x', 'auto'],
  ['.product-workspace-toolbar', 'overflow-y', 'hidden'],
  ['.product-workspace-toolbar .btn', 'flex', '0 0 auto'],
  ['.product-workspace-toolbar .btn', 'width', 'auto'],
  ['.product-workspace-toolbar .btn', 'white-space', 'nowrap'],
  ['.product-toolbar-spacer', 'display', 'none']
]) {
  assert.equal(ruleHasDeclaration(current, selector, property, value), true, 'V6.39 touch action rail declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(current, selector, property, value + '!important'), false, 'V6.39 touch action rail !important returned: ' + selector + ' :: ' + property);
}

for (const [selector, property, value] of [
  ['.content-library-home', 'padding', '12px 10px 28px'],
  ['.content-completion-card', 'padding', '10px 11px'],
  ['.quote-flow-card', 'padding', '11px'],
  ['.content-block-list', 'gap', '7px'],
  ['.content-block-row', 'min-height', '64px'],
  ['.content-block-row', 'padding', '10px 11px']
]) {
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value), true, 'V6.41 phone content declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value + '!important'), false, 'V6.41 phone content !important returned: ' + selector + ' :: ' + property);
}

for (const [selector, property, value] of [
  ['.content-template-grid', 'display', 'flex'],
  ['.content-template-grid', 'grid-template-columns', 'none'],
  ['.content-template-grid', 'gap', '9px'],
  ['.content-template-grid', 'overflow-x', 'auto'],
  ['.content-template-grid', 'overflow-y', 'hidden'],
  ['.content-template-grid', 'padding', '2px 1px 7px'],
  ['.content-template-grid button', 'flex', '0 0 146px'],
  ['.content-template-grid button', 'width', '146px'],
  ['.content-template-grid button', 'min-height', '104px']
]) {
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value), true, 'V6.42 phone template rail declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value + '!important'), false, 'V6.42 phone template rail !important returned: ' + selector + ' :: ' + property);
}


for (const [selector, property, value] of [
  ['.content-library', 'background', 'var(--touch-surface)'],
  ['.content-workspace-width-control', 'display', 'none'],
  ['.studio-topbar-doc', 'display', 'none'],
  ['.studio-topbar', 'padding-left', '12px'],
  ['.studio-topbar', 'padding-right', '8px'],
  ['.studio-topbar-context', 'gap', '0']
]) {
  assert.equal(ruleHasDeclaration(current, selector, property, value), true, 'V6.43 touch chrome declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(current, selector, property, value + '!important'), false, 'V6.43 touch chrome !important returned: ' + selector + ' :: ' + property);
}

for (const [selector, property, value] of [
  ['.content-workspace-icon', 'width', '34px'],
  ['.content-workspace-icon', 'min-width', '34px'],
  ['.content-workspace-icon', 'height', '34px'],
  ['.content-workspace-icon', 'border-radius', '9px'],
  ['.content-workspace-head h2', 'font-size', '15px'],
  ['.content-workspace-head h2', 'line-height', '18px'],
  ['.content-workspace-toolbar', 'padding', '0 9px'],
  ['.content-workspace-toolbar small', 'display', 'none']
]) {
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value), true, 'V6.44 phone workspace header declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value + '!important'), false, 'V6.44 phone workspace header !important returned: ' + selector + ' :: ' + property);
}

for (const [selector, property, value] of [
  ['.quote-flow-step-list', 'gap', '4px'],
  ['.quote-flow-step-button', 'width', '92px'],
  ['.quote-flow-step-button', 'min-height', '36px'],
  ['.quote-flow-step-button', 'padding', '4px 5px'],
  ['.quote-flow-step-button', 'grid-template-columns', '21px minmax(0,1fr)'],
  ['.quote-flow-step-marker', 'width', '20px'],
  ['.quote-flow-step-marker', 'height', '20px'],
  ['.quote-flow-step-button strong', 'line-height', '12px'],
  ['.quote-flow-review-button', 'font-size', '10px']
]) {
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value), true, 'V6.46 phone quote-flow declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value + '!important'), false, 'V6.46 phone quote-flow !important returned: ' + selector + ' :: ' + property);
}
assert.equal(ruleHasDeclaration(phoneCurrent, '.quote-flow-step-button strong', 'font-size', '10px!important'), true, 'V6.46 must preserve readable 10px phone flow-step label over the legacy 9.5px important owner');

for (const [selector, property, value] of [
  ['.content-workspace-body,\n  body.v5-ui.reference-ui-v59[data-device-class="phone"] .product-workspace-modal-body', 'padding', '6px'],
  ['.content-workspace-body,\n  body.v5-ui.reference-ui-v59[data-device-class="phone"] .product-workspace-modal-body', 'gap', '5px'],
  ['.content-workspace-main,\n  body.v5-ui.reference-ui-v59[data-device-class="phone"] .product-workspace-main', 'padding', '8px'],
  ['.content-workspace-main,\n  body.v5-ui.reference-ui-v59[data-device-class="phone"] .product-workspace-main', 'border-radius', '10px'],
  ['.content-workspace-main .row', 'margin-bottom', '9px']
]) {
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value), true, 'V6.45 phone workspace spacing declaration missing: ' + selector + ' :: ' + property);
  assert.equal(ruleHasDeclaration(phoneCurrent, selector, property, value + '!important'), false, 'V6.45 phone workspace spacing !important returned: ' + selector + ' :: ' + property);
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
