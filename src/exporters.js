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
