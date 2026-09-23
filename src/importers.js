const fold = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/đ/g, 'd');

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const nonEmptyCells = (row) => (Array.isArray(row) ? row : []).map(clean).filter(Boolean);

const rowText = (row) => nonEmptyCells(row).join(' ').trim();

const stripAdminPrefix = (value, prefix) =>
  clean(value).replace(new RegExp('^' + prefix + '\\s+', 'i'), '').trim();

function parseAdministrativeRegion(text) {
  const raw = clean(text);
  const wardMatch = raw.match(/(?:^|[,;\-])\s*(?:Phường|P\.)\s*([^,;\-]+)/i) ||
    raw.match(/\bPhường\s+([^,;\-]+)/i);
  const provinceMatch = raw.match(/(?:^|[,;\-])\s*(?:Tỉnh)\s*([^,;\-]+)/i) ||
    raw.match(/\bTỉnh\s+([^,;\-]+)/i);

  const fields = {};
  if (wardMatch) fields.companyWard = stripAdminPrefix(wardMatch[1], 'Phường');
  if (provinceMatch) fields.companyProvince = stripAdminPrefix(provinceMatch[1], 'Tỉnh');

  // Specific source fallback from the supplied Tùng Gia Bảo material.
  if (!fields.companyProvince && /khánh\s*hòa/i.test(raw)) fields.companyProvince = 'Khánh Hòa';
  return fields;
}

const looksLikeProductHeader = (row) => {
  const cells = (Array.isArray(row) ? row : []).map(cell => fold(clean(cell)));
  const joined = cells.join('|');
  return /stt/.test(joined) && /(mat hang|san pham|ten hang)/.test(joined) &&
    /(dvt|don vi)/.test(joined) && /(don gia|gia)/.test(joined);
};

const looksLikeGroup = (row) => {
  const values = nonEmptyCells(row);
  if (values.length !== 1) return false;
  const text = fold(values[0]);
  return text.includes('san pham') || text.includes('thit gia cam') || text.includes('thit heo') ||
    text.includes('trung') && values[0] === values[0].toUpperCase();
};

const parseNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return { valid: true, value: Math.max(0, value) };
  const raw = clean(value);
  if (!raw) return { valid: false, value: 0 };
  const text = raw.replace(/[.,](?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? { valid: true, value: Math.max(0, parsed) } : { valid: false, value: 0 };
};

const numberValue = (value) => parseNumber(value).value;


export function parseProductClipboardText(rawText) {
  const rows = String(rawText || '')
    .split(/\r?\n/)
    .map(line => line.split('\t').map(clean))
    .filter(row => row.some(Boolean));

  if (!rows.length) return { products: [], warnings: ['Không có dữ liệu để dán.'], mapping: [] };

  const aliases = {
    group: ['nhom', 'nhom hang', 'category'],
    name: ['ten san pham', 'ten hang', 'san pham', 'hang hoa', 'ten sp', 'product'],
    pack: ['quy cach', 'packaging'],
    unit: ['dvt', 'don vi', 'don vi tinh', 'unit'],
    qty: ['sl', 'so luong', 'quantity', 'qty'],
    price: ['gia', 'don gia', 'price'],
    note: ['ghi chu', 'note']
  };
  const normalizedHeader = rows[0].map(cell => fold(cell));
  const mapping = normalizedHeader.map(cell => {
    for (const [key, names] of Object.entries(aliases)) {
      if (names.some(name => cell === name || cell.includes(name))) return key;
    }
    return '';
  });
  const hasHeader = mapping.filter(Boolean).length >= 2;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  let positional = mapping;
  if (!hasHeader) {
    const width = Math.max(...dataRows.map(row => row.length));
    if (width >= 7) positional = ['group','name','pack','unit','qty','price','note'];
    else if (width === 6) positional = ['name','pack','unit','qty','price','note'];
    else if (width === 5) positional = ['name','unit','qty','price','note'];
    else if (width === 4) positional = ['name','unit','qty','price'];
    else if (width === 3) positional = ['name','unit','price'];
    else positional = ['name','price'];
  }

  const warnings = [];
  const products = dataRows.map((row, rowIndex) => {
    const product = { group:'', name:'', pack:'', unit:'', qty:1, price:0, note:'' };
    positional.forEach((key, columnIndex) => {
      if (!key) return;
      const value = row[columnIndex];
      if (key === 'qty' || key === 'price') {
        const parsed = parseNumber(value);
        if (clean(value) && !parsed.valid) warnings.push('Dòng ' + (rowIndex + 1 + (hasHeader ? 1 : 0)) + ': ' + key + ' không hợp lệ.');
        product[key] = key === 'qty' && !clean(value) ? 1 : parsed.value;
      } else {
        product[key] = clean(value);
      }
    });
    return product;
  }).filter(product => product.name || product.group || product.pack || product.unit || product.note || product.price > 0 || product.qty !== 1);

  return { products, warnings: [...new Set(warnings)], mapping: positional, hasHeader };
}

export function parseSpreadsheetRows(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const fields = {};
  const warnings = [];
  const unmatched = [];
  const products = [];
  const groups = [];
  let currentGroup = '';
  let noteColumnDetected = false;
  let titleIndex = -1;
  let dateIndex = -1;

  safeRows.forEach((row, index) => {
    const cells = Array.isArray(row) ? row : [];
    const text = rowText(cells);
    const folded = fold(text);
    if (!text) return;

    if (looksLikeProductHeader(cells)) {
      const headers = cells.map(cell => fold(clean(cell)));
      noteColumnDetected ||= headers.some(cell => cell.includes('ghi chu'));
      return;
    }

    if (looksLikeGroup(cells)) {
      currentGroup = text;
      if (!groups.includes(currentGroup)) groups.push(currentGroup);
      return;
    }

    const first = cells[0];
    const second = cells[1];
    const parsedPrice = parseNumber(cells[3]);
    const isProduct = (typeof first === 'number' || /^\d+$/.test(clean(first))) &&
      clean(second) && parsedPrice.valid;
    if (isProduct) {
      products.push({
        group: currentGroup,
        name: clean(second),
        pack: '',
        unit: clean(cells[2]),
        qty: 1,
        price: parsedPrice.value,
        note: clean(cells[4])
      });
      return;
    }

    if (!fields.companyName && /\bhkd\b/.test(folded) && index < 10) {
      fields.companyName = text;
      return;
    }

    const firstFolded = fold(clean(cells[0]));
    if (/^dia chi chi tiet\b/.test(firstFolded) || /^dia chi\b/.test(firstFolded)) {
      const address = clean(cells.slice(1).filter(Boolean).join(' ')) ||
        text.replace(/^\s*địa\s*chỉ(?:\s*chi\s*tiết)?\s*:?/i, '').trim();
      if (address) {
        fields.companyAddressDetail = address;
        fields.companyAddress = address;
      }
      return;
    }

    if (/^(khu vuc|phuong|tinh)\b/.test(firstFolded)) {
      const regionText = clean(cells.slice(1).filter(Boolean).join(' ')) || text;
      Object.assign(fields, parseAdministrativeRegion(regionText));
      if (/^phuong\b/.test(firstFolded) && !fields.companyWard) {
        fields.companyWard = clean(cells.slice(1).filter(Boolean).join(' ')).replace(/^Phường\s+/i, '');
      }
      if (/^tinh\b/.test(firstFolded) && !fields.companyProvince) {
        fields.companyProvince = clean(cells.slice(1).filter(Boolean).join(' ')).replace(/^Tỉnh\s+/i, '');
      }
      return;
    }

    if (!fields.phone && /(sdt|dien thoai|dt)\s*[:.\-]?/.test(folded)) {
      const match = text.match(/(?:SĐT|SDT|ĐT|DT|Điện thoại)\s*[:.\-]?\s*([0-9 .\-]{9,16})/i);
      if (match) fields.phone = match[1].replace(/\D/g, '');
      return;
    }

    if (!fields.companyEmail && /@/.test(text)) {
      const match = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
      if (match) fields.companyEmail = match[0];
    }

    if (!fields.website && /(www\.|https?:\/\/)/i.test(text)) {
      const match = text.match(/(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/\S*)?/);
      if (match) fields.website = match[0];
    }

    if (titleIndex < 0 && /(thong bao|bang bao gia|bao gia)/.test(folded) && index < 15) {
      fields.quoteTitle = text;
      titleIndex = index;
      return;
    }

    if (!fields.recipientLine && /kinh gui/.test(folded)) {
      fields.recipientLine = /:\s*$/.test(text) ? text + ' QUÝ KHÁCH HÀNG' : text;
      return;
    }

    if (!fields.intro && /(xin gui|bang bao gia nhu sau|bao gia nhu sau)/.test(folded)) {
      fields.intro = text;
      return;
    }

    if (/\bngay\b/.test(folded) && /\bnam\b/.test(folded)) {
      fields.dateLine = text;
      dateIndex = index;
      return;
    }

    if (dateIndex >= 0 && index > dateIndex && /\bhkd\b/.test(folded)) {
      fields.rightName = text;
      return;
    }

    if (!fields.quoteSubtitle && titleIndex >= 0 && index > titleIndex && index <= titleIndex + 3 &&
      /(thang|luong thuc|thuc pham|gia)/.test(folded)) {
      fields.quoteSubtitle = text.replace(/^g[ií]a\s+/i, 'Giá ');
      return;
    }

    if (index < 12 || index > safeRows.length - 6) unmatched.push(text);
  });

  if (!fields.quoteTitle) fields.quoteTitle = 'BẢNG BÁO GIÁ';
  if (!fields.recipientLine) fields.recipientLine = 'Kính gửi: QUÝ KHÁCH HÀNG';
  if (!fields.sectionTitle) fields.sectionTitle = groups.length > 1 ? 'DANH MỤC HÀNG HÓA' : (groups[0] || 'DANH MỤC SẢN PHẨM');
  if (!products.length) warnings.push('Không tìm thấy dòng sản phẩm có cấu trúc STT / Mặt hàng / ĐVT / Đơn giá.');
  if (!fields.companyName) warnings.push('Chưa nhận diện được tên đơn vị.');
  if (!fields.companyAddressDetail && !fields.companyAddress) warnings.push('Chưa nhận diện được địa chỉ chi tiết.');

  const hasNoteValues = products.some(product => clean(product.note));
  return {
    source: 'excel',
    fields,
    products,
    groups,
    layoutHints: {
      showPack: false,
      showQty: false,
      showPrice: true,
      showAmount: false,
      showNote: noteColumnDetected && hasNoteValues,
      showTotals: false,
      showWords: false,
      showPaymentBlock: false,
      showTerms: false
    },
    warnings,
    unmatched
  };
}

const extractPhone = (text) => {
  const direct = String(text || '').match(/(?:SĐT|SDT|ĐT|DT|Đ\.T|Điện thoại)\s*[:.\-]?\s*([0-9 .\-]{9,16})/i);
  if (direct) return direct[1].replace(/\D/g, '');
  const loose = String(text || '').match(/\b0[0-9 .\-]{8,13}\b/);
  return loose ? loose[0].replace(/\D/g, '') : '';
};

export function parseHandwritingText(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);

  const fields = {};
  const confidence = {};
  const unmatched = [];
  const addressParts = [];

  lines.forEach((line) => {
    const f = fold(line);
    const phone = extractPhone(line);
    if (!fields.phone && phone.length >= 9) {
      fields.phone = phone;
      confidence.phone = 0.94;
      return;
    }
    if (!fields.companyName && /\bhkd\b/.test(f)) {
      fields.companyName = line;
      confidence.companyName = 0.82;
      return;
    }
    if (!fields.quoteTitle && /(bang bao gia|bao gia)/.test(f)) {
      fields.quoteTitle = /bang bao gia/.test(f) ? 'BẢNG BÁO GIÁ' : line;
      confidence.quoteTitle = 0.88;
      return;
    }
    if (!fields.recipientLine && /(kinh gui|gui quy khach)/.test(f)) {
      fields.recipientLine = line.replace(/^.*?(k[ií]nh\s*gửi)\s*/i, 'Kính gửi: ');
      if (!fields.recipientLine.includes(':')) fields.recipientLine = 'Kính gửi: ' + fields.recipientLine.replace(/^Kính gửi\s*/i, '');
      confidence.recipientLine = 0.8;
      return;
    }
    if (/(lo\s|bt\d|duong|kdt|nha trang|khanh hoa|my gia|phuong|tinh)/.test(f)) {
      const region = parseAdministrativeRegion(line);
      Object.assign(fields, region);
      let detailPart = line
        .replace(/[,;\-]?\s*Phường\s+[^,;\-]+/ig, '')
        .replace(/[,;\-]?\s*Tỉnh\s+[^,;\-]+/ig, '')
        .replace(/\s*[-–]\s*Khánh\s*Hòa\s*$/i, '')
        .trim();
      if (detailPart) addressParts.push(detailPart);
      return;
    }
    unmatched.push(line);
  });

  if (addressParts.length) {
    fields.companyAddressDetail = addressParts.join(', ');
    fields.companyAddress = fields.companyAddressDetail;
    confidence.companyAddressDetail = 0.65;
  }

  return {
    source: 'handwriting',
    fields,
    products: [],
    groups: [],
    layoutHints: {},
    confidence,
    warnings: lines.length ? [] : ['OCR không trả về nội dung chữ.'],
    unmatched
  };
}

export function mergeImportDraft(base, next, options = {}) {
  const sourceParts = [...new Set(
    [base?.source, next?.source]
      .filter(Boolean)
      .flatMap(value => String(value).split('+'))
      .map(value => value.trim())
      .filter(Boolean)
  )];
  const nextSource = String(next?.source || '').trim();
  const result = {
    source: sourceParts.join('+') || 'manual',
    fields: { ...(base?.fields || {}) },
    fieldSources: { ...(base?.fieldSources || {}) },
    products: Array.isArray(base?.products) ? base.products.map(item => ({ ...item })) : [],
    groups: Array.isArray(base?.groups) ? [...base.groups] : [],
    layoutHints: { ...(base?.layoutHints || {}) },
    warnings: [...(base?.warnings || [])],
    unmatched: [...(base?.unmatched || [])],
    confidence: { ...(base?.confidence || {}) }
  };

  if (options.replaceSourceFields && nextSource) {
    Object.entries(result.fieldSources).forEach(([key, source]) => {
      if (source !== nextSource) return;
      delete result.fields[key];
      delete result.fieldSources[key];
      delete result.confidence[key];
    });
  }

  Object.entries(next?.fields || {}).forEach(([key, value]) => {
    const cleaned = clean(value);
    if (!cleaned) return;
    const empty = !clean(result.fields[key]);
    const sameSource = Boolean(nextSource) && result.fieldSources[key] === nextSource;
    const replace = key === 'phone' || (Boolean(options.preferNext) && sameSource);
    if (empty || replace) {
      result.fields[key] = cleaned;
      result.fieldSources[key] = nextSource || 'unknown';
    }
  });

  if ((!result.products.length) && Array.isArray(next?.products)) result.products = next.products.map(item => ({ ...item }));
  if ((!result.groups.length) && Array.isArray(next?.groups)) result.groups = [...next.groups];
  Object.assign(result.layoutHints, next?.layoutHints || {});
  result.warnings.push(...(next?.warnings || []));
  result.unmatched.push(...(next?.unmatched || []));
  Object.assign(result.confidence, next?.confidence || {});
  return result;
}
