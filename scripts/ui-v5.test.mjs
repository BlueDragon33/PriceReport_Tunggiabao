import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');
const legacyCss = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

function fail(message) {
  console.error('V5 UI FAIL:', message);
  process.exitCode = 1;
}

if (!css.includes('--v5-primary:')) fail('V5 design tokens are missing');
if (!css.includes('body.v5-ui')) fail('V5 stylesheet is not body-scoped');
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
