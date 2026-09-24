const text = (value) => String(value ?? '').trim();

export function productRowsForExport(products) {
  const rows = [[
    'STT','Nhóm hàng','Tên sản phẩm','Quy cách','ĐVT','Số lượng','Đơn giá','Thành tiền','Ghi chú'
  ]];

  (Array.isArray(products) ? products : [])
    .filter((product) => {
      if (!product || typeof product !== 'object') return false;
      const hasText = [product.group, product.name, product.pack, product.unit, product.note].some(value => text(value));
      const qty = Number(product.qty ?? 1);
      const price = Number(product.price ?? 0);
      return hasText || (Number.isFinite(qty) && qty !== 1) || (Number.isFinite(price) && price !== 0);
    })
    .forEach((product, index) => {
      const qty = Number(product.qty ?? 0);
      const price = Number(product.price ?? 0);
      rows.push([
        index + 1,
        text(product.group),
        text(product.name),
        text(product.pack),
        text(product.unit),
        Number.isFinite(qty) ? qty : 0,
        Number.isFinite(price) ? price : 0,
        (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(price) ? price : 0),
        text(product.note)
      ]);
    });

  return rows;
}

export function csvFromRows(rows) {
  const escape = (value) => {
    const valueText = String(value ?? '');
    return /[",\r\n]/.test(valueText)
      ? '"' + valueText.replace(/"/g, '""') + '"'
      : valueText;
  };
  return '\uFEFF' + (Array.isArray(rows) ? rows : [])
    .map(row => (Array.isArray(row) ? row : []).map(escape).join(','))
    .join('\r\n');
}


function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value) {
  return Math.max(0, number(value, 0));
}

function listLines(value) {
  return text(value)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

export function quotationWorkbookModel(data = {}) {
  const currency = ['VND','USD','RUB'].includes(text(data.currency).toUpperCase())
    ? text(data.currency).toUpperCase()
    : 'VND';
  const products = Array.isArray(data.products) ? data.products : [];
  const productRows = productRowsForExport(products);
  const rows = [];
  const mergeRows = [];
  const moneyCells = [];
  const totalRows = [];

  const pushMerged = (value) => {
    const rowIndex = rows.length;
    rows.push([text(value)]);
    if (text(value)) mergeRows.push(rowIndex);
    return rowIndex;
  };
  const pushPair = (label, value) => {
    if (!text(value)) return -1;
    const rowIndex = rows.length;
    rows.push([text(label), text(value)]);
    return rowIndex;
  };

  pushMerged(data.companyName || '');
  pushPair('Địa chỉ', data.companyAddressDetail || data.companyAddress || '');
  pushPair('Khu vực', [data.companyWard, data.companyProvince].map(text).filter(Boolean).join(', '));
  pushPair('Điện thoại', data.phone || '');
  pushPair('Mã số thuế', data.taxCode || '');
  if (data.showWebEmail !== false) {
    pushPair('Website', data.website || '');
    pushPair('Email', data.companyEmail || '');
  }

  rows.push([]);
  pushMerged(data.quoteTitle || 'BẢNG BÁO GIÁ');
  if (text(data.quoteSubtitle)) pushMerged(data.quoteSubtitle);
  pushPair('Mã báo giá', data.quoteNo || '');
  pushPair('Ngày báo giá', data.quoteDate || '');
  pushPair('Hiệu lực', data.validity || '');
  if (text(data.recipientLine)) pushMerged(data.recipientLine);

  if (data.showCustomer !== false) {
    pushPair('Khách hàng', data.customerName || '');
    pushPair('Đơn vị', data.customerCompany || '');
    pushPair('Địa chỉ khách hàng', data.customerAddress || '');
    pushPair('Điện thoại khách hàng', data.customerPhone || '');
    pushPair('Email khách hàng', data.customerEmail || '');
    pushPair('Người liên hệ', data.customerContact || '');
  }
  if (text(data.intro)) pushMerged(data.intro);

  rows.push([]);
  const productHeaderRow = rows.length;
  rows.push(...productRows);
  const productFirstDataRow = productHeaderRow + 1;
  const productLastDataRow = productHeaderRow + productRows.length - 1;

  for (let row = productFirstDataRow; row <= productLastDataRow; row += 1) {
    moneyCells.push({ row, col: 6 });
    moneyCells.push({ row, col: 7 });
  }

  const subtotal = products.reduce((sum, product) => {
    const qty = Math.max(0, number(product?.qty, 0));
    const price = money(product?.price);
    const meaningful = [product?.group, product?.name, product?.pack, product?.unit, product?.note].some((value) => text(value))
      || qty !== 1
      || price !== 0;
    return meaningful ? sum + qty * price : sum;
  }, 0);
  const discountPct = Math.min(100, Math.max(0, number(data.discountPct, 0)));
  const vatPct = Math.min(100, Math.max(0, number(data.vatPct, 0)));
  const discount = subtotal * discountPct / 100;
  const taxable = Math.max(0, subtotal - discount);
  const vat = taxable * vatPct / 100;
  const otherFee = money(data.otherFee);
  const total = taxable + vat + otherFee;

  rows.push([]);
  const pushTotal = (label, value) => {
    const rowIndex = rows.length;
    rows.push(['','','','','','',label,value]);
    moneyCells.push({ row: rowIndex, col: 7 });
    totalRows.push(rowIndex);
  };
  pushTotal(`Tạm tính (${currency})`, subtotal);
  if (discountPct > 0 || discount > 0) pushTotal(`Chiết khấu ${discountPct}% (${currency})`, -discount);
  if (vatPct > 0 || vat > 0) pushTotal(`VAT ${vatPct}% (${currency})`, vat);
  if (otherFee > 0) pushTotal(`Phí khác (${currency})`, otherFee);
  pushTotal(`TỔNG CỘNG (${currency})`, total);

  if (data.showPaymentBlock !== false) {
    const paymentLines = [
      ['Phương thức thanh toán', data.paymentMethod],
      ['Ngân hàng', data.bankName],
      ['Số tài khoản', data.bankAccount],
      ['Chủ tài khoản', data.bankOwner],
    ].filter(([, value]) => text(value));
    if (paymentLines.length) {
      rows.push([]);
      pushMerged('THÔNG TIN THANH TOÁN');
      paymentLines.forEach(([label, value]) => pushPair(label, value));
    }
  }

  if (data.showTerms !== false) {
    const terms = listLines(data.termsText);
    if (terms.length) {
      rows.push([]);
      pushMerged(data.termsTitle || 'ĐIỀU KHOẢN THƯƠNG MẠI');
      terms.forEach((line, index) => {
        const rowIndex = rows.length;
        rows.push([index + 1, line]);
      });
    }
  }

  const signatureLines = [data.dateLine, data.rightTitle, data.rightName].map(text).filter(Boolean);
  if (signatureLines.length) {
    rows.push([]);
    signatureLines.forEach((line) => pushMerged(line));
  }

  return {
    rows,
    currency,
    productHeaderRow,
    productFirstDataRow,
    productLastDataRow,
    moneyCells,
    totalRows,
    mergeRows,
    total,
  };
}
