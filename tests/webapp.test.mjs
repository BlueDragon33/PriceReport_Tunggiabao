import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('src/app.js','utf8');
const css=fs.readFileSync('assets/styles.css','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));

test('main webapp surfaces exist',()=>{
  for(const id of ['companyForm','customerForm','productEditor','financeForm','termsForm','templateGrid','paper','quoteBody','totals']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
});

test('editor supports all core quotation domains',()=>{
  for(const marker of ['company.','customer.','quote.','finance.','terms.','signature.','display.']){
    assert.ok(js.includes(marker),marker+' state missing');
  }
  assert.ok(js.includes("['Chân trang','footer','textarea']"));
  assert.ok(js.includes("['Hiện logo','display.showLogo']"));
});

test('A4 and print contract is defined',()=>{
  assert.ok(css.includes('width:210mm'));
  assert.ok(css.includes('min-height:297mm'));
  assert.ok(css.includes('@media print'));
  assert.ok(css.includes('@page{size:A4 portrait'));
});

test('PWA manifest is installable',()=>{
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.lang,'vi');
  assert.ok(Array.isArray(manifest.icons)&&manifest.icons.length>0);
});
