const fold = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/đ/g, 'd');

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const nonEmptyCells = (row) => (Array.isArray(row) ? row : []).map(clean).filter(Boolean);

const rowText = (row) => nonEmptyCells(row).join(' ').trim();

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

    if (/^dia chi\b/.test(fold(clean(cells[0])))) {
      const address = clean(cells.slice(1).filter(Boolean).join(' ')) || text.replace(/^\s*địa\s*chỉ\s*:?/i, '').trim();
      if (address) fields.companyAddress = address;
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
  if (!fields.companyAddress) warnings.push('Chưa nhận diện được địa chỉ.');

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
    if (/(lo\s|bt\d|duong|kdt|nha trang|khanh hoa|my gia)/.test(f)) {
      addressParts.push(line);
      return;
    }
    unmatched.push(line);
  });

  if (addressParts.length) {
    fields.companyAddress = addressParts.join(', ');
    confidence.companyAddress = 0.65;
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
