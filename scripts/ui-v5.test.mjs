import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');
const legacyCss = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function fail(message) {
  console.error('V5 UI FAIL:', message);
  process.exitCode = 1;
}

if (!css.includes('--v5-primary:')) fail('V5 design tokens are missing');
if (!css.includes('body.v5-ui')) fail('V5 stylesheet is not body-scoped');
if (!html.includes('class="v5-ui reference-ui-v57"')) fail('V5.7 reference UI scope is not active on the application body');
if (!css.includes('V5.7 reference-fidelity UI/UX refactor')) fail('V5.7 reference-fidelity refactor block is missing');
if (!css.includes('--v5-sidebar-width:118px') || !css.includes('--nav:118px') || !css.includes('--edit:320px') || !css.includes('--design:368px')) fail('V5.7 reference desktop geometry 118/320/flexible/368 is missing');
if (!css.includes('body.v5-ui.reference-ui-v57{') || !css.includes('font-size:15px')) fail('V5.7 readable application typography baseline is missing');
if (!css.includes('min-height:204px') || !css.includes('grid-template-columns:minmax(0,1fr) 300px')) fail('V5.7 workspace proportion polish is missing');
if (!css.includes('body.v5-ui.reference-ui-v57 .history-workspace .history-table-row') || !css.includes('min-height:70px')) fail('V5.7 readable management-row density is missing');
if (!css.includes('width:min(1020px,96vw)') || !css.includes('width:min(1040px,96vw)')) fail('V5.7 modal hierarchy sizing is missing'); // V5.7 workspace proportion polish
if (!css.includes('min-height:112px') || !css.includes('body.v5-ui.reference-ui-v57 .export-action-card b')) fail('V5.7 Publishing/Data Center action-card refactor is missing');
if (!css.includes('body.v5-ui.reference-ui-v57 .tpl span') || !css.includes('font-size:12px')) fail('V5.7 readable template-card typography is missing');
if (!css.includes('V5.7 Pass 4: contextual navigation hierarchy')) fail('V5.7 contextual navigation pass is missing');
if (!css.includes('grid-template-columns:118px 320px minmax(620px,1fr) 368px')) fail('V5.7 Studio must place preview between editor and inspector');
if (!css.includes('.shell:not(.app-workspace) .preview{') || !css.includes('grid-column:3')) fail('V5.7 preview grid placement is missing');
if (!css.includes('.shell:not(.app-workspace) .design{') || !css.includes('grid-column:4')) fail('V5.7 inspector grid placement is missing');
if (!css.includes('background:#0b2442') || !css.includes('background:#263a54')) fail('V5.7 dark studio chrome / neutral preview canvas is missing');
if (!html.includes('data-inspector-tab="design"') || !html.includes('data-inspector-tab="content"') || !html.includes('data-inspector-tab="check"')) fail('V5.7 Design/Content/Check inspector tabs are missing');
if (!css.includes('V5.7 Pass 5: right inspector tabs') || !css.includes('.design>.inspector-tabs')) fail('V5.7 inspector tab styling is missing');
if (!css.includes('.shell.app-workspace .nav button[data-tab="customer"]') || !css.includes('.shell.app-workspace .nav button[data-tab="presets"]')) fail('V5.7 management navigation still exposes quotation-step clutter');
if (!css.includes('.shell:not(.app-workspace) .nav button[data-tab="payment"]') || !css.includes('.shell:not(.app-workspace) .nav button[data-tab="export"]')) fail('V5.7 Studio rail still exposes workflow-step clutter');
if (css.includes('!important')) fail('V5 stylesheet must not introduce !important');
if (/\.paper(?:\b|\s|[.:#>+~\[])/.test(css)) fail('V5 application stylesheet must not target the report document');
if (/@media\s+print/i.test(css)) fail('V5 application stylesheet must not contain print rules');
if (/V[1-4](?:\.|\b)/.test(css)) fail('V5 stylesheet must not carry legacy version blocks');

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
if (mediaCount > 4) fail('V5 responsive layer has too many media-query blocks: ' + mediaCount);

const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

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
  fail('V5 application selectors must be explicitly scoped: ' + unscoped.slice(0, 8).join(' | '));
}

if (!process.exitCode) {
  console.log('V5 UI GUARD PASS:', mediaCount, 'responsive blocks, 0 !important, report CSS isolated');
}
