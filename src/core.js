export function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function normalizeNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function localDateISO(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export function normalizeBoundedNumber(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function isValidISODate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function normalizeHexColor(value, fallback = '#0b8f83') {
  const text = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text);
  if (short) return ('#' + short.slice(1).map(char => char + char).join('')).toLowerCase();
  return fallback;
}

export function normalizePhone(value) {
  return String(value || '').replace(/\D+/g, '');
}

export function calcQuoteTotal(data = {}) {
  const products = Array.isArray(data.products) ? data.products : [];
  const subtotal = products.reduce((sum, product) => {
    const qty = normalizeNonNegativeNumber(product?.qty);
    const price = normalizeNonNegativeNumber(product?.price);
    return sum + qty * price;
  }, 0);
  const discountPct = clamp(data.discountPct || 0, 0, 100);
  const vatPct = clamp(data.vatPct || 0, 0, 100);
  const discount = subtotal * discountPct / 100;
  const taxable = Math.max(0, subtotal - discount);
  const vat = taxable * vatPct / 100;
  const fee = normalizeNonNegativeNumber(data.otherFee);
  return taxable + vat + fee;
}

export function nextDuplicateQuoteNo(base, usedQuoteNumbers = []) {
  const safeBase = (String(base || 'BG').trim() || 'BG').replace(/-COPY(?:-\d+)?$/i, '');
  const used = new Set(Array.from(usedQuoteNumbers || []).filter(Boolean));
  let candidate = safeBase + '-COPY';
  let sequence = 2;
  while (used.has(candidate)) {
    candidate = safeBase + '-COPY-' + sequence;
    sequence += 1;
  }
  return candidate;
}

export function historyTotalsByCurrency(records = []) {
  return (Array.isArray(records) ? records : []).reduce((totals, record) => {
    const data = record?.data || {};
    const currency = normalizeCatalogCurrency(record?.currency || data.currency || 'VND');
    const total = Number.isFinite(Number(record?.total))
      ? Math.max(0, Number(record.total))
      : calcQuoteTotal(data);
    totals[currency] = (totals[currency] || 0) + total;
    return totals;
  }, {});
}

export function normalizeCatalogCurrency(value) {
  const currency = String(value || 'VND').toUpperCase();
  return ['VND','USD','RUB'].includes(currency) ? currency : 'VND';
}
