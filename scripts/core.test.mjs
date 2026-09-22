import assert from 'node:assert/strict';
import {
  calcQuoteTotal,
  historyTotalsByCurrency,
  nextDuplicateQuoteNo,
  normalizeBoundedNumber,
  normalizeCatalogCurrency,
  normalizeNonNegativeNumber,
  normalizePhone,
  isValidISODate,
  localDateISO
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
assert.equal(nextDuplicateQuoteNo('BG-001-COPY-2', ['BG-001-COPY']), 'BG-001-COPY-2');

assert.deepEqual(historyTotalsByCurrency([
  {currency:'VND', total:1000, data:{}},
  {data:{currency:'USD',products:[{qty:2,price:5}]}},
  {data:{products:[{qty:1,price:500}]}}
]), {VND:1500,USD:10});

assert.equal(normalizeCatalogCurrency('usd'), 'USD');
assert.equal(normalizeCatalogCurrency('eur'), 'VND');
assert.equal(normalizeNonNegativeNumber('Infinity'), 0);
assert.equal(normalizeNonNegativeNumber(-10), 0);
assert.equal(normalizeNonNegativeNumber('12.5'), 12.5);
assert.equal(localDateISO(new Date(2026, 0, 2, 1, 30)), '2026-01-02');
assert.equal(normalizeBoundedNumber('Infinity', 20, 32, 25), 25);
assert.equal(normalizeBoundedNumber(99, 20, 32, 25), 32);
assert.equal(isValidISODate('2026-02-28'), true);
assert.equal(isValidISODate('2026-02-30'), false);
assert.equal(isValidISODate('28/02/2026'), false);
assert.deepEqual(historyTotalsByCurrency([{currency:'EUR',total:2,data:{}}]), {VND:2});

console.log('CORE LOGIC PASS');
