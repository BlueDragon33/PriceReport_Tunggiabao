import assert from 'node:assert/strict';
import { buildVersionedHistoryRecord } from '../src/domain/history.js';

const first = buildVersionedHistoryRecord({
  id:'history-1', savedAt:'2026-09-27T10:00:00.000Z', status:'draft', currency:'VND', total:100,
  data:{ quoteNo:'BG-1', quoteTitle:'Bản 1' }
});
assert.equal(first.id,'history-1');
assert.equal(first.quotationId,'history-1');
assert.equal(first.revision,1);
assert.deepEqual(first.revisions,[]);

const second = buildVersionedHistoryRecord({
  existingRecord:first, id:'ignored', savedAt:'2026-09-27T11:00:00.000Z', status:'sent', currency:'VND', total:120,
  data:{ quoteNo:'BG-1', quoteTitle:'Bản 2' }
});
assert.equal(second.id,'history-1');
assert.equal(second.quotationId,'history-1');
assert.equal(second.revision,2);
assert.equal(second.revisions.length,1);
assert.equal(second.revisions[0].revision,1);
assert.equal(second.revisions[0].data.quoteTitle,'Bản 1');
assert.equal(second.data.quoteTitle,'Bản 2');
second.data.quoteTitle='mutated current';
assert.equal(second.revisions[0].data.quoteTitle,'Bản 1');

console.log('HISTORY REVISION DOMAIN PASS');
