import assert from 'node:assert/strict';
import { buildReportViewModel } from '../src/report/report-view-model.js';
const model=buildReportViewModel({companyName:'TGB',customerName:'Khách',quoteNo:'BG-1',currency:'VND',products:[{itemId:'i1',name:'A',qty:2,price:100}],discountPct:10,vatPct:8,otherFee:5,termsText:'Dòng 1\nDòng 2'});
assert.equal(model.quote.quoteNo,'BG-1'); assert.equal(model.company.name,'TGB'); assert.equal(model.customer.name,'Khách');
assert.equal(model.items[0].itemId,'i1'); assert.equal(model.totals.subtotal,200); assert.equal(model.totals.total,199.4);
assert.deepEqual(model.terms,['Dòng 1','Dòng 2']);
console.log('REPORT VIEW MODEL PASS');
