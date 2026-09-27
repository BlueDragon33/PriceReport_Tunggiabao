import { normalizeCatalogCurrency, normalizeNonNegativeNumber, normalizePhone } from '../core.js';

export const QUOTATION_STATUSES = Object.freeze(['draft','sent','accepted','rejected','expired']);
export const QUOTATION_STATUS_TRANSITIONS = Object.freeze({
  draft: Object.freeze(['sent']),
  sent: Object.freeze(['accepted','rejected','expired']),
  accepted: Object.freeze([]),
  rejected: Object.freeze([]),
  expired: Object.freeze([])
});
let fallbackSequence = 0;

export function createId(prefix = 'id') {
  const safePrefix = String(prefix || 'id').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'id';
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (randomUUID) return safePrefix + '-' + randomUUID();
  fallbackSequence += 1;
  return safePrefix + '-' + Date.now().toString(36) + '-' + fallbackSequence.toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
export function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}
export function normalizeQuotationStatus(value) {
  const status = String(value || 'draft').toLowerCase();
  return QUOTATION_STATUSES.includes(status) ? status : 'draft';
}
export function canTransitionQuotationStatus(from, to, options = {}) {
  const current = normalizeQuotationStatus(from);
  const target = normalizeQuotationStatus(to);
  if (current === target) return true;
  if (options.allowReopen === true && ['accepted','rejected','expired'].includes(current) && target === 'draft') return true;
  return QUOTATION_STATUS_TRANSITIONS[current].includes(target);
}
export function normalizeCustomerEntity(value = {}, options = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const customerId = String(source.customerId || source.id || options.fallbackId || '').trim();
  const now = String(options.now || '');
  return {
    customerId, id: customerId,
    type: ['person','company'].includes(source.type) ? source.type : (source.company ? 'company' : 'person'),
    name: String(source.name || '').trim(), company: String(source.company || '').trim(),
    phone: String(source.phone || '').trim(), normalizedPhone: normalizePhone(source.phone),
    email: String(source.email || '').trim(), taxCode: String(source.taxCode || '').trim(),
    address: String(source.address || '').trim(), contact: String(source.contact || '').trim(),
    note: String(source.note || '').trim(), createdAt: String(source.createdAt || now), updatedAt: String(source.updatedAt || now)
  };
}
export function normalizeProductEntity(value = {}, options = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const productId = String(source.productId || source.id || options.fallbackId || '').trim();
  const now = String(options.now || '');
  const price = normalizeNonNegativeNumber(source.defaultPrice ?? source.price);
  return {
    productId, id: productId, sku: String(source.sku || '').trim(), name: String(source.name || '').trim(),
    group: String(source.group || '').trim(), unit: String(source.unit || '').trim(), pack: String(source.pack || '').trim(),
    defaultPrice: price, price, currency: normalizeCatalogCurrency(source.currency || 'VND'),
    note: String(source.note || '').trim(), active: source.active !== false,
    createdAt: String(source.createdAt || now), updatedAt: String(source.updatedAt || now)
  };
}
export function createQuotationItemSnapshot(product = {}, options = {}) {
  const source = product && typeof product === 'object' && !Array.isArray(product) ? product : {};
  const itemId = String(options.itemId || source.itemId || createId('item'));
  const sourceProductId = String(options.sourceProductId || source.productId || source.id || source.sourceProductId || '');
  const name = String(source.nameSnapshot ?? source.name ?? '').trim();
  const unit = String(source.unitSnapshot ?? source.unit ?? '').trim();
  const pack = String(source.packSnapshot ?? source.pack ?? '').trim();
  const group = String(source.groupSnapshot ?? source.group ?? '').trim();
  const unitPrice = normalizeNonNegativeNumber(source.unitPrice ?? source.price);
  return {
    itemId, sourceProductId, nameSnapshot:name, unitSnapshot:unit, packSnapshot:pack, groupSnapshot:group,
    name, unit, pack, group, qty: normalizeNonNegativeNumber(source.qty ?? 1),
    unitPrice, price:unitPrice, discount:normalizeNonNegativeNumber(source.discount),
    tax:normalizeNonNegativeNumber(source.tax), note:String(source.note || '').trim()
  };
}

export function ensureQuotationItemIds(items = []) {
  const list = Array.isArray(items) ? items : [];
  const seen = new Set();
  list.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const base = String(item.itemId || '').trim() || 'item-' + (index + 1);
    let candidate = base;
    let suffix = 2;
    while (seen.has(candidate)) {
      candidate = 'item-' + (index + 1) + '-' + suffix;
      suffix += 1;
    }
    item.itemId = candidate;
    item.sourceProductId = String(item.sourceProductId || '');
    seen.add(candidate);
  });
  return list;
}
