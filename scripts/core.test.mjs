import assert from 'node:assert/strict';
import {
  calcQuoteTotal,
  historyTotalsByCurrency,
  nextDuplicateQuoteNo,
  normalizeCatalogCurrency,
  normalizePhone
} from '../src/core.js';

function close(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} !== ${expected}`);
}

close(calcQuoteTotal({
  products:[{qty:100,price:28000}],
  discountPct:5,
  vatPct:8,
  otherFee:0
}), 2872800);

close(calcQuoteTotal({
  products:[{qty:-2,price:100},{qty:2,price:-100}],
  discountPct:999,
  vatPct:999,
  otherFee:-10
}), 0);

assert.equal(normalizePhone('0888.458 222'), '0888458222');
assert.equal(nextDuplicateQuoteNo('BG-001', ['BG-001-COPY','BG-001-COPY-2']), 'BG-001-COPY-3');
assert.equal(nextDuplicateQuoteNo('BG-001', []), 'BG-001-COPY');

assert.deepEqual(historyTotalsByCurrency([
  {currency:'VND', total:1000, data:{}},
  {data:{currency:'USD',products:[{qty:2,price:5}]}},
  {data:{products:[{qty:1,price:500}]}}
]), {VND:1500,USD:10});

assert.equal(normalizeCatalogCurrency('usd'), 'USD');
assert.equal(normalizeCatalogCurrency('eur'), 'VND');

console.log('CORE LOGIC PASS');
