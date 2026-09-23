import assert from 'node:assert/strict';
import { detectSpreadsheetHeader, inferSpreadsheetColumns, mergeImportDraft, normalizeImportedPhone, normalizeImportedProduct, parseHandwritingText, parseMappedSpreadsheetRows, parsePastedTable, parseSpreadsheetRows } from '../src/importers.js';

const rows = [
  ['HKD - Tùng Gia Bảo','','','',''],
  ['Địa chỉ chi tiết:','Lô BT02-25 đường số 29 KĐT Nam Nha Trang','','',''],
  ['Khu vực:','Phường Nam Nha Trang, Tỉnh Khánh Hòa','','',''],
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
assert.equal(excel.fields.companyAddressDetail, 'Lô BT02-25 đường số 29 KĐT Nam Nha Trang');
assert.equal(excel.fields.companyWard, 'Nam Nha Trang');
assert.equal(excel.fields.companyProvince, 'Khánh Hòa');
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
assert.match(handwriting.fields.companyAddressDetail, /Nam Nha Trang/);
assert.equal(handwriting.fields.companyProvince, 'Khánh Hòa');

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


const blankNotes = parseSpreadsheetRows([
  ['STT','Mặt hàng','ĐVT','Đơn giá','Ghi chú'],
  ['CÁC SẢN PHẨM TRỨNG','','','',''],
  [1,'Trứng gà đỏ','kg',39000,''],
  [2,'Trứng gà ta','quả',3500,'']
]);
assert.equal(blankNotes.layoutHints.showNote, false);

const realNotes = parseSpreadsheetRows([
  ['STT','Mặt hàng','ĐVT','Đơn giá','Ghi chú'],
  ['CÁC SẢN PHẨM TRỨNG','','','',''],
  [1,'Trứng gà đỏ','kg',39000,'Giao sáng']
]);
assert.equal(realNotes.layoutHints.showNote, true);

const firstOcr = mergeImportDraft(null, parseHandwritingText('HKD - Sai tên\nĐT. 0900000000'));
const reparsedOcr = mergeImportDraft(
  firstOcr,
  parseHandwritingText('HKD - Tùng Gia Bảo\nĐT. 0962944688'),
  { replaceSourceFields: true }
);
assert.equal(reparsedOcr.fields.companyName, 'HKD - Tùng Gia Bảo');
assert.equal(reparsedOcr.fields.phone, '0962944688');
assert.equal(reparsedOcr.fieldSources.companyName, 'handwriting');

const excelFirst = mergeImportDraft(null, { source:'excel', fields:{
  companyName:'HKD Excel',
  companyAddressDetail:'Địa chỉ Excel',
  companyProvince:'Khánh Hòa',
  companyWard:'Nam Nha Trang'
} });
const mixedReparse = mergeImportDraft(
  mergeImportDraft(excelFirst, parseHandwritingText('HKD - OCR sai\nĐT. 0900000000')),
  parseHandwritingText('HKD - OCR mới\nĐT. 0962944688'),
  { replaceSourceFields:true, preferNext:true }
);
assert.equal(mixedReparse.fields.companyName, 'HKD Excel');
assert.equal(mixedReparse.fields.companyAddressDetail, 'Địa chỉ Excel');
assert.equal(mixedReparse.fields.companyWard, 'Nam Nha Trang');
assert.equal(mixedReparse.fields.companyProvince, 'Khánh Hòa');
assert.equal(mixedReparse.fields.phone, '0962944688');


const inferredColumns = inferSpreadsheetColumns([
  'Tên SP', 'Nhóm hàng', 'Quy cách', 'Đơn vị tính', 'SL', 'Giá', 'Ghi chú'
]);
assert.deepEqual(inferredColumns.mapping, {
  name: 0,
  group: 1,
  pack: 2,
  unit: 3,
  qty: 4,
  price: 5,
  note: 6
});
assert.ok(inferredColumns.confidence.name >= 0.8);
assert.ok(inferredColumns.confidence.price >= 0.8);

const genericImport = parseSpreadsheetRows([
  ['Tên SP', 'Nhóm hàng', 'Quy cách', 'Đơn vị tính', 'SL', 'Giá', 'Ghi chú'],
  [' Trứng gà tươi ', 'Trứng', 'Hộp 10', 'Hộp', '2', '28.000', ' Giao sáng '],
  ['Ức gà phi lê', 'Thịt gia cầm', '', 'kg', '3', '76,000', '']
]);
assert.equal(genericImport.products.length, 2);
assert.deepEqual(genericImport.products[0], {
  group: 'Trứng',
  name: 'Trứng gà tươi',
  pack: 'Hộp 10',
  unit: 'Hộp',
  qty: 2,
  price: 28000,
  note: 'Giao sáng'
});
assert.equal(genericImport.products[1].price, 76000);
assert.equal(genericImport.products[1].qty, 3);

const englishImport = parseSpreadsheetRows([
  ['Product', 'Unit', 'Qty', 'Unit Price', 'Notes'],
  ['Eggs', 'box', '4', '28 000', '']
]);
assert.equal(englishImport.products.length, 1);
assert.equal(englishImport.products[0].name, 'Eggs');
assert.equal(englishImport.products[0].unit, 'box');
assert.equal(englishImport.products[0].qty, 4);
assert.equal(englishImport.products[0].price, 28000);

const normalizedDirty = normalizeImportedProduct({
  name: '  Trứng   gà  ',
  unit: ' Hộp ',
  qty: '',
  price: '28 000',
  note: '  mới  '
});
assert.equal(normalizedDirty.name, 'Trứng gà');
assert.equal(normalizedDirty.unit, 'Hộp');
assert.equal(normalizedDirty.qty, 1);
assert.equal(normalizedDirty.price, 28000);
assert.equal(normalizedDirty.note, 'mới');


const mappingRows = [
  ['Bảng giá tháng 9'],
  ['Tên hàng', 'ĐVT', 'Số lượng', 'Đơn giá', 'Ghi chú'],
  ['Trứng gà', 'Hộp', 2, '28 000', 'Giao sáng'],
  ['Trứng vịt', 'Khay', 3, '85.000', '']
];
const detectedHeader = detectSpreadsheetHeader(mappingRows);
assert.equal(detectedHeader.headerIndex, 1);
assert.equal(detectedHeader.mapping.name, 0);
assert.equal(detectedHeader.mapping.unit, 1);
assert.equal(detectedHeader.mapping.qty, 2);
assert.equal(detectedHeader.mapping.price, 3);

const remapped = parseMappedSpreadsheetRows(mappingRows, {
  headerIndex: 1,
  mapping: { name: 0, unit: 1, qty: 2, price: 3, note: 4 }
});
assert.equal(remapped.products.length, 2);
assert.equal(remapped.products[0].price, 28000);
assert.equal(remapped.products[1].qty, 3);
assert.deepEqual(remapped.invalidRows, []);

const dirtyMapped = parseMappedSpreadsheetRows([
  ['Product', 'Qty', 'Price'],
  ['Valid', 1, 12000],
  ['Missing price', 2, ''],
  ['', '', 30000],
  ['TOTAL', '', 42000]
], {
  headerIndex: 0,
  mapping: { name: 0, qty: 1, price: 2 }
});
assert.equal(dirtyMapped.products.length, 1);
assert.equal(dirtyMapped.invalidRows.length, 2);
assert.equal(dirtyMapped.invalidRows[0].rowNumber, 3);


const pastedWithHeader = parsePastedTable(
  'Tên sản phẩm\tĐVT\tSố lượng\tĐơn giá\nTrứng gà\tHộp\t2\t28 000\nTrứng vịt\tKhay\t3\t85.000'
);
assert.equal(pastedWithHeader.source, 'paste');
assert.equal(pastedWithHeader.products.length, 2);
assert.equal(pastedWithHeader.products[0].name, 'Trứng gà');
assert.equal(pastedWithHeader.products[0].qty, 2);
assert.equal(pastedWithHeader.products[0].price, 28000);
assert.equal(pastedWithHeader.spreadsheetMeta.mapping.price, 3);

const pastedNoHeader = parsePastedTable(
  'Trứng gà\tHộp\t2\t28 000\nTrứng vịt\tKhay\t3\t85.000'
);
assert.equal(pastedNoHeader.products.length, 2);
assert.equal(pastedNoHeader.spreadsheetMeta.headerIndex, -1);
assert.equal(pastedNoHeader.spreadsheetMeta.headers[0], 'Cột A');
assert.equal(pastedNoHeader.spreadsheetMeta.mapping.unit, 1);
assert.equal(pastedNoHeader.spreadsheetMeta.mapping.qty, 2);
assert.equal(pastedNoHeader.spreadsheetMeta.mapping.price, 3);


const invalidNegative = parseMappedSpreadsheetRows([
  ['Tên sản phẩm', 'Số lượng', 'Đơn giá'],
  ['Giá âm', 1, -12000],
  ['SL âm', -2, 15000],
  ['Hợp lệ', 2, 15000]
], {
  headerIndex: 0,
  mapping: { name: 0, qty: 1, price: 2 }
});
assert.equal(invalidNegative.products.length, 1);
assert.equal(invalidNegative.invalidRows.length, 2);
assert.ok(invalidNegative.invalidRows[0].reasons.includes('negative-price'));
assert.ok(invalidNegative.invalidRows[1].reasons.includes('negative-qty'));

const duplicateRows = parseMappedSpreadsheetRows([
  ['Tên sản phẩm', 'ĐVT', 'Đơn giá'],
  [' Trứng gà tươi ', 'Hộp', 28000],
  ['Trứng gà tươi', 'Hộp', 28500],
  ['Trứng vịt', 'Khay', 85000]
], {
  headerIndex: 0,
  mapping: { name: 0, unit: 1, price: 2 }
});
assert.equal(duplicateRows.products.length, 3);
assert.equal(duplicateRows.duplicates.length, 1);
assert.deepEqual(duplicateRows.duplicates[0].indexes, [0, 1]);


const repairRows = [
  ['Tên SP', 'SL', 'Giá'],
  ['', '2', '28 000']
];
const repairMapping = detectSpreadsheetHeader(repairRows);
const beforeRepair = parseMappedSpreadsheetRows(repairRows, {
  headerIndex: repairMapping.headerIndex,
  mapping: repairMapping.mapping
});
assert.equal(beforeRepair.products.length, 0);
assert.equal(beforeRepair.invalidRows.length, 1);
assert.equal(beforeRepair.invalidRows[0].rowNumber, 2);
assert.ok(beforeRepair.invalidRows[0].reasons.includes('missing-name'));

repairRows[1][repairMapping.mapping.name] = 'Trứng gà sửa lại';
const afterRepair = parseMappedSpreadsheetRows(repairRows, {
  headerIndex: repairMapping.headerIndex,
  mapping: repairMapping.mapping
});
assert.equal(afterRepair.invalidRows.length, 0);
assert.equal(afterRepair.products.length, 1);
assert.equal(afterRepair.products[0].name, 'Trứng gà sửa lại');
assert.equal(afterRepair.products[0].qty, 2);
assert.equal(afterRepair.products[0].price, 28000);


const duplicateResolutionRows = [
  ['Tên SP', 'ĐVT', 'SL', 'Giá'],
  ['Trứng gà', 'Hộp', '2', '28000'],
  ['Trứng gà', 'Hộp', '3', '28000'],
  ['Trứng vịt', 'Hộp', '1', '32000']
];
const duplicateHeader = detectSpreadsheetHeader(duplicateResolutionRows);
const duplicateParsed = parseMappedSpreadsheetRows(duplicateResolutionRows, {
  headerIndex: duplicateHeader.headerIndex,
  mapping: duplicateHeader.mapping
});
assert.equal(duplicateParsed.duplicates.length, 1);
assert.deepEqual(duplicateParsed.duplicates[0].rowNumbers, [2, 3]);
assert.deepEqual(duplicateParsed.duplicates[0].quantities, [2, 3]);
assert.deepEqual(duplicateParsed.duplicates[0].prices, [28000, 28000]);

const duplicateSkipped = parseMappedSpreadsheetRows(duplicateResolutionRows, {
  headerIndex: duplicateHeader.headerIndex,
  mapping: duplicateHeader.mapping,
  excludedRows: [3]
});
assert.equal(duplicateSkipped.duplicates.length, 0);
assert.equal(duplicateSkipped.products.length, 2);
assert.equal(duplicateSkipped.products.some(product => product.name === 'Trứng vịt'), true);


assert.equal(normalizeImportedPhone('+84 962 944 688'), '0962944688');
assert.equal(normalizeImportedPhone('0084 962 944 688'), '0962944688');
assert.equal(normalizeImportedPhone('0962.944.688'), '0962944688');

const currencyNormalized = normalizeImportedProduct({
  name: '\u200B Trứng gà ',
  qty: '2',
  price: '28.000 đ'
});
assert.equal(currencyNormalized.name, 'Trứng gà');
assert.equal(currencyNormalized.price, 28000);

const currencyCodeNormalized = normalizeImportedProduct({
  name: 'Trứng vịt',
  qty: '1',
  price: '32,000 VND'
});
assert.equal(currencyCodeNormalized.price, 32000);

const internationalPhoneSheet = parseSpreadsheetRows([
  ['HKD Test'],
  ['SĐT:', '+84 962 944 688'],
  ['STT', 'Mặt hàng', 'ĐVT', 'Đơn giá'],
  [1, 'Trứng gà', 'Hộp', '28.000 đ']
]);
assert.equal(internationalPhoneSheet.fields.phone, '0962944688');
assert.equal(internationalPhoneSheet.products[0].price, 28000);


for (const size of [100, 300, 500]) {
  const largeRows = [
    ['Tên SP', 'Nhóm hàng', 'ĐVT', 'SL', 'Giá'],
    ...Array.from({ length: size }, (_, index) => [
      'Sản phẩm ' + (index + 1),
      index % 2 ? 'Nhóm A' : 'Nhóm B',
      'Hộp',
      String((index % 5) + 1),
      String(28000 + index)
    ])
  ];
  const largeHeader = detectSpreadsheetHeader(largeRows);
  const largeParsed = parseMappedSpreadsheetRows(largeRows, {
    headerIndex: largeHeader.headerIndex,
    mapping: largeHeader.mapping
  });
  assert.equal(largeParsed.products.length, size);
  assert.equal(largeParsed.invalidRows.length, 0);
}
