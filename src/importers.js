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
  if (typeof value === 'number' && Number.isFinite(value)) return { valid: true, value };
  const raw = clean(value);
  if (!raw) return { valid: false, value: 0 };
  const text = raw
    .replace(/\s+/g, '')
    .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? { valid: true, value: parsed } : { valid: false, value: 0 };
};

const numberValue = (value) => parseNumber(value).value;

const HEADER_ALIASES = {
  name: ['ten san pham','ten sp','san pham','ten hang','hang hoa','mat hang','product','product name'],
  group: ['nhom hang','nhom','group','category','loai hang'],
  pack: ['quy cach','dong goi','packaging','package','spec','specification'],
  unit: ['dvt','don vi','don vi tinh','unit','uom'],
  qty: ['sl','so luong','quantity','qty'],
  price: ['gia','don gia','price','unit price'],
  note: ['ghi chu','note','notes','remark','remarks']
};

const headerScore = (header, aliases) => {
  const value = fold(clean(header)).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!value) return 0;
  let best = 0;
  aliases.forEach(alias => {
    if (value === alias) best = Math.max(best, 100);
    else if (value.includes(alias) || alias.includes(value)) best = Math.max(best, 80);
    else {
      const a = new Set(value.split(' ').filter(Boolean));
      const b = new Set(alias.split(' ').filter(Boolean));
      const overlap = [...a].filter(token => b.has(token)).length;
      if (overlap) best = Math.max(best, Math.round((overlap / Math.max(a.size, b.size)) * 60));
    }
  });
  return best;
};

export function inferSpreadsheetColumns(row) {
  const headers = Array.isArray(row) ? row : [];
  const mapping = {};
  const confidence = {};
  const used = new Set();

  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    let bestIndex = -1;
    let bestScore = 0;
    headers.forEach((header, index) => {
      if (used.has(index)) return;
      const score = headerScore(header, aliases);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0 && bestScore >= 55) {
      mapping[field] = bestIndex;
      confidence[field] = bestScore / 100;
      used.add(bestIndex);
    }
  });

  return { mapping, confidence };
}

export function normalizeImportedProduct(raw = {}) {
  const qtyParsed = parseNumber(raw.qty);
  const priceParsed = parseNumber(raw.price);
  return {
    group: clean(raw.group),
    name: clean(raw.name),
    pack: clean(raw.pack),
    unit: clean(raw.unit),
    qty: qtyParsed.valid ? qtyParsed.value : 1,
    price: priceParsed.valid ? priceParsed.value : 0,
    note: clean(raw.note)
  };
}

export function detectSpreadsheetHeader(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  let best = null;
  safeRows.forEach((row, headerIndex) => {
    const inferred = inferSpreadsheetColumns(row);
    const keys = Object.keys(inferred.mapping);
    if (inferred.mapping.name == null || inferred.mapping.price == null) return;
    const score = keys.length * 10 +
      (inferred.mapping.unit != null ? 5 : 0) +
      (inferred.mapping.qty != null ? 5 : 0) +
      (inferred.mapping.group != null ? 3 : 0);
    if (!best || score > best.score) {
      best = {
        headerIndex,
        headers: (Array.isArray(row) ? row : []).map(clean),
        mapping: { ...inferred.mapping },
        confidence: { ...inferred.confidence },
        score
      };
    }
  });
  return best;
}

export function parsePastedTable(rawText) {
  const text = String(rawText || '').replace(/\r/g, '').trim();
  if (!text) {
    return {
      source: 'paste',
      fields: {},
      products: [],
      groups: [],
      layoutHints: {},
      warnings: ['Chưa có dữ liệu để dán.'],
      unmatched: [],
      spreadsheetMeta: null
    };
  }

  const lines = text.split('\n').filter(line => line.trim());
  const tabCount = lines.reduce((sum, line) => sum + (line.match(/\t/g) || []).length, 0);
  const semicolonCount = lines.reduce((sum, line) => sum + (line.match(/;/g) || []).length, 0);
  const delimiter = tabCount ? '\t' : (semicolonCount ? ';' : null);
  const rows = lines.map(line => delimiter
    ? line.split(delimiter).map(clean)
    : [clean(line)]);

  let header = detectSpreadsheetHeader(rows);
  let headerIndex = header?.headerIndex ?? -1;
  let mapping = header?.mapping ? { ...header.mapping } : null;
  let confidence = header?.confidence ? { ...header.confidence } : {};

  if (!mapping) {
    const width = Math.max(...rows.map(row => row.length));
    mapping = { name: 0 };
    if (width >= 4) {
      mapping.unit = 1;
      mapping.qty = 2;
      mapping.price = 3;
      if (width >= 5) mapping.note = 4;
    } else if (width === 3) {
      const secondNumeric = rows.filter(row => parseNumber(row[1]).valid).length >= Math.ceil(rows.length * 0.6);
      mapping.price = 2;
      if (secondNumeric) mapping.qty = 1;
      else mapping.unit = 1;
    } else if (width === 2) {
      mapping.price = 1;
    }
    confidence = Object.fromEntries(Object.keys(mapping).map(key => [key, key === 'name' ? 0.9 : 0.65]));
  }

  const headers = headerIndex >= 0
    ? rows[headerIndex].map(clean)
    : Array.from({ length: Math.max(...rows.map(row => row.length)) }, (_, index) => 'Cột ' + String.fromCharCode(65 + index));

  const rebuilt = parseMappedSpreadsheetRows(rows, { headerIndex, mapping });
  return {
    source: 'paste',
    fields: {},
    products: rebuilt.products,
    groups: rebuilt.groups,
    layoutHints: {},
    warnings: [
      ...(rebuilt.invalidRows.length ? ['Có ' + rebuilt.invalidRows.length + ' dòng dán cần kiểm tra trước khi nhập.'] : []),
      ...(rebuilt.duplicates.length ? ['Phát hiện ' + rebuilt.duplicates.length + ' nhóm sản phẩm có khả năng bị trùng.'] : [])
    ],
    unmatched: [],
    spreadsheetMeta: {
      headerIndex,
      headers,
      mapping,
      confidence,
      rows,
      invalidRows: rebuilt.invalidRows,
      duplicates: rebuilt.duplicates
    }
  };
}

export function parseMappedSpreadsheetRows(rows, options = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const detected = detectSpreadsheetHeader(safeRows);
  const headerIndex = Number.isInteger(options.headerIndex) ? options.headerIndex : detected?.headerIndex;
  const mapping = options.mapping && typeof options.mapping === 'object'
    ? options.mapping
    : detected?.mapping;
  if (!mapping || mapping.name == null || mapping.price == null || headerIndex == null) {
    return { products: [], groups: [], invalidRows: [], duplicates: [] };
  }

  const excludedRows = new Set(
    (Array.isArray(options.excludedRows) ? options.excludedRows : [])
      .map(value => Number(value))
      .filter(Number.isFinite)
  );
  const products = [];
  const productRowNumbers = [];
  const groups = [];
  const invalidRows = [];
  let currentGroup = '';

  safeRows.slice(headerIndex + 1).forEach((row, offset) => {
    const sourceRowNumber = headerIndex + offset + 2;
    if (excludedRows.has(sourceRowNumber)) return;

    const cells = Array.isArray(row) ? row : [];
    const values = nonEmptyCells(cells);
    if (!values.length) return;

    const rawProduct = {
      group: mapping.group != null ? cells[mapping.group] : currentGroup,
      name: cells[mapping.name],
      pack: mapping.pack != null ? cells[mapping.pack] : '',
      unit: mapping.unit != null ? cells[mapping.unit] : '',
      qty: mapping.qty != null ? cells[mapping.qty] : 1,
      price: mapping.price != null ? cells[mapping.price] : '',
      note: mapping.note != null ? cells[mapping.note] : ''
    };
    const name = clean(rawProduct.name);
    const parsedPrice = parseNumber(rawProduct.price);
    const parsedQty = mapping.qty != null ? parseNumber(rawProduct.qty) : { valid: true, value: 1 };

    if ((!name || !parsedPrice.valid) && values.length === 1 && !parseNumber(values[0]).valid) {
      currentGroup = values[0];
      if (!groups.includes(currentGroup)) groups.push(currentGroup);
      return;
    }

    if (!name && !parsedPrice.valid) return;
    if (/^(tong|tong cong|cong|subtotal|total)$/i.test(fold(name))) return;
    if (!name || !parsedPrice.valid || parsedPrice.value < 0 || (parsedQty.valid && parsedQty.value < 0)) {
      const reasons = [];
      if (!name) reasons.push('missing-name');
      if (!parsedPrice.valid) reasons.push('invalid-price');
      if (parsedPrice.valid && parsedPrice.value < 0) reasons.push('negative-price');
      if (parsedQty.valid && parsedQty.value < 0) reasons.push('negative-qty');
      invalidRows.push({
        rowNumber: sourceRowNumber,
        name,
        price: clean(rawProduct.price),
        qty: clean(rawProduct.qty),
        reasons
      });
      return;
    }

    const product = normalizeImportedProduct(rawProduct);
    if (!product.group) product.group = currentGroup;
    if (product.group && !groups.includes(product.group)) groups.push(product.group);
    products.push(product);
    productRowNumbers.push(sourceRowNumber);
  });

  const duplicateMap = new Map();
  products.forEach((product, index) => {
    const signature = [product.name, product.unit, product.pack]
      .map(value => fold(clean(value)))
      .join('|');
    if (!signature.replace(/|/g, '')) return;
    const indexes = duplicateMap.get(signature) || [];
    indexes.push(index);
    duplicateMap.set(signature, indexes);
  });
  const duplicates = [...duplicateMap.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([signature, indexes]) => ({
      signature,
      indexes,
      rowNumbers: indexes.map(index => productRowNumbers[index]),
      names: indexes.map(index => products[index].name),
      prices: indexes.map(index => products[index].price),
      quantities: indexes.map(index => products[index].qty)
    }));

  return { products, groups, invalidRows, duplicates };
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
  let activeColumnMapping = null;
  let spreadsheetMeta = null;
  let titleIndex = -1;
  let dateIndex = -1;

  safeRows.forEach((row, index) => {
    const cells = Array.isArray(row) ? row : [];
    const text = rowText(cells);
    const folded = fold(text);
    if (!text) return;

    const inferred = inferSpreadsheetColumns(cells);
    const inferredKeys = Object.keys(inferred.mapping);
    if (looksLikeProductHeader(cells) || (inferred.mapping.name != null && inferred.mapping.price != null && inferredKeys.length >= 3)) {
      const headers = cells.map(cell => fold(clean(cell)));
      noteColumnDetected ||= headers.some(cell => cell.includes('ghi chu') || cell === 'note' || cell === 'notes');
      activeColumnMapping = inferred.mapping;
      if (!spreadsheetMeta) {
        spreadsheetMeta = {
          headerIndex: index,
          headers: cells.map(clean),
          mapping: { ...inferred.mapping },
          confidence: { ...inferred.confidence }
        };
      }
      return;
    }

    if (looksLikeGroup(cells)) {
      currentGroup = text;
      if (!groups.includes(currentGroup)) groups.push(currentGroup);
      return;
    }

    if (activeColumnMapping?.name != null) {
      const rawProduct = {
        group: activeColumnMapping.group != null ? cells[activeColumnMapping.group] : currentGroup,
        name: cells[activeColumnMapping.name],
        pack: activeColumnMapping.pack != null ? cells[activeColumnMapping.pack] : '',
        unit: activeColumnMapping.unit != null ? cells[activeColumnMapping.unit] : '',
        qty: activeColumnMapping.qty != null ? cells[activeColumnMapping.qty] : 1,
        price: activeColumnMapping.price != null ? cells[activeColumnMapping.price] : '',
        note: activeColumnMapping.note != null ? cells[activeColumnMapping.note] : ''
      };
      const parsedPrice = parseNumber(rawProduct.price);
      const name = clean(rawProduct.name);
      if (name && parsedPrice.valid) {
        const product = normalizeImportedProduct(rawProduct);
        if (!product.group) product.group = currentGroup;
        products.push(product);
        return;
      }
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
    unmatched,
    spreadsheetMeta
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
    confidence: { ...(base?.confidence || {}) },
    spreadsheetMeta: next?.spreadsheetMeta || base?.spreadsheetMeta || null
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
