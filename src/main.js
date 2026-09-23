import './styles.css';
import './ui-v5.css';
import {
  calcQuoteTotal,
  historyTotalsByCurrency,
  nextDuplicateQuoteNo,
  normalizeBoundedNumber,
  normalizeCatalogCurrency,
  normalizeHexColor,
  normalizeNonNegativeNumber,
  normalizePhone,
  isValidISODate,
  localDateISO
} from './core.js';
import { parseHandwritingText, parseSpreadsheetRows, mergeImportDraft } from './importers.js';
import {
  TUNGGIABAO_PRODUCTS,
  TUNGGIABAO_PROFILE,
  applyTungGiaBaoBaseline,
  looksLikeLegacyBienUyenBaoProfile
} from './tunggiabao-defaults.js';
import {
  choosePcBackupDirectory,
  directoryPermission,
  getRememberedPcDirectory,
  readTextFromPcDirectory,
  sanitizePcFileName,
  supportsPcFolderAccess,
  writeTextToPcDirectory
} from './pc-storage.js';
import { startDeviceProfileRuntime } from './device-profile.js';
import { startPriceReportDeviceAccess } from './device-access-gate.js';
import {
  normalizeLogoDisplayMode,
  normalizeRemoveBgTolerance,
  removeBackgroundDataUrl
} from './logo-processing.js';

const STORAGE = 'tunggiabao-price-report-v1';
const PRESETS = 'tunggiabao-price-report-presets-v1';
const HISTORY = 'tunggiabao-price-report-history-v1';
const CUSTOMERS = 'tunggiabao-price-report-customers-v1';
const CATALOG = 'tunggiabao-price-report-catalog-v1';
const UI_STATE = 'tunggiabao-price-report-ui-v2';
const LOGO_STORAGE = 'tunggiabao-price-report-logo-v1';

const LAYOUT_BLOCK_KEYS = [
  'logo','company','companyName','companyAddress','companyAddressDetail','companyRegion','branchKhanhHoa','branchDongNai','farmAddress',
  'taxCode','phone','website','companyEmail','quote','quoteTitle','quoteSubtitle','quoteMeta','recipient','customer',
  'intro','section','table','summary','words','payment','paymentMethod','bankName','bankAccount','bankOwner',
  'terms','termsTitle','termsText','closing','signatures','footer','slogan','footerText'
];
const PX_PER_MM = 96 / 25.4;
let layoutEditEnabled = false;
let selectedLayoutKey = '';
let layoutDrag = null;

function normalizeLayoutOffsets(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const normalized = {};
  LAYOUT_BLOCK_KEYS.forEach((key) => {
    const item = source[key];
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const x = normalizeBoundedNumber(item.x, -80, 80, 0);
    const y = normalizeBoundedNumber(item.y, -120, 120, 0);
    if (x || y) normalized[key] = {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10
    };
  });
  return normalized;
}

const defaults = {
  logo: '',
  companyName: 'CÔNG TY TNHH TMDV BIỂN UYÊN BẢO',
  companyAddress: '12/1 đường 3/4, Phường Xuân Hương - Đà Lạt, Lâm Đồng',
  companyAddressDetail: '12/1 đường 3/4',
  companyProvince: 'Lâm Đồng',
  companyWard: 'Xuân Hương - Đà Lạt',
  branchKhanhHoa: 'Số 55 Nguyễn Xiển, P Bắc Nha Trang, Khánh Hòa',
  branchDongNai: 'Tổ 8, Khu phố 3A, Phường Trảng Dài, Đồng Nai',
  farmAddress: 'Ấp Bàu Mây, Xã Tân Phú, Tỉnh Đồng Nai',
  taxCode: '5801476262',
  phone: '0888.458.222',
  website: 'www.thegioitrung.vn',
  companyEmail: 'contact@thegioitrung.vn',
  slogan: 'Vì sức khỏe cộng đồng',
  quoteTitle: 'BẢNG BÁO GIÁ',
  quoteSubtitle: '',
  quoteNo: 'BG-2026-001',
  quoteDate: localDateISO(),
  quoteStatus: 'draft',
  historyRecordId: '',
  validity: '7 ngày',
  recipientLine: 'Kính gửi: QUÝ KHÁCH HÀNG',
  intro: 'Công ty TNHH TM DV Biển Uyên Bảo xin trân trọng gửi đến Quý khách hàng bảng báo giá sản phẩm của chúng tôi như sau:',
  sectionTitle: 'I. CÁC SẢN PHẨM TRỨNG',
  customerName: 'QUÝ KHÁCH HÀNG',
  customerCompany: '',
  customerAddress: '',
  customerPhone: '',
  customerEmail: '',
  customerContact: '',
  showCustomer: false,
  showStt: true,
  showPrice: true,
  showAmount: true,
  showNote: false,
  discountPct: 0,
  vatPct: 0,
  otherFee: 0,
  currency: 'VND',
  showTotals: true,
  showWords: true,
  showPaymentBlock: true,
  paymentMethod: 'Tiền mặt hoặc chuyển khoản',
  bankName: '',
  bankAccount: '',
  bankOwner: '',
  termsTitle: 'II. ĐIỀU KHOẢN THƯƠNG MẠI',
  termsText: 'Giá trên đã bao gồm VAT (nếu có), chi phí giao hàng tùy theo khu vực.\nThời gian giao hàng: 1 - 3 ngày kể từ khi xác nhận đơn hàng.\nPhương thức thanh toán: Tiền mặt hoặc chuyển khoản.\nBảng báo giá có hiệu lực trong vòng 7 ngày kể từ ngày phát hành.',
  closingText: 'Rất mong được hợp tác cùng Quý khách hàng!',
  dateLine: 'Đà Lạt, ngày ..... tháng ..... năm ........',
  leftTitle: 'KHÁCH HÀNG',
  rightTitle: 'ĐẠI DIỆN CÔNG TY',
  leftNote: '(Ký, ghi rõ họ tên)',
  rightNote: '(Ký, ghi rõ họ tên, đóng dấu)',
  leftName: '',
  rightName: '',
  footerText: 'Vì sức khỏe cộng đồng  •  0888.458.222  •  contact@thegioitrung.vn  •  www.thegioitrung.vn',
  theme: 'modern',
  accent: '#0b8f83',
  showLogo: true,
  showSlogan: true,
  showWebEmail: false,
  showTerms: true,
  showSignature: true,
  showQuoteMeta: false,
  compactTable: false,
  docFont: 'Times New Roman',
  marginX: 13,
  marginTop: 13,
  marginBottom: 12,
  logoWidth: 58,
  logoPadding: 2,
  logoOffsetX: 0,
  logoOffsetY: 0,
  logoDisplayMode: 'original',
  logoRemoveBgThreshold: 46,
  logoTreatment: 'none',
  logoBlendMode: 'normal',
  logoBackdropColor: '#0b8f83',
  logoBackdropOpacity: 0,
  logoBackdropRadius: 14,
  logoBackdropBorder: 'none',
  docFontSize: 12.2,
  tableFontSize: 9,
  previewTitleAlign: 'center',
  previewTitleSize: 27,
  previewSpacing: 'standard',
  previewTableDensity: 'standard',
  previewHeaderGap: 4,
  previewMetaWidth: 44,
  previewLineHeight: 1.26,
  layoutOffsets: {},
  products: [
    { name: 'Trứng gà tươi', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 100, price: 28000, note: '' },
    { name: 'Trứng gà Omega-3', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 50, price: 32000, note: '' },
    { name: 'Trứng vịt tươi', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 50, price: 30000, note: '' },
    { name: 'Trứng gà thảo mộc', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 30, price: 35000, note: '' },
    { name: 'Trứng lồng đào', pack: 'Khay 30 quả', unit: 'Khay', qty: 10, price: 85000, note: '' }
  ]
};

Object.assign(defaults, TUNGGIABAO_PROFILE, {
  showPack: false,
  showQty: false,
  showPrice: true,
  showAmount: false,
  showNote: false,
  showTotals: false,
  showWords: false,
  showPaymentBlock: false,
  showTerms: false,
  showWebEmail: false,
  showSlogan: false,
  products: TUNGGIABAO_PRODUCTS.map((product) => ({ ...product }))
});

const clone = (obj) => JSON.parse(JSON.stringify(obj));

function defaultSignatureDateLine(date = new Date()) {
  const valid = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return 'Nha Trang, ngày ..... tháng ' + String(valid.getMonth() + 1).padStart(2, '0') + ' năm ' + valid.getFullYear();
}

function merge(data) {
  const rawProducts = Array.isArray(data && data.products) ? data.products : clone(defaults.products);
  const merged = Object.assign(clone(defaults), data || {}, {
    products: rawProducts.map((product) => ({
      group: String(product?.group || ''),
      name: String(product?.name || ''),
      pack: String(product?.pack || ''),
      unit: String(product?.unit || ''),
      qty: normalizeNonNegativeNumber(product?.qty),
      price: normalizeNonNegativeNumber(product?.price),
      note: String(product?.note || '')
    }))
  });
  if (!merged.products.length) merged.products = [{ group: '', name: '', pack: '', unit: '', qty: 1, price: 0, note: '' }];

  const hasStructuredCompanyAddress = data && (
    Object.prototype.hasOwnProperty.call(data, 'companyAddressDetail') ||
    Object.prototype.hasOwnProperty.call(data, 'companyProvince') ||
    Object.prototype.hasOwnProperty.call(data, 'companyWard')
  );
  if (!hasStructuredCompanyAddress) {
    merged.companyAddressDetail = String(data?.companyAddress || merged.companyAddress || '').trim();
    merged.companyProvince = '';
    merged.companyWard = '';
    const foldedCompany = String(merged.companyName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const foldedAddress = merged.companyAddressDetail.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (foldedCompany.includes('tung gia bao') && foldedAddress.includes('nam nha trang')) {
      merged.companyProvince = 'Khánh Hòa';
    }
  }

  if (merged.theme === 'blue') merged.theme = 'corporate';
  if (!['modern','corporate','minimal','classic','emerald','warm','premium','mono'].includes(merged.theme)) merged.theme = 'modern';
  if (!['VND','USD','RUB'].includes(String(merged.currency || '').toUpperCase())) merged.currency = 'VND';
  else merged.currency = String(merged.currency).toUpperCase();
  merged.discountPct = normalizeBoundedNumber(merged.discountPct, 0, 100, defaults.discountPct);
  merged.vatPct = normalizeBoundedNumber(merged.vatPct, 0, 100, defaults.vatPct);
  merged.otherFee = normalizeNonNegativeNumber(merged.otherFee);
  merged.marginX = normalizeBoundedNumber(merged.marginX, 6, 30, defaults.marginX);
  merged.marginTop = normalizeBoundedNumber(merged.marginTop, 6, 30, defaults.marginTop);
  merged.marginBottom = normalizeBoundedNumber(merged.marginBottom, 6, 30, defaults.marginBottom);
  merged.logoWidth = normalizeBoundedNumber(merged.logoWidth, 18, 90, defaults.logoWidth);
  merged.logoPadding = normalizeBoundedNumber(merged.logoPadding, 0, 12, defaults.logoPadding);
  merged.logoOffsetX = normalizeBoundedNumber(merged.logoOffsetX, -40, 40, defaults.logoOffsetX);
  merged.logoOffsetY = normalizeBoundedNumber(merged.logoOffsetY, -30, 30, defaults.logoOffsetY);
  merged.logoRemoveBgThreshold = normalizeRemoveBgTolerance(merged.logoRemoveBgThreshold, defaults.logoRemoveBgThreshold);
  merged.logoBackdropOpacity = normalizeBoundedNumber(merged.logoBackdropOpacity, 0, 100, defaults.logoBackdropOpacity);
  merged.logoBackdropRadius = normalizeBoundedNumber(merged.logoBackdropRadius, 0, 24, defaults.logoBackdropRadius);
  merged.docFontSize = normalizeBoundedNumber(merged.docFontSize, 9, 18, defaults.docFontSize);
  const hasTableFontSize = data && Object.prototype.hasOwnProperty.call(data, 'tableFontSize');
  if (!hasTableFontSize) {
    const legacyScale = normalizeBoundedNumber(Number(data?.docFontSize || defaults.docFontSize) / 12.2, 0.6, 1.6, 1);
    merged.tableFontSize = Math.round((9 * legacyScale) * 10) / 10;
  }
  merged.tableFontSize = normalizeBoundedNumber(merged.tableFontSize, 7.5, 14, defaults.tableFontSize);
  // All typography outside the product table is fixed from V3.3 onward.
  merged.previewTitleSize = 27;
  merged.previewHeaderGap = normalizeBoundedNumber(merged.previewHeaderGap, 2, 12, defaults.previewHeaderGap);
  merged.previewMetaWidth = normalizeBoundedNumber(merged.previewMetaWidth, 38, 56, defaults.previewMetaWidth);
  merged.previewLineHeight = normalizeBoundedNumber(merged.previewLineHeight, 1.15, 1.5, defaults.previewLineHeight);
  merged.layoutOffsets = normalizeLayoutOffsets(merged.layoutOffsets);

  const hasPreviewLayout = data && Object.prototype.hasOwnProperty.call(data, 'previewSpacing');
  if (!hasPreviewLayout) {
    merged.previewTitleAlign = 'center';
    merged.previewTitleSize = 27;
    merged.previewSpacing = 'standard';
    merged.previewTableDensity = 'standard';
    merged.previewHeaderGap = 4;
    merged.previewMetaWidth = 44;
    merged.previewLineHeight = 1.26;
    merged.showQuoteMeta = false;
    if (merged.theme === 'modern') merged.docFont = 'Times New Roman';
    else if (merged.docFont === 'Times New Roman' && ['corporate','minimal','premium','mono'].includes(merged.theme)) merged.docFont = 'Arial';
  }

  const hasLogoDisplayMode = data && Object.prototype.hasOwnProperty.call(data, 'logoDisplayMode');
  if (!hasLogoDisplayMode) {
    // Existing projects migrate to original-first behavior so a previously
    // stored blend/multiply setting can no longer alter the uploaded pixels.
    merged.logoDisplayMode = 'original';
    merged.logoRemoveBgThreshold = 46;
    merged.logoTreatment = 'none';
    merged.logoBlendMode = 'normal';
    merged.logoBackdropOpacity = 0;
    merged.logoBackdropBorder = 'none';
    merged.logoPadding = Math.min(4, Math.max(0, Number(merged.logoPadding || 2)));
  }

  const stringKeys = [
    'logo','companyName','companyAddress','companyAddressDetail','companyProvince','companyWard','branchKhanhHoa','branchDongNai','farmAddress',
    'taxCode','phone','website','companyEmail','slogan','quoteTitle','quoteSubtitle','quoteNo','quoteDate',
    'historyRecordId','validity','recipientLine','intro','sectionTitle','customerName',
    'customerCompany','customerAddress','customerPhone','customerEmail','customerContact',
    'paymentMethod','bankName','bankAccount','bankOwner','termsTitle','termsText','closingText',
    'dateLine','leftTitle','rightTitle','leftNote','rightNote','leftName','rightName','footerText',
    'accent','docFont','logoDisplayMode','logoTreatment','logoBlendMode','logoBackdropColor','logoBackdropBorder',
    'previewTitleAlign','previewSpacing','previewTableDensity'
  ];
  stringKeys.forEach((key) => {
    const fallback = defaults[key] == null ? '' : defaults[key];
    merged[key] = typeof merged[key] === 'string' ? merged[key] : String(merged[key] ?? fallback);
  });

  const booleanKeys = [
    'showCustomer','showStt','showPack','showQty','showPrice','showAmount','showNote','showTotals','showWords',
    'showPaymentBlock','showLogo','showSlogan','showWebEmail','showTerms','showSignature',
    'showQuoteMeta','compactTable'
  ];
  booleanKeys.forEach((key) => {
    const value = merged[key];
    if (typeof value === 'string') merged[key] = value.toLowerCase() === 'true';
    else merged[key] = Boolean(value);
  });

  merged.accent = normalizeHexColor(merged.accent, defaults.accent);
  merged.logoBackdropColor = normalizeHexColor(merged.logoBackdropColor, merged.accent);
  if (!['Times New Roman','Georgia','Arial'].includes(merged.docFont)) merged.docFont = defaults.docFont;
  merged.logoDisplayMode = normalizeLogoDisplayMode(merged.logoDisplayMode);
  if (!['blend','soft','clean','custom','none'].includes(merged.logoTreatment)) merged.logoTreatment = defaults.logoTreatment;
  if (!['normal','multiply','darken'].includes(merged.logoBlendMode)) merged.logoBlendMode = defaults.logoBlendMode;
  if (!['none','soft'].includes(merged.logoBackdropBorder)) merged.logoBackdropBorder = defaults.logoBackdropBorder;
  if (!['draft','sent','accepted','rejected','expired'].includes(merged.quoteStatus)) merged.quoteStatus = 'draft';
  if (!['center','left','right'].includes(merged.previewTitleAlign)) merged.previewTitleAlign = 'center';
  if (!['compact','standard','comfortable'].includes(merged.previewTableDensity)) merged.previewTableDensity = 'standard';
  if (merged.previewSpacing === 'relaxed') merged.previewSpacing = 'airy';
  if (!['compact','standard','airy'].includes(merged.previewSpacing)) merged.previewSpacing = 'standard';

  return merged;
}
let state;
let rawStored = null;
try {
  rawStored = JSON.parse(localStorage.getItem(STORAGE));
  const shouldMigrateLegacyProfile = looksLikeLegacyBienUyenBaoProfile(rawStored);
  if (shouldMigrateLegacyProfile) {
    rawStored = applyTungGiaBaoBaseline(rawStored);
    try {
      const persistedMigration = clone(rawStored);
      delete persistedMigration.logo;
      localStorage.setItem(STORAGE, JSON.stringify(persistedMigration));
    } catch (error) {
      console.warn('Tùng Gia Bảo profile migration is active in memory but could not be persisted yet.', error);
    }
  }
  state = merge(rawStored);
} catch {
  state = clone(defaults);
}

try {
  const separateLogo = localStorage.getItem(LOGO_STORAGE);
  state.logo = separateLogo || String(rawStored?.logo || '');
  if (!separateLogo && rawStored?.logo) {
    try {
      localStorage.setItem(LOGO_STORAGE, rawStored.logo);
      const migrated = clone(rawStored);
      delete migrated.logo;
      localStorage.setItem(STORAGE, JSON.stringify(migrated));
    } catch (error) {
      console.warn('Legacy logo migration deferred; keeping loaded quotation state intact.', error);
    }
  }
} catch {
  state.logo = String(rawStored?.logo || state.logo || '');
}

let deviceProfileRuntime = null;
try {
  deviceProfileRuntime = startDeviceProfileRuntime();
} catch (error) {
  console.warn('Device classification is unavailable; PriceReport continues without management metadata.', error);
}
void deviceProfileRuntime;

let deviceAccessRuntime = null;
Promise.resolve()
  .then(() => startPriceReportDeviceAccess())
  .then((runtime) => { deviceAccessRuntime = runtime; })
  .catch((error) => console.warn('KT Device Gate could not start.', error));
void deviceAccessRuntime;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
function safeStore(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('Local storage write failed:', error);
    const toastEl = document.getElementById('toast');
    if (toastEl) toast('Không thể lưu dữ liệu: bộ nhớ trình duyệt có thể đã đầy.');
    return false;
  }
}
function saveLogoAsset(value) {
  try {
    if (value) localStorage.setItem(LOGO_STORAGE, value);
    else localStorage.removeItem(LOGO_STORAGE);
    return true;
  } catch (error) {
    console.error('Logo storage write failed:', error);
    toast('Không thể lưu logo: bộ nhớ trình duyệt có thể đã đầy.');
    return false;
  }
}

function stateForStorage() {
  const data = clone(state);
  delete data.logo;
  return data;
}

let autosaveStateTimer = 0;
function setAutosaveState(mode, label) {
  const el = document.getElementById('studioAutosaveState');
  if (!el) return;
  el.classList.remove('saving','saved','error');
  if (mode) el.classList.add(mode);
  el.innerHTML = '<span>●</span> ' + label;
}
function save() {
  setAutosaveState('saving', 'Đang lưu…');
  const ok = safeStore(STORAGE, JSON.stringify(stateForStorage()));
  window.clearTimeout(autosaveStateTimer);
  if (ok) {
    const stamp = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    setAutosaveState('saved', 'Đã lưu lúc ' + stamp);
    autosaveStateTimer = window.setTimeout(() => setAutosaveState('saved', 'Đã tự động lưu'), 2400);
  } else {
    setAutosaveState('error', 'Không thể lưu');
  }
  return ok;
}

function captureStorageSnapshot(keys) {
  const snapshot = {};
  try {
    keys.forEach((key) => {
      snapshot[key] = localStorage.getItem(key);
    });
    return snapshot;
  } catch (error) {
    console.error('Unable to capture storage snapshot:', error);
    return null;
  }
}

function restoreStorageSnapshot(snapshot) {
  if (!snapshot) return false;
  try {
    Object.entries(snapshot).forEach(([key, value]) => {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    });
    return true;
  } catch (error) {
    console.error('Unable to roll back storage snapshot:', error);
    return false;
  }
}

function storageWriteError(rollbackOk = true) {
  const error = new Error(rollbackOk ? 'storage-write-failed' : 'storage-rollback-failed');
  error.code = rollbackOk ? 'STORAGE_WRITE_FAILED' : 'STORAGE_ROLLBACK_FAILED';
  return error;
}

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value == null ? '' : value;
};

let latestDeviceAccess = {
  state: String(document.documentElement?.dataset?.priceReportDeviceAccess || ''),
  deviceCode: '',
  lastKnownStatus: '',
  message: ''
};

function captureDeviceAccess(detail = {}) {
  const identity = detail?.identity || {};
  latestDeviceAccess = {
    state: String(detail?.state || document.documentElement?.dataset?.priceReportDeviceAccess || ''),
    deviceCode: typeof identity.deviceCode === 'string' ? identity.deviceCode : '',
    lastKnownStatus: typeof identity.lastKnownStatus === 'string' ? identity.lastKnownStatus : '',
    message: typeof detail?.message === 'string' ? detail.message : ''
  };
}


const STATUS_LABELS = {
  draft: 'Bản nháp',
  sent: 'Đã gửi',
  accepted: 'Đã chấp nhận',
  rejected: 'Từ chối',
  expired: 'Hết hiệu lực'
};

const STUDIO_WORKFLOW = [
  { tab: 'general', label: 'Thông tin' },
  { tab: 'products', label: 'Sản phẩm' },
  { tab: 'payment', label: 'Thanh toán' },
  { tab: 'terms', label: 'Điều khoản' },
  { tab: 'design', label: 'Thiết kế' },
  { tab: 'export', label: 'Xuất' }
];

const STUDIO_STAGE_BY_TAB = {
  general: 'general',
  customer: 'general',
  products: 'products',
  payment: 'payment',
  terms: 'terms',
  design: 'design',
  presets: 'design',
  export: 'export'
};

function comparableQuoteForHistory(data) {
  const snapshot = clone(data || {});
  delete snapshot.logo;
  delete snapshot.historyRecordId;
  return snapshot;
}

function currentQuoteHistoryState() {
  if (!state.historyRecordId) return 'new';
  const record = getHistory().find(item => item.id === state.historyRecordId);
  if (!record) return 'new';
  return JSON.stringify(comparableQuoteForHistory(state)) === JSON.stringify(comparableQuoteForHistory(record.data))
    ? 'saved'
    : 'dirty';
}

function syncStudioContext(tab = '') {
  const quoteLabel = document.getElementById('studioQuoteLabel');
  const quoteStatus = document.getElementById('studioQuoteStatus');
  const historyState = document.getElementById('studioHistoryState');
  if (quoteLabel) quoteLabel.textContent = String(state.quoteNo || '').trim() || 'Báo giá mới';
  if (quoteStatus) {
    const currentStatus = state.quoteStatus || 'draft';
    quoteStatus.textContent = statusLabel(currentStatus);
    quoteStatus.className = 'studio-status-badge status-' + currentStatus;
  }
  if (historyState) {
    const historyMode = currentQuoteHistoryState();
    historyState.textContent = historyMode === 'saved'
      ? 'Đã lưu lịch sử'
      : historyMode === 'dirty'
        ? 'Có thay đổi chưa lưu'
        : 'Chưa lưu lịch sử';
    historyState.className = 'studio-history-state' +
      (historyMode === 'saved' ? ' saved' : historyMode === 'dirty' ? ' dirty' : '');
  }

  const stage = STUDIO_STAGE_BY_TAB[tab] || '';
  document.querySelectorAll('[data-studio-step]').forEach((button) => {
    const active = Boolean(stage) && button.dataset.studioStep === stage;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'step' : 'false');
  });

  const workflowIndex = STUDIO_WORKFLOW.findIndex(item => item.tab === stage);
  const position = document.getElementById('studioWorkflowPosition');
  const prev = document.getElementById('studioPrevStep');
  const next = document.getElementById('studioNextStep');
  if (position) {
    position.textContent = workflowIndex >= 0
      ? 'Bước ' + (workflowIndex + 1) + '/' + STUDIO_WORKFLOW.length + ' · ' + STUDIO_WORKFLOW[workflowIndex].label
      : 'Quy trình ' + STUDIO_WORKFLOW.length + ' bước';
  }
  if (prev) {
    prev.disabled = workflowIndex <= 0;
    prev.title = workflowIndex > 0 ? 'Về ' + STUDIO_WORKFLOW[workflowIndex - 1].label : 'Đang ở bước đầu';
  }
  if (next) {
    next.disabled = workflowIndex < 0 || workflowIndex >= STUDIO_WORKFLOW.length - 1;
    next.title = workflowIndex >= 0 && workflowIndex < STUDIO_WORKFLOW.length - 1
      ? 'Tiếp: ' + STUDIO_WORKFLOW[workflowIndex + 1].label
      : 'Đang ở bước cuối';
  }
}

const tabMeta = {
  dashboard: ['TRANG CHỦ', 'Tổng quan báo giá, khách hàng, sản phẩm và trạng thái ứng dụng.'],
  general: ['TẠO BÁO GIÁ', 'Thông tin doanh nghiệp, khách hàng và báo giá.'],
  history: ['QUẢN LÝ BÁO GIÁ', 'Lưu, tìm kiếm, mở lại và nhân bản các báo giá.'],
  master: ['DANH MỤC', 'Tái sử dụng khách hàng và sản phẩm thường dùng.'],
  system: ['THIẾT BỊ & HỆ THỐNG', 'Trạng thái thiết bị, Device Gate và Application Management.'],
  customer: ['KHÁCH HÀNG', 'Thông tin người nhận và đơn vị mua hàng.'],
  products: ['SẢN PHẨM', 'Danh mục, số lượng, đơn giá và cột hiển thị.'],
  payment: ['THANH TOÁN', 'Chiết khấu, VAT, tổng tiền và tài khoản.'],
  terms: ['ĐIỀU KHOẢN', 'Điều khoản thương mại, ngày tháng và chữ ký.'],
  design: ['THIẾT KẾ', 'Mẫu trình bày, màu sắc và định dạng A4.'],
  view: ['XEM BÁO CÁO', 'Chế độ đọc toàn màn hình cho điện thoại và máy tính bảng.'],
  export: ['XUẤT / NHẬP / IN', 'PDF, Excel, OCR và sao lưu dữ liệu.'],
  presets: ['LƯU MẪU', 'Lưu các cấu hình báo giá để dùng lại.'],
  settings: ['CÀI ĐẶT ỨNG DỤNG', 'Khởi động, giao diện và hành vi lưu dữ liệu.']
};

let mobileMoreLastFocus = null;

function mobileMoreFocusable() {
  const menu = document.getElementById('mobileMoreMenu');
  if (!menu) return [];
  return Array.from(menu.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
}

function setMobileMoreMenu(open, { restoreFocus = false } = {}) {
  const menu = document.getElementById('mobileMoreMenu');
  const toggle = document.getElementById('mobileMoreToggle');
  if (!menu || !toggle) return;
  const enabled = Boolean(open);
  if (enabled) mobileMoreLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
  menu.hidden = !enabled;
  toggle.setAttribute('aria-expanded', enabled ? 'true' : 'false');
  document.body.classList.toggle('mobile-more-open', enabled);
  if (enabled) {
    mobileMoreFocusable()[0]?.focus();
  } else if (restoreFocus) {
    (mobileMoreLastFocus || toggle)?.focus?.();
  }
}

document.getElementById('mobileMoreMenu')?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    setMobileMoreMenu(false, { restoreFocus: true });
    return;
  }
  if (event.key !== 'Tab') return;
  const items = mobileMoreFocusable();
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

function openTab(tab) {
  setMobileMoreMenu(false);
  if (tab !== 'dashboard') closeDashboardSearchResults();
  const shell = document.querySelector('.shell');
  const appWorkspace = ['dashboard', 'history', 'master', 'system', 'settings', 'export'].includes(tab);
  shell?.classList.toggle('data-entry-mode', tab === 'products');
  document.querySelectorAll('[data-studio-block]').forEach((button) => {
    const activeBlock = button.dataset.studioBlock === (STUDIO_STAGE_BY_TAB[tab] || tab);
    button.classList.toggle('active', activeBlock);
  });

  const primaryNavTab = STUDIO_STAGE_BY_TAB[tab] ? 'general' : tab;
  document.querySelectorAll('.nav button[data-tab]').forEach((el) => {
    const active = el.dataset.tab === primaryNavTab;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });

  if (tab === 'view') {
    shell?.classList.remove('app-workspace');
    setReportViewMode(true);
    return;
  }

  shell?.classList.toggle('app-workspace', appWorkspace);
  setReportViewMode(false);
  document.querySelectorAll('.pane').forEach((el) => el.classList.toggle('active', el.id === 'pane-' + tab));
  document.getElementById('paneTitle').textContent = tabMeta[tab][0];
  document.getElementById('paneSub').textContent = tabMeta[tab][1];

  syncStudioContext(tab);
  if (tab !== 'design') document.getElementById('designPanel')?.classList.remove('open');
  if (appWorkspace) setPreviewCustomizer(false);
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'export') renderExportCenter();
  if (tab === 'system') renderSystemWorkspace();
  if (tab === 'settings') renderSettingsWorkspace();
  if (tab === 'design') {
    document.getElementById('designPanel').classList.add('open');
    setMajorPanelState('design', false);
  }
  if (tab === 'presets') renderPresets();
  if (tab === 'history') renderHistory();
  if (tab === 'master') renderMasterData();
  setTimeout(enhanceCollapsibleCards, 0);
  if (tab !== 'products') {
    document.querySelector('.shell')?.classList.remove('product-focus');
    const focusBtn = document.getElementById('productFocusToggle');
    if (focusBtn) focusBtn.textContent = '⛶ Mở rộng vùng nhập';
  }
}

document.querySelectorAll('.nav button[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => openTab(btn.dataset.tab));
});

document.getElementById('studioBackHome')?.addEventListener('click', () => openTab('dashboard'));
document.querySelectorAll('[data-studio-step]').forEach((button) => {
  button.addEventListener('click', () => openTab(button.dataset.studioStep));
});

function moveStudioWorkflow(direction) {
  const activeTab = document.querySelector('.pane.active')?.id?.replace('pane-', '') || '';
  const stage = STUDIO_STAGE_BY_TAB[activeTab] || '';
  const index = STUDIO_WORKFLOW.findIndex(item => item.tab === stage);
  const target = STUDIO_WORKFLOW[index + direction];
  if (target) openTab(target.tab);
}

document.getElementById('studioPrevStep')?.addEventListener('click', () => moveStudioWorkflow(-1));
document.getElementById('studioNextStep')?.addEventListener('click', () => moveStudioWorkflow(1));
document.getElementById('studioSaveQuote')?.addEventListener('click', saveCurrentQuote);
document.getElementById('studioCheckQuote')?.addEventListener('click', () => document.getElementById('preflightCheck')?.click());
document.getElementById('studioPreviewQuote')?.addEventListener('click', () => openTab('view'));

document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
  event.preventDefault();
  saveCurrentQuote();
});

function dashboardStatusClass(status) {
  return ['draft','sent','accepted','rejected','expired'].includes(status) ? status : 'draft';
}

function dashboardRevenueLabel(history) {
  const totals = historyTotalsByCurrency(history);
  const entries = Object.entries(totals).filter(([, value]) => Number(value || 0) !== 0);
  if (!entries.length) return '0 VND';
  const preferred = entries.find(([currency]) => currency === 'VND') || entries[0];
  const suffix = entries.length > 1 ? ' +' + (entries.length - 1) : '';
  return moneyForCurrency(preferred[1], preferred[0]) + suffix;
}

function systemAccessLabel(value) {
  return ({
    'classification-only': 'Phân loại cục bộ',
    authorized: 'Đã duyệt',
    pending: 'Chờ duyệt',
    blocked: 'Đã khóa',
    offline: 'Không kết nối',
    checking: 'Đang kiểm tra'
  })[String(value || '')] || 'Chưa có trạng thái';
}

function managementStateLabel(value) {
  return ({
    ready: 'Sẵn sàng quản trị từ xa',
    'classification-only': 'Chỉ phân loại cục bộ',
    unavailable: 'Không đọc được contract',
    loading: 'Đang đọc contract'
  })[String(value || '')] || 'Đang đọc contract';
}

function readinessLabel(value) {
  const raw = String(value || '');
  if (raw === 'available') return 'Sẵn sàng';
  if (raw.startsWith('implemented')) return 'Đã triển khai · chờ hạ tầng';
  if (!raw) return 'Chưa xác minh';
  return raw;
}

function setSystemStateTone(elementId, state) {
  const card = document.getElementById(elementId);
  if (!card) return;
  card.dataset.state = state || 'unknown';
}

function renderSettingsWorkspace() {
  const prefs = getAppPreferences();
  const startPage = document.getElementById('settingsStartPage');
  const showHero = document.getElementById('settingsShowDashboardHero');
  const compact = document.getElementById('settingsCompactManagement');
  const autoPc = document.getElementById('settingsAutoPcSave');

  if (startPage) startPage.value = prefs.startPage;
  if (showHero) showHero.checked = prefs.showDashboardHero;
  if (compact) compact.checked = prefs.compactManagement;
  if (autoPc) autoPc.checked = prefs.autoPcSave;

  setText('settingsHistoryCount', getHistory().length);
  setText('settingsCustomerCount', getCustomerLibrary().length);
  setText('settingsProductCount', getProductCatalog().length);
  setText('settingsPcSupport', supportsPcFolderAccess() ? 'Có hỗ trợ' : 'Không hỗ trợ');
}

function renderSystemWorkspace() {
  const runtime = window.PriceReportManagement;
  const local = runtime?.getLocalDeviceRecord?.() || {};
  const profile = runtime?.getDeviceProfile?.() || {};
  const contract = runtime?.managementContract || null;
  const readiness = contract?.readiness || {};
  const boundary = contract?.boundary || {};
  const policy = contract?.policy || {};
  const accessState = latestDeviceAccess.state || String(document.documentElement?.dataset?.priceReportDeviceAccess || '');

  setText('systemDeviceLabel', local.deviceLabel || profile.label || 'Chưa nhận diện');
  setText('systemDeviceClass', [local.deviceClass || profile.id, local.uiProfile || profile.shell].filter(Boolean).join(' · ') || '—');
  setText('systemAccessState', systemAccessLabel(accessState));
  setText('systemAccessMessage', latestDeviceAccess.message || (accessState === 'classification-only' ? 'Remote Device Gate chưa bật.' : '—'));
  setText('systemManagementState', managementStateLabel(runtime?.managementReadiness));
  setText('systemManagementDetail', runtime?.managementError || (runtime?.remoteAdminReady ? 'Contract production đã xác minh readiness.' : 'Remote Admin chưa đạt đầy đủ readiness.'));
  setText('systemRemoteAdminState', runtime?.remoteAdminReady ? 'Sẵn sàng' : 'Chưa bật');

  setText('systemDetailDeviceClass', local.deviceLabel || profile.label || local.deviceClass || profile.id || '—');
  setText('systemUiProfile', local.uiProfile || profile.shell || '—');
  setText('systemLocalDeviceCode', local.deviceCode || '—');
  setText('systemRegistryDeviceCode', latestDeviceAccess.deviceCode || 'Chưa cấp registry');
  setText('systemViewport', local.width && local.height ? local.width + ' × ' + local.height + ' px' : '—');
  setText('systemPlatform', local.platform || '—');
  setText('systemLastSeen', local.lastSeenAt ? new Date(local.lastSeenAt).toLocaleString('vi-VN') : '—');
  setText('systemEnvironmentChanged', local.environmentChanged ? 'Có' : 'Không');

  setText('systemRegistryReady', readinessLabel(readiness.deviceRegistry));
  setText('systemGatewayReady', readinessLabel(readiness.deviceGateway));
  setText('systemAdminApiReady', readinessLabel(readiness.adminApi));
  setText('systemAuditReady', readinessLabel(readiness.remoteAuditApi));
  setText('systemContractApp', contract?.application?.name || 'PriceReport Tùng Gia Bảo');
  setText('systemContractMeta', [
    contract?.application?.category || runtime?.category || 'Kế toán',
    'namespace ' + (contract?.device?.namespace || runtime?.deviceNamespace || 'KT-')
  ].join(' · '));

  setText('systemBoundaryLocal', boundary.localFirst === true ? 'Có · dữ liệu nghiệp vụ ưu tiên trên thiết bị' : contract ? 'Không' : 'Đang đọc contract');
  setText('systemBoundaryQuote', boundary.quotationDataInControlPlane === false ? 'Không' : contract ? 'Có / cần kiểm tra' : 'Đang đọc contract');
  setText('systemBoundaryCustomer', boundary.customerDataInControlPlane === false ? 'Không' : contract ? 'Có / cần kiểm tra' : 'Đang đọc contract');
  setText('systemBoundaryPrivateKey', policy.privateKeyMayLeaveDevice === false ? 'Không · khóa riêng ở lại thiết bị' : contract ? 'Có / cần kiểm tra' : 'Đang đọc contract');

  setSystemStateTone('systemAccessCard', accessState);
  setSystemStateTone('systemManagementCard', runtime?.managementReadiness || 'loading');
}

async function refreshSystemWorkspace() {
  const button = document.getElementById('systemRefreshRuntime');
  const pane = document.getElementById('pane-system');
  pane?.setAttribute('aria-busy', 'true');
  if (button) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = '↻ Đang kiểm tra...';
  }
  try {
    deviceProfileRuntime?.refreshDeviceProfile?.();
    const runtime = window.PriceReportManagement;
    if (runtime?.refreshDeviceProfile) runtime.refreshDeviceProfile();
    if (runtime?.refreshManagementReadiness) await runtime.refreshManagementReadiness();
    if (deviceAccessRuntime?.enabled && typeof deviceAccessRuntime.refresh === 'function') {
      await deviceAccessRuntime.refresh();
    }
  } catch (error) {
    console.warn('System workspace refresh failed:', error);
  } finally {
    renderSystemWorkspace();
    pane?.setAttribute('aria-busy', 'false');
    if (button) {
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
      button.textContent = '↻ Kiểm tra lại';
    }
  }
}

function updateDashboardSystemState() {
  const stateEl = document.getElementById('dashSystemState');
  const detailEl = document.getElementById('dashSystemDetail');
  if (!stateEl || !detailEl) return;
  const runtime = window.PriceReportManagement;
  const accessState = document.documentElement?.dataset?.priceReportDeviceAccess || '';
  if (runtime?.remoteAdminReady) {
    stateEl.textContent = 'Đã kết nối quản trị';
    detailEl.textContent = 'Thiết bị và Application Management đang dùng contract production đã xác minh.';
    return;
  }
  if (accessState && accessState !== 'classification-only') {
    stateEl.textContent = 'Thiết bị đang được quản lý';
    detailEl.textContent = 'Device Gate đang hoạt động ở trạng thái: ' + accessState + '.';
    return;
  }
  stateEl.textContent = 'Ứng dụng sẵn sàng';
  detailEl.textContent = 'Dữ liệu báo giá chạy local-first; quản trị từ xa đang ở chế độ an toàn.';
}

let dashboardSearchActiveIndex = -1;

function setDashboardSearchActive(index) {
  const input = document.getElementById('dashboardSearch');
  const options = Array.from(document.querySelectorAll('#dashboardSearchResults .dashboard-search-result'));
  if (!options.length) {
    dashboardSearchActiveIndex = -1;
    input?.removeAttribute('aria-activedescendant');
    return;
  }
  dashboardSearchActiveIndex = Math.max(0, Math.min(index, options.length - 1));
  options.forEach((option, optionIndex) => {
    const active = optionIndex === dashboardSearchActiveIndex;
    option.classList.toggle('is-active', active);
    option.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  const active = options[dashboardSearchActiveIndex];
  if (active?.id) input?.setAttribute('aria-activedescendant', active.id);
  active?.scrollIntoView?.({ block: 'nearest' });
}

function closeDashboardSearchResults() {
  const box = document.getElementById('dashboardSearchResults');
  const input = document.getElementById('dashboardSearch');
  dashboardSearchActiveIndex = -1;
  if (box) {
    box.hidden = true;
    box.innerHTML = '';
  }
  input?.setAttribute('aria-expanded', 'false');
  input?.removeAttribute('aria-activedescendant');
}

function appendDashboardSearchResult(box, { type, eyebrow, title, subtitle, onSelect }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dashboard-search-result';
  button.dataset.resultType = type;
  button.id = 'dashboardSearchOption-' + box.querySelectorAll('.dashboard-search-result').length;
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', 'false');

  const icon = document.createElement('span');
  icon.className = 'dashboard-search-result-icon';
  icon.textContent = type === 'quote' ? '▤' : type === 'customer' ? '●' : '◆';

  const content = document.createElement('span');
  content.className = 'dashboard-search-result-copy';
  const meta = document.createElement('small');
  meta.textContent = eyebrow;
  const strong = document.createElement('strong');
  strong.textContent = title;
  const sub = document.createElement('em');
  sub.textContent = subtitle || '';
  content.append(meta, strong, sub);

  button.append(icon, content);
  button.addEventListener('click', () => {
    closeDashboardSearchResults();
    onSelect();
  });
  box.appendChild(button);
}

function renderDashboardSearchResults(rawQuery) {
  const box = document.getElementById('dashboardSearchResults');
  const input = document.getElementById('dashboardSearch');
  if (!box || !input) return;

  const query = String(rawQuery || '').trim().toLowerCase();
  if (query.length < 2) {
    closeDashboardSearchResults();
    return;
  }

  const quotes = getHistory().filter(record => {
    const data = record.data || {};
    return [data.quoteNo, data.customerName, data.customerCompany, data.customerPhone]
      .filter(Boolean).join(' ').toLowerCase().includes(query);
  }).slice(0, 4);
  const customers = getCustomerLibrary().filter(customer =>
    [customer.name, customer.company, customer.phone, customer.email, customer.address]
      .filter(Boolean).join(' ').toLowerCase().includes(query)
  ).slice(0, 4);
  const products = getProductCatalog().filter(product =>
    [product.name, product.group, product.pack, product.unit, product.note]
      .filter(Boolean).join(' ').toLowerCase().includes(query)
  ).slice(0, 4);

  box.innerHTML = '';
  dashboardSearchActiveIndex = -1;
  input.removeAttribute('aria-activedescendant');
  quotes.forEach(record => {
    const data = record.data || {};
    appendDashboardSearchResult(box, {
      type: 'quote',
      eyebrow: 'BÁO GIÁ',
      title: data.quoteNo || 'Chưa có mã',
      subtitle: data.customerCompany || data.customerName || 'Chưa có khách hàng',
      onSelect: () => loadQuoteRecord(record)
    });
  });
  customers.forEach(customer => {
    appendDashboardSearchResult(box, {
      type: 'customer',
      eyebrow: 'KHÁCH HÀNG',
      title: customer.name || customer.company || 'Khách hàng',
      subtitle: [customer.company, customer.phone].filter(Boolean).join(' • '),
      onSelect: () => useCustomer(customer)
    });
  });
  products.forEach(product => {
    const currency = normalizeCatalogCurrency(product.currency || 'VND');
    appendDashboardSearchResult(box, {
      type: 'product',
      eyebrow: 'SẢN PHẨM',
      title: product.name || 'Sản phẩm',
      subtitle: [product.group, moneyForCurrency(Number(product.price || 0), currency)].filter(Boolean).join(' • '),
      onSelect: () => addCatalogProduct(product)
    });
  });

  if (!box.children.length) {
    const empty = document.createElement('div');
    empty.className = 'dashboard-search-empty';
    empty.setAttribute('role', 'option');
    empty.setAttribute('aria-disabled', 'true');
    empty.textContent = 'Không tìm thấy báo giá, khách hàng hoặc sản phẩm phù hợp.';
    box.appendChild(empty);
  }
  box.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function renderExportCenter() {
  const validation = validateQuote();
  const namedProducts = (Array.isArray(state.products) ? state.products : [])
    .filter(product => String(product?.name || '').trim());
  const history = getHistory();
  const customers = getCustomerLibrary();
  const products = getProductCatalog();

  setText('exportCenterQuote', String(state.quoteNo || '').trim() || 'Báo giá mới');
  setText('exportCenterQuoteStatus', statusLabel(state.quoteStatus || 'draft'));
  setText('exportCenterProducts', namedProducts.length);
  setText('exportCenterStored', (history.length + customers.length + products.length) + ' mục');
  setText('exportBackupHistoryCount', history.length);
  setText('exportBackupCustomerCount', customers.length);
  setText('exportBackupProductCount', products.length);

  const health = document.getElementById('exportCenterHealth');
  const detail = document.getElementById('exportCenterHealthDetail');
  const card = health?.closest('.export-status-card');
  card?.classList.remove('health-ok','health-warn','health-error');

  if (validation.errors.length) {
    setText('exportCenterHealth', validation.errors.length + ' lỗi');
    setText('exportCenterHealthDetail', 'Cần sửa trước khi in/PDF.');
    card?.classList.add('health-error');
  } else if (validation.warnings.length) {
    setText('exportCenterHealth', validation.warnings.length + ' mục cần kiểm tra');
    setText('exportCenterHealthDetail', 'Có thể rà lại trước khi phát hành.');
    card?.classList.add('health-warn');
  } else {
    setText('exportCenterHealth', 'Sẵn sàng');
    setText('exportCenterHealthDetail', 'Không phát hiện lỗi nghiệp vụ.');
    card?.classList.add('health-ok');
  }
}

function renderDashboard() {
  const history = getHistory();
  const customers = getCustomerLibrary();
  const products = getProductCatalog();
  const statusOf = (record) => record?.data?.quoteStatus || record?.status || 'draft';
  const pending = history.filter((record) => ['draft','sent'].includes(statusOf(record))).length;
  const accepted = history.filter((record) => statusOf(record) === 'accepted').length;

  setText('dashQuoteCount', history.length);
  setText('dashCustomerCount', customers.length);
  setText('dashProductCount', products.length);
  setText('dashPendingCount', pending);
  setText('dashAcceptedCount', accepted);
  setText('dashRevenue', dashboardRevenueLabel(history));

  const now = new Date();
  const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const monthCount = history.filter((record) => {
    const date = String(record?.data?.quoteDate || record?.savedAt || '');
    return date.slice(0, 7) === monthKey;
  }).length;
  setText('dashMonthCount', monthCount + ' báo giá');
  const progress = Math.min(100, monthCount * 10);
  const progressBar = document.getElementById('dashProgressBar');
  if (progressBar) progressBar.style.width = progress + '%';
  setText('dashProgressText', monthCount
    ? 'Đã tạo ' + monthCount + ' báo giá trong tháng hiện tại.'
    : 'Bắt đầu bằng báo giá đầu tiên của tháng.');

  const list = document.getElementById('dashRecentQuotes');
  if (list) {
    list.innerHTML = '';
    const recent = history.slice(0, 6);
    if (!recent.length) {
      const empty = document.createElement('div');
      empty.className = 'dashboard-empty';
      empty.setAttribute('role', 'status');
      empty.textContent = 'Chưa có báo giá đã lưu. Tạo báo giá mới để bắt đầu.';
      list.appendChild(empty);
    } else {
      recent.forEach((record) => {
        const data = record.data || {};
        const status = statusOf(record);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'recent-quote-row';
        row.addEventListener('click', () => loadQuoteRecord(record));

        const quote = document.createElement('strong');
        quote.textContent = data.quoteNo || 'Chưa có mã';
        const customer = document.createElement('span');
        customer.textContent = data.customerCompany || data.customerName || 'Chưa có khách hàng';
        const date = document.createElement('span');
        date.textContent = data.quoteDate || String(record.savedAt || '').slice(0, 10) || '—';
        const total = document.createElement('span');
        total.className = 'recent-total';
        total.textContent = moneyForCurrency(record.total ?? calcTotal(data), record.currency || data.currency || 'VND');
        const badge = document.createElement('span');
        badge.className = 'dashboard-status status-' + dashboardStatusClass(status);
        badge.textContent = statusLabel(status);
        row.append(quote, customer, date, total, badge);
        list.appendChild(row);
      });
    }
  }
  updateDashboardSystemState();
}

function focusTabDestination(tab) {
  const pane = document.getElementById('pane-' + tab);
  if (!pane) return;
  const target = pane.querySelector('h1, h2, h3') || pane;
  if (!(target instanceof HTMLElement)) return;
  const previousTabIndex = target.getAttribute('tabindex');
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  target.addEventListener('blur', () => {
    if (previousTabIndex == null) target.removeAttribute('tabindex');
    else target.setAttribute('tabindex', previousTabIndex);
  }, { once: true });
}

document.querySelectorAll('[data-open-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const fromMobileMore = Boolean(btn.closest('#mobileMoreMenu'));
    const tab = btn.dataset.openTab;
    openTab(tab);
    if (fromMobileMore) focusTabDestination(tab);
  });
});

document.getElementById('settingsStartPage')?.addEventListener('change', (event) => {
  saveAppPreferences({ startPage: event.currentTarget.value });
});
document.getElementById('settingsShowDashboardHero')?.addEventListener('change', (event) => {
  saveAppPreferences({ showDashboardHero: event.currentTarget.checked });
});
document.getElementById('settingsCompactManagement')?.addEventListener('change', (event) => {
  saveAppPreferences({ compactManagement: event.currentTarget.checked });
});
document.getElementById('settingsAutoPcSave')?.addEventListener('change', (event) => {
  saveAppPreferences({ autoPcSave: event.currentTarget.checked });
});
document.getElementById('settingsResetUi')?.addEventListener('click', () => {
  if (!confirm('Đặt lại cài đặt giao diện? Dữ liệu báo giá, lịch sử, danh bạ và danh mục sẽ được giữ nguyên.')) return;
  const current = getUiState();
  const clean = { appPreferences: Object.assign({}, DEFAULT_APP_PREFERENCES) };
  if (current && typeof current === 'object') {
    // Deliberately drop panel/card collapse state while preserving no business data in UI_STATE.
  }
  saveUiState(clean);
  applyAppPreferences();
  setMajorPanelState('editor', false, false);
  setMajorPanelState('design', false, false);
  renderSettingsWorkspace();
  toast('Đã đặt lại cài đặt giao diện');
});

document.querySelectorAll('[data-create-quote]').forEach((btn) => {
  btn.addEventListener('click', () => createNewQuote());
});

function openMasterSection(section) {
  openTab('master');
  const targetId = section === 'products' ? 'productCatalogCard' : 'customerLibraryCard';
  requestAnimationFrame(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('master-section-highlight');
    setTimeout(() => target.classList.remove('master-section-highlight'), 900);
  });
}

document.querySelectorAll('[data-open-master]').forEach((btn) => {
  btn.addEventListener('click', () => openMasterSection(btn.dataset.openMaster));
});

document.getElementById('mobileMoreToggle')?.addEventListener('click', () => {
  const menu = document.getElementById('mobileMoreMenu');
  setMobileMoreMenu(Boolean(menu?.hidden));
});
document.getElementById('mobileMoreClose')?.addEventListener('click', () => setMobileMoreMenu(false, { restoreFocus: true }));


document.getElementById('dashboardSearch')?.addEventListener('input', (event) => {
  renderDashboardSearchResults(event.currentTarget.value);
});
document.getElementById('dashboardSearch')?.addEventListener('keydown', (event) => {
  const resultBox = document.getElementById('dashboardSearchResults');
  const results = Array.from(document.querySelectorAll('#dashboardSearchResults .dashboard-search-result'));
  const resultsOpen = Boolean(resultBox && !resultBox.hidden && results.length);

  if (event.key === 'Escape') {
    closeDashboardSearchResults();
    return;
  }
  if (resultsOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = dashboardSearchActiveIndex < 0
      ? (delta > 0 ? 0 : results.length - 1)
      : (dashboardSearchActiveIndex + delta + results.length) % results.length;
    setDashboardSearchActive(next);
    return;
  }
  if (event.key !== 'Enter') return;
  if (resultsOpen) {
    event.preventDefault();
    const selected = results[dashboardSearchActiveIndex >= 0 ? dashboardSearchActiveIndex : 0];
    selected?.click();
    return;
  }
  const value = event.currentTarget.value.trim();
  openTab('history');
  const search = document.getElementById('quoteSearch');
  if (search) {
    search.value = value;
    renderHistory();
    search.focus();
  }
});

window.addEventListener('pricereport:management-readiness', () => {
  updateDashboardSystemState();
  renderSystemWorkspace();
});
window.addEventListener('pricereport:device-profile', () => {
  renderSystemWorkspace();
});
window.addEventListener('pricereport:device-access', (event) => {
  captureDeviceAccess(event.detail || {});
  updateDashboardSystemState();
  renderSystemWorkspace();
});

document.getElementById('systemRefreshRuntime')?.addEventListener('click', () => {
  void refreshSystemWorkspace();
});
document.getElementById('systemCopyDeviceCode')?.addEventListener('click', async () => {
  const runtime = window.PriceReportManagement;
  const localCode = runtime?.getLocalDeviceRecord?.()?.deviceCode || '';
  const code = latestDeviceAccess.deviceCode || localCode;
  if (!code) {
    toast('Chưa có mã thiết bị để sao chép');
    return;
  }
  try {
    await navigator.clipboard.writeText(code);
    toast('Đã sao chép mã thiết bị');
  } catch {
    toast('Không thể sao chép mã thiết bị');
  }
});


function applyTungGiaBaoToCurrentQuote({ confirmReplace = true } = {}) {
  if (confirmReplace && !window.confirm('Thay thông tin doanh nghiệp và danh sách sản phẩm hiện tại bằng dữ liệu Tùng Gia Bảo? Thiết kế, logo và dữ liệu khách hàng vẫn được giữ.')) {
    return false;
  }
  const currentLogo = state.logo;
  state = merge(applyTungGiaBaoBaseline(state));
  state.logo = currentLogo;
  syncLegacyCompanyAddress();
  const persisted = save();
  syncInputs();
  resetCollapsedProductsForState?.();
  renderEditorProducts();
  render();
  toast(persisted
    ? 'Đã thay toàn bộ nội dung mẫu sang Tùng Gia Bảo'
    : 'Đã thay nội dung tạm thời; trình duyệt chưa lưu được dữ liệu');
  return persisted;
}

function bindInputs() {
  $$('[data-bind]').forEach((el) => {
    const key = el.dataset.bind;
    if (el.type === 'checkbox') el.checked = Boolean(state[key]);
    else el.value = state[key] == null ? '' : state[key];

    let undoBaseline = '';
    const captureUndoBaseline = () => {
      if (!undoBaseline && typeof quoteSnapshotString === 'function') undoBaseline = quoteSnapshotString();
    };
    el.addEventListener('focus', captureUndoBaseline);
    el.addEventListener('pointerdown', captureUndoBaseline);
    el.addEventListener('blur', () => {
      if (undoBaseline && undoBaseline !== quoteSnapshotString()) pushQuoteUndoSnapshot(undoBaseline);
      undoBaseline = '';
    });

    const onChange = () => {
      if (el.type === 'checkbox') {
        state[key] = el.checked;
      } else if (el.type === 'number' || el.type === 'range' || ['tableFontSize','logoWidth','logoPadding','logoOffsetX','logoOffsetY','logoRemoveBgThreshold','logoBackdropOpacity','logoBackdropRadius','previewHeaderGap','previewMetaWidth','previewLineHeight'].includes(key)) {
        let value = Number(el.value || 0);
        if (key === 'discountPct' || key === 'vatPct' || key === 'logoBackdropOpacity') value = Math.min(100, Math.max(0, value));
        else if (key === 'logoWidth') value = Math.min(90, Math.max(18, value));
        else if (key === 'logoPadding') value = Math.min(12, Math.max(0, value));
        else if (key === 'logoOffsetX') value = Math.min(40, Math.max(-40, value));
        else if (key === 'logoOffsetY') value = Math.min(30, Math.max(-30, value));
        else if (key === 'logoRemoveBgThreshold') value = normalizeRemoveBgTolerance(value, 46);
        else if (key === 'logoBackdropRadius') value = Math.min(24, Math.max(0, value));
        else if (['otherFee'].includes(key)) value = normalizeNonNegativeNumber(value);
        else if (['marginX','marginTop','marginBottom'].includes(key)) value = Math.min(30, Math.max(6, value));
        else if (key === 'tableFontSize') value = Math.min(14, Math.max(7.5, value));
        else if (key === 'previewHeaderGap') value = Math.min(12, Math.max(2, value));
        else if (key === 'previewMetaWidth') value = Math.min(56, Math.max(38, value));
        else if (key === 'previewLineHeight') value = Math.min(1.5, Math.max(1.15, value));
        state[key] = value;
        if (Number(el.value) !== value) el.value = String(value);
      } else {
        state[key] = el.value;
      }

      $$('[data-bind]').forEach((peer) => {
        if (peer === el || peer.dataset.bind !== key) return;
        if (peer.type === 'checkbox') peer.checked = Boolean(state[key]);
        else peer.value = state[key] == null ? '' : state[key];
      });

      if (['companyAddressDetail','companyProvince','companyWard'].includes(key)) syncLegacyCompanyAddress();
      save();
      render();
      if (key === 'currency') renderEditorProducts();
    };
    el.addEventListener('input', onChange);
    el.addEventListener('change', onChange);
  });
}

function syncInputs() {
  $$('[data-bind]').forEach((el) => {
    const key = el.dataset.bind;
    if (el.type === 'checkbox') el.checked = Boolean(state[key]);
    else el.value = state[key] == null ? '' : state[key];
  });
}

function formatDate(value) {
  if (!value) return '';
  const p = value.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : value;
}

function adminLabel(prefix, value) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  const normalized = clean.replace(new RegExp('^' + prefix + '\\s+', 'i'), '').trim();
  return prefix + ' ' + normalized;
}

function companyRegionLine(source = state) {
  return [
    adminLabel('Phường', source.companyWard),
    adminLabel('Tỉnh', source.companyProvince)
  ].filter(Boolean).join(', ');
}

function syncLegacyCompanyAddress() {
  state.companyAddress = [
    String(state.companyAddressDetail || '').trim(),
    companyRegionLine(state)
  ].filter(Boolean).join(', ');
}

function money(value) {
  const digits = state.currency === 'VND' ? 0 : 2;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value || 0)) + ' ' + state.currency;
}

function moneyForCurrency(value, currency = 'VND') {
  const code = normalizeCatalogCurrency(currency);
  const digits = code === 'VND' ? 0 : 2;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value || 0)) + ' ' + code;
}

function numericMoney(value, currency = state.currency) {
  const code = normalizeCatalogCurrency(currency);
  const digits = code === 'VND' ? 0 : 2;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value || 0));
}

const units = ['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
function readThree(num, full) {
  const hundreds = Math.floor(num / 100);
  const tens = Math.floor((num % 100) / 10);
  const ones = num % 10;
  let out = '';
  if (hundreds || full) {
    out += units[hundreds] + ' trăm';
    if (!tens && ones) out += ' lẻ';
  }
  if (tens > 1) {
    out += (out ? ' ' : '') + units[tens] + ' mươi';
    if (ones === 1) out += ' mốt';
    else if (ones === 5) out += ' lăm';
    else if (ones) out += ' ' + units[ones];
  } else if (tens === 1) {
    out += (out ? ' ' : '') + 'mười';
    if (ones === 5) out += ' lăm';
    else if (ones) out += ' ' + units[ones];
  } else if (ones) {
    out += (out ? ' ' : '') + units[ones];
  }
  return out;
}

function numberToWords(value) {
  let n = Math.round(Number(value || 0));
  if (!n) return 'Không';
  const groups = [];
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  while (n) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const parts = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    if (!groups[i]) continue;
    const full = i < groups.length - 1 && groups[i] < 100;
    parts.push(readThree(groups[i], full) + (scales[i] ? ' ' + scales[i] : ''));
  }
  const text = parts.join(' ').replace(/\s+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

let collapsedProducts = new Set();

function resetCollapsedProductsForState() {
  collapsedProducts = state.products.length >= 24
    ? new Set(state.products.map((_, index) => index))
    : new Set();
}

resetCollapsedProductsForState();

function productHasDraftContent(product) {
  if (!product) return false;
  const textFields = [product.group, product.name, product.pack, product.unit, product.note];
  if (textFields.some(value => String(value || '').trim())) return true;
  if (normalizeNonNegativeNumber(product.price) > 0) return true;
  return normalizeNonNegativeNumber(product.qty) !== 1;
}

function focusProductName(index) {
  requestAnimationFrame(() => {
    const gridTarget = document.querySelector('#productDataGridBody [data-product-grid-index="' + index + '"][data-product-grid-key="name"]');
    const legacyTarget = document.querySelectorAll('#productEditor .product-card')[index]?.querySelector('[data-product-key="name"]');
    const target = gridTarget || legacyTarget;
    target?.focus();
    target?.select?.();
  });
}

function renderEditorProducts() {
  renderProductDataGrid();
}

function renderPreviewProducts() {
  const cols = [];
  if (state.showStt) cols.push(['STT', 'stt']);
  cols.push(['Tên sản phẩm', 'name']);
  if (state.showPack) cols.push(['Quy cách', 'pack']);
  cols.push(['ĐVT', 'unit']);
  if (state.showQty) cols.push(['Số lượng', 'qty']);
  if (state.showPrice) cols.push(['Đơn giá (' + state.currency + ')', 'price']);
  if (state.showAmount) cols.push(['Thành tiền (' + state.currency + ')', 'amount']);
  if (state.showNote) cols.push(['Ghi chú', 'note']);

  const head = document.getElementById('qHead');
  const body = document.getElementById('qBody');
  const colgroup = document.getElementById('qCols');
  head.innerHTML = '';
  body.innerHTML = '';
  if (colgroup) colgroup.innerHTML = '';

  const columnWeights = { stt: 5, name: 27, pack: 15, unit: 8, qty: 9, price: 15, amount: 17, note: 18 };
  const totalWeight = cols.reduce((sum, [, key]) => sum + (columnWeights[key] || 10), 0);

  if (colgroup) {
    cols.forEach(([, key]) => {
      const col = document.createElement('col');
      col.className = 'col-' + key;
      col.style.width = ((columnWeights[key] || 10) / totalWeight * 100).toFixed(2) + '%';
      colgroup.appendChild(col);
    });
  }

  const hrow = document.createElement('tr');
  cols.forEach(([label, key]) => {
    const th = document.createElement('th');
    th.textContent = label;
    th.classList.add('col-' + key);
    hrow.appendChild(th);
  });
  head.appendChild(hrow);

  const draftProducts = state.products
    .map((product, sourceIndex) => ({ product, sourceIndex }))
    .filter(({ product }) => productHasDraftContent(product));

  let activeGroup = null;
  let groupIndex = 0;
  draftProducts.forEach(({ product }, visibleIndex) => {
    const productGroup = String(product.group || '').trim();
    if (productGroup !== activeGroup) {
      activeGroup = productGroup;
      groupIndex = 0;
      if (productGroup) {
        const groupRow = document.createElement('tr');
        groupRow.className = 'qgroup-row';
        const groupCell = document.createElement('td');
        groupCell.colSpan = Math.max(1, cols.length);
        groupCell.textContent = productGroup;
        groupRow.appendChild(groupCell);
        body.appendChild(groupRow);
      }
    }
    groupIndex += 1;

    const row = document.createElement('tr');
    const missingName = !String(product.name || '').trim();
    if (missingName) row.classList.add('draft-missing-name');
    cols.forEach(([, key]) => {
      const td = document.createElement('td');
      let value = '';
      if (key === 'stt') value = productGroup ? groupIndex : visibleIndex + 1;
      else if (key === 'name') value = missingName ? '⚠ Chưa đặt tên' : product.name;
      else if (key === 'price') value = numericMoney(product.price);
      else if (key === 'amount') value = numericMoney(Number(product.qty || 0) * Number(product.price || 0));
      else value = product[key] == null ? '' : product[key];
      td.textContent = value;
      td.classList.add('col-' + key);
      if (['stt','unit','qty'].includes(key)) td.classList.add('center');
      if (['price','amount'].includes(key)) td.classList.add('num');
      row.appendChild(td);
    });
    body.appendChild(row);
  });

  const density = state.compactTable ? 'compact' : (state.previewTableDensity || 'standard');
  const tablePadding = {
    compact: '1.15mm .9mm',
    standard: '1.7mm 1.25mm',
    comfortable: '2.25mm 1.45mm'
  };
  $$('.qtable th,.qtable td').forEach((el) => {
    el.style.padding = tablePadding[density] || tablePadding.standard;
  });
}

function renderTotals() {
  const subtotal = state.products.reduce((sum, p) =>
    sum + normalizeNonNegativeNumber(p.qty) * normalizeNonNegativeNumber(p.price), 0);
  const discountPct = normalizeBoundedNumber(state.discountPct, 0, 100, 0);
  const vatPct = normalizeBoundedNumber(state.vatPct, 0, 100, 0);
  const discount = subtotal * discountPct / 100;
  const taxable = Math.max(0, subtotal - discount);
  const vat = taxable * vatPct / 100;
  const fee = normalizeNonNegativeNumber(state.otherFee);
  const total = calcQuoteTotal(state);

  setText('sub', money(subtotal));
  setText('disc', '- ' + money(discount));
  setText('vat', money(vat));
  setText('discLabel', 'Giảm giá (' + discountPct + '%)');
  setText('vatLabel', 'VAT (' + vatPct + '%)');
  setText('fee', money(fee));
  setText('grand', money(total));
  setText('studioSubtotal', money(subtotal));
  setText('studioGrandTotal', money(total));

  document.getElementById('discRow').style.display = discount ? 'table-row' : 'none';
  document.getElementById('vatRow').style.display = vat ? 'table-row' : 'none';
  document.getElementById('feeRow').style.display = fee ? 'table-row' : 'none';
  document.getElementById('summary').style.display = state.showTotals ? 'table' : 'none';

  const words = document.getElementById('words');
  words.style.display = state.showTotals && state.showWords && state.currency === 'VND' ? 'block' : 'none';
  words.textContent = 'Bằng chữ: ' + numberToWords(total) + ' đồng.';
}

function hexToRgba(hex, opacity) {
  const clean = String(hex || '#ffffff').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(char => char + char).join('') : clean.padEnd(6, 'f').slice(0, 6);
  const number = Number.parseInt(full, 16);
  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + Math.min(1, Math.max(0, Number(opacity || 0) / 100)) + ')';
}

let logoRenderToken = 0;
let logoProcessedCache = { source: '', threshold: 0, dataUrl: '' };

function syncLogoModeControls(mode) {
  const removeControls = document.getElementById('logoRemoveBgControls');
  const styledControls = document.getElementById('logoStyledControls');
  if (removeControls) removeControls.hidden = mode !== 'remove-bg';
  if (styledControls) styledControls.hidden = mode !== 'styled';
  const badge = document.getElementById('logoModeStatus');
  if (badge) {
    badge.textContent = mode === 'original'
      ? 'Ảnh gốc • không xử lý nền'
      : mode === 'remove-bg'
        ? 'Đã xóa nền • vùng nền được chuyển thành trong suốt'
        : 'Hiệu ứng nâng cao • ảnh gốc vẫn được giữ';
    badge.dataset.mode = mode;
  }
}

async function processedLogoSource(source, threshold) {
  if (!source) return '';
  if (
    logoProcessedCache.source === source &&
    logoProcessedCache.threshold === threshold &&
    logoProcessedCache.dataUrl
  ) return logoProcessedCache.dataUrl;

  const processed = await removeBackgroundDataUrl(source, threshold);
  logoProcessedCache = { source, threshold, dataUrl: processed };
  return processed;
}

function renderLogo() {
  const renderToken = ++logoRenderToken;
  const preview = document.getElementById('previewLogo');
  const editor = document.getElementById('logoEdit');
  const designPreview = document.getElementById('logoDesignPreview');
  const targets = [preview, editor, designPreview].filter(Boolean);

  const displayMode = normalizeLogoDisplayMode(state.logoDisplayMode);
  const styledMode = displayMode === 'styled';
  const removeBgMode = displayMode === 'remove-bg';
  const validTreatments = ['blend','soft','clean','custom','none'];
  const treatment = styledMode && validTreatments.includes(state.logoTreatment)
    ? state.logoTreatment
    : 'none';
  const backgroundColor = state.logoBackdropColor || state.accent || '#0b8f83';
  const opacity = styledMode ? Math.min(100, Math.max(0, Number(state.logoBackdropOpacity || 0))) : 0;
  const radius = styledMode ? Math.min(24, Math.max(0, Number(state.logoBackdropRadius || 0))) : 0;
  const borderEnabled = styledMode && state.logoBackdropBorder === 'soft';

  syncLogoModeControls(displayMode);

  targets.forEach(target => {
    target.innerHTML = '';
    target.classList.remove(
      'logo-treatment-blend','logo-treatment-soft','logo-treatment-clean',
      'logo-treatment-custom','logo-treatment-none',
      'logo-image-mode-original','logo-image-mode-remove-bg','logo-image-mode-styled'
    );
    target.classList.add('logo-treatment-' + treatment, 'logo-image-mode-' + displayMode);
    target.dataset.logoMode = displayMode;
    target.style.borderRadius = radius + 'mm';
    target.style.borderColor = borderEnabled ? hexToRgba(backgroundColor, Math.max(16, opacity + 10)) : 'transparent';
    target.style.borderWidth = borderEnabled ? '1px' : '0';
    target.style.borderStyle = 'solid';

    if (styledMode && treatment === 'custom') target.style.background = hexToRgba(backgroundColor, opacity);
    else if (styledMode && treatment === 'soft') target.style.background = hexToRgba(state.accent || backgroundColor, Math.max(4, Math.min(14, opacity || 8)));
    else if (styledMode && treatment === 'clean') target.style.background = '#ffffff';
    else target.style.background = 'transparent';
  });

  preview.style.padding = Math.max(0, Number(state.logoPadding || 0)) + 'mm';
  preview.style.setProperty('--logo-x', Number(state.logoOffsetX || 0) + 'mm');
  preview.style.setProperty('--logo-y', Number(state.logoOffsetY || 0) + 'mm');
  preview.style.setProperty('--logo-scale', String(Math.min(90, Math.max(18, Number(state.logoWidth || 58))) / 58));
  preview.style.setProperty('--logo-wash', hexToRgba(state.accent || backgroundColor, Math.max(3, Math.min(12, opacity || 6))));

  const images = [];
  const buildImage = (target, isPaper = false) => {
    const img = document.createElement('img');
    img.src = state.logo;
    img.alt = 'Logo doanh nghiệp';
    img.dataset.logoOriginal = 'true';
    img.style.mixBlendMode = styledMode && ['multiply','darken'].includes(state.logoBlendMode)
      ? state.logoBlendMode
      : 'normal';
    img.style.filter = 'none';
    img.style.opacity = '1';
    if (isPaper) {
      img.style.width = '58mm';
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      img.draggable = false;
    }
    target.appendChild(img);
    images.push(img);
  };

  if (state.showLogo && state.logo) {
    buildImage(preview, true);
    buildImage(editor);
    if (designPreview) buildImage(designPreview);

    if (removeBgMode) {
      const originalSource = state.logo;
      const threshold = normalizeRemoveBgTolerance(state.logoRemoveBgThreshold, 46);
      processedLogoSource(originalSource, threshold)
        .then((processed) => {
          if (renderToken !== logoRenderToken || state.logo !== originalSource || normalizeLogoDisplayMode(state.logoDisplayMode) !== 'remove-bg') return;
          images.forEach((img) => { img.src = processed || originalSource; });
        })
        .catch((error) => {
          console.warn('Optional logo background removal failed; original logo retained.', error);
        });
    }
  } else {
    preview.innerHTML = '';
    editor.innerHTML = '<div class="logo-placeholder muted-logo">Chưa có logo</div>';
    if (designPreview) designPreview.innerHTML = '<div class="logo-placeholder muted-logo">Chưa có logo</div>';
  }

  const widthValue = document.getElementById('logoWidthValue');
  if (widthValue) widthValue.textContent = Math.round(Number(state.logoWidth || 56)) + ' mm';
  const opacityValue = document.getElementById('logoBackdropOpacityValue');
  if (opacityValue) opacityValue.textContent = opacity + '%';
  const thresholdValue = document.getElementById('logoRemoveBgThresholdValue');
  if (thresholdValue) thresholdValue.textContent = normalizeRemoveBgTolerance(state.logoRemoveBgThreshold, 46);
  const tableFontSizeValue = document.getElementById('tableFontSizeValue');
  if (tableFontSizeValue) tableFontSizeValue.textContent = Number(state.tableFontSize || 9).toFixed(1) + ' px';

  const docHead = document.querySelector('.doc-head');
  if (docHead) {
    docHead.classList.toggle('no-logo', !state.showLogo);
    if (state.showLogo) docHead.style.removeProperty('grid-template-columns');
    else docHead.style.gridTemplateColumns = '1fr';
  }
  const activeTab = document.querySelector('.nav button[data-tab].active')?.dataset?.tab || '';
  syncStudioContext(activeTab);
  if (activeTab === 'export') renderExportCenter();
}

function layoutOffset(key) {
  const item = state.layoutOffsets && state.layoutOffsets[key];
  return {
    x: normalizeBoundedNumber(item?.x, -80, 80, 0),
    y: normalizeBoundedNumber(item?.y, -120, 120, 0)
  };
}

function setLayoutOffset(key, x, y) {
  if (!LAYOUT_BLOCK_KEYS.includes(key)) return;
  const next = Object.assign({}, state.layoutOffsets || {});
  const normalized = normalizeLayoutOffsets(Object.assign({}, next, { [key]: { x, y } }));
  state.layoutOffsets = normalized;
}

function applyLayoutOffsets() {
  LAYOUT_BLOCK_KEYS.forEach((key) => {
    const element = document.querySelector('[data-layout-block="' + key + '"]');
    if (!element) return;
    const offset = layoutOffset(key);
    element.classList.add('layout-block');
    element.style.setProperty('--layout-x', offset.x + 'mm');
    element.style.setProperty('--layout-y', offset.y + 'mm');
  });
}

function updatePageEstimate() {
  const paper = document.getElementById('paper');
  const badge = document.getElementById('pageEstimate');
  if (!paper || !badge) return;
  const a4Px = (297 / 25.4) * 96;
  const pages = Math.max(1, Math.ceil(paper.scrollHeight / a4Px));
  badge.textContent = '≈ ' + pages + ' trang A4';
  badge.classList.toggle('warn', pages > 1);
}

function render() {
  const paper = document.getElementById('paper');
  paper.className = 'paper theme-' + state.theme;
  paper.classList.toggle('layout-edit-mode', layoutEditEnabled);
  paper.style.setProperty('--doc', state.accent);
  paper.style.paddingLeft = state.marginX + 'mm';
  paper.style.paddingRight = state.marginX + 'mm';
  paper.style.paddingTop = state.marginTop + 'mm';
  paper.style.paddingBottom = state.marginBottom + 'mm';
  paper.style.fontSize = '12.2px';
  paper.style.setProperty('--doc-font-scale', '1');
  // V3.3: typography outside the product table is intentionally fixed.
  // The fixed set is approximately +2px larger than the old V3.2 baseline.
  [
    ['--fs-company', '11.6px'],
    ['--fs-company-name', '15.2px'],
    ['--fs-subtitle', '13.2px'],
    ['--fs-meta', '11.6px'],
    ['--fs-recipient', '15.5px'],
    ['--fs-intro', '12.5px'],
    ['--fs-section', '13.5px'],
    ['--fs-summary', '11.4px'],
    ['--fs-summary-grand', '12.2px'],
    ['--fs-words', '11.8px'],
    ['--fs-small-heading', '12.5px'],
    ['--fs-payment', '11.4px'],
    ['--fs-terms', '11.5px'],
    ['--fs-signature', '11.5px'],
    ['--fs-footer', '10.4px']
  ].forEach(([name, value]) => paper.style.setProperty(name, value));
  paper.style.setProperty('--fs-table', Number(state.tableFontSize || 9).toFixed(1) + 'px');
  paper.style.fontFamily = '"' + state.docFont + '", serif';
  paper.style.lineHeight = Number(state.previewLineHeight || 1.26);
  paper.style.setProperty('--preview-title-size', '27px');
  paper.style.setProperty('--preview-header-gap', Number(state.previewHeaderGap || 4) + 'mm');
  paper.style.setProperty('--preview-meta-width', Number(state.previewMetaWidth || 44) + 'mm');
  paper.dataset.titleAlign = state.previewTitleAlign || 'center';
  paper.dataset.spacing = state.previewSpacing || 'standard';
  paper.dataset.tableDensity = state.previewTableDensity || 'standard';

  [
    ['pCompanyName','companyName'],['pCompanyAddressDetail','companyAddressDetail'],['pBranchKhanhHoa','branchKhanhHoa'],
    ['pBranchDongNai','branchDongNai'],['pFarmAddress','farmAddress'],['pTaxCode','taxCode'],['pPhone','phone'],
    ['pWebsite','website'],['pCompanyEmail','companyEmail'],['pQuoteTitle','quoteTitle'],['pQuoteSubtitle','quoteSubtitle'],['pQuoteNo','quoteNo'],
    ['pValidity','validity'],['pRecipient','recipientLine'],['pIntro','intro'],['pSection','sectionTitle'],
    ['pTermsTitle','termsTitle'],['pClosing','closingText'],['pDate','dateLine'],['pDateLeft','dateLine'],
    ['pLeftTitle','leftTitle'],['pRightTitle','rightTitle'],['pLeftNote','leftNote'],['pRightNote','rightNote'],
    ['pLeftName','leftName'],['pRightName','rightName'],['pFooter','footerText'],
    ['pSlogan','slogan'],['pPaymentMethod','paymentMethod'],['pBankName','bankName'],
    ['pBankAccount','bankAccount'],['pBankOwner','bankOwner']
  ].forEach(([id, key]) => setText(id, state[key]));

  setText('pCompanyRegion', companyRegionLine(state));
  const companyRegionRow = document.getElementById('pCompanyRegionRow');
  if (companyRegionRow) companyRegionRow.style.display = companyRegionLine(state) ? 'block' : 'none';

  setText('pQuoteDate', formatDate(state.quoteDate));
  renderLogo();
  applyLayoutOffsets();

  $$('[data-company-key]').forEach((el) => {
    const key = el.dataset.companyKey;
    const hasValue = Boolean(String(state[key] || '').trim());
    const webGate = !el.classList.contains('webemail') || state.showWebEmail;
    el.style.display = hasValue && webGate ? 'block' : 'none';
  });

  const customerPrimary = [state.customerName, state.customerCompany].filter(Boolean).join(' · ');
  const customerContact = [state.customerContact, state.customerPhone, state.customerEmail].filter(Boolean).join(' · ');
  const customerLines = [
    customerPrimary ? 'Khách hàng: ' + customerPrimary : '',
    customerContact ? 'Liên hệ: ' + customerContact : '',
    state.customerAddress ? 'Địa chỉ: ' + state.customerAddress : ''
  ].filter(Boolean);
  setText('pCustomer', customerLines.join('\n'));
  document.getElementById('pCustomer').style.display = state.showCustomer && customerLines.length ? 'block' : 'none';

  const terms = document.getElementById('pTerms');
  terms.innerHTML = '';
  const termLines = String(state.termsText || '').split(/\n+/)
    .map(line => line.trim().replace(/^\s*(?:\d+[.)]|[-•])\s*/, ''))
    .filter(Boolean);
  termLines.forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    terms.appendChild(li);
  });
  document.getElementById('termsBox').style.display = state.showTerms && termLines.length ? 'block' : 'none';
  document.getElementById('signatures').style.display = state.showSignature ? 'grid' : 'none';

  const quoteMeta = document.querySelector('.quote-top > .qmeta');
  if (quoteMeta) quoteMeta.style.display = state.showQuoteMeta ? 'block' : 'none';
  paper.classList.toggle('meta-hidden', !state.showQuoteMeta);

  const paymentFields = [
    ['pPaymentMethod', state.paymentMethod],
    ['pBankName', state.bankName],
    ['pBankAccount', state.bankAccount],
    ['pBankOwner', state.bankOwner]
  ];
  paymentFields.forEach(([id, value]) => {
    const row = document.getElementById(id)?.closest('div');
    if (row) row.style.display = String(value || '').trim() ? 'block' : 'none';
  });
  const hasPayment = paymentFields.some(([, value]) => String(value || '').trim());
  document.getElementById('paymentPrint').style.display = state.showPaymentBlock && hasPayment ? 'block' : 'none';
  document.getElementById('pSlogan').style.display = state.showSlogan && state.slogan ? 'inline' : 'none';
  document.getElementById('footerSep').style.display = state.showSlogan && state.slogan && state.footerText ? 'inline' : 'none';

  renderPreviewProducts();
  renderTotals();

  $$('.tpl').forEach((el) => el.classList.toggle('active', el.dataset.theme === state.theme));
  $$('.color').forEach((el) => el.classList.toggle('active', el.dataset.color === state.accent));
  $$('[data-title-align]').forEach((el) => el.classList.toggle('active', el.dataset.titleAlign === (state.previewTitleAlign || 'center')));
  const activeTemplate = document.querySelector('.tpl[data-theme="' + state.theme + '"]');
  const description = document.getElementById('templateDescription');
  if (description && activeTemplate) description.textContent = activeTemplate.dataset.description || '';
  updateDocumentHealth();
  const activeStudioTab = document.querySelector('.pane.active')?.id?.replace('pane-', '') || '';
  syncStudioContext(activeStudioTab);
  syncStudioV6Context(activeStudioTab);
  renderStudioCheckPanel();
  syncLayoutEditModeUI();
  requestAnimationFrame(() => {
    updatePageEstimate();
    if (document.querySelector('.shell')?.classList.contains('report-view')) fitReportView();
  });
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

function downloadBlob(name, blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function download(name, text, type) {
  downloadBlob(name, new Blob([text], { type }));
}

function fullBackupPayload() {
  return {
    schemaVersion: 4,
    exportedAt: new Date().toISOString(),
    current: clone(state),
    history: getHistory(),
    presets: getPresets(),
    customers: getCustomerLibrary(),
    catalog: getProductCatalog()
  };
}

function excelRowsForCurrentQuote() {
  const rows = [];
  rows.push([state.companyName || '']);
  if (state.companyAddressDetail) rows.push(['Địa chỉ chi tiết:', state.companyAddressDetail]);
  if (companyRegionLine(state)) rows.push(['Khu vực:', companyRegionLine(state)]);
  if (state.phone) rows.push(['Điện thoại:', state.phone]);
  if (state.taxCode) rows.push(['MST:', state.taxCode]);
  rows.push([]);
  rows.push([state.quoteTitle || 'BẢNG BÁO GIÁ']);
  if (state.quoteSubtitle) rows.push([state.quoteSubtitle]);
  if (state.recipientLine) rows.push([state.recipientLine]);
  if (state.intro) rows.push([state.intro]);
  rows.push([]);
  rows.push(['STT','Mặt hàng','ĐVT','Đơn giá','Ghi chú']);

  let activeGroup = '';
  let groupIndex = 0;
  (state.products || []).forEach((product, index) => {
    const group = String(product.group || '').trim();
    if (group && group !== activeGroup) {
      activeGroup = group;
      groupIndex = 0;
      rows.push([group]);
    }
    groupIndex += 1;
    rows.push([
      group ? groupIndex : index + 1,
      product.name || '',
      product.unit || '',
      Number(product.price || 0),
      product.note || ''
    ]);
  });

  rows.push([]);
  if (state.dateLine) rows.push(['', state.dateLine]);
  if (state.rightName) rows.push(['', state.rightName]);
  return rows;
}

async function exportCurrentQuoteExcel() {
  try {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet(excelRowsForCurrentQuote());
    sheet['!cols'] = [{ wch: 8 }, { wch: 42 }, { wch: 12 }, { wch: 16 }, { wch: 26 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Bảng báo giá');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const name = sanitizePcFileName(state.quoteNo || state.quoteTitle || 'bao-gia', 'bao-gia') + '.xlsx';
    downloadBlob(name, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    toast('Đã xuất file Excel');
  } catch (error) {
    console.error('Excel export failed:', error);
    alert('Không thể xuất Excel. Hãy thử tải lại trang rồi thực hiện lại.');
  }
}

let rememberedPcHandle = null;

async function updatePcFolderStatus() {
  const status = document.getElementById('pcFolderStatus');
  if (!status) return;
  if (!supportsPcFolderAccess()) {
    status.textContent = 'Trình duyệt này không hỗ trợ lưu trực tiếp vào thư mục PC. Hãy dùng Chrome/Edge trên máy tính.';
    status.dataset.state = 'unsupported';
    return;
  }
  rememberedPcHandle = rememberedPcHandle || await getRememberedPcDirectory();
  if (!rememberedPcHandle) {
    status.textContent = 'Chưa liên kết thư mục PC.';
    status.dataset.state = 'empty';
    return;
  }
  const permission = await directoryPermission(rememberedPcHandle, { request: false });
  status.textContent = 'Thư mục đã nhớ: ' + (rememberedPcHandle.name || 'Thư mục đã chọn') +
    (permission === 'granted' ? ' • sẵn sàng tự lưu' : ' • cần cấp lại quyền khi lưu');
  status.dataset.state = permission === 'granted' ? 'ready' : 'prompt';
}

async function choosePcFolder() {
  try {
    rememberedPcHandle = await choosePcBackupDirectory();
    if (!rememberedPcHandle) {
      await updatePcFolderStatus();
      return false;
    }
    const permission = await directoryPermission(rememberedPcHandle, { request: true });
    await updatePcFolderStatus();
    if (permission !== 'granted') {
      toast('Chưa được cấp quyền ghi thư mục');
      return false;
    }
    toast('Đã nhớ thư mục PC: ' + rememberedPcHandle.name);
    return true;
  } catch (error) {
    if (error?.name !== 'AbortError') console.error('PC folder selection failed:', error);
    await updatePcFolderStatus();
    return false;
  }
}

async function saveCurrentToPc({ notify = false, requestPermission = false } = {}) {
  if (!supportsPcFolderAccess()) {
    if (notify) alert('Lưu trực tiếp vào thư mục PC cần Chrome/Edge trên máy tính hỗ trợ File System Access API.');
    return false;
  }
  rememberedPcHandle = rememberedPcHandle || await getRememberedPcDirectory();
  if (!rememberedPcHandle) {
    if (notify) toast('Chưa chọn thư mục PC');
    return false;
  }
  const permission = await directoryPermission(rememberedPcHandle, { request: requestPermission });
  if (permission !== 'granted') {
    await updatePcFolderStatus();
    if (notify) toast('Cần cấp lại quyền thư mục PC');
    return false;
  }

  try {
    const currentText = JSON.stringify(state, null, 2);
    const backupText = JSON.stringify(fullBackupPayload(), null, 2);
    const safeQuote = sanitizePcFileName(state.quoteNo || ('Bao_gia_' + state.quoteDate), 'bao-gia');
    await writeTextToPcDirectory(rememberedPcHandle, 'PriceReport_Tunggiabao-current.json', currentText);
    await writeTextToPcDirectory(rememberedPcHandle, 'PriceReport_Tunggiabao-backup.json', backupText);
    await writeTextToPcDirectory(rememberedPcHandle, safeQuote + '.json', currentText);
    await updatePcFolderStatus();
    if (notify) toast('Đã lưu thêm trên PC');
    return true;
  } catch (error) {
    console.error('PC autosave failed:', error);
    await updatePcFolderStatus();
    if (notify) alert('Không thể ghi file vào thư mục PC đã chọn. Hãy chọn/cấp quyền thư mục lại.');
    return false;
  }
}

async function restoreCurrentFromPc() {
  if (!supportsPcFolderAccess()) {
    alert('Tính năng đọc thư mục PC cần Chrome/Edge trên máy tính.');
    return false;
  }
  rememberedPcHandle = rememberedPcHandle || await getRememberedPcDirectory();
  if (!rememberedPcHandle) {
    toast('Chưa có thư mục PC đã nhớ');
    return false;
  }
  const permission = await directoryPermission(rememberedPcHandle, { request: true });
  if (permission !== 'granted') {
    await updatePcFolderStatus();
    return false;
  }
  try {
    const text = await readTextFromPcDirectory(rememberedPcHandle, 'PriceReport_Tunggiabao-current.json');
    const imported = JSON.parse(text);
    if (!isPlainObject(imported)) throw new Error('invalid-pc-current');
    if (!confirm('Đọc bản báo giá gần nhất từ thư mục PC và thay báo giá đang mở?')) return false;
    state = merge(imported);
    state.historyRecordId = '';
    if (!saveLogoAsset(state.logo || '') || !save()) throw new Error('pc-restore-save-failed');
    syncInputs();
    resetCollapsedProductsForState();
    renderEditorProducts();
    render();
    toast('Đã đọc bản báo giá gần nhất từ PC');
    return true;
  } catch (error) {
    console.error('PC restore failed:', error);
    alert('Không đọc được file PriceReport_Tunggiabao-current.json trong thư mục đã nhớ.');
    return false;
  }
}


let smartImportDraft = null;
let smartImportImageUrl = '';
let smartImportBusy = false;
let smartImportLastFocus = null;
let smartImportManualFields = new Set();


function resetSmartImportDraft() {
  smartImportDraft = null;
  smartImportManualFields = new Set();
  const review = document.getElementById('smartImportReview');
  const apply = document.getElementById('applySmartImport');
  const raw = document.getElementById('ocrRawText');
  const rawBox = document.getElementById('ocrRawBox');
  const previewWrap = document.getElementById('handwritingPreviewWrap');
  const preview = document.getElementById('handwritingPreview');
  const excelInput = document.getElementById('excelSmartImportInput');
  const handwritingInput = document.getElementById('handwritingSmartImportInput');
  if (review) review.hidden = true;
  if (apply) apply.disabled = true;
  if (raw) raw.value = '';
  if (rawBox) rawBox.hidden = true;
  if (previewWrap) previewWrap.hidden = true;
  if (preview) preview.removeAttribute('src');
  if (excelInput) excelInput.value = '';
  if (handwritingInput) handwritingInput.value = '';
  if (smartImportImageUrl) URL.revokeObjectURL(smartImportImageUrl);
  smartImportImageUrl = '';
  document.querySelectorAll('[data-import-field]').forEach((input) => { input.value = ''; });
  setSmartImportProgress('Chọn file Excel hoặc ảnh chữ viết tay để bắt đầu.');
}

function setSmartImportBusy(busy) {
  smartImportBusy = Boolean(busy);
  document.getElementById('smartImportDialog')?.setAttribute('aria-busy', smartImportBusy ? 'true' : 'false');
  ['excelSmartImportInput','handwritingSmartImportInput','applySmartImport','resetSmartImport','cancelSmartImport','closeSmartImport'].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    if (id === 'applySmartImport') element.disabled = smartImportBusy || !smartImportDraft;
    else element.disabled = smartImportBusy;
  });
}

function setSmartImportProgress(message, tone = '') {
  const box = document.getElementById('smartImportProgress');
  if (!box) return;
  box.textContent = message;
  box.dataset.tone = tone;
}

function collectImportReviewFields() {
  const fields = {};
  document.querySelectorAll('[data-import-field]').forEach((input) => {
    fields[input.dataset.importField] = String(input.value || '').trim();
  });
  return fields;
}

function syncDraftFromImportReview() {
  if (!smartImportDraft) return;
  const current = collectImportReviewFields();
  smartImportDraft.fields = Object.assign({}, smartImportDraft.fields || {});
  smartImportDraft.fieldSources = Object.assign({}, smartImportDraft.fieldSources || {});
  smartImportManualFields.forEach((key) => {
    smartImportDraft.fields[key] = current[key] || '';
    smartImportDraft.fieldSources[key] = 'manual';
  });
}

function mergeSmartImportSource(parsed, options = {}) {
  syncDraftFromImportReview();
  const manualValues = collectImportReviewFields();
  const merged = mergeImportDraft(smartImportDraft, parsed, options);
  merged.fields = Object.assign({}, merged.fields || {});
  merged.fieldSources = Object.assign({}, merged.fieldSources || {});
  smartImportManualFields.forEach((key) => {
    merged.fields[key] = manualValues[key] || '';
    merged.fieldSources[key] = 'manual';
  });
  return merged;
}

function supplementImportFields(draft) {
  const fields = Object.assign({}, draft?.fields || {});
  if (!fields.companyAddressDetail && fields.companyAddress) fields.companyAddressDetail = fields.companyAddress;
  const company = String(fields.companyName || '').trim();
  const phone = String(fields.phone || '').replace(/\D/g, '');

  if (!fields.recipientLine && !smartImportManualFields.has('recipientLine')) fields.recipientLine = 'Kính gửi: QUÝ KHÁCH HÀNG';
  if (!fields.sectionTitle && Array.isArray(draft?.groups) && draft.groups.length) {
    fields.sectionTitle = draft.groups.length > 1 ? 'DANH MỤC HÀNG HÓA' : draft.groups[0];
  }
  if (!fields.rightName && company && !smartImportManualFields.has('rightName')) {
    fields.rightName = company.toUpperCase().replace(/^HKD\s*-\s*/i, 'HKD ');
  }
  if (!fields.rightTitle && /^HKD\b/i.test(company)) fields.rightTitle = 'ĐẠI DIỆN HKD';
  if (!fields.footerText && phone) fields.footerText = phone;

  const subtitle = String(fields.quoteSubtitle || '');
  if (!fields.dateLine) {
    const monthYear = subtitle.match(/(?:tháng\s*)?(0?[1-9]|1[0-2])\s*[\/\-]\s*(20\d{2})/i);
    if (monthYear) {
      fields.dateLine = 'Nha Trang, ngày ..... tháng ' + String(monthYear[1]).padStart(2, '0') + ' năm ' + monthYear[2];
    }
  }
  return fields;
}

function renderSmartImportReview() {
  const review = document.getElementById('smartImportReview');
  const apply = document.getElementById('applySmartImport');
  if (!review || !apply) return;
  if (!smartImportDraft) {
    review.hidden = true;
    apply.disabled = true;
    return;
  }

  const displayFields = supplementImportFields(smartImportDraft);
  document.querySelectorAll('[data-import-field]').forEach((input) => {
    if (smartImportManualFields.has(input.dataset.importField)) return;
    input.value = displayFields?.[input.dataset.importField] || '';
  });

  const products = Array.isArray(smartImportDraft.products) ? smartImportDraft.products : [];
  const groups = [...new Set(products.map(item => String(item.group || '').trim()).filter(Boolean))];
  const sourceLabel = String(smartImportDraft.source || 'manual')
    .replace('excel', 'Excel')
    .replace('handwriting', 'OCR chữ viết tay')
    .replace('+', ' + ');

  document.getElementById('smartImportSource').textContent = sourceLabel;
  document.getElementById('smartImportProductCount').textContent = products.length + ' sản phẩm';
  document.getElementById('smartImportGroupCount').textContent = groups.length + ' nhóm';
  document.getElementById('smartImportSummary').textContent =
    Object.values(displayFields || {}).filter(value => String(value || '').trim()).length +
    ' trường • ' + products.length + ' sản phẩm';

  const warnings = document.getElementById('smartImportWarnings');
  warnings.innerHTML = '';
  const messages = [...new Set([...(smartImportDraft.warnings || []), ...(smartImportDraft.unmatched || []).slice(0, 4)])];
  messages.forEach((message) => {
    const item = document.createElement('div');
    item.textContent = message;
    warnings.appendChild(item);
  });
  warnings.hidden = !messages.length;

  review.hidden = false;
  apply.disabled = false;
}

function openSmartImport() {
  const modal = document.getElementById('smartImportModal');
  if (!modal) return;
  smartImportLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.hidden = false;
  document.body.classList.add('smart-import-open');
  if (!smartImportDraft) resetSmartImportDraft();
  requestAnimationFrame(() => document.getElementById('closeSmartImport')?.focus());
}

function closeSmartImport({ discard = false, force = false } = {}) {
  const modal = document.getElementById('smartImportModal');
  if (!modal) return false;
  if (smartImportBusy && !force) {
    setSmartImportProgress('Đang xử lý dữ liệu; vui lòng chờ hoàn tất trước khi đóng.', 'working');
    return false;
  }
  modal.hidden = true;
  document.body.classList.remove('smart-import-open');
  if (discard) resetSmartImportDraft();
  smartImportLastFocus?.focus?.();
  return true;
}

async function parseExcelFile(file) {
  setSmartImportProgress('Đang đọc workbook và nhận diện cấu trúc...', 'working');
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const sheetNames = workbook.SheetNames || [];
  if (!sheetNames.length) throw new Error('Workbook không có sheet.');
  const candidates = sheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });
    const parsed = parseSpreadsheetRows(rows);
    const fieldCount = Object.values(parsed.fields || {}).filter(value => String(value || '').trim()).length;
    const score = parsed.products.length * 12 + parsed.groups.length * 4 + fieldCount;
    return { sheetName, parsed, score };
  }).sort((a, b) => b.score - a.score);
  const best = candidates[0];
  best.parsed.sheetName = best.sheetName;
  best.parsed.sheetCount = sheetNames.length;
  if (sheetNames.length > 1) {
    best.parsed.warnings = [...(best.parsed.warnings || []),
      'Workbook có ' + sheetNames.length + ' sheet; hệ thống chọn sheet “' + best.sheetName + '” có cấu trúc phù hợp nhất.'];
  }
  return best.parsed;
}

async function imageToOcrCanvasUrl(file) {
  if (!window.createImageBitmap) return URL.createObjectURL(file);
  const bitmap = await createImageBitmap(file);
  const targetWidth = Math.min(2400, Math.max(bitmap.width, 1800));
  const scale = targetWidth / bitmap.width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.filter = 'grayscale(1) contrast(1.45)';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/png');
}

async function recognizeHandwritingFile(file) {
  setSmartImportProgress('Đang chuẩn hóa ảnh. OCR lần đầu có thể cần tải bộ ngôn ngữ Việt/Anh...', 'working');
  const imageUrl = await imageToOcrCanvasUrl(file);
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker(['vie', 'eng'], 1, {
    logger: (message) => {
      const pct = Number.isFinite(message?.progress) ? Math.round(message.progress * 100) : null;
      const label = String(message?.status || 'Đang nhận diện');
      setSmartImportProgress(label + (pct == null ? '' : ' ' + pct + '%'), 'working');
    }
  });
  try {
    if (PSM?.SPARSE_TEXT) {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: '1'
      });
    }
    const result = await worker.recognize(imageUrl);
    const text = String(result?.data?.text || '');
    const parsed = parseHandwritingText(text);
    parsed.rawText = text;
    return parsed;
  } finally {
    await worker.terminate();
    if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
  }
}

function applySmartImportDraft() {
  if (!smartImportDraft) return;
  syncDraftFromImportReview();
  const appliedFields = supplementImportFields(smartImportDraft);

  const next = Object.assign({}, state, appliedFields, smartImportDraft.layoutHints || {});
  const shouldReplaceProducts = document.getElementById('replaceImportedProducts')?.checked !== false;
  if (shouldReplaceProducts && Array.isArray(smartImportDraft.products) && smartImportDraft.products.length) {
    next.products = smartImportDraft.products.map((product) => ({
      group: String(product.group || ''),
      name: String(product.name || ''),
      pack: String(product.pack || ''),
      unit: String(product.unit || ''),
      qty: normalizeNonNegativeNumber(product.qty || 1),
      price: normalizeNonNegativeNumber(product.price),
      note: String(product.note || '')
    }));
    next.previewSpacing = next.products.length >= 26 ? 'compact' : next.previewSpacing;
    next.previewTableDensity = next.products.length >= 26 ? 'compact' : next.previewTableDensity;
    next.previewHeaderGap = next.products.length >= 26 ? 2.5 : next.previewHeaderGap;
    next.previewLineHeight = next.products.length >= 26 ? 1.18 : next.previewLineHeight;
  }

  state = merge(next);
  syncLegacyCompanyAddress();
  const persisted = save();
  syncInputs();
  resetCollapsedProductsForState();
  renderEditorProducts();
  render();
  closeSmartImport({ discard: true });
  openTab('general');
  toast(persisted
    ? 'Đã áp dụng dữ liệu nhập vào báo giá'
    : 'Đã áp dụng tạm thời; trình duyệt chưa lưu được dữ liệu');
}

function setupSmartImport() {
  document.querySelectorAll('[data-import-field]').forEach((input) => {
    input.addEventListener('input', () => {
      smartImportManualFields.add(input.dataset.importField);
    });
  });
  document.getElementById('openSmartImport')?.addEventListener('click', openSmartImport);
  document.getElementById('closeSmartImport')?.addEventListener('click', () => closeSmartImport());
  document.getElementById('cancelSmartImport')?.addEventListener('click', () => closeSmartImport({ discard: true }));
  document.getElementById('resetSmartImport')?.addEventListener('click', resetSmartImportDraft);
  document.getElementById('applySmartImport')?.addEventListener('click', applySmartImportDraft);

  document.getElementById('smartImportModal')?.addEventListener('click', (event) => {
    if (event.target?.id === 'smartImportModal' && !smartImportBusy) closeSmartImport();
  });

  document.getElementById('excelSmartImportInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file || smartImportBusy) return;
    if (file.size > 12 * 1024 * 1024) {
      setSmartImportProgress('File Excel vượt 12 MB; hãy rút gọn workbook trước khi nhập.', 'error');
      event.target.value = '';
      return;
    }
    try {
      setSmartImportBusy(true);
      syncDraftFromImportReview();
      const parsed = await parseExcelFile(file);
      smartImportDraft = mergeSmartImportSource(parsed);
      renderSmartImportReview();
      setSmartImportProgress('Đã đọc sheet “' + parsed.sheetName + '”: ' + parsed.products.length + ' sản phẩm.', 'success');
    } catch (error) {
      console.error('Excel smart import failed:', error);
      setSmartImportProgress('Không thể đọc file Excel. Hãy kiểm tra định dạng hoặc thử file khác.', 'error');
    } finally {
      setSmartImportBusy(false);
      event.target.value = '';
    }
  });

  document.getElementById('handwritingSmartImportInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file || smartImportBusy) return;
    if (file.size > 10 * 1024 * 1024) {
      setSmartImportProgress('Ảnh vượt 10 MB; hãy giảm kích thước ảnh trước khi OCR.', 'error');
      event.target.value = '';
      return;
    }

    const previewWrap = document.getElementById('handwritingPreviewWrap');
    const preview = document.getElementById('handwritingPreview');
    if (smartImportImageUrl) URL.revokeObjectURL(smartImportImageUrl);
    smartImportImageUrl = URL.createObjectURL(file);
    preview.src = smartImportImageUrl;
    previewWrap.hidden = false;

    try {
      setSmartImportBusy(true);
      syncDraftFromImportReview();
      const parsed = await recognizeHandwritingFile(file);
      smartImportDraft = mergeSmartImportSource(parsed);
      document.getElementById('ocrRawText').value = parsed.rawText || '';
      document.getElementById('ocrRawBox').hidden = false;
      renderSmartImportReview();
      setSmartImportProgress('OCR hoàn tất. Hãy kiểm tra các trường trước khi áp dụng.', 'success');
    } catch (error) {
      console.error('Handwriting OCR failed:', error);
      smartImportDraft = mergeSmartImportSource({
        source: 'handwriting',
        fields: {},
        products: [],
        groups: [],
        layoutHints: {},
        confidence: {},
        warnings: ['OCR tự động không hoàn tất; có thể nhập văn bản nhận diện thủ công rồi phân tích lại.'],
        unmatched: []
      });
      document.getElementById('ocrRawBox').hidden = false;
      renderSmartImportReview();
      document.getElementById('ocrRawBox').hidden = false;
      setSmartImportProgress('OCR không hoàn tất. Hãy nhập/chỉnh văn bản OCR thô rồi bấm “Phân tích lại”.', 'error');
    } finally {
      setSmartImportBusy(false);
      event.target.value = '';
    }
  });

  document.getElementById('reparseOcrText')?.addEventListener('click', () => {
    const text = document.getElementById('ocrRawText')?.value || '';
    const parsed = parseHandwritingText(text);
    smartImportDraft = mergeSmartImportSource(parsed, { replaceSourceFields: true });
    renderSmartImportReview();
    setSmartImportProgress('Đã phân tích lại văn bản OCR đã chỉnh.', 'success');
  });
}

const DEFAULT_APP_PREFERENCES = {
  startPage: 'dashboard',
  showDashboardHero: true,
  compactManagement: false,
  autoPcSave: true
};

function getAppPreferences() {
  const ui = getUiState();
  const raw = isPlainObject(ui.appPreferences) ? ui.appPreferences : {};
  const startPage = ['dashboard','history','general'].includes(raw.startPage) ? raw.startPage : 'dashboard';
  return {
    startPage,
    showDashboardHero: raw.showDashboardHero !== false,
    compactManagement: Boolean(raw.compactManagement),
    autoPcSave: raw.autoPcSave !== false
  };
}

function saveAppPreferences(next) {
  const ui = getUiState();
  ui.appPreferences = Object.assign({}, DEFAULT_APP_PREFERENCES, getAppPreferences(), next || {});
  saveUiState(ui);
  applyAppPreferences();
}

function applyAppPreferences() {
  const prefs = getAppPreferences();
  document.body.classList.toggle('dashboard-hero-hidden', !prefs.showDashboardHero);
  document.body.classList.toggle('management-compact', prefs.compactManagement);
}

function getUiState() {
  try {
    const data = JSON.parse(localStorage.getItem(UI_STATE));
    return isPlainObject(data) ? data : {};
  } catch {
    return {};
  }
}

function saveUiState(next) {
  safeStore(UI_STATE, JSON.stringify(next));
}

function setMajorPanelState(panel, collapsed, persist = true) {
  const shell = document.querySelector('.shell');
  if (!shell) return;
  const className = panel === 'editor' ? 'editor-collapsed' : 'design-collapsed';
  shell.classList.toggle(className, collapsed);

  const button = document.getElementById(panel === 'editor' ? 'toggleEditorPanel' : 'toggleDesignPanel');
  if (button) {
    button.textContent = collapsed ? '›' : '‹';
    button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  if (persist) {
    const ui = getUiState();
    ui[panel + 'Collapsed'] = collapsed;
    saveUiState(ui);
  }
  requestAnimationFrame(() => document.getElementById('fit')?.click());
}

function setupMajorPanelToggles() {
  const ui = getUiState();
  setMajorPanelState('editor', Boolean(ui.editorCollapsed), false);
  setMajorPanelState('design', Boolean(ui.designCollapsed), false);

  document.getElementById('toggleEditorPanel')?.addEventListener('click', () => {
    setMajorPanelState('editor', !document.querySelector('.shell')?.classList.contains('editor-collapsed'));
  });
  document.getElementById('toggleDesignPanel')?.addEventListener('click', () => {
    setMajorPanelState('design', !document.querySelector('.shell')?.classList.contains('design-collapsed'));
  });
}

function cardCollapseKey(card, index) {
  const pane = card.closest('.pane')?.id || (card.closest('.design') ? 'design' : 'panel');
  const title = card.querySelector(':scope > h3, :scope > .section-title, :scope > .product-workspace-head h3')?.textContent?.trim() || 'card';
  return pane + ':' + title + ':' + index;
}

function enhanceCollapsibleCards() {
  const ui = getUiState();
  const cardState = ui.cards || {};
  const cards = $$('.editor .card, .editor .section-block.quick-customer, .design .card');

  cards.forEach((card, index) => {
    if (card.dataset.collapseReady === '1') return;
    const heading = card.querySelector(':scope > h3, :scope > .section-title, :scope > .product-workspace-head h3');
    if (!heading) return;

    const key = cardCollapseKey(card, index);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card-collapse-handle';
    button.title = 'Thu gọn / mở bảng';
    button.setAttribute('aria-label', 'Thu gọn / mở bảng');

    const apply = (collapsed) => {
      card.classList.toggle('card-collapsed', collapsed);
      button.textContent = collapsed ? '⌄' : '⌃';
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    };

    apply(Boolean(cardState[key]));
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const collapsed = !card.classList.contains('card-collapsed');
      apply(collapsed);
      const nextUi = getUiState();
      nextUi.cards = nextUi.cards || {};
      nextUi.cards[key] = collapsed;
      saveUiState(nextUi);
    });

    card.appendChild(button);
    card.dataset.collapseReady = '1';
  });
}


const PRODUCT_GRID_KEYS = ['name','group','pack','unit','qty','price','note'];
const PRODUCT_HEADER_ALIASES = {
  name: ['ten san pham','ten sp','ten hang','san pham','hang hoa','mat hang','product','item'],
  group: ['nhom hang','nhom','group','category','loai'],
  pack: ['quy cach','dong goi','packaging','package','spec'],
  unit: ['dvt','don vi','don vi tinh','unit'],
  qty: ['sl','so luong','quantity','qty'],
  price: ['gia','don gia','price','unit price'],
  note: ['ghi chu','note','notes','remark']
};
let quoteUndoStack = [];
let quoteRedoStack = [];
let gridEditBaseline = '';
let productGridRenderQueued = false;
let selectedProductRows = new Set();
let pendingProductImport = null;

function quoteSnapshotString() {
  const snapshot = stateForStorage();
  return JSON.stringify(snapshot);
}
function pushQuoteUndoSnapshot(snapshot = quoteSnapshotString()) {
  if (!snapshot) return;
  if (quoteUndoStack[quoteUndoStack.length - 1] === snapshot) return;
  quoteUndoStack.push(snapshot);
  if (quoteUndoStack.length > 40) quoteUndoStack.shift();
  quoteRedoStack = [];
  syncUndoRedoButtons();
}
function restoreQuoteSnapshot(snapshot) {
  const keepLogo = state.logo;
  state = merge(JSON.parse(snapshot));
  state.logo = keepLogo;
  save();
  syncInputs();
  resetCollapsedProductsForState();
  renderEditorProducts();
  render();
}
function undoQuoteChange() {
  if (!quoteUndoStack.length) return;
  const current = quoteSnapshotString();
  const snapshot = quoteUndoStack.pop();
  quoteRedoStack.push(current);
  restoreQuoteSnapshot(snapshot);
  syncUndoRedoButtons();
  toast('Đã hoàn tác');
}
function redoQuoteChange() {
  if (!quoteRedoStack.length) return;
  const current = quoteSnapshotString();
  const snapshot = quoteRedoStack.pop();
  quoteUndoStack.push(current);
  restoreQuoteSnapshot(snapshot);
  syncUndoRedoButtons();
  toast('Đã làm lại');
}
function syncUndoRedoButtons() {
  const undo = document.getElementById('studioUndo');
  const redo = document.getElementById('studioRedo');
  if (undo) undo.disabled = !quoteUndoStack.length;
  if (redo) redo.disabled = !quoteRedoStack.length;
}

function normalizeGridHeader(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function editDistance(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const hold = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
      previous = hold;
    }
  }
  return row[right.length];
}
function headerSimilarity(a, b) {
  const left = normalizeGridHeader(a);
  const right = normalizeGridHeader(b);
  if (!left || !right) return 0;
  return 1 - (editDistance(left, right) / Math.max(left.length, right.length, 1));
}
function headerField(value) {
  const normalized = normalizeGridHeader(value);
  if (!normalized) return '';
  let best = { key: '', score: 0 };
  for (const [key, aliases] of Object.entries(PRODUCT_HEADER_ALIASES)) {
    if (aliases.includes(normalized)) return key;
    if (aliases.some(alias => normalized === alias || normalized.startsWith(alias + ' '))) return key;
    aliases.forEach((alias) => {
      const score = headerSimilarity(normalized, alias);
      if (score > best.score) best = { key, score };
    });
  }
  return best.score >= 0.78 ? best.key : '';
}
function normalizeGridNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let raw = String(value ?? '').trim();
  if (!raw) return 0;
  raw = raw.replace(/\s+/g, '');
  const sign = raw.startsWith('-') ? '-' : '';
  raw = raw.replace(/^[+-]/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, '');
  else if (raw.includes(',') && raw.includes('.')) {
    const decimalIsComma = raw.lastIndexOf(',') > raw.lastIndexOf('.');
    raw = decimalIsComma
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
  } else if (raw.includes(',')) {
    const pieces = raw.split(',');
    raw = pieces.length === 2 && pieces[1].length !== 3 ? pieces[0] + '.' + pieces[1] : pieces.join('');
  } else if ((raw.match(/\./g) || []).length > 1 || /^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, '');
  }
  const parsed = Number(sign + raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
function blankProduct() {
  return { group: '', name: '', pack: '', unit: '', qty: 1, price: 0, note: '' };
}
function productMeaningful(product) {
  return Boolean(
    String(product?.name || '').trim() ||
    String(product?.group || '').trim() ||
    String(product?.pack || '').trim() ||
    String(product?.unit || '').trim() ||
    String(product?.note || '').trim() ||
    Number(product?.price || 0) !== 0 ||
    Number(product?.qty ?? 1) !== 1
  );
}
function ensureProductDatalists() {
  let holder = document.getElementById('productGridDatalists');
  if (!holder) {
    holder = document.createElement('div');
    holder.id = 'productGridDatalists';
    holder.hidden = true;
    holder.innerHTML = '<datalist id="productNameDatalist"></datalist><datalist id="productGroupDatalist"></datalist><datalist id="productUnitDatalist"></datalist>';
    document.body.appendChild(holder);
  }
  const catalog = getProductCatalog();
  const fill = (id, values) => {
    const list = document.getElementById(id);
    if (!list) return;
    list.innerHTML = '';
    [...new Set(values.filter(Boolean).map(value => String(value).trim()).filter(Boolean))].slice(0, 500).forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      list.appendChild(option);
    });
  };
  fill('productNameDatalist', catalog.map(item => item.name));
  fill('productGroupDatalist', catalog.map(item => item.group));
  fill('productUnitDatalist', catalog.map(item => item.unit));
}
function fillProductFromCatalog(product) {
  const name = String(product?.name || '').trim().toLowerCase();
  if (!name) return false;
  const match = getProductCatalog().find(item => String(item?.name || '').trim().toLowerCase() === name);
  if (!match) return false;
  if (!String(product.group || '').trim()) product.group = match.group || '';
  if (!String(product.pack || '').trim()) product.pack = match.pack || '';
  if (!String(product.unit || '').trim()) product.unit = match.unit || '';
  if (!Number(product.price || 0)) product.price = normalizeGridNumber(match.price);
  return true;
}
function productGridValidity(product, key) {
  if (key === 'name' && productMeaningful(product) && !String(product.name || '').trim()) return 'Thiếu tên sản phẩm';
  if (key === 'qty' && Number(product.qty) < 0) return 'Số lượng không được âm';
  if (key === 'price' && Number(product.price) < 0) return 'Đơn giá không được âm';
  return '';
}
function refreshProductGridRow(row, product) {
  if (!row) return;
  row.querySelectorAll('[data-product-grid-key]').forEach((field) => {
    const key = field.dataset.productGridKey;
    const validity = productGridValidity(product, key);
    const cell = field.closest('.product-grid-cell');
    cell?.classList.toggle('invalid', Boolean(validity));
    if (validity) {
      field.setAttribute('aria-invalid', 'true');
      field.title = validity;
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('title');
    }
    if (key !== document.activeElement?.dataset?.productGridKey && key in product) {
      field.value = product[key] == null ? '' : product[key];
    }
  });
  const amount = row.querySelector('.product-grid-amount');
  if (amount) amount.textContent = numericMoney(Number(product.qty || 0) * Number(product.price || 0));
}
function scheduleProductGridRender() {
  if (productGridRenderQueued) return;
  productGridRenderQueued = true;
  requestAnimationFrame(() => {
    productGridRenderQueued = false;
    renderProductDataGrid();
  });
}
function renderProductDataGrid() {
  const body = document.getElementById('productDataGridBody');
  const empty = document.getElementById('productGridEmpty');
  if (!body) return;
  ensureProductDatalists();
  body.innerHTML = '';
  const products = Array.isArray(state.products) ? state.products : [];
  if (empty) empty.hidden = products.some(productMeaningful);

  products.forEach((product, index) => {
    const row = document.createElement('div');
    row.className = 'product-grid-row';
    row.setAttribute('role', 'row');

    const indexCell = document.createElement('div');
    indexCell.className = 'product-grid-index';
    const select = document.createElement('input');
    select.type = 'checkbox';
    select.className = 'product-grid-select';
    select.checked = selectedProductRows.has(index);
    select.setAttribute('aria-label', 'Chọn dòng ' + (index + 1));
    select.addEventListener('change', () => {
      if (select.checked) selectedProductRows.add(index);
      else selectedProductRows.delete(index);
      updateProductBulkBar();
    });
    const indexText = document.createElement('span');
    indexText.textContent = String(index + 1);
    indexCell.append(select, indexText);
    row.appendChild(indexCell);

    const definitions = [
      ['name','text'],['group','text'],['pack','text'],['unit','text'],['qty','number'],['price','number']
    ];
    definitions.forEach(([key, type]) => {
      const cell = document.createElement('div');
      cell.className = 'product-grid-cell';
      const input = document.createElement('input');
      input.type = type;
      if (type === 'number') {
        input.step = key === 'price' ? '1000' : '1';
        input.inputMode = 'decimal';
      }
      input.value = product[key] == null ? '' : product[key];
      input.dataset.productGridIndex = String(index);
      input.dataset.productGridKey = key;
      input.setAttribute('aria-label', (key === 'name' ? 'Tên sản phẩm' : key) + ' dòng ' + (index + 1));
      if (key === 'name') input.setAttribute('list', 'productNameDatalist');
      if (key === 'group') input.setAttribute('list', 'productGroupDatalist');
      if (key === 'unit') input.setAttribute('list', 'productUnitDatalist');
      const validity = productGridValidity(product, key);
      if (validity) {
        cell.classList.add('invalid');
        input.setAttribute('aria-invalid', 'true');
        input.title = validity;
      }
      input.addEventListener('focus', () => { gridEditBaseline = quoteSnapshotString(); });
      input.addEventListener('input', () => {
        if (key === 'qty' || key === 'price') product[key] = normalizeGridNumber(input.value);
        else product[key] = input.value;
        if (key === 'name') fillProductFromCatalog(product);
        refreshProductGridRow(row, product);
        save();
        renderPreviewProducts();
        renderTotals();
        updateDocumentHealth();
        renderStudioCheckPanel();
        syncStudioV6Context('products');
      });
      input.addEventListener('blur', () => {
        if (gridEditBaseline && gridEditBaseline !== quoteSnapshotString()) pushQuoteUndoSnapshot(gridEditBaseline);
        gridEditBaseline = '';
      });
      input.addEventListener('keydown', (event) => {
        const keyIndex = PRODUCT_GRID_KEYS.indexOf(key);
        const focusCell = (rowIndex, columnKey) => {
          const target = document.querySelector('[data-product-grid-index="' + rowIndex + '"][data-product-grid-key="' + columnKey + '"]');
          target?.focus();
          target?.select?.();
        };
        if (event.key === 'Enter') {
          event.preventDefault();
          if (index === state.products.length - 1) {
            pushQuoteUndoSnapshot();
            state.products.push(blankProduct());
            save();
            renderEditorProducts();
            focusProductName(index + 1);
          } else {
            focusCell(index + 1, key);
          }
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          focusCell(Math.min(state.products.length - 1, index + 1), key);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          focusCell(Math.max(0, index - 1), key);
        } else if (event.key === 'ArrowRight' && keyIndex >= 0 && keyIndex < PRODUCT_GRID_KEYS.length - 1) {
          event.preventDefault();
          focusCell(index, PRODUCT_GRID_KEYS[keyIndex + 1]);
        } else if (event.key === 'ArrowLeft' && keyIndex > 0) {
          event.preventDefault();
          focusCell(index, PRODUCT_GRID_KEYS[keyIndex - 1]);
        }
      });
      cell.appendChild(input);
      row.appendChild(cell);
    });

    const amount = document.createElement('div');
    amount.className = 'product-grid-amount';
    amount.textContent = numericMoney(Number(product.qty || 0) * Number(product.price || 0));
    row.appendChild(amount);

    const noteCell = document.createElement('div');
    noteCell.className = 'product-grid-cell';
    const note = document.createElement('input');
    note.value = product.note || '';
    note.dataset.productGridIndex = String(index);
    note.dataset.productGridKey = 'note';
    note.setAttribute('aria-label', 'Ghi chú dòng ' + (index + 1));
    note.addEventListener('focus', () => { gridEditBaseline = quoteSnapshotString(); });
    note.addEventListener('input', () => {
      product.note = note.value;
      refreshProductGridRow(row, product);
      save(); renderPreviewProducts(); updateDocumentHealth(); renderStudioCheckPanel();
    });
    note.addEventListener('keydown', (event) => {
      const focusNote = (rowIndex) => {
        const target = document.querySelector('[data-product-grid-index="' + rowIndex + '"][data-product-grid-key="note"]');
        target?.focus();
        target?.select?.();
      };
      if (event.key === 'Enter' || event.key === 'ArrowDown') {
        event.preventDefault();
        if (index === state.products.length - 1 && event.key === 'Enter') {
          pushQuoteUndoSnapshot();
          state.products.push(blankProduct());
          save(); renderEditorProducts(); focusProductName(index + 1);
        } else {
          focusNote(Math.min(state.products.length - 1, index + 1));
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusNote(Math.max(0, index - 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const target = document.querySelector('[data-product-grid-index="' + index + '"][data-product-grid-key="price"]');
        target?.focus(); target?.select?.();
      }
    });
    note.addEventListener('blur', () => {
      if (gridEditBaseline && gridEditBaseline !== quoteSnapshotString()) pushQuoteUndoSnapshot(gridEditBaseline);
      gridEditBaseline = '';
    });
    noteCell.appendChild(note);
    row.appendChild(noteCell);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'product-grid-delete';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Xóa dòng ' + (index + 1));
    remove.addEventListener('click', () => {
      if (productMeaningful(product) && !confirm('Xóa dòng sản phẩm này?')) return;
      pushQuoteUndoSnapshot();
      state.products.splice(index, 1);
      if (!state.products.length) state.products.push(blankProduct());
      save(); renderEditorProducts(); render();
    });
    row.appendChild(remove);
    body.appendChild(row);
  });
  selectedProductRows = new Set([...selectedProductRows].filter(index => index >= 0 && index < products.length));
  updateProductBulkBar();
}

function cleanProductRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => Array.from(row || []).map(value => value ?? ''))
    .filter(row => row.some(value => String(value).trim()));
}
function guessProductColumnMap(rows) {
  if (!rows.length) return { start: 0, map: [], confidence: 0 };
  const width = Math.max(...rows.map(row => row.length));
  const first = rows[0].map(headerField);
  const recognized = first.filter(Boolean).length;
  if (recognized >= 2) {
    const unique = new Set(first.filter(Boolean)).size;
    const confidence = Math.min(1, 0.72 + (unique / Math.max(4, width)) * 0.28);
    return { start: 1, map: first, confidence };
  }

  const sample = rows.slice(0, 8);
  const sampleFirst = sample.map(row => String(row[0] ?? '').trim()).filter(Boolean);
  const looksLikeStt = sampleFirst.length >= 2 && sampleFirst.every(value => /^\d+$/.test(value));
  const numericRatio = (column) => {
    const values = sample.map(row => String(row[column] ?? '').trim()).filter(Boolean);
    if (!values.length) return 0;
    return values.filter(value => /^[-+]?\s*[\d., ]+$/.test(value)).length / values.length;
  };
  const textRatio = (column) => {
    const values = sample.map(row => String(row[column] ?? '').trim()).filter(Boolean);
    if (!values.length) return 0;
    return values.filter(value => /[A-Za-zÀ-ỹ]/.test(value)).length / values.length;
  };

  if (width >= 8 && looksLikeStt) return { start: 0, map: ['', 'name','group','pack','unit','qty','price','note'], confidence: 0.82 };
  if (width === 4 && textRatio(0) > 0.6 && textRatio(1) > 0.4 && numericRatio(2) > 0.7 && numericRatio(3) > 0.7) {
    return { start: 0, map: ['name','unit','qty','price'], confidence: 0.86 };
  }
  if (width === 3 && textRatio(0) > 0.6 && numericRatio(1) > 0.7 && numericRatio(2) > 0.7) {
    return { start: 0, map: ['name','qty','price'], confidence: 0.82 };
  }
  if (width >= 7) return { start: 0, map: ['name','group','pack','unit','qty','price','note'], confidence: 0.62 };
  if (width === 6) return { start: 0, map: ['name','pack','unit','qty','price','note'], confidence: 0.58 };
  if (width === 5) return { start: 0, map: ['name','pack','unit','qty','price'], confidence: 0.58 };
  if (width === 4) return { start: 0, map: ['name','unit','qty','price'], confidence: 0.6 };
  if (width === 3) return { start: 0, map: ['name','qty','price'], confidence: 0.58 };
  if (width === 2) return { start: 0, map: ['name','unit'], confidence: 0.5 };
  return { start: 0, map: ['name'], confidence: 0.45 };
}
function productsFromMappedRows(rows, { start = 0, map = [] } = {}) {
  const products = [];
  cleanProductRows(rows).slice(start).forEach(row => {
    const product = blankProduct();
    map.forEach((key, column) => {
      if (!key) return;
      const value = row[column];
      if (key === 'qty' || key === 'price') product[key] = normalizeGridNumber(value);
      else product[key] = String(value ?? '').trim();
    });
    if (productMeaningful(product)) products.push(product);
  });
  return products;
}
function rowsToProducts(rows) {
  const cleanRows = cleanProductRows(rows);
  const guess = guessProductColumnMap(cleanRows);
  return productsFromMappedRows(cleanRows, guess);
}
function productImportValidity(product) {
  if (!String(product?.name || '').trim()) return false;
  if (Number(product?.qty) < 0 || Number(product?.price) < 0) return false;
  return true;
}
function mappingLabel(key) {
  return ({
    '': 'Bỏ qua cột',
    name: 'Tên sản phẩm',
    group: 'Nhóm hàng',
    pack: 'Quy cách',
    unit: 'ĐVT',
    qty: 'Số lượng',
    price: 'Đơn giá',
    note: 'Ghi chú'
  })[key] || key;
}
function renderProductMappingReview() {
  const review = document.getElementById('productMappingReview');
  const columns = document.getElementById('productMappingColumns');
  const preview = document.getElementById('productMappingPreview');
  if (!review || !columns || !preview || !pendingProductImport) return;
  const { rows, source, start, map } = pendingProductImport;
  const width = Math.max(...rows.map(row => row.length));
  review.hidden = false;
  setText('productMappingSource', 'Nguồn: ' + source + ' · Hệ thống đã đoán trước, chỉ sửa cột nào chưa đúng.');
  columns.innerHTML = '';
  const options = ['', ...PRODUCT_GRID_KEYS];
  for (let column = 0; column < width; column += 1) {
    const box = document.createElement('label');
    box.className = 'product-mapping-column';
    const sample = rows.slice(start, start + 3).map(row => String(row[column] ?? '').trim()).filter(Boolean).join(' · ');
    const title = document.createElement('strong');
    title.textContent = 'Cột ' + String.fromCharCode(65 + column);
    const small = document.createElement('small');
    small.textContent = sample || 'Không có dữ liệu mẫu';
    const select = document.createElement('select');
    select.dataset.mappingColumn = String(column);
    options.forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = mappingLabel(key);
      option.selected = (map[column] || '') === key;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      const nextKey = select.value;
      if (nextKey) {
        document.querySelectorAll('#productMappingColumns select').forEach(other => {
          if (other !== select && other.value === nextKey) {
            other.value = '';
            pendingProductImport.map[Number(other.dataset.mappingColumn)] = '';
          }
        });
      }
      pendingProductImport.map[column] = nextKey;
      renderProductMappingReview();
    });
    box.append(title, small, select);
    columns.appendChild(box);
  }

  const products = productsFromMappedRows(rows, { start, map });
  const valid = products.filter(productImportValidity).length;
  const reviewCount = products.length - valid;
  setText('mappingTotalRows', products.length);
  setText('mappingValidRows', valid);
  setText('mappingReviewRows', reviewCount);
  setText('mappingBlankRows', Math.max(0, rows.length - start - products.length));
  document.getElementById('applyMappedImport').textContent = 'Nhập ' + products.length + ' dòng';

  const previewRows = products.slice(0, 6);
  preview.innerHTML = '<table><thead><tr><th>Tên sản phẩm</th><th>Nhóm</th><th>Quy cách</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th></tr></thead><tbody>' +
    previewRows.map(product => '<tr><td>' + escapeHtml(product.name || '⚠ Thiếu tên') + '</td><td>' + escapeHtml(product.group || '') + '</td><td>' + escapeHtml(product.pack || '') + '</td><td>' + escapeHtml(product.unit || '') + '</td><td>' + escapeHtml(String(product.qty ?? '')) + '</td><td>' + escapeHtml(String(product.price ?? '')) + '</td></tr>').join('') +
    '</tbody></table>';
}
function closeProductMappingReview(message = '') {
  pendingProductImport = null;
  const review = document.getElementById('productMappingReview');
  if (review) review.hidden = true;
  if (message) setProductImportSummary(message);
}
function stageProductRows(rows, { source = 'dữ liệu', startIndex = null } = {}) {
  const cleanRows = cleanProductRows(rows);
  if (!cleanRows.length) {
    setProductImportSummary('Không tìm thấy dữ liệu để nhập.', 'warn');
    return 0;
  }
  const guess = guessProductColumnMap(cleanRows);
  if (guess.confidence >= 0.78) {
    return applyImportedProducts(productsFromMappedRows(cleanRows, guess), { source, startIndex });
  }
  pendingProductImport = { rows: cleanRows, source, startIndex, start: guess.start, map: guess.map.slice() };
  setProductImportSummary('Cần kiểm tra mapping trước khi nhập.', 'warn');
  renderProductMappingReview();
  document.getElementById('productMappingReview')?.scrollIntoView({ block: 'nearest' });
  return 0;
}
function duplicateProductCount(products) {
  const seen = new Set();
  let duplicates = 0;
  products.forEach(product => {
    const key = normalizeGridHeader(product.name);
    if (!key) return;
    if (seen.has(key)) duplicates += 1;
    else seen.add(key);
  });
  return duplicates;
}
function applyImportedProducts(products, { startIndex = null, source = 'dữ liệu' } = {}) {
  if (!products.length) {
    setProductImportSummary('Không tìm thấy dòng sản phẩm hợp lệ.', 'warn');
    return 0;
  }
  pushQuoteUndoSnapshot();
  const target = Array.isArray(state.products) ? state.products.slice() : [];
  const start = Number.isInteger(startIndex) ? startIndex : (target.length === 1 && !productMeaningful(target[0]) ? 0 : target.length);
  target.splice(start, products.length, ...products);
  state.products = target.length ? target : [blankProduct()];
  save();
  resetCollapsedProductsForState();
  renderEditorProducts();
  render();
  const duplicates = duplicateProductCount(state.products);
  setProductImportSummary(
    'Đã nhập ' + products.length + ' dòng từ ' + source +
    (duplicates ? ' · Phát hiện ' + duplicates + ' sản phẩm có thể trùng, dữ liệu vẫn được giữ nguyên.' : ''),
    duplicates ? 'warn' : 'ok'
  );
  return products.length;
}
function updateProductBulkBar() {
  const bar = document.getElementById('productBulkBar');
  const count = selectedProductRows.size;
  if (bar) bar.hidden = count === 0;
  setText('productBulkCount', count + ' dòng được chọn');
  const selectAll = document.getElementById('productSelectAll');
  if (selectAll) {
    const total = Array.isArray(state.products) ? state.products.length : 0;
    selectAll.checked = total > 0 && count === total;
    selectAll.indeterminate = count > 0 && count < total;
  }
}
function syncProductBulkActionUI() {
  const action = document.getElementById('productBulkAction')?.value || 'group';
  const value = document.getElementById('productBulkValue');
  if (!value) return;
  const needsValue = ['group','unit','price-up','price-down'].includes(action);
  value.hidden = !needsValue;
  value.type = ['price-up','price-down'].includes(action) ? 'number' : 'text';
  value.placeholder = action === 'group' ? 'Tên nhóm mới' :
    action === 'unit' ? 'ĐVT mới' :
    action === 'price-up' ? '% tăng giá' :
    action === 'price-down' ? '% giảm giá' : '';
}
function saveSelectedProductsToCatalog(products) {
  const named = products.filter(product => String(product?.name || '').trim());
  if (!named.length) {
    toast('Các dòng đã chọn chưa có tên sản phẩm');
    return false;
  }
  const items = getProductCatalog();
  named.forEach(product => {
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      group: product.group || '',
      name: product.name || '',
      pack: product.pack || '',
      unit: product.unit || '',
      price: normalizeNonNegativeNumber(product.price),
      currency: normalizeCatalogCurrency(state.currency),
      note: product.note || ''
    };
    const key = catalogKey(item);
    const index = items.findIndex(existing => catalogKey(existing) === key);
    if (index >= 0) {
      item.id = items[index].id;
      items[index] = item;
    } else {
      items.unshift(item);
    }
  });
  if (!setProductCatalog(items)) return false;
  renderMasterData();
  ensureProductDatalists();
  toast('Đã lưu ' + named.length + ' sản phẩm vào danh mục');
  return true;
}
function applyProductBulkAction() {
  const indices = [...selectedProductRows].filter(index => state.products[index]).sort((a,b) => a-b);
  if (!indices.length) return;
  const action = document.getElementById('productBulkAction')?.value || 'group';
  const rawValue = document.getElementById('productBulkValue')?.value || '';
  const products = indices.map(index => state.products[index]);

  if (action === 'catalog') {
    saveSelectedProductsToCatalog(products);
    return;
  }
  if (action === 'delete' && !confirm('Xóa ' + indices.length + ' dòng sản phẩm đã chọn?')) return;
  if (['group','unit'].includes(action) && !String(rawValue).trim()) {
    toast('Nhập giá trị cần áp dụng');
    document.getElementById('productBulkValue')?.focus();
    return;
  }
  if (['price-up','price-down'].includes(action) && (!Number.isFinite(Number(rawValue)) || Number(rawValue) < 0)) {
    toast('Nhập phần trăm hợp lệ');
    document.getElementById('productBulkValue')?.focus();
    return;
  }

  pushQuoteUndoSnapshot();
  if (action === 'group') products.forEach(product => { product.group = String(rawValue).trim(); });
  else if (action === 'unit') products.forEach(product => { product.unit = String(rawValue).trim(); });
  else if (action === 'price-up' || action === 'price-down') {
    const pct = Math.min(1000, Number(rawValue)) / 100;
    products.forEach(product => {
      const base = normalizeGridNumber(product.price);
      product.price = Math.round(base * (action === 'price-up' ? 1 + pct : Math.max(0, 1 - pct)));
    });
  } else if (action === 'duplicate') {
    state.products.push(...products.map(product => ({ ...product })));
  } else if (action === 'delete') {
    indices.slice().sort((a,b) => b-a).forEach(index => state.products.splice(index, 1));
    if (!state.products.length) state.products.push(blankProduct());
  }
  selectedProductRows.clear();
  save();
  renderEditorProducts();
  render();
  toast('Đã áp dụng cho ' + indices.length + ' dòng');
}

function setProductImportSummary(message, tone = '') {
  const el = document.getElementById('productImportSummary');
  if (!el) return;
  el.textContent = message;
  el.dataset.tone = tone;
}
function parseClipboardTable(text) {
  return String(text || '').replace(/\r/g, '').split('\n')
    .filter(line => line.trim())
    .map(line => line.split('\t'));
}
function chooseWorkbookSheet(sheetNames) {
  if (!Array.isArray(sheetNames) || sheetNames.length <= 1) return Promise.resolve(sheetNames?.[0] || '');
  const host = document.getElementById('productImportSummary');
  if (!host) return Promise.resolve(sheetNames[0]);
  host.innerHTML = '';
  host.dataset.tone = '';
  const wrap = document.createElement('div');
  wrap.className = 'product-sheet-picker';
  const label = document.createElement('label');
  label.textContent = 'Bạn muốn lấy sheet nào?';
  const select = document.createElement('select');
  sheetNames.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
  const apply = document.createElement('button');
  apply.type = 'button';
  apply.className = 'btn primary';
  apply.textContent = 'Đọc sheet';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn';
  cancel.textContent = 'Hủy';
  wrap.append(label, select, apply, cancel);
  host.appendChild(wrap);
  return new Promise((resolve) => {
    const finish = (value) => {
      host.innerHTML = '';
      resolve(value);
    };
    apply.addEventListener('click', () => finish(select.value), { once: true });
    cancel.addEventListener('click', () => finish(''), { once: true });
    select.focus();
  });
}

async function importProductWorkbook(file) {
  if (!file) return;
  setProductImportSummary('Đang đọc ' + file.name + '…');
  try {
    const XLSX = await import('xlsx');
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
    if (!workbook.SheetNames.length) throw new Error('Workbook không có sheet.');
    const sheetName = await chooseWorkbookSheet(workbook.SheetNames);
    if (!sheetName) {
      setProductImportSummary('Đã hủy nhập Excel.');
      return;
    }
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
    stageProductRows(rows, { source: file.name + ' / ' + sheetName });
  } catch (error) {
    console.error('Product Excel import failed:', error);
    setProductImportSummary('Không thể đọc file Excel. File không bị áp dụng vào báo giá.', 'error');
  }
}

function syncStudioV6Context(tab = '') {
  setText('studioV6QuoteName', String(state.quoteTitle || '').trim() || 'Báo giá mới');
  setText('studioV6QuoteNo', String(state.quoteNo || '').trim() || 'Chưa có mã');
  const stage = STUDIO_STAGE_BY_TAB[tab] || tab;
  document.querySelectorAll('[data-studio-block]').forEach(button => button.classList.toggle('active', button.dataset.studioBlock === stage));
  syncUndoRedoButtons();
}
function studioFieldTarget(message) {
  if (/tên công ty/i.test(message)) return ['general','companyName'];
  if (/tiêu đề báo giá/i.test(message)) return ['general','quoteTitle'];
  if (/Kính gửi/i.test(message)) return ['general','recipientLine'];
  if (/email khách hàng/i.test(message)) return ['customer','quickCustomerEmail'];
  if (/email công ty/i.test(message)) return ['general','companyEmail'];
  if (/sản phẩm|dòng sản phẩm|đơn giá|số lượng/i.test(message)) return ['products',''];
  if (/VAT|tổng cộng|ngân hàng|chuyển khoản/i.test(message)) return ['payment',''];
  if (/điều khoản|chữ ký/i.test(message)) return ['terms',''];
  if (/logo/i.test(message)) return ['design',''];
  return ['general',''];
}
function focusValidationIssue(message) {
  const rowMatch = String(message).match(/(?:Dòng sản phẩm|Sản phẩm).*?(\d+)/i);
  openTab(/sản phẩm|dòng sản phẩm|đơn giá|số lượng/i.test(message) ? 'products' : studioFieldTarget(message)[0]);
  requestAnimationFrame(() => {
    if (rowMatch) {
      const target = document.querySelector('[data-product-grid-index="' + (Number(rowMatch[1]) - 1) + '"][data-product-grid-key="name"]');
      target?.focus();
      target?.scrollIntoView({ block: 'center', inline: 'center' });
      return;
    }
    const id = studioFieldTarget(message)[1];
    if (id) {
      const target = document.getElementById(id);
      target?.focus();
      target?.scrollIntoView({ block: 'center' });
    }
  });
}
function renderStudioCheckPanel() {
  const list = document.getElementById('studioCheckList');
  const summary = document.getElementById('studioCheckSummary');
  if (!list || !summary) return;
  const result = validateQuote();
  list.innerHTML = '';
  if (!result.errors.length && !result.warnings.length) {
    summary.textContent = '✓ Sẵn sàng · Không phát hiện lỗi nghiệp vụ.';
    summary.dataset.tone = 'ok';
    return;
  }
  summary.textContent = result.errors.length + ' lỗi · ' + result.warnings.length + ' cảnh báo';
  summary.dataset.tone = result.errors.length ? 'error' : 'warn';
  [...result.errors.map(message => ['error',message]), ...result.warnings.map(message => ['warn',message])].forEach(([tone,message]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-check-item ' + tone;
    button.innerHTML = '<span>' + (tone === 'error' ? '✕' : '⚠') + '</span><span><b>' + message + '</b><small>Bấm để tới vị trí cần kiểm tra</small></span>';
    button.addEventListener('click', () => focusValidationIssue(message));
    list.appendChild(button);
  });
}
function showInspectorTab(tab) {
  const panel = document.getElementById('designPanel');
  if (!panel) return;
  panel.classList.toggle('inspector-content-mode', tab === 'content');
  panel.classList.toggle('inspector-check-mode', tab === 'check');
  document.getElementById('studioInspectorContent').hidden = tab !== 'content';
  document.getElementById('studioInspectorCheck').hidden = tab !== 'check';
  document.querySelectorAll('[data-inspector-tab]').forEach(button => {
    const active = button.dataset.inspectorTab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  if (tab === 'check') renderStudioCheckPanel();
}
function inspectorStageForTarget(targetId) {
  if (/Customer/i.test(targetId) || /^quickCustomer|^customer/.test(targetId)) return 'customer';
  if (/product/i.test(targetId)) return 'products';
  if (/payment|bank|discount|vat|currency|Fee/i.test(targetId)) return 'payment';
  if (/terms|closing|dateLine|left|right|footer/i.test(targetId)) return 'terms';
  if (/logo|theme|font|margin|preview/i.test(targetId)) return 'design';
  return 'general';
}
function renderInspectorSelection(targetId) {
  const box = document.getElementById('studioInspectorSelection');
  if (!box) return;
  const source = document.getElementById(targetId);
  const key = source?.dataset?.bind;
  const label = source?.closest('.row')?.querySelector('label')?.textContent?.trim() || source?.getAttribute('aria-label') || targetId;
  box.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'card';
  const heading = document.createElement('h3');
  heading.textContent = label || 'Nội dung';
  wrap.appendChild(heading);
  if (key) {
    const field = source.tagName === 'TEXTAREA' ? document.createElement('textarea') : document.createElement('input');
    if (field instanceof HTMLInputElement) field.type = source.type === 'email' ? 'email' : 'text';
    field.value = state[key] == null ? '' : state[key];
    field.addEventListener('input', () => {
      state[key] = field.value;
      source.value = field.value;
      save();
      render();
    });
    wrap.appendChild(field);
  }
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'btn';
  open.textContent = 'Mở phần nhập đầy đủ';
  open.addEventListener('click', () => {
    openTab(inspectorStageForTarget(targetId));
    requestAnimationFrame(() => source?.focus());
  });
  wrap.appendChild(open);
  box.appendChild(wrap);
}

function openCommandPalette() {
  const modal = document.getElementById('commandPaletteModal');
  const input = document.getElementById('commandPaletteInput');
  if (!modal) return;
  modal.hidden = false;
  if (input) {
    input.value = '';
    input.focus();
  }
  filterCommandPalette('');
}
function closeCommandPalette() {
  const modal = document.getElementById('commandPaletteModal');
  if (modal) modal.hidden = true;
}
function filterCommandPalette(query) {
  const normalized = normalizeGridHeader(query);
  document.querySelectorAll('#commandPaletteList [data-command]').forEach(button => {
    button.hidden = Boolean(normalized) && !normalizeGridHeader(button.textContent).includes(normalized);
  });
}
function runStudioCommand(command) {
  closeCommandPalette();
  if (['products','customer'].includes(command)) openTab(command);
  else if (command === 'check') showInspectorTab('check');
  else if (command === 'preview') openTab('view');
  else if (command === 'export') openTab('export');
  else if (command === 'advanced') {
    const toggle = document.getElementById('studioAdvancedMode');
    if (toggle) {
      toggle.checked = true;
      document.body.dataset.studioMode = 'advanced';
    }
    openTab('design');
    showInspectorTab('design');
  }
}
function initStudioV6() {
  document.body.dataset.studioMode = document.getElementById('studioAdvancedMode')?.checked ? 'advanced' : 'simple';
  document.getElementById('studioV6Home')?.addEventListener('click', () => openTab('dashboard'));
  document.getElementById('studioV6Save')?.addEventListener('click', saveCurrentQuote);
  document.getElementById('studioV6Check')?.addEventListener('click', () => showInspectorTab('check'));
  document.getElementById('studioV6Preview')?.addEventListener('click', () => openTab('view'));
  document.getElementById('studioUndo')?.addEventListener('click', undoQuoteChange);
  document.getElementById('studioRedo')?.addEventListener('click', redoQuoteChange);
  document.getElementById('studioCommandPalette')?.addEventListener('click', openCommandPalette);
  document.getElementById('studioV6More')?.addEventListener('click', openCommandPalette);
  document.getElementById('commandPaletteClose')?.addEventListener('click', closeCommandPalette);
  document.getElementById('commandPaletteModal')?.addEventListener('click', event => {
    if (event.target?.id === 'commandPaletteModal') closeCommandPalette();
  });
  document.getElementById('commandPaletteInput')?.addEventListener('input', event => filterCommandPalette(event.currentTarget.value));
  document.querySelectorAll('#commandPaletteList [data-command]').forEach(button => button.addEventListener('click', () => runStudioCommand(button.dataset.command)));
  document.getElementById('studioAdvancedMode')?.addEventListener('change', event => {
    document.body.dataset.studioMode = event.currentTarget.checked ? 'advanced' : 'simple';
  });
  document.getElementById('studioBlockSearch')?.addEventListener('input', event => {
    const query = normalizeGridHeader(event.currentTarget.value);
    document.querySelectorAll('[data-studio-block]').forEach(button => {
      button.hidden = Boolean(query) && !normalizeGridHeader(button.dataset.studioSearch + ' ' + button.textContent).includes(query);
    });
  });
  document.querySelectorAll('[data-studio-block]').forEach(button => button.addEventListener('click', () => openTab(button.dataset.studioBlock)));
  document.querySelectorAll('[data-studio-template]').forEach(button => button.addEventListener('click', () => {
    const themeButton = document.querySelector('.tpl[data-theme="' + button.dataset.studioTemplate + '"]');
    themeButton?.click();
  }));
  document.querySelectorAll('[data-inspector-tab]').forEach(button => button.addEventListener('click', () => showInspectorTab(button.dataset.inspectorTab)));
  document.getElementById('productSelectAll')?.addEventListener('change', event => {
    selectedProductRows = event.currentTarget.checked
      ? new Set(state.products.map((_, index) => index))
      : new Set();
    renderProductDataGrid();
  });
  document.getElementById('productBulkAction')?.addEventListener('change', syncProductBulkActionUI);
  document.getElementById('applyProductBulk')?.addEventListener('click', applyProductBulkAction);
  document.getElementById('clearProductSelection')?.addEventListener('click', () => {
    selectedProductRows.clear();
    renderProductDataGrid();
  });
  document.getElementById('cancelProductMapping')?.addEventListener('click', () => closeProductMappingReview('Đã hủy nhập dữ liệu.'));
  document.getElementById('applyMappedImport')?.addEventListener('click', () => {
    if (!pendingProductImport) return;
    let products = productsFromMappedRows(pendingProductImport.rows, pendingProductImport);
    if (document.getElementById('mappingValidOnly')?.checked) products = products.filter(productImportValidity);
    const { source, startIndex } = pendingProductImport;
    closeProductMappingReview();
    applyImportedProducts(products, { source, startIndex });
  });
  syncProductBulkActionUI();
  document.getElementById('addProductGrid')?.addEventListener('click', () => {
    pushQuoteUndoSnapshot();
    state.products.push(blankProduct());
    save(); renderEditorProducts(); render(); focusProductName(state.products.length - 1);
  });
  document.getElementById('pasteProductData')?.addEventListener('click', () => {
    openTab('products');
    requestAnimationFrame(() => {
      const first = document.querySelector('[data-product-grid-key="name"]');
      first?.focus();
      toast('Bấm Ctrl+V để dán bảng từ Excel');
    });
  });
  document.getElementById('productExcelInput')?.addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    await importProductWorkbook(file);
    input.value = '';
  });
  document.getElementById('productDataGridBody')?.addEventListener('paste', event => {
    const text = event.clipboardData?.getData('text/plain') || '';
    if (!text.trim()) return;
    event.preventDefault();
    const startIndex = Number(event.target?.dataset?.productGridIndex || 0);
    stageProductRows(parseClipboardTable(text), { startIndex, source: 'clipboard Excel' });
  });
  document.getElementById('paper')?.addEventListener('click', event => {
    const target = event.target?.closest?.('[data-target]');
    if (!target?.dataset?.target) return;
    renderInspectorSelection(target.dataset.target);
    showInspectorTab('content');
  }, true);
  document.addEventListener('keydown', event => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if (event.key === 'Escape' && !document.getElementById('commandPaletteModal')?.hidden) {
      closeCommandPalette();
      return;
    }
    const editable = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
    if (!mod || editable) return;
    if (event.key.toLowerCase() === 'z' && event.shiftKey) {
      event.preventDefault(); redoQuoteChange();
    } else if (event.key.toLowerCase() === 'z') {
      event.preventDefault(); undoQuoteChange();
    } else if (event.key.toLowerCase() === 'y') {
      event.preventDefault(); redoQuoteChange();
    }
  });
  renderProductDataGrid();
  renderStudioCheckPanel();
  syncStudioV6Context(document.querySelector('.pane.active')?.id?.replace('pane-', '') || '');
  syncUndoRedoButtons();
}

bindInputs();
setupMajorPanelToggles();
enhanceCollapsibleCards();
renderEditorProducts();
render();
initStudioV6();

document.getElementById('applyTungGiaBaoProfile')?.addEventListener('click', () => {
  applyTungGiaBaoToCurrentQuote();
});

document.getElementById('resetLogoPosition').addEventListener('click', () => {
  state.logoWidth = 58;
  state.logoPadding = 2;
  state.logoOffsetX = 0;
  state.logoOffsetY = 0;
  state.layoutOffsets = Object.assign({}, state.layoutOffsets || {});
  delete state.layoutOffsets.logo;
  state.logoDisplayMode = 'original';
  state.logoRemoveBgThreshold = 46;
  state.logoTreatment = 'none';
  state.logoBlendMode = 'normal';
  state.logoBackdropColor = state.accent || '#0b8f83';
  state.logoBackdropOpacity = 0;
  state.logoBackdropRadius = 0;
  state.logoBackdropBorder = 'none';
  save();
  syncInputs();
  render();
  toast('Đã căn lại logo');
});

const MAX_LOGO_FILE_BYTES = 3 * 1024 * 1024;
let logoReadToken = 0;

function clearCurrentLogo({ notify = false } = {}) {
  logoReadToken += 1;
  state.logo = '';
  state.showLogo = false;
  saveLogoAsset('');
  save();
  syncInputs();
  render();

  const input = document.getElementById('logoInput');
  if (input) input.value = '';

  if (notify) toast('Đã xóa hoàn toàn logo');
}

document.getElementById('logoInput').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (file.size > MAX_LOGO_FILE_BYTES) {
    alert('Logo quá lớn. Kích thước tối đa là 3 MB. Hãy chọn ảnh nhỏ hơn để tránh đầy bộ nhớ trình duyệt.');
    event.target.value = '';
    return;
  }

  const token = ++logoReadToken;

  // Replacement is destructive by design: remove the previous asset first,
  // so the old logo can never remain underneath or be composited with the new one.
  state.logo = '';
  state.showLogo = false;
  saveLogoAsset('');
  save();
  syncInputs();
  render();

  const reader = new FileReader();
  reader.onload = () => {
    if (token !== logoReadToken) return;
    state.logo = String(reader.result || '');
    state.showLogo = Boolean(state.logo);
    state.logoDisplayMode = 'original';
    state.logoRemoveBgThreshold = 46;
    state.logoTreatment = 'none';
    state.logoBlendMode = 'normal';
    state.logoBackdropOpacity = 0;
    state.logoBackdropRadius = 0;
    state.logoBackdropBorder = 'none';
    logoProcessedCache = { source: '', threshold: 0, dataUrl: '' };
    if (!saveLogoAsset(state.logo)) {
      state.logo = '';
      state.showLogo = false;
    }
    save();
    syncInputs();
    render();
    toast('Đã thay logo mới hoàn toàn');
  };
  reader.onerror = () => {
    if (token !== logoReadToken) return;
    state.logo = '';
    state.showLogo = false;
    saveLogoAsset('');
    save();
    syncInputs();
    render();
    alert('Không thể đọc file logo. Logo cũ đã được xóa.');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
});

document.getElementById('restoreLogoOriginal')?.addEventListener('click', () => {
  state.logoDisplayMode = 'original';
  state.logoTreatment = 'none';
  state.logoBlendMode = 'normal';
  state.logoBackdropOpacity = 0;
  state.logoBackdropRadius = 0;
  state.logoBackdropBorder = 'none';
  save();
  syncInputs();
  render();
  toast('Đã khôi phục hiển thị logo gốc');
});

document.getElementById('clearLogo').addEventListener('click', () => {
  clearCurrentLogo({ notify: true });
});

const THEME_ACCENTS = {
  modern: '#0b8f83',
  corporate: '#1b5faa',
  minimal: '#56616f',
  classic: '#735d49',
  emerald: '#16845f',
  warm: '#d97919',
  premium: '#202c43',
  mono: '#30343a'
};

const THEME_FONTS = {
  modern: 'Times New Roman',
  corporate: 'Arial',
  minimal: 'Arial',
  classic: 'Georgia',
  emerald: 'Arial',
  warm: 'Georgia',
  premium: 'Arial',
  mono: 'Arial'
};

const THEME_PROFILES = {
  modern: { showWebEmail: false, showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  corporate: { showQuoteMeta: true, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  minimal: { showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'airy', previewTableDensity: 'standard' },
  classic: { showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  emerald: { showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  warm: { showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  premium: { showQuoteMeta: true, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  mono: { showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'compact', previewTableDensity: 'compact' }
};

$$('.tpl').forEach((el) => {
  el.addEventListener('mouseenter', () => {
    const description = document.getElementById('templateDescription');
    if (description) description.textContent = el.dataset.description || '';
  });
  el.addEventListener('mouseleave', () => {
    const active = document.querySelector('.tpl.active');
    const description = document.getElementById('templateDescription');
    if (description && active) description.textContent = active.dataset.description || '';
  });
  el.addEventListener('click', () => {
    pushQuoteUndoSnapshot();
    state.theme = el.dataset.theme;
    if (THEME_ACCENTS[state.theme]) state.accent = THEME_ACCENTS[state.theme];
    if (THEME_FONTS[state.theme]) state.docFont = THEME_FONTS[state.theme];
    Object.assign(state, THEME_PROFILES[state.theme] || {});
    if (state.logoTreatment === 'custom' && !state.logoBackdropColor) state.logoBackdropColor = state.accent;
    save();
    syncInputs();
    render();
  });
});

$$('.color').forEach((el) => {
  el.addEventListener('click', () => {
    pushQuoteUndoSnapshot();
    state.accent = el.dataset.color;
    save();
    render();
  });
});

document.getElementById('openDesign').addEventListener('click', () => {
  document.getElementById('designPanel').classList.add('open');
  setMajorPanelState('design', false);
});
document.getElementById('closeDesign').addEventListener('click', () => {
  document.getElementById('designPanel').classList.remove('open');
  if (window.innerWidth > 1280) setMajorPanelState('design', true);
});

$$('.print-action').forEach((el) => el.addEventListener('click', () => {
  if (runPreflight({ forPrint: true })) window.print();
}));

document.getElementById('preflightCheck')?.addEventListener('click', () => {
  const result = validateQuote();
  updateDocumentHealth();
  if (!result.errors.length && !result.warnings.length) {
    toast('Báo giá đã sẵn sàng để in');
    return;
  }
  const lines = [];
  if (result.errors.length) lines.push('LỖI:\n• ' + result.errors.join('\n• '));
  if (result.warnings.length) lines.push('CẦN KIỂM TRA:\n• ' + result.warnings.join('\n• '));
  alert(lines.join('\n\n'));
});

document.getElementById('exportExcel')?.addEventListener('click', exportCurrentQuoteExcel);
document.getElementById('importExcelQuick')?.addEventListener('click', () => {
  openSmartImport();
  document.getElementById('excelSmartImportInput')?.click();
});
document.getElementById('importHandwritingQuick')?.addEventListener('click', () => {
  openSmartImport();
  document.getElementById('handwritingSmartImportInput')?.click();
});
document.getElementById('choosePcFolder')?.addEventListener('click', choosePcFolder);
document.getElementById('savePcNow')?.addEventListener('click', async () => {
  if (!rememberedPcHandle && !await choosePcFolder()) return;
  await saveCurrentToPc({ notify: true, requestPermission: true });
});
document.getElementById('restorePcLatest')?.addEventListener('click', restoreCurrentFromPc);
updatePcFolderStatus().catch((error) => console.warn('PC folder status unavailable:', error));

document.getElementById('exportJson').addEventListener('click', () => {
  download('bao-gia-du-lieu.json', JSON.stringify(state, null, 2), 'application/json');
});

document.getElementById('preflightExport')?.addEventListener('click', () => {
  document.getElementById('preflightCheck')?.click();
});

document.getElementById('importJson').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let previousState = null;
    let snapshot = null;
    try {
      const imported = JSON.parse(reader.result);
      if (!isPlainObject(imported)) throw new Error('invalid quote schema');
      const importedState = merge(imported);
      importedState.historyRecordId = '';

      previousState = clone(state);
      snapshot = captureStorageSnapshot([STORAGE, LOGO_STORAGE]);
      if (!snapshot) throw storageWriteError(false);

      state = importedState;
      if (!saveLogoAsset(state.logo || '') || !save()) {
        state = previousState;
        const rollbackOk = restoreStorageSnapshot(snapshot);
        throw storageWriteError(rollbackOk);
      }

      syncInputs();
      renderEditorProducts();
      render();
      renderDashboard();
      renderExportCenter();
      toast('Đã nhập dữ liệu');
    } catch (error) {
      if (previousState && (error?.code === 'STORAGE_WRITE_FAILED' || error?.code === 'STORAGE_ROLLBACK_FAILED')) {
        state = previousState;
        syncInputs();
        renderEditorProducts();
        render();
      }
      if (error?.code === 'STORAGE_WRITE_FAILED') {
        alert('Không thể nhập dữ liệu vì bộ nhớ trình duyệt không ghi được. Dữ liệu trước đó đã được giữ nguyên.');
      } else if (error?.code === 'STORAGE_ROLLBACK_FAILED') {
        alert('Không thể hoàn tất nhập dữ liệu và việc khôi phục bộ nhớ cũ cũng gặp lỗi. Hãy xuất sao lưu hiện có trước khi thao tác tiếp.');
      } else {
        alert('File JSON không hợp lệ.');
      }
    }
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
});

document.getElementById('exportAllData').addEventListener('click', () => {
  download('PriceReport_Tunggiabao-backup.json', JSON.stringify(fullBackupPayload(), null, 2), 'application/json');
});

document.getElementById('importAllData').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let previousState = null;
    let snapshot = null;
    try {
      const payload = JSON.parse(reader.result);
      if (!isPlainObject(payload) || !isPlainObject(payload.current) || !Array.isArray(payload.history) || !isPlainObject(payload.presets)) {
        throw new Error('invalid backup schema');
      }
      const schemaVersion = Number(payload.schemaVersion || 1);
      if (!Number.isFinite(schemaVersion) || schemaVersion > 4) {
        throw new Error('unsupported backup schema');
      }

      const restoredState = merge(payload.current);
      const restoredHistory = normalizeHistoryRecords(payload.history);
      const restoredPresets = normalizePresetStore(payload.presets);
      const restoredCustomers = normalizeCustomerLibrary(payload.customers);
      const restoredCatalog = normalizeProductCatalog(payload.catalog);
      if (!confirm('Khôi phục toàn bộ dữ liệu sẽ thay thế báo giá đang mở, lịch sử và mẫu đã lưu. Tiếp tục?')) return;

      previousState = clone(state);
      snapshot = captureStorageSnapshot([STORAGE, HISTORY, PRESETS, CUSTOMERS, CATALOG, LOGO_STORAGE]);
      if (!snapshot) throw storageWriteError(false);

      state = restoredState;
      const writeOk =
        saveLogoAsset(state.logo || '') &&
        setHistory(restoredHistory) &&
        safeStore(PRESETS, JSON.stringify(restoredPresets)) &&
        setCustomerLibrary(restoredCustomers) &&
        setProductCatalog(restoredCatalog) &&
        save();

      if (!writeOk) {
        state = previousState;
        const rollbackOk = restoreStorageSnapshot(snapshot);
        throw storageWriteError(rollbackOk);
      }

      syncInputs();
      renderEditorProducts();
      render();
      renderHistory();
      renderPresets();
      renderMasterData();
      renderDashboard();
      renderExportCenter();
      toast('Đã khôi phục toàn bộ dữ liệu');
    } catch (error) {
      if (previousState && (error?.code === 'STORAGE_WRITE_FAILED' || error?.code === 'STORAGE_ROLLBACK_FAILED')) {
        state = previousState;
        syncInputs();
        renderEditorProducts();
        render();
        renderHistory();
        renderPresets();
        renderMasterData();
      }
      if (error?.code === 'STORAGE_WRITE_FAILED') {
        alert('Không thể khôi phục vì bộ nhớ trình duyệt không ghi được. Dữ liệu trước đó đã được phục hồi nguyên trạng.');
      } else if (error?.code === 'STORAGE_ROLLBACK_FAILED') {
        alert('Khôi phục dữ liệu bị gián đoạn và rollback bộ nhớ cũ cũng gặp lỗi. Không thao tác thêm trước khi xuất sao lưu các dữ liệu còn đọc được.');
      } else {
        alert('File sao lưu không hợp lệ hoặc không đúng định dạng PriceReport.');
      }
    }
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
});

document.getElementById('saveQuoteToHistory').addEventListener('click', saveCurrentQuote);
document.getElementById('newQuote').addEventListener('click', () => {
  if (currentQuoteHistoryState() !== 'saved') {
    const proceed = confirm('Tạo báo giá mới? Báo giá hiện tại có thay đổi chưa lưu vào lịch sử. Bấm Hủy để quay lại và chọn "Lưu nháp".');
    if (!proceed) return;
  }
  createNewQuote();
});
document.getElementById('quoteSearch').addEventListener('input', renderHistory);
document.getElementById('quoteStatusFilter').addEventListener('change', renderHistory);

document.getElementById('saveCurrentCustomer').addEventListener('click', saveCurrentCustomerToLibrary);
document.getElementById('saveCurrentProducts').addEventListener('click', saveCurrentProductsToCatalog);
document.getElementById('customerLibrarySearch').addEventListener('input', renderMasterData);
document.getElementById('productCatalogSearch').addEventListener('input', renderMasterData);

document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Khôi phục báo giá hiện tại về mẫu ban đầu? Lịch sử, danh bạ và danh mục sẽ được giữ nguyên.')) return;
  state = clone(defaults);
  saveLogoAsset('');
  save();
  syncInputs();
  resetCollapsedProductsForState();
  renderEditorProducts();
  render();
  toast('Đã khôi phục mẫu');
});

function validateQuote(data = state) {
  const errors = [];
  const warnings = [];

  if (!String(data.companyName || '').trim()) errors.push('Thiếu tên công ty.');
  if (!String(data.quoteTitle || '').trim()) errors.push('Thiếu tiêu đề báo giá.');
  if (!String(data.recipientLine || '').trim()) warnings.push('Chưa có dòng Kính gửi.');
  const finalStatus = data.quoteStatus && data.quoteStatus !== 'draft';
  if (finalStatus && !String(data.quoteNo || '').trim()) errors.push('Báo giá đã rời trạng thái nháp nhưng chưa có số báo giá.');
  if (finalStatus && !String(data.quoteDate || '').trim()) errors.push('Báo giá đã rời trạng thái nháp nhưng chưa có ngày báo giá.');
  if (data.quoteDate && !isValidISODate(data.quoteDate)) {
    (finalStatus ? errors : warnings).push('Ngày báo giá không hợp lệ; cần dùng định dạng ngày hợp lệ.');
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.companyEmail && !emailPattern.test(String(data.companyEmail))) warnings.push('Email công ty có vẻ chưa đúng định dạng.');
  if (data.customerEmail && !emailPattern.test(String(data.customerEmail))) warnings.push('Email khách hàng có vẻ chưa đúng định dạng.');

  const products = Array.isArray(data.products) ? data.products : [];
  const namedProducts = products.filter(product => String(product?.name || '').trim());
  if (!namedProducts.length) errors.push('Chưa có sản phẩm hợp lệ.');

  products.forEach((product, index) => {
    const name = String(product?.name || '').trim();
    const qty = Number(product?.qty || 0);
    const price = Number(product?.price || 0);
    if (!name && productHasDraftContent(product)) {
      errors.push('Dòng sản phẩm ' + (index + 1) + ' đã có dữ liệu nhưng chưa có tên.');
      return;
    }
    if (name && (data.showQty || data.showAmount || data.showTotals) && qty <= 0) warnings.push('Sản phẩm "' + name + '" có số lượng bằng 0.');
    if (name && data.showPrice && price <= 0) warnings.push('Sản phẩm "' + name + '" chưa có đơn giá.');
  });

  if (data.showQuoteMeta && !String(data.quoteNo || '').trim()) warnings.push('Đang hiện hộp thông tin nhưng chưa có số báo giá.');
  if (data.showLogo && !data.logo) warnings.push('Đang bật hiển thị logo nhưng chưa có file logo.');
  if ((Number(data.discountPct || 0) > 0 || Number(data.vatPct || 0) > 0 || Number(data.otherFee || 0) > 0) && !data.showTotals) {
    warnings.push('Có giảm giá/VAT/phí khác nhưng bảng tổng cộng đang bị ẩn.');
  }
  if (Number(data.vatPct || 0) > 0 && /đã bao gồm\s*VAT/i.test(String(data.termsText || ''))) {
    warnings.push('Điều khoản ghi "đã bao gồm VAT" trong khi bảng tổng cộng đang cộng VAT riêng.');
  }
  if (data.showTerms && !String(data.termsText || '').trim()) warnings.push('Đang bật điều khoản nhưng nội dung điều khoản đang trống.');
  if (data.showSignature && !String(data.rightTitle || '').trim()) warnings.push('Đang bật chữ ký nhưng chức danh đại diện công ty đang trống.');
  const transferOnly = /^\s*chuyển khoản\s*$/i.test(String(data.paymentMethod || ''));
  const partialBank = [data.bankName, data.bankAccount, data.bankOwner].some(Boolean) &&
    ![data.bankName, data.bankAccount, data.bankOwner].every(Boolean);
  if (data.showPaymentBlock && transferOnly && !data.bankName) warnings.push('Phương thức là chuyển khoản nhưng chưa nhập ngân hàng.');
  if (data.showPaymentBlock && partialBank) warnings.push('Thông tin tài khoản ngân hàng đang nhập dở.');

  return { errors, warnings };
}

function updateDocumentHealth() {
  const result = validateQuote();
  const badges = [
    document.getElementById('documentHealth'),
    document.getElementById('studioDocumentHealth')
  ].filter(Boolean);

  let tone = 'ok';
  let label = 'Sẵn sàng in';
  if (result.errors.length) {
    tone = 'error';
    label = result.errors.length + ' lỗi cần sửa';
  } else if (result.warnings.length) {
    tone = 'warn';
    label = result.warnings.length + ' mục cần kiểm tra';
  }

  badges.forEach((badge) => {
    badge.classList.remove('ok','warn','error');
    badge.classList.add(tone);
    badge.textContent = label;
  });
}

function runPreflight({ forPrint = false } = {}) {
  const result = validateQuote();
  updateDocumentHealth();
  if (result.errors.length) {
    alert('Chưa thể ' + (forPrint ? 'in/xuất PDF' : 'hoàn tất') + ':\n\n• ' + result.errors.join('\n• '));
    return false;
  }
  if (forPrint && result.warnings.length) {
    return confirm('Báo giá có ' + result.warnings.length + ' mục cần kiểm tra:\n\n• ' + result.warnings.join('\n• ') + '\n\nVẫn tiếp tục in/xuất PDF?');
  }
  return true;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeHistoryRecords(value) {
  const records = Array.isArray(value) ? value : [];
  const seenIds = new Set();
  return records.flatMap((record, index) => {
    if (!isPlainObject(record) || !isPlainObject(record.data)) return [];
    const rawData = Object.assign({}, record.data, {
      products: Array.isArray(record.data.products) ? record.data.products : []
    });
    const data = merge(rawData);
    data.logo = '';
    const currency = normalizeCatalogCurrency(record.currency || data.currency || 'VND');
    data.currency = currency;
    let id = String(record.id || '').trim();
    if (!id || seenIds.has(id)) {
      const stamp = String(record.savedAt || '').replace(/\W+/g, '').slice(0, 24) || 'legacy';
      id = 'restored-' + stamp + '-' + (index + 1);
      let suffix = 2;
      while (seenIds.has(id)) {
        id = 'restored-' + stamp + '-' + (index + 1) + '-' + suffix;
        suffix += 1;
      }
    }
    seenIds.add(id);
    const status = ['draft','sent','accepted','rejected','expired'].includes(record.status)
      ? record.status
      : data.quoteStatus;
    data.quoteStatus = status;
    return [{
      id,
      savedAt: typeof record.savedAt === 'string' ? record.savedAt : '',
      status,
      currency,
      total: calcQuoteTotal(data),
      data
    }];
  });
}

function getHistory() {
  try {
    return normalizeHistoryRecords(JSON.parse(localStorage.getItem(HISTORY)));
  } catch {
    return [];
  }
}

function setHistory(items) {
  return safeStore(HISTORY, JSON.stringify(normalizeHistoryRecords(items)));
}

function calcTotal(data) {
  return calcQuoteTotal(data);
}

function quoteLabel(data) {
  return data.quoteNo || 'Chưa có số báo giá';
}

function statusLabel(status) {
  return STATUS_LABELS[status] || STATUS_LABELS.draft;
}

function saveCurrentQuote() {
  const validation = validateQuote();
  if (state.quoteStatus !== 'draft' && validation.errors.length) {
    alert('Báo giá không thể lưu ở trạng thái "' + statusLabel(state.quoteStatus) + '" khi còn lỗi:\n\n• ' + validation.errors.join('\n• '));
    return false;
  }

  const items = getHistory();
  const now = new Date().toISOString();
  const previousHistoryRecordId = state.historyRecordId || '';
  let existingIndex = previousHistoryRecordId
    ? items.findIndex(item => item.id === previousHistoryRecordId)
    : -1;

  if (state.quoteNo) {
    const collision = items.some((item, index) =>
      index !== existingIndex && item?.data?.quoteNo === state.quoteNo);
    if (collision) {
      state.quoteNo = generateUniqueQuoteNo();
      toast('Mã báo giá trùng; đã đổi thành ' + state.quoteNo);
    }
  }

  const id = existingIndex >= 0
    ? items[existingIndex].id
    : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

  const historyData = clone(state);
  historyData.logo = '';
  historyData.historyRecordId = '';
  const record = {
    id,
    savedAt: now,
    status: state.quoteStatus || 'draft',
    currency: normalizeCatalogCurrency(state.currency),
    total: calcTotal(state),
    data: historyData
  };

  if (existingIndex >= 0) items.splice(existingIndex, 1);
  items.unshift(record);
  if (!setHistory(items)) {
    state.historyRecordId = previousHistoryRecordId;
    syncStudioContext(document.querySelector('.pane.active')?.id?.replace('pane-', '') || '');
    return false;
  }

  state.historyRecordId = id;
  const currentSaved = save();
  syncInputs();
  renderHistory();
  syncStudioContext(document.querySelector('.pane.active')?.id?.replace('pane-', '') || '');
  toast(currentSaved
    ? (existingIndex >= 0 ? 'Đã cập nhật báo giá' : 'Đã lưu báo giá')
    : 'Đã lưu vào lịch sử; trạng thái hiện tại chưa thể autosave');
  if (getAppPreferences().autoPcSave) {
    saveCurrentToPc({ notify: false }).catch((error) => console.warn('PC autosave skipped:', error));
  }
  return true;
}

function loadQuoteRecord(record) {
  const activeLogo = state.logo;
  const recordLogo = String(record?.data?.logo || '');
  state = merge(record.data);
  state.logo = recordLogo || activeLogo;
  if (recordLogo) saveLogoAsset(recordLogo);
  state.historyRecordId = record.id || '';
  const persisted = save();
  syncInputs();
  resetCollapsedProductsForState();
  renderEditorProducts();
  render();
  openTab('general');
  toast(persisted ? ('Đã mở ' + quoteLabel(record.data)) : ('Đã mở ' + quoteLabel(record.data) + '; chưa autosave được'));
}

function duplicateQuoteRecord(record) {
  const activeLogo = state.logo;
  const recordLogo = String(record?.data?.logo || '');
  state = merge(clone(record.data));
  state.logo = recordLogo || activeLogo;
  if (recordLogo) saveLogoAsset(recordLogo);
  const used = getHistory().map(item => item?.data?.quoteNo).filter(Boolean);
  state.quoteNo = nextDuplicateQuoteNo(state.quoteNo || 'BG', used);
  state.quoteDate = localDateISO();
  state.quoteStatus = 'draft';
  state.historyRecordId = '';
  const persisted = save();
  syncInputs();
  resetCollapsedProductsForState();
  renderEditorProducts();
  render();
  openTab('general');
  toast(persisted ? ('Đã nhân bản thành ' + state.quoteNo) : ('Đã nhân bản tạm thời ' + state.quoteNo + '; chưa autosave được'));
}

function generateUniqueQuoteNo() {
  const used = new Set(getHistory().map(item => item.data && item.data.quoteNo).filter(Boolean));
  const d = new Date();
  const stamp = String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  let seq = 1;
  let candidate = '';
  do {
    candidate = 'BG-' + stamp + '-' + String(seq).padStart(3, '0');
    seq += 1;
  } while (used.has(candidate));
  return candidate;
}

function createNewQuote() {
  const keep = {
    logo: state.logo,
    companyName: state.companyName,
    companyAddress: state.companyAddress,
    companyAddressDetail: state.companyAddressDetail,
    companyProvince: state.companyProvince,
    companyWard: state.companyWard,
    branchKhanhHoa: state.branchKhanhHoa,
    branchDongNai: state.branchDongNai,
    farmAddress: state.farmAddress,
    taxCode: state.taxCode,
    phone: state.phone,
    website: state.website,
    companyEmail: state.companyEmail,
    slogan: state.slogan,
    footerText: state.footerText,
    currency: state.currency,
    theme: state.theme,
    accent: state.accent,
    showLogo: state.showLogo,
    showSlogan: state.showSlogan,
    showWebEmail: state.showWebEmail,
    docFont: state.docFont,
    marginX: state.marginX,
    marginTop: state.marginTop,
    marginBottom: state.marginBottom,
    logoWidth: state.logoWidth,
    logoPadding: state.logoPadding,
    logoOffsetX: state.logoOffsetX,
    logoOffsetY: state.logoOffsetY,
    layoutOffsets: clone(state.layoutOffsets || {}),
    logoDisplayMode: state.logoDisplayMode,
    logoRemoveBgThreshold: state.logoRemoveBgThreshold,
    logoTreatment: state.logoTreatment,
    logoBlendMode: state.logoBlendMode,
    logoBackdropColor: state.logoBackdropColor,
    logoBackdropOpacity: state.logoBackdropOpacity,
    logoBackdropRadius: state.logoBackdropRadius,
    logoBackdropBorder: state.logoBackdropBorder,
    docFontSize: state.docFontSize,
    tableFontSize: state.tableFontSize,
    previewTitleAlign: state.previewTitleAlign,
    previewTitleSize: 27,
    previewSpacing: state.previewSpacing,
    previewTableDensity: state.previewTableDensity,
    previewHeaderGap: state.previewHeaderGap,
    previewMetaWidth: state.previewMetaWidth,
    previewLineHeight: state.previewLineHeight,
    showQuoteMeta: state.showQuoteMeta,
    compactTable: state.compactTable,
    showStt: state.showStt,
    showPack: state.showPack,
    showQty: state.showQty,
    showPrice: state.showPrice,
    showAmount: state.showAmount,
    showNote: state.showNote,
    showTotals: state.showTotals,
    showWords: state.showWords,
    showTerms: state.showTerms,
    showSignature: state.showSignature,
    showPaymentBlock: state.showPaymentBlock,
    paymentMethod: state.paymentMethod,
    bankName: state.bankName,
    bankAccount: state.bankAccount,
    bankOwner: state.bankOwner,
    termsTitle: state.termsTitle,
    termsText: state.termsText,
    closingText: state.closingText,
    leftTitle: state.leftTitle,
    rightTitle: state.rightTitle,
    leftNote: state.leftNote,
    rightNote: state.rightNote,
    rightName: state.rightName
  };
  state = Object.assign(clone(defaults), keep);
  state.products = [{ group: '', name: '', pack: '', unit: '', qty: 1, price: 0, note: '' }];
  const d = new Date();
  state.quoteNo = generateUniqueQuoteNo();
  state.quoteDate = localDateISO(d);
  state.quoteSubtitle = '';
  state.dateLine = defaultSignatureDateLine(d);
  state.quoteStatus = 'draft';
  state.historyRecordId = '';
  const persisted = save();
  syncInputs();
  resetCollapsedProductsForState();
  renderEditorProducts();
  render();
  openTab('general');
  toast(persisted ? 'Đã tạo báo giá mới' : 'Đã tạo báo giá mới tạm thời; chưa autosave được');
}

function renderHistory() {
  const list = document.getElementById('quoteHistoryList');
  if (!list) return;
  const all = getHistory();
  const query = (document.getElementById('quoteSearch')?.value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('quoteStatusFilter')?.value || '';
  const items = all.filter(record => {
    const data = record.data || {};
    const status = data.quoteStatus || record.status || 'draft';
    const matchesQuery = !query || [data.quoteNo, data.customerName, data.customerCompany, data.customerPhone]
      .filter(Boolean).join(' ').toLowerCase().includes(query);
    const matchesStatus = !statusFilter || status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  document.getElementById('historyCount').textContent = String(all.length);
  const acceptedCount = all.filter(record => (record?.data?.quoteStatus || record?.status || 'draft') === 'accepted').length;
  const pendingCount = all.filter(record => ['draft','sent'].includes(record?.data?.quoteStatus || record?.status || 'draft')).length;
  const acceptedEl = document.getElementById('historyAcceptedCount');
  const pendingEl = document.getElementById('historyPendingCount');
  const resultEl = document.getElementById('historyResultCount');
  if (acceptedEl) acceptedEl.textContent = String(acceptedCount);
  if (pendingEl) pendingEl.textContent = String(pendingCount);
  if (resultEl) resultEl.textContent = String(items.length);

  const totalsByCurrency = historyTotalsByCurrency(all);
  const revenueEl = document.getElementById('historyRevenue');
  revenueEl.innerHTML = '';
  const currencies = Object.keys(totalsByCurrency);
  if (!currencies.length) {
    revenueEl.textContent = '0 VND';
  } else {
    currencies.sort().forEach((currency) => {
      const line = document.createElement('span');
      line.className = 'history-money-line';
      line.textContent = moneyForCurrency(totalsByCurrency[currency], currency);
      revenueEl.appendChild(line);
    });
  }

  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = '<div class="history-empty" role="status">Chưa có báo giá phù hợp.</div>';
    return;
  }

  items.forEach(record => {
    const data = record.data || {};
    const currentStatus = data.quoteStatus || record.status || 'draft';
    const customer = data.customerCompany || data.customerName || 'Chưa nhập khách hàng';
    const recordCurrency = normalizeCatalogCurrency(record.currency || data.currency || 'VND');

    const row = document.createElement('div');
    row.className = 'history-item history-table-row';

    const quoteCell = document.createElement('div');
    quoteCell.className = 'history-cell history-quote-cell';
    const quoteStrong = document.createElement('strong');
    quoteStrong.textContent = quoteLabel(data);
    const quoteSub = document.createElement('small');
    quoteSub.textContent = data.quoteSubtitle || 'Báo giá';
    quoteCell.append(quoteStrong, quoteSub);

    const customerCell = document.createElement('div');
    customerCell.className = 'history-cell history-customer-cell';
    const customerStrong = document.createElement('strong');
    customerStrong.textContent = customer;
    const customerSub = document.createElement('small');
    customerSub.textContent = data.customerPhone || data.customerName || '—';
    customerCell.append(customerStrong, customerSub);

    const dateCell = document.createElement('div');
    dateCell.className = 'history-cell history-date-cell';
    dateCell.textContent = formatDate(data.quoteDate || '') || '—';

    const totalCell = document.createElement('div');
    totalCell.className = 'history-cell history-value-cell';
    totalCell.textContent = moneyForCurrency(Number(record.total ?? calcTotal(data)), recordCurrency);

    const statusCell = document.createElement('div');
    statusCell.className = 'history-cell history-status-cell';
    const badge = document.createElement('span');
    badge.className = 'status-badge status-' + currentStatus;
    badge.textContent = statusLabel(currentStatus);
    statusCell.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'history-actions history-cell history-action-cell';
    const open = document.createElement('button');
    open.className = 'btn primary';
    open.textContent = 'Mở';
    open.addEventListener('click', () => loadQuoteRecord(record));

    const copy = document.createElement('button');
    copy.className = 'btn';
    copy.textContent = 'Nhân bản';
    copy.addEventListener('click', () => duplicateQuoteRecord(record));

    const del = document.createElement('button');
    del.className = 'btn danger';
    del.textContent = 'Xóa';
    del.addEventListener('click', () => {
      if (!confirm('Xóa ' + quoteLabel(data) + '?')) return;
      if (!setHistory(getHistory().filter(item => item.id !== record.id))) return;
      renderHistory();
      renderDashboard();
      toast('Đã xóa báo giá');
    });

    actions.append(open, copy, del);
    row.append(quoteCell, customerCell, dateCell, totalCell, statusCell, actions);
    list.appendChild(row);
  });
}

function normalizeCustomerLibrary(items) {
  const source = Array.isArray(items) ? items : [];
  return source.flatMap((item, index) => {
    if (!isPlainObject(item)) return [];
    return [{
      id: String(item.id || ('customer-' + (index + 1))),
      name: String(item.name || ''),
      company: String(item.company || ''),
      address: String(item.address || ''),
      phone: String(item.phone || ''),
      email: String(item.email || ''),
      contact: String(item.contact || '')
    }];
  });
}

function getCustomerLibrary() {
  try {
    return normalizeCustomerLibrary(JSON.parse(localStorage.getItem(CUSTOMERS)));
  } catch {
    return [];
  }
}

function setCustomerLibrary(items) {
  return safeStore(CUSTOMERS, JSON.stringify(normalizeCustomerLibrary(items)));
}

function customerKey(customer) {
  const phone = normalizePhone(customer.phone);
  if (phone) return 'phone:' + phone;
  return 'name:' + [customer.name, customer.company].filter(Boolean).join('|').trim().toLowerCase();
}

function saveCurrentCustomerToLibrary() {
  const customer = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: state.customerName || '',
    company: state.customerCompany || '',
    address: state.customerAddress || '',
    phone: state.customerPhone || '',
    email: state.customerEmail || '',
    contact: state.customerContact || ''
  };
  if (![customer.name, customer.company, customer.phone].some(Boolean)) {
    alert('Cần nhập ít nhất tên khách hàng, công ty hoặc SĐT trước khi lưu.');
    return;
  }
  const items = getCustomerLibrary();
  const key = customerKey(customer);
  const index = items.findIndex(item => customerKey(item) === key);
  if (index >= 0) customer.id = items[index].id;
  if (index >= 0) items[index] = customer;
  else items.unshift(customer);
  if (!setCustomerLibrary(items)) return;
  renderMasterData();
  toast(index >= 0 ? 'Đã cập nhật khách hàng' : 'Đã lưu khách hàng');
}

function useCustomer(customer) {
  state.customerName = customer.name || '';
  state.customerCompany = customer.company || '';
  state.customerAddress = customer.address || '';
  state.customerPhone = customer.phone || '';
  state.customerEmail = customer.email || '';
  state.customerContact = customer.contact || '';
  state.recipientLine = 'Kính gửi: ' + (state.customerCompany || state.customerName || 'QUÝ KHÁCH HÀNG');
  const persisted = save();
  syncInputs();
  render();
  openTab('general');
  requestAnimationFrame(() => document.getElementById('quickCustomerName')?.focus());
  toast(persisted ? 'Đã nạp khách hàng' : 'Đã nạp khách hàng tạm thời; chưa autosave được');
}

function normalizeProductCatalog(items) {
  const source = Array.isArray(items) ? items : [];
  return source.flatMap((item, index) => {
    if (!isPlainObject(item)) return [];
    return [{
      id: String(item.id || ('product-' + (index + 1))),
      group: String(item.group || ''),
      name: String(item.name || ''),
      pack: String(item.pack || ''),
      unit: String(item.unit || ''),
      price: normalizeNonNegativeNumber(item.price),
      currency: normalizeCatalogCurrency(item.currency || 'VND'),
      note: String(item.note || '')
    }];
  });
}

function getProductCatalog() {
  try {
    return normalizeProductCatalog(JSON.parse(localStorage.getItem(CATALOG)));
  } catch {
    return [];
  }
}

function setProductCatalog(items) {
  return safeStore(CATALOG, JSON.stringify(normalizeProductCatalog(items)));
}

function productKey(product) {
  return [product.group, product.name, product.pack, product.unit].map(value => String(value || '').trim().toLowerCase()).join('|');
}

function catalogKey(product) {
  return productKey(product) + '|' + normalizeCatalogCurrency(product?.currency || 'VND');
}

function saveCurrentProductsToCatalog() {
  const products = state.products.filter(product => String(product.name || '').trim());
  if (!products.length) {
    alert('Báo giá hiện tại chưa có sản phẩm để lưu.');
    return;
  }
  const items = getProductCatalog();
  let changed = 0;
  products.forEach(product => {
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      group: product.group || '',
      name: product.name || '',
      pack: product.pack || '',
      unit: product.unit || '',
      price: normalizeNonNegativeNumber(product.price),
      currency: normalizeCatalogCurrency(state.currency),
      note: product.note || ''
    };
    const key = catalogKey(item);
    const index = items.findIndex(existing => catalogKey(existing) === key);
    if (index >= 0) {
      item.id = items[index].id;
      items[index] = item;
    } else {
      items.unshift(item);
    }
    changed += 1;
  });
  if (!setProductCatalog(items)) return;
  renderMasterData();
  toast('Đã lưu ' + changed + ' sản phẩm vào danh mục');
}

function addCatalogProduct(product) {
  const key = productKey(product);
  const sourceCurrency = normalizeCatalogCurrency(product.currency || 'VND');
  const targetCurrency = normalizeCatalogCurrency(state.currency);
  const currencyMatches = sourceCurrency === targetCurrency;
  const catalogPrice = currencyMatches ? normalizeNonNegativeNumber(product.price) : 0;
  const existing = state.products.find(item => productKey(item) === key);
  if (existing) {
    existing.qty = normalizeNonNegativeNumber(existing.qty) + 1;
    if (currencyMatches) existing.price = catalogPrice;
  } else {
    state.products.push({
      group: product.group || '',
      name: product.name || '',
      pack: product.pack || '',
      unit: product.unit || '',
      qty: 1,
      price: catalogPrice,
      note: product.note || ''
    });
  }
  const persisted = save();
  renderEditorProducts();
  render();
  openTab('products');
  const successMessage = currencyMatches ? 'Đã thêm sản phẩm vào báo giá' : 'Đã thêm sản phẩm; đơn giá để 0 vì khác loại tiền tệ';
  toast(persisted ? successMessage : successMessage + ' — chưa autosave được');
}

function renderMasterData() {
  const customerList = document.getElementById('customerLibraryList');
  const productList = document.getElementById('productCatalogList');
  if (!customerList || !productList) return;

  const customerQuery = (document.getElementById('customerLibrarySearch')?.value || '').trim().toLowerCase();
  const productQuery = (document.getElementById('productCatalogSearch')?.value || '').trim().toLowerCase();

  const allCustomers = getCustomerLibrary();
  const allProducts = getProductCatalog();
  const customers = allCustomers.filter(item => {
    const haystack = [item.name, item.company, item.phone, item.email, item.address, item.contact]
      .filter(Boolean).join(' ').toLowerCase();
    return !customerQuery || haystack.includes(customerQuery);
  });
  const products = allProducts.filter(item => {
    const haystack = [item.group, item.name, item.pack, item.unit, item.note, item.currency]
      .filter(Boolean).join(' ').toLowerCase();
    return !productQuery || haystack.includes(productQuery);
  });

  setText('customerLibraryCount', allCustomers.length);
  setText('productCatalogCount', allProducts.length);
  setText('customerLibraryResultCount', customers.length);
  setText('productCatalogResultCount', products.length);

  customerList.innerHTML = '';
  if (!customers.length) {
    customerList.innerHTML = '<div class="history-empty" role="status">Chưa có khách hàng phù hợp.</div>';
  } else {
    customers.forEach(customer => {
      const row = document.createElement('div');
      row.className = 'master-item master-table-row customer-table-grid';

      const nameCell = document.createElement('div');
      nameCell.className = 'master-cell master-name-cell';
      const name = document.createElement('strong');
      name.textContent = customer.name || customer.company || 'Khách hàng';
      const contact = document.createElement('small');
      contact.textContent = customer.contact || 'Chưa có người liên hệ';
      nameCell.append(name, contact);

      const companyCell = document.createElement('div');
      companyCell.className = 'master-cell master-company-cell';
      companyCell.textContent = customer.company || '—';

      const contactCell = document.createElement('div');
      contactCell.className = 'master-cell master-contact-cell';
      const phone = document.createElement('strong');
      phone.textContent = customer.phone || '—';
      const email = document.createElement('small');
      email.textContent = customer.email || 'Chưa có email';
      contactCell.append(phone, email);

      const addressCell = document.createElement('div');
      addressCell.className = 'master-cell master-address-cell';
      addressCell.textContent = customer.address || '—';

      const actions = document.createElement('div');
      actions.className = 'master-actions master-cell master-action-cell';
      const use = document.createElement('button');
      use.className = 'btn primary';
      use.textContent = 'Dùng';
      use.addEventListener('click', () => useCustomer(customer));
      const del = document.createElement('button');
      del.className = 'btn danger';
      del.textContent = 'Xóa';
      del.addEventListener('click', () => {
        if (!confirm('Xóa khách hàng này khỏi danh bạ?')) return;
        if (!setCustomerLibrary(getCustomerLibrary().filter(item => item.id !== customer.id))) return;
        renderMasterData();
        renderDashboard();
      });
      actions.append(use, del);
      row.append(nameCell, companyCell, contactCell, addressCell, actions);
      customerList.appendChild(row);
    });
  }

  productList.innerHTML = '';
  if (!products.length) {
    productList.innerHTML = '<div class="history-empty" role="status">Chưa có sản phẩm phù hợp.</div>';
  } else {
    products.forEach(product => {
      const row = document.createElement('div');
      row.className = 'master-item master-table-row product-table-grid';
      const productCurrency = normalizeCatalogCurrency(product.currency || 'VND');

      const nameCell = document.createElement('div');
      nameCell.className = 'master-cell master-name-cell';
      const name = document.createElement('strong');
      name.textContent = product.name || 'Sản phẩm';
      const currency = document.createElement('small');
      currency.textContent = productCurrency;
      nameCell.append(name, currency);

      const groupCell = document.createElement('div');
      groupCell.className = 'master-cell master-group-cell';
      groupCell.textContent = product.group || '—';

      const packCell = document.createElement('div');
      packCell.className = 'master-cell master-pack-cell';
      packCell.textContent = [product.pack, product.unit].filter(Boolean).join(' / ') || '—';

      const priceCell = document.createElement('div');
      priceCell.className = 'master-cell master-price-cell';
      priceCell.textContent = moneyForCurrency(Number(product.price || 0), productCurrency);

      const noteCell = document.createElement('div');
      noteCell.className = 'master-cell master-note-cell';
      noteCell.textContent = product.note || '—';

      const actions = document.createElement('div');
      actions.className = 'master-actions master-cell master-action-cell';
      const add = document.createElement('button');
      add.className = 'btn primary';
      add.textContent = 'Thêm';
      add.addEventListener('click', () => addCatalogProduct(product));
      const del = document.createElement('button');
      del.className = 'btn danger';
      del.textContent = 'Xóa';
      del.addEventListener('click', () => {
        if (!confirm('Xóa sản phẩm này khỏi danh mục?')) return;
        if (!setProductCatalog(getProductCatalog().filter(item => item.id !== product.id))) return;
        renderMasterData();
        renderDashboard();
      });
      actions.append(add, del);
      row.append(nameCell, groupCell, packCell, priceCell, noteCell, actions);
      productList.appendChild(row);
    });
  }
}

function normalizePresetStore(value) {
  if (!isPlainObject(value)) return {};
  const normalized = {};
  Object.entries(value).forEach(([name, preset]) => {
    const safeName = String(name || '').trim();
    if (!safeName || !isPlainObject(preset)) return;
    const source = Object.assign({}, preset, {
      products: Array.isArray(preset.products) ? preset.products : []
    });
    normalized[safeName] = createPresetState(merge(source));
  });
  return normalized;
}

function getPresets() {
  try {
    return normalizePresetStore(JSON.parse(localStorage.getItem(PRESETS)));
  } catch {
    return {};
  }
}

function createPresetState(source) {
  const preset = clone(source);
  preset.historyRecordId = '';
  preset.logo = '';
  preset.quoteNo = '';
  preset.quoteDate = localDateISO();
  preset.quoteSubtitle = '';
  preset.dateLine = defaultSignatureDateLine();
  preset.quoteStatus = 'draft';
  preset.customerName = 'QUÝ KHÁCH HÀNG';
  preset.customerCompany = '';
  preset.customerAddress = '';
  preset.customerPhone = '';
  preset.customerEmail = '';
  preset.customerContact = '';
  preset.leftName = '';
  preset.recipientLine = 'Kính gửi: QUÝ KHÁCH HÀNG';
  preset.discountPct = 0;
  preset.otherFee = 0;
  preset.products = [{ group: '', name: '', pack: '', unit: '', qty: 1, price: 0, note: '' }];
  return preset;
}

document.getElementById('savePreset').addEventListener('click', () => {
  const name = document.getElementById('presetName').value.trim();
  if (!name) {
    alert('Nhập tên mẫu.');
    return;
  }
  const presets = getPresets();
  presets[name] = createPresetState(state);
  if (!safeStore(PRESETS, JSON.stringify(presets))) return;
  document.getElementById('presetName').value = '';
  renderPresets();
  toast('Đã lưu mẫu');
});

function renderPresets() {
  const box = document.getElementById('presetList');
  const presets = getPresets();
  const names = Object.keys(presets);
  box.innerHTML = '';
  if (!names.length) {
    box.innerHTML = '<div style="font-size:11px;color:#8390a3">Chưa có mẫu đã lưu.</div>';
    return;
  }

  names.forEach((name) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '8px';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';

    const title = document.createElement('b');
    title.style.fontSize = '11px';
    title.textContent = name;

    const actions = document.createElement('div');
    const use = document.createElement('button');
    const del = document.createElement('button');
    use.className = 'btn primary';
    del.className = 'btn danger';
    use.textContent = 'Dùng';
    del.textContent = 'Xóa';

    use.addEventListener('click', () => {
      const activeLogo = state.logo;
      state = merge(createPresetState(presets[name]));
      state.logo = activeLogo;
      const persisted = save();
      syncInputs();
      resetCollapsedProductsForState();
      renderEditorProducts();
      render();
      toast(persisted ? 'Đã nạp mẫu' : 'Đã nạp mẫu tạm thời; chưa autosave được');
    });

    del.addEventListener('click', () => {
      const nextPresets = Object.assign({}, presets);
      delete nextPresets[name];
      if (!safeStore(PRESETS, JSON.stringify(nextPresets))) return;
      renderPresets();
      toast('Đã xóa mẫu');
    });

    actions.append(use, del);
    row.append(title, actions);
    card.appendChild(row);
    box.appendChild(card);
  });
}


function updateLayoutSelection() {
  const badge = document.getElementById('layoutSelection');
  if (!badge) return;
  badge.hidden = !layoutEditEnabled;
  if (!layoutEditEnabled) return;
  const selected = selectedLayoutKey
    ? document.querySelector('[data-layout-block="' + selectedLayoutKey + '"]')
    : null;
  if (!selected) {
    badge.textContent = 'Chọn khối để kéo';
    return;
  }
  const offset = layoutOffset(selectedLayoutKey);
  badge.textContent = (selected.dataset.layoutLabel || selectedLayoutKey) +
    ' · X ' + offset.x.toFixed(1) + ' / Y ' + offset.y.toFixed(1) + ' mm';
}

function selectLayoutBlock(key) {
  selectedLayoutKey = LAYOUT_BLOCK_KEYS.includes(key) ? key : '';
  document.querySelectorAll('[data-layout-block]').forEach((element) => {
    element.classList.toggle('layout-selected', element.dataset.layoutBlock === selectedLayoutKey);
  });
  updateLayoutSelection();
}

function syncLayoutEditModeUI() {
  const paper = document.getElementById('paper');
  paper?.classList.toggle('layout-edit-mode', layoutEditEnabled);
  const button = document.getElementById('layoutEditToggle');
  if (button) {
    button.classList.toggle('active-arrange', layoutEditEnabled);
    button.setAttribute('aria-pressed', layoutEditEnabled ? 'true' : 'false');
    button.innerHTML = layoutEditEnabled ? '✓&nbsp; Xong sắp xếp' : '✥&nbsp; Sắp xếp';
  }
  document.getElementById('autoArrangeLayoutToolbar')?.toggleAttribute('hidden', !layoutEditEnabled);
  document.getElementById('layoutSelection')?.toggleAttribute('hidden', !layoutEditEnabled);
}

function setLayoutEditMode(enabled) {
  const next = Boolean(enabled);
  if (layoutEditEnabled === next) {
    syncLayoutEditModeUI();
    return;
  }
  layoutEditEnabled = next;
  if (!layoutEditEnabled) {
    if (layoutDrag) {
      document.querySelector('[data-layout-block="' + layoutDrag.key + '"]')?.classList.remove('layout-dragging');
      layoutDrag = null;
    }
    selectLayoutBlock('');
  }
  syncLayoutEditModeUI();
  if (layoutEditEnabled) updateLayoutSelection();
}

function autoArrangePreview() {
  const namedProducts = (Array.isArray(state.products) ? state.products : [])
    .filter((product) => String(product?.name || '').trim());
  const textWeight = [
    state.companyName,state.companyAddressDetail,state.companyProvince,state.companyWard,state.branchKhanhHoa,state.branchDongNai,state.farmAddress,
    state.intro,state.termsText,state.footerText
  ].map((value) => String(value || '')).join(' ').length;
  const dense = namedProducts.length >= 26 || textWeight >= 1150;
  const medium = namedProducts.length >= 14 || textWeight >= 700;

  state.layoutOffsets = {};
  state.logoOffsetX = 0;
  state.logoOffsetY = 0;
  state.previewTitleAlign = 'center';
  state.previewHeaderGap = dense ? 2.5 : medium ? 3 : 4;
  state.previewSpacing = dense ? 'compact' : 'standard';
  state.previewTableDensity = dense ? 'compact' : medium ? 'standard' : 'comfortable';
  state.previewLineHeight = dense ? 1.18 : medium ? 1.23 : 1.26;
  state.previewTitleSize = 27;
  if (state.showPack && namedProducts.every(product => !String(product.pack || '').trim())) state.showPack = false;
  if (state.showNote && namedProducts.every(product => !String(product.note || '').trim())) state.showNote = false;

  const persisted = save();
  syncInputs();
  render();
  setLayoutEditMode(true);
  selectLayoutBlock('');
  const message = dense ? 'Đã tự sắp xếp theo bố cục gọn nhiều nội dung' : 'Đã tự sắp xếp theo bố cục A4 cân đối';
  toast(persisted ? message : message + ' — chưa autosave được');
}

function nudgeSelectedLayout(dx, dy) {
  if (!selectedLayoutKey) return;
  const current = layoutOffset(selectedLayoutKey);
  setLayoutOffset(selectedLayoutKey, current.x + dx, current.y + dy);
  applyLayoutOffsets();
  save();
  updateLayoutSelection();
}

function setupLayoutEditor() {
  const paper = document.getElementById('paper');
  if (!paper) return;

  document.getElementById('layoutEditToggle')?.addEventListener('click', () => {
    if (layoutEditEnabled) {
      setLayoutEditMode(false);
      toast('Đã hoàn tất sắp xếp');
    } else {
      setLayoutEditMode(true);
      toast('Chế độ sắp xếp đang bật — kéo nhiều lần, bấm Xong khi hoàn tất');
    }
  });

  ['autoArrangeLayoutToolbar','autoArrangeLayoutPanel'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => {
      pushQuoteUndoSnapshot();
      autoArrangePreview();
    });
  });

  document.getElementById('resetBlockPositions')?.addEventListener('click', () => {
    pushQuoteUndoSnapshot();
    state.layoutOffsets = {};
    applyLayoutOffsets();
    const persisted = save();
    selectLayoutBlock('');
    toast(persisted ? 'Đã đưa các khối về vị trí chuẩn' : 'Đã đặt lại vị trí tạm thời; chưa autosave được');
  });

  const resizeLogo = (delta) => {
    pushQuoteUndoSnapshot();
    state.logoWidth = Math.min(90, Math.max(18, Number(state.logoWidth || 58) + delta));
    save();
    syncInputs();
    renderLogo();
    applyLayoutOffsets();
  };
  document.getElementById('logoShrink')?.addEventListener('click', () => resizeLogo(-2));
  document.getElementById('logoGrow')?.addEventListener('click', () => resizeLogo(2));

  paper.addEventListener('pointerdown', (event) => {
    if (!layoutEditEnabled) return;
    const block = event.target.closest?.('[data-layout-block]');
    if (!block || !paper.contains(block)) return;
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const key = block.dataset.layoutBlock;
    const current = layoutOffset(key);
    selectLayoutBlock(key);
    layoutDrag = {
      key,
      undoSnapshot: quoteSnapshotString(),
      pointerId: event.pointerId,
      element: block,
      startX: event.clientX,
      startY: event.clientY,
      baseX: current.x,
      baseY: current.y
    };
    try {
      if (event.pointerId != null && block.setPointerCapture) block.setPointerCapture(event.pointerId);
    } catch {}
    block.classList.add('layout-dragging');
  });

  document.addEventListener('pointermove', (event) => {
    if (!layoutDrag || !layoutEditEnabled) return;
    if (layoutDrag.pointerId != null && event.pointerId != null && layoutDrag.pointerId !== event.pointerId) return;
    const paperRect = paper.getBoundingClientRect();
    const fallbackScale = Math.max(0.01, Number(zoom || 100) / 100);
    const scale = paper.offsetWidth && paperRect.width
      ? Math.max(0.01, paperRect.width / paper.offsetWidth)
      : fallbackScale;
    const dx = (event.clientX - layoutDrag.startX) / scale / PX_PER_MM;
    const dy = (event.clientY - layoutDrag.startY) / scale / PX_PER_MM;
    const snap = (value) => Math.round(value * 2) / 2;
    setLayoutOffset(layoutDrag.key, snap(layoutDrag.baseX + dx), snap(layoutDrag.baseY + dy));
    applyLayoutOffsets();
    updateLayoutSelection();
  });

  const finishDrag = (event) => {
    if (!layoutDrag) return;
    if (layoutDrag.pointerId != null && event?.pointerId != null && layoutDrag.pointerId !== event.pointerId) return;
    const active = layoutDrag;
    active.element?.classList.remove('layout-dragging');
    try {
      if (active.pointerId != null && active.element?.hasPointerCapture?.(active.pointerId)) {
        active.element.releasePointerCapture(active.pointerId);
      }
    } catch {}
    layoutDrag = null;
    save();
    if (active.undoSnapshot && active.undoSnapshot !== quoteSnapshotString()) pushQuoteUndoSnapshot(active.undoSnapshot);
    syncLayoutEditModeUI();
    updateLayoutSelection();
  };
  document.addEventListener('pointerup', finishDrag);
  document.addEventListener('pointercancel', finishDrag);

  document.addEventListener('keydown', (event) => {
    if (!layoutEditEnabled || !selectedLayoutKey) return;
    if (event.target?.closest?.('input,textarea,select,button,[contenteditable="true"]')) return;
    const step = event.shiftKey ? 2 : 0.5;
    const deltas = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step]
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    nudgeSelectedLayout(delta[0], delta[1]);
  });
}

$$('.clickable').forEach((el) => {
  el.addEventListener('click', (event) => {
    if (layoutEditEnabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const target = document.getElementById(el.dataset.target);
    if (!target) return;
    const pane = target.closest('.pane');
    if (pane) openTab(pane.id.replace('pane-', ''));
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus();
    }, 80);
  });
});

let zoom = 82;
setupLayoutEditor();
setupSmartImport();

function resetReportViewScale() {
  const wrap = document.getElementById('paperWrap');
  const paper = document.getElementById('paper');
  if (!wrap || !paper) return;
  paper.style.removeProperty('transform');
  paper.style.removeProperty('transform-origin');
  wrap.style.removeProperty('height');
  wrap.style.width = '210mm';
  wrap.style.minHeight = '297mm';
}

function fitReportView() {
  const shell = document.querySelector('.shell');
  if (!shell?.classList.contains('report-view')) return;
  const preview = document.querySelector('.preview');
  const wrap = document.getElementById('paperWrap');
  const paper = document.getElementById('paper');
  if (!preview || !wrap || !paper) return;

  wrap.style.transform = 'none';
  wrap.style.marginBottom = '0';
  paper.style.removeProperty('transform');
  const available = Math.max(280, preview.clientWidth - 20);
  const paperWidth = paper.offsetWidth || (210 / 25.4) * 96;
  const scale = Math.min(1, available / paperWidth);
  const paperHeight = Math.max(paper.scrollHeight, paper.offsetHeight);

  wrap.style.width = Math.ceil(paperWidth * scale) + 'px';
  wrap.style.height = Math.ceil(paperHeight * scale) + 'px';
  wrap.style.minHeight = '0';
  paper.style.transformOrigin = 'top left';
  paper.style.transform = 'scale(' + scale + ')';
  zoom = Math.round(scale * 100);
  document.getElementById('zoomText').textContent = zoom + '%';
}

function setReportViewMode(enabled) {
  const shell = document.querySelector('.shell');
  if (!shell) return;
  shell.classList.toggle('report-view', Boolean(enabled));
  document.body.classList.toggle('report-view-active', Boolean(enabled));
  const exit = document.getElementById('exitReportView');
  if (exit) exit.hidden = !enabled;
  if (enabled) {
    setPreviewCustomizer(false);
    setLayoutEditMode(false);
    requestAnimationFrame(fitReportView);
  } else {
    resetReportViewScale();
    if (!shell.classList.contains('app-workspace')) {
      requestAnimationFrame(() => document.getElementById('fit')?.click());
    }
  }
}

function setZoom(value) {
  if (document.querySelector('.shell')?.classList.contains('report-view')) {
    fitReportView();
    return;
  }
  resetReportViewScale();
  zoom = Math.max(50, Math.min(120, value));
  document.getElementById('paperWrap').style.transform = 'scale(' + (zoom / 100) + ')';
  document.getElementById('zoomText').textContent = zoom + '%';
  document.getElementById('paperWrap').style.marginBottom =
    (((zoom / 100) - 1) * document.getElementById('paper').offsetHeight) + 'px';
  updatePageEstimate();
}

document.getElementById('exitReportView')?.addEventListener('click', () => openTab('general'));
document.getElementById('actual').addEventListener('click', () => setZoom(100));
document.getElementById('fit').addEventListener('click', () => {
  const available = document.querySelector('.preview').clientWidth - 34;
  const width = document.getElementById('paper').offsetWidth;
  setZoom(Math.floor((available / width) * 100));
});
document.getElementById('zoomOut').addEventListener('click', () => setZoom(zoom - 10));
document.getElementById('zoomIn').addEventListener('click', () => setZoom(zoom + 10));
document.getElementById('wideView').addEventListener('click', () => {
  const shell = document.querySelector('.shell');
  const enabled = shell.classList.toggle('wide-preview');
  document.getElementById('wideView').innerHTML = enabled ? '⛶&nbsp; Thu gọn' : '⛶&nbsp; Màn hình rộng';
  requestAnimationFrame(() => document.getElementById('fit').click());
});
document.getElementById('toolbarMenu').addEventListener('click', () => {
  openTab('export');
  toast('Đã mở công cụ Xuất / Nhập / In');
});

function setPreviewCustomizer(open) {
  const panel = document.getElementById('previewCustomizer');
  if (!panel) return;
  panel.classList.toggle('open', open);
  panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.getElementById('customizePreview')?.classList.toggle('active-customize', open);
}

document.getElementById('customizePreview').addEventListener('click', () => {
  const panel = document.getElementById('previewCustomizer');
  setPreviewCustomizer(!panel.classList.contains('open'));
});

document.getElementById('closePreviewCustomizer').addEventListener('click', () => setPreviewCustomizer(false));

$$('[data-title-align]').forEach((button) => {
  button.addEventListener('click', () => {
    state.previewTitleAlign = button.dataset.titleAlign;
    save();
    render();
  });
});

document.getElementById('resetPreviewLayout').addEventListener('click', () => {
  state.previewTitleAlign = 'center';
  state.previewTitleSize = 25;
  state.previewSpacing = 'standard';
  state.previewTableDensity = 'standard';
  state.previewHeaderGap = 4;
  state.previewMetaWidth = 44;
  state.previewLineHeight = 1.26;
  state.showQuoteMeta = false;
  state.layoutOffsets = {};
  const persisted = save();
  syncInputs();
  render();
  toast(persisted ? 'Đã khôi phục bố cục chuẩn hiện đại' : 'Đã khôi phục bố cục tạm thời; chưa autosave được');
});

function compactLegacyBrandAssets() {
  const activeLogo = String(state.logo || '');
  if (!activeLogo) return;

  const history = getHistory();
  let historyChanged = false;
  history.forEach((record) => {
    if (record?.data?.logo && record.data.logo === activeLogo) {
      record.data.logo = '';
      historyChanged = true;
    }
  });
  if (historyChanged) setHistory(history);

  const presets = getPresets();
  let presetsChanged = false;
  Object.keys(presets).forEach((name) => {
    if (presets[name]?.logo && presets[name].logo === activeLogo) {
      presets[name].logo = '';
      presetsChanged = true;
    }
  });
  if (presetsChanged) safeStore(PRESETS, JSON.stringify(presets));
}

compactLegacyBrandAssets();
applyAppPreferences();
const initialAppPage = getAppPreferences().startPage;
openTab(initialAppPage);
if (initialAppPage === 'dashboard') renderDashboard();

setTimeout(() => {
  if (!document.querySelector('.shell')?.classList.contains('app-workspace')) {
    document.getElementById('fit')?.click();
  }
}, 60);
window.addEventListener('resize', () => {
  if (document.querySelector('.shell')?.classList.contains('report-view')) {
    requestAnimationFrame(fitReportView);
  } else if (window.innerWidth > 1050) {
    document.getElementById('fit').click();
  }
  requestAnimationFrame(updatePageEstimate);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!document.getElementById('mobileMoreMenu')?.hidden) {
    setMobileMoreMenu(false, { restoreFocus: true });
    return;
  }
  if (!document.getElementById('smartImportModal')?.hidden) {
    if (!smartImportBusy) closeSmartImport();
    return;
  }
  if (layoutEditEnabled) {
    if (layoutDrag) {
      layoutDrag.element?.classList.remove('layout-dragging');
      layoutDrag = null;
    }
    selectLayoutBlock('');
    syncLayoutEditModeUI();
  }
  setPreviewCustomizer(false);
  document.getElementById('designPanel')?.classList.remove('open');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
