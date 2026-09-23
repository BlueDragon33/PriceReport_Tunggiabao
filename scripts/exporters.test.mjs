import assert from 'node:assert/strict';
import { csvFromRows, productRowsForExport } from '../src/exporters.js';

const rows = productRowsForExport([
  { group:'Trứng', name:'Trứng gà', pack:'Hộp 10', unit:'Hộp', qty:2, price:28000, note:'Giao sáng' },
  { group:'Thịt', name:'Ức gà', pack:'500g', unit:'Gói', qty:3, price:76000, note:'Lạnh' },
  { group:'', name:'', pack:'', unit:'', qty:1, price:0, note:'' }
]);

assert.deepEqual(rows[0], [
  'STT','Nhóm hàng','Tên sản phẩm','Quy cách','ĐVT','Số lượng','Đơn giá','Thành tiền','Ghi chú'
]);
assert.equal(rows.length, 3);
assert.deepEqual(rows[1], [1,'Trứng','Trứng gà','Hộp 10','Hộp',2,28000,56000,'Giao sáng']);
assert.deepEqual(rows[2], [2,'Thịt','Ức gà','500g','Gói',3,76000,228000,'Lạnh']);

const csv = csvFromRows([
  ['Tên sản phẩm','Ghi chú'],
  ['Trứng gà','Giao sáng, trước 8h'],
  ['Hàng "đặc biệt"','Dòng 1\nDòng 2']
]);
assert.ok(csv.startsWith('\uFEFF'));
assert.match(csv, /"Giao sáng, trước 8h"/);
assert.match(csv, /"Hàng ""đặc biệt"""/);
assert.match(csv, /"Dòng 1\nDòng 2"/);

console.log('EXPORTER LOGIC PASS');
