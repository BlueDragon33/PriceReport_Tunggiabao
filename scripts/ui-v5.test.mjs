import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/ui-v5.css', import.meta.url), 'utf8');

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

const mediaCount = (css.match(/@media/g) || []).length;
if (mediaCount > 4) fail('V5 responsive layer has too many media-query blocks: ' + mediaCount);

const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const selectorLines = withoutComments
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('@') && line.includes('{'))
  .map(line => line.slice(0, line.indexOf('{')).trim())
  .filter(selector => selector && !selector.includes(';'))
  .flatMap(group => group.split(',').map(value => value.trim()).filter(Boolean));

const unscoped = selectorLines.filter(selector =>
  selector !== ':root' &&
  !selector.startsWith('body.v5-ui')
);

if (unscoped.length) {
  fail('V5 application selectors must be explicitly scoped: ' + unscoped.slice(0, 8).join(' | '));
}

if (!process.exitCode) {
  console.log('V5 UI GUARD PASS:', mediaCount, 'responsive blocks, 0 !important, report CSS isolated');
}
