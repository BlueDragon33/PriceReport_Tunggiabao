import assert from 'node:assert/strict';
import { csvFromRows, productRowsForExport, quotationWorkbookModel } from '../src/exporters.js';

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


const workbook = quotationWorkbookModel({
  companyName: 'HKD Tùng Gia Bảo',
  companyAddressDetail: 'Lô BT02-25 đường số 29',
  companyProvince: 'Khánh Hòa',
  phone: '0962944688',
  taxCode: '4200000000',
  quoteTitle: 'BẢNG BÁO GIÁ',
  quoteSubtitle: 'Tháng 09/2026',
  quoteNo: 'BG-2026-009',
  quoteDate: '2026-09-24',
  validity: '7 ngày',
  recipientLine: 'Kính gửi: Công ty ABC',
  showCustomer: true,
  customerName: 'Nguyễn Văn A',
  customerCompany: 'Công ty ABC',
  customerAddress: 'Nha Trang',
  customerPhone: '0900000000',
  customerEmail: 'a@example.com',
  customerContact: 'Phòng mua hàng',
  intro: 'Trân trọng gửi báo giá:',
  currency: 'VND',
  discountPct: 10,
  vatPct: 8,
  showTotals: true,
  otherFee: 12000,
  showPaymentBlock: true,
  paymentMethod: 'Chuyển khoản',
  bankName: 'Vietcombank',
  bankAccount: '123456789',
  bankOwner: 'HKD Tùng Gia Bảo',
  showTerms: true,
  termsTitle: 'ĐIỀU KHOẢN',
  termsText: '1. Giao hàng trong 2 ngày\n• Thanh toán trong 7 ngày',
  dateLine: 'Nha Trang, ngày 24 tháng 09 năm 2026',
  rightTitle: 'ĐẠI DIỆN HKD',
  rightName: 'HKD TÙNG GIA BẢO',
  products: [
    { group:'Trứng', name:'Trứng gà', pack:'Hộp 10', unit:'Hộp', qty:2, price:28000, note:'Giao sáng' },
    { group:'Thịt', name:'Ức gà', pack:'500g', unit:'Gói', qty:3, price:76000, note:'Lạnh' }
  ]
});

assert.equal(workbook.currency, 'VND');
assert.equal(workbook.total, 288048);
assert.ok(workbook.productHeaderRow >= 1);
assert.equal(workbook.productFirstDataRow, workbook.productHeaderRow + 1);
assert.equal(workbook.productLastDataRow, workbook.productHeaderRow + 2);
assert.ok(workbook.mergeRows.length >= 5);
assert.ok(workbook.moneyCells.some(cell => cell.row === workbook.productFirstDataRow && cell.col === 6));
assert.ok(workbook.moneyCells.some(cell => cell.row === workbook.productFirstDataRow && cell.col === 7));
assert.ok(workbook.totalRows.length >= 4);

const workbookText = workbook.rows.flat().join(' | ');
for (const expected of [
  'HKD Tùng Gia Bảo',
  'BG-2026-009',
  'Nguyễn Văn A',
  'Công ty ABC',
  'Tạm tính (VND)',
  'Chiết khấu 10% (VND)',
  'VAT 8% (VND)',
  'TỔNG CỘNG (VND)',
  'THÔNG TIN THANH TOÁN',
  'Vietcombank',
  'ĐIỀU KHOẢN',
  'Giao hàng trong 2 ngày',
  'Thanh toán trong 7 ngày',
  'HKD TÙNG GIA BẢO'
]) assert.ok(workbookText.includes(expected), 'missing workbook content: ' + expected);

const termRows = workbook.rows.filter(row => row[0] === 1 || row[0] === 2);
assert.deepEqual(termRows.slice(-2), [
  [1, 'Giao hàng trong 2 ngày'],
  [2, 'Thanh toán trong 7 ngày']
]);

console.log('PROFESSIONAL WORKBOOK MODEL PASS');


const priceListWorkbook = quotationWorkbookModel({
  companyName: 'HKD Tùng Gia Bảo',
  quoteTitle: 'BẢNG GIÁ',
  currency: 'VND',
  showTotals: false,
  showPaymentBlock: false,
  showTerms: false,
  products: [{ name: 'Trứng gà', unit: 'quả', qty: 1, price: 3500 }]
});
const priceListText = priceListWorkbook.rows.flat().join(' | ');
assert.equal(priceListWorkbook.totalRows.length, 0);
assert.equal(priceListText.includes('TỔNG CỘNG'), false);
assert.equal(priceListText.includes('THÔNG TIN THANH TOÁN'), false);


const safeCsv = csvFromRows([
  ['Tên', 'Giá trị'],
  ['Công thức nguy hiểm', '=HYPERLINK("https://example.com","x")'],
  ['Cộng', '+SUM(1,2)'],
  ['Trừ dạng text', '-cmd|test'],
  ['At', '@SUM(1,2)'],
  ['Số âm thật', -1200],
]);
assert.ok(safeCsv.includes('Công thức nguy hiểm,"\'=HYPERLINK(""https://example.com"",""x"")"'));
assert.ok(safeCsv.includes('Cộng,"\'+SUM(1,2)"'));
assert.ok(safeCsv.includes("Trừ dạng text,'-cmd|test"));
assert.ok(safeCsv.includes('At,"\'@SUM(1,2)"'));
assert.ok(safeCsv.includes('Số âm thật,-1200'));

const normalizedRows = productRowsForExport([
  { name: 'Không cho âm', qty: -3, price: -5000 },
  { name: 'Giữ số hợp lệ', qty: 2.5, price: 10000 },
]);
assert.deepEqual(normalizedRows[1].slice(5, 8), [0, 0, 0]);
assert.deepEqual(normalizedRows[2].slice(5, 8), [2.5, 10000, 25000]);

const normalizedWorkbook = quotationWorkbookModel({
  currency: 'VND',
  showTotals: true,
  showPaymentBlock: false,
  showTerms: false,
  products: [
    { name: 'Âm phải chặn', qty: -2, price: 10000 },
    { name: 'Giá âm phải chặn', qty: 3, price: -5000 },
    { name: 'Hợp lệ', qty: 2, price: 15000 },
  ],
});
assert.equal(normalizedWorkbook.total, 30000);
const negativeExportText = normalizedWorkbook.rows.flat().join(' | ');
assert.equal(negativeExportText.includes('-5000'), false);

console.log('EXPORT HARDENING PASS');
