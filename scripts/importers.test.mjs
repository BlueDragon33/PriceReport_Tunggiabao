import assert from 'node:assert/strict';
import { mergeImportDraft, parseHandwritingText, parseSpreadsheetRows } from '../src/importers.js';

const rows = [
  ['HKD - Tùng Gia Bảo','','','',''],
  ['Địa chỉ:','Lô BT02-25 đường số 29 KĐT Nam Nha Trang','','',''],
  [],
  ['THÔNG BÁO','','','',''],
  ['Gía lương thực , thực phẩm tháng 09/2026','','','',''],
  ['Kính gửi: ','','','',''],
  ['HKD chúng tôi xin gửi tới quý khách hàng bảng báo giá như sau:','','','',''],
  [],
  ['STT','Mặt hàng','ĐVT','Đơn giá','Ghi chú'],
  ['CÁC SẢN PHẨM TRỨNG','','','',''],
  [1,'Trứng gà đỏ','kg',39000,''],
  [2,'Trứng gà ta','quả',3500,''],
  ['CÁC SẢN PHẨM THỊT GIA CẦM','','','',''],
  ['STT','Mặt hàng','ĐVT','Đơn giá','Ghi chú'],
  [1,'Ức gà phi lê','kg',76000,''],
  [],
  ['', 'Nha Trang, ngày     tháng  09  năm 2026','','',''],
  ['', 'HKD TÙNG GIA BẢO','','','']
];

const excel = parseSpreadsheetRows(rows);
assert.equal(excel.fields.companyName, 'HKD - Tùng Gia Bảo');
assert.equal(excel.fields.companyAddress, 'Lô BT02-25 đường số 29 KĐT Nam Nha Trang');
assert.equal(excel.fields.quoteTitle, 'THÔNG BÁO');
assert.equal(excel.fields.quoteSubtitle, 'Giá lương thực , thực phẩm tháng 09/2026');
assert.equal(excel.fields.recipientLine, 'Kính gửi: QUÝ KHÁCH HÀNG');
assert.equal(excel.fields.intro, 'HKD chúng tôi xin gửi tới quý khách hàng bảng báo giá như sau:');
assert.equal(excel.fields.dateLine, 'Nha Trang, ngày tháng 09 năm 2026');
assert.equal(excel.fields.rightName, 'HKD TÙNG GIA BẢO');
assert.equal(excel.products.length, 3);
assert.equal(excel.products[0].group, 'CÁC SẢN PHẨM TRỨNG');
assert.equal(excel.products[2].group, 'CÁC SẢN PHẨM THỊT GIA CẦM');
assert.equal(excel.products[0].price, 39000);
assert.equal(excel.layoutHints.showQty, false);
assert.equal(excel.layoutHints.showAmount, false);

const handwriting = parseHandwritingText(`
HKD - Tùng Gia Bảo
BT02 - lô 25 Đg 29 KĐT Nam Nha Trang - Khánh Hòa
ĐT. 0962944688
Bảng báo giá
Kính gửi Quý khách hàng
`);
assert.equal(handwriting.fields.companyName, 'HKD - Tùng Gia Bảo');
assert.equal(handwriting.fields.phone, '0962944688');
assert.equal(handwriting.fields.quoteTitle, 'BẢNG BÁO GIÁ');
assert.match(handwriting.fields.recipientLine, /^Kính gửi:/);
assert.match(handwriting.fields.companyAddress, /Nam Nha Trang/);

const merged = mergeImportDraft(excel, handwriting);
assert.equal(merged.fields.phone, '0962944688');
assert.equal(merged.products.length, 3);
assert.equal(merged.fields.companyName, 'HKD - Tùng Gia Bảo');

console.log('IMPORTER LOGIC PASS');


const invalidPriceRows = [
  ['STT','Mặt hàng','ĐVT','Đơn giá','Ghi chú'],
  [1,'Không phải sản phẩm','kg','N/A','ghi chú'],
  [2,'Giá 0 hợp lệ','kg',0,'']
];
const invalidParsed = parseSpreadsheetRows(invalidPriceRows);
assert.equal(invalidParsed.products.length, 1);
assert.equal(invalidParsed.products[0].name, 'Giá 0 hợp lệ');
assert.equal(invalidParsed.products[0].price, 0);

const repeatSource = mergeImportDraft(
  { source: 'excel+handwriting', fields: {}, products: [], groups: [], warnings: [], unmatched: [], layoutHints: {} },
  { source: 'handwriting', fields: {}, products: [], groups: [], warnings: [], unmatched: [], layoutHints: {} }
);
assert.equal(repeatSource.source, 'excel+handwriting');
