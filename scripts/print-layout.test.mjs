import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/print-v618.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

const marker = 'V6.18 PDF / PRINT ISOLATION';
assert.ok(css.includes(marker), 'V6.18 print isolation stylesheet is missing its release marker');
const printCss = css;

assert.match(printCss, /@page\{size:A4 portrait;margin:0\}/, 'A4 zero-margin page contract is missing');
assert.match(printCss, /\.shell>:not\(\.preview\)/, 'application shell must isolate preview during print');
assert.match(printCss, /\.preview>:not\(\.paper-wrap\)/, 'preview must isolate the paper wrapper during print');
assert.match(printCss, /#app>:not\(\.shell\)[\s\S]*\.shell>:not\(\.preview\)[\s\S]*\.preview>:not\(\.paper-wrap\)[\s\S]*display:none!important/, 'print tree must structurally remove all application chrome');
assert.match(printCss, /\.paper\{[\s\S]*box-sizing:border-box!important/, 'A4 paper must use border-box sizing in print');
assert.match(printCss, /width:210mm!important/, 'print width must be locked to A4');
assert.match(printCss, /min-height:297mm!important/, 'print minimum height must be locked to A4');
assert.match(printCss, /transform:none!important/, 'screen preview transforms must be removed in print');

assert.match(js, /function printQuoteDocument\(\)/, 'central print function is missing');
assert.match(js, /classList\.toggle\('print-export-active'/, 'print export state guard is missing');
assert.match(js, /addEventListener\('beforeprint'/, 'beforeprint guard is missing');
assert.match(js, /addEventListener\('afterprint'/, 'afterprint cleanup is missing');
assert.equal((js.match(/window\.print\(\)/g) || []).length, 1, 'all print actions must route through printQuoteDocument');
assert.match(js, /\$\$\('\.print-action'\)\.forEach/, 'all PDF buttons must keep the multi-element event binding');

console.log('V6.18 PRINT/PDF ISOLATION PASS');
