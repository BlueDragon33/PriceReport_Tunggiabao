import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');
const studioCss = fs.readFileSync(new URL('../src/studio-v58.css', import.meta.url), 'utf8');
const legacyCss = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function fail(message) {
  console.error('V5 UI FAIL:', message);
  process.exitCode = 1;
}

if (!css.includes('--v5-primary:')) fail('V5 shared design tokens are missing');
if (!css.includes('body.v5-ui')) fail('V5 shared stylesheet is not body-scoped');
if (!html.includes('class="v5-ui reference-ui-v58"')) fail('V5.8 pixel-lock UI scope is not active on the application body');
if (!html.includes('href="./src/studio-v58.css"')) fail('V5.8 dedicated Studio stylesheet is not loaded');
if (!studioCss.includes('V5.8 Studio Pixel-Lock')) fail('V5.8 Studio stylesheet ownership marker is missing');
if (!studioCss.includes('--studio-header-h:72px') ||
    !studioCss.includes('--studio-rail-w:118px') ||
    !studioCss.includes('--studio-left-w:320px') ||
    !studioCss.includes('--studio-right-w:384px') ||
    !studioCss.includes('--studio-preview-toolbar-h:52px')) {
  fail('V5.8 canonical 72 / 118 / 320 / 384 / 52 geometry tokens are missing');
}
if (!studioCss.includes('grid-template-columns:var(--studio-rail-w) var(--studio-left-w) minmax(0,1fr) var(--studio-right-w)')) {
  fail('V5.8 canonical Studio four-column grid is missing');
}
if (!studioCss.includes('grid-template-rows:var(--studio-header-h) minmax(0,1fr)')) fail('V5.8 Studio header row geometry is missing');
if (!html.includes('class="studio-topbar"')) fail('V5.8 single Studio topbar is missing');
if (html.includes('class="studio-global-bar"')) fail('V5.7 Studio global bar must not remain visible');
if (!html.includes('class="editor content-library"') || !html.includes('id="contentLibraryHome"')) fail('V5.8 Thêm nội dung library is missing');
if (!studioCss.includes('.content-library-home') || !studioCss.includes('.content-block-row')) fail('V5.8 content library styling is missing');

const contentOrder = [
  'data-content-block="general"',
  'data-content-block="customer"',
  'data-content-block="products"',
  'data-content-block="payment"',
  'data-content-block="terms"',
  'data-content-block="signature"',
  'data-content-block="custom-text"'
];
let contentCursor = -1;
for (const token of contentOrder) {
  const next = html.indexOf(token, contentCursor + 1);
  if (next < 0) fail('V5.8 content block is missing: ' + token);
  else if (next <= contentCursor) fail('V5.8 content block order is incorrect: ' + token);
  contentCursor = next;
}

if (!html.includes('id="studioCommandSearch"') || !html.includes('id="studioCommandResults"')) fail('V5.8 command search surface is missing');
if (!html.includes('id="previewOverflowMenu"')) fail('V5.8 compact preview overflow menu is missing');
if (!html.includes('data-inspector-tab="design"') || !html.includes('data-inspector-tab="content"') || !html.includes('data-inspector-tab="check"')) fail('V5.8 Design/Content/Check inspector tabs are missing');

const inspectorOrder = [
  '>Giao diện tổng thể<',
  '>Màu chủ đạo<',
  '>Font chữ<',
  '>Thiết lập hiển thị<',
  '>Cài đặt nâng cao<',
  '>Brand Kit<'
];
let inspectorCursor = html.indexOf('inspector-design-view');
if (inspectorCursor < 0) fail('V5.8 inspector Design view is missing');
for (const token of inspectorOrder) {
  const next = html.indexOf(token, inspectorCursor + 1);
  if (next < 0) fail('V5.8 inspector section is missing: ' + token);
  else if (next <= inspectorCursor) fail('V5.8 inspector section order is incorrect: ' + token);
  inspectorCursor = next;
}

if (!studioCss.includes('background:var(--studio-bg)') || !studioCss.includes('background:var(--studio-panel)')) fail('V5.8 dark Studio chrome/canvas ownership is missing');
if (!studioCss.includes('#paperWrap') || !studioCss.includes('drop-shadow(0 12px 32px rgba(0,0,0,.20))')) fail('V5.8 A4 presentation shadow is missing');
if (studioCss.includes('!important')) fail('V5.8 Studio stylesheet must not introduce !important');
if (/\.paper(?=[\s.:#>+~\[\{])/.test(studioCss)) fail('V5.8 Studio stylesheet must not target the report document');
if (/@media\s+print/i.test(studioCss)) fail('V5.8 Studio stylesheet must not contain print rules');
if (html.includes('class="studio-stepper"') || html.includes('class="studio-commandbar"')) fail('V5.7 visible stepper/command bar must not remain in V5.8 Studio DOM');

if (css.includes('!important')) fail('V5 shared stylesheet must not introduce !important');
if (/\.paper(?:\b|\s|[.:#>+~\[])/.test(css)) fail('V5 shared application stylesheet must not target the report document');
if (/@media\s+print/i.test(css)) fail('V5 shared application stylesheet must not contain print rules');
if (/V[1-4](?:\.|\b)/.test(css)) fail('V5 shared stylesheet must not carry legacy version blocks');

const forbiddenLegacyApplicationFamilies = [
  'dashboard-',
  'history-',
  'master-',
  'settings-',
  'system-',
  'export-',
  'studio-',
  'mobile-more',
  'app-brand',
  'device-profile-chip',
  'price-report-device',
  'product-workspace',
  'product-card',
  'panel-edge-toggle',
  'card-collapse-handle'
];

for (const family of forbiddenLegacyApplicationFamilies) {
  if (legacyCss.includes(family)) {
    fail('Migrated application selector leaked back into report CSS: ' + family);
  }
}

const semanticTokens = [
  '--v5-divider:#edf1f5',
  '--v5-heading:#18385f',
  '--v5-data-heading:#29415f',
  '--v5-data-value:#294667',
  '--v5-accent-purple:#7653d9',
  '--v5-accent-purple-soft:#f2edff',
  '--v5-danger-surface:#fffafa'
];
for (const token of semanticTokens) {
  if (!css.includes(token)) fail('V5 semantic token missing: ' + token);
}
for (const literal of ['#edf1f5','#18385f','#29415f','#294667','#7653d9','#f2edff','#fffafa']) {
  const count = css.toLowerCase().split(literal).length - 1;
  if (count > 1) fail('Semantic color literal escaped token ownership: ' + literal + ' (' + count + ')');
}

const mediaCount = (css.match(/@media/g) || []).length;
if (mediaCount > 4) fail('V5 shared responsive layer has too many media-query blocks: ' + mediaCount);
const studioMediaCount = (studioCss.match(/@media/g) || []).length;
if (studioMediaCount > 4) fail('V5.8 Studio responsive layer has too many media-query blocks: ' + studioMediaCount);

const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const studioWithoutComments = studioCss.replace(/\/\*[\s\S]*?\*\//g, '');

function splitSelectorList(prelude) {
  const values = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < prelude.length; index += 1) {
    const char = prelude[index];
    if (char === '(') parenDepth += 1;
    else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (char === '[') bracketDepth += 1;
    else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (char === ',' && parenDepth === 0 && bracketDepth === 0) {
      values.push(prelude.slice(start, index).trim());
      start = index + 1;
    }
  }

  values.push(prelude.slice(start).trim());
  return values.filter(Boolean);
}

function extractSelectors(source) {
  const selectors = [];
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf('{', cursor);
    if (open < 0) break;

    const prelude = source.slice(cursor, open).trim();
    let depth = 1;
    let close = open + 1;
    for (; close < source.length && depth > 0; close += 1) {
      if (source[close] === '{') depth += 1;
      else if (source[close] === '}') depth -= 1;
    }
    const body = source.slice(open + 1, Math.max(open + 1, close - 1));

    if (/^@(media|supports|container|layer)\b/i.test(prelude)) {
      selectors.push(...extractSelectors(body));
    } else if (prelude && !prelude.startsWith('@')) {
      selectors.push(...splitSelectorList(prelude));
    }

    cursor = close;
  }

  return selectors;
}

function parseDeclarationMap(body) {
  const values = {};
  body.split(';').forEach((entry) => {
    const colon = entry.indexOf(':');
    if (colon <= 0) return;
    const property = entry.slice(0, colon).trim();
    const value = entry.slice(colon + 1).trim();
    if (property && value) values[property] = value;
  });
  return values;
}

function extractRootRules(source) {
  const rules = [];
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf('{', cursor);
    if (open < 0) break;

    const prelude = source.slice(cursor, open).trim();
    let depth = 1;
    let close = open + 1;
    for (; close < source.length && depth > 0; close += 1) {
      if (source[close] === '{') depth += 1;
      else if (source[close] === '}') depth -= 1;
    }

    const body = source.slice(open + 1, Math.max(open + 1, close - 1));
    if (prelude && !prelude.startsWith('@')) {
      const declarations = parseDeclarationMap(body);
      splitSelectorList(prelude).forEach((selector) => rules.push({ selector, declarations }));
    }
    cursor = close;
  }

  return rules;
}

const rootRuleMap = new Map();
extractRootRules(withoutComments).forEach((rule) => {
  const items = rootRuleMap.get(rule.selector) || [];
  items.push(rule.declarations);
  rootRuleMap.set(rule.selector, items);
});

const rootConflicts = [];
for (const [selector, ruleSets] of rootRuleMap.entries()) {
  const properties = new Map();
  ruleSets.forEach((declarations) => {
    Object.entries(declarations).forEach(([property, value]) => {
      const values = properties.get(property) || new Set();
      values.add(value);
      properties.set(property, values);
    });
  });
  for (const [property, values] of properties.entries()) {
    if (values.size > 1) {
      rootConflicts.push(selector + ' :: ' + property + ' => ' + [...values].join(' | '));
    }
  }
}

if (rootConflicts.length) {
  fail('V5 root cascade conflicts detected: ' + rootConflicts.slice(0, 8).join(' || '));
}

const selectorRules = extractSelectors(withoutComments);
const unscoped = selectorRules.filter(selector =>
  selector !== ':root' &&
  !selector.startsWith('body.v5-ui')
);

if (unscoped.length) {
  fail('V5 shared application selectors must be explicitly scoped: ' + unscoped.slice(0, 8).join(' | '));
}

const studioSelectors = extractSelectors(studioWithoutComments);
const studioUnscoped = studioSelectors.filter(selector =>
  selector !== ':root' &&
  !selector.startsWith('body.v5-ui.reference-ui-v58')
);
if (studioUnscoped.length) {
  fail('V5.8 Studio selectors must be explicitly scoped: ' + studioUnscoped.slice(0, 8).join(' | '));
}

if (!process.exitCode) {
  console.log('V5 UI GUARD PASS:', mediaCount, 'shared media blocks,', studioMediaCount, 'Studio media blocks, 0 !important, report CSS isolated');
}
