export function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function normalizePhone(value) {
  return String(value || '').replace(/\D+/g, '');
}

export function calcQuoteTotal(data = {}) {
  const products = Array.isArray(data.products) ? data.products : [];
  const subtotal = products.reduce((sum, product) => {
    const qty = Math.max(0, Number(product?.qty || 0));
    const price = Math.max(0, Number(product?.price || 0));
    return sum + qty * price;
  }, 0);
  const discountPct = clamp(data.discountPct || 0, 0, 100);
  const vatPct = clamp(data.vatPct || 0, 0, 100);
  const discount = subtotal * discountPct / 100;
  const taxable = Math.max(0, subtotal - discount);
  const vat = taxable * vatPct / 100;
  const fee = Math.max(0, Number(data.otherFee || 0));
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
    const currency = String(record?.currency || data.currency || 'VND').toUpperCase();
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
