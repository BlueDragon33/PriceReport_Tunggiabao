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
import { parseCustomerSpreadsheetRows, parseHandwritingText, parseMappedSpreadsheetRows, parsePastedTable, parseSpreadsheetRows, mergeImportDraft } from './importers.js';
import { csvFromRows, productRowsForExport as buildProductExportRows, quotationWorkbookModel } from './exporters.js';
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
const RECOVERY_STORAGE = 'tunggiabao-price-report-recovery-v1';
const DATA_LIBRARY_IMPORT_RECOVERY = 'tunggiabao-price-report-data-library-import-recovery-v1';
const DATA_LIBRARY_IMPORT_RECOVERY_MAX_CHARS = 1000000;
const DATA_LIBRARY_IMPORT_RECOVERY_TTL_MS = 6 * 60 * 60 * 1000;
const DATA_LIBRARY_OPERATION_HISTORY_LIMIT = 8;

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
  if (!['modern','corporate','minimal','classic','emerald','warm','premium','mono','canva-blue','mint-finance','warm-proposal','violet-studio','reference-blue-corporate','blue-sidebar','executive-navy','sky-minimal'].includes(merged.theme)) merged.theme = 'modern';
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
    else if (merged.docFont === 'Times New Roman' && ['corporate','minimal','premium','mono','canva-blue','mint-finance','warm-proposal','violet-studio','reference-blue-corporate','blue-sidebar','executive-navy','sky-minimal'].includes(merged.theme)) merged.docFont = 'Arial';
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

function updateAutosaveIndicator(mode, timestamp = Date.now()) {
  const el = document.getElementById('studioAutosaveState');
  if (!el) return;
  el.dataset.state = mode;
  if (mode === 'saving') {
    el.textContent = '● Đang lưu...';
  } else if (mode === 'saved') {
    const time = new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    el.textContent = '✓ Đã lưu lúc ' + time;
  } else if (mode === 'error') {
    el.textContent = '⚠ Không thể lưu';
  } else {
    el.textContent = 'Đã nạp bản lưu';
  }
}

function writeRecoverySnapshot() {
  try {
    sessionStorage.setItem(RECOVERY_STORAGE, JSON.stringify({
      savedAt: Date.now(),
      data: stateForStorage()
    }));
    return true;
  } catch (error) {
    console.warn('Draft recovery snapshot could not be stored.', error);
    return false;
  }
}

function clearRecoverySnapshot() {
  try {
    sessionStorage.removeItem(RECOVERY_STORAGE);
  } catch (error) {
    console.warn('Draft recovery snapshot could not be cleared.', error);
  }
}

function readRecoverySnapshot() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(RECOVERY_STORAGE) || 'null');
    if (!parsed || !isPlainObject(parsed.data)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save() {
  updateAutosaveIndicator('saving');
  writeRecoverySnapshot();
  const persisted = safeStore(STORAGE, JSON.stringify(stateForStorage()));
  if (persisted) {
    clearRecoverySnapshot();
    updateAutosaveIndicator('saved');
  } else {
    updateAutosaveIndicator('error');
  }
  return persisted;
}

function offerDraftRecovery() {
  const banner = document.getElementById('draftRecoveryBanner');
  const detail = document.getElementById('draftRecoveryDetail');
  const snapshot = readRecoverySnapshot();
  if (!banner || !snapshot) return false;

  const stored = JSON.stringify(stateForStorage());
  const recovery = JSON.stringify(snapshot.data);
  if (stored === recovery) {
    clearRecoverySnapshot();
    return false;
  }

  const time = new Date(Number(snapshot.savedAt || Date.now())).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  if (detail) detail.textContent = 'Bản khôi phục gần nhất lúc ' + time + ' chưa được ghi hoàn chỉnh vào bộ nhớ chính.';
  banner.hidden = false;

  document.getElementById('restoreDraftRecovery')?.addEventListener('click', () => {
    state = merge(snapshot.data);
    const persisted = save();
    syncInputs();
    resetCollapsedProductsForState();
    selectedProductRows.clear();
    renderEditorProducts();
    render();
    banner.hidden = true;
    toast(persisted ? 'Đã khôi phục bản đang soạn' : 'Đã khôi phục tạm thời; bộ nhớ chính vẫn chưa ghi được');
  }, { once: true });

  document.getElementById('discardDraftRecovery')?.addEventListener('click', () => {
    clearRecoverySnapshot();
    banner.hidden = true;
    updateAutosaveIndicator('idle');
  }, { once: true });
  return true;
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

const THEME_LABELS = {
  modern: 'Chuẩn công ty',
  corporate: 'Doanh nghiệp',
  minimal: 'Tối giản',
  classic: 'Trang trọng',
  emerald: 'Xanh thương hiệu',
  warm: 'Ấm nhẹ',
  premium: 'Cao cấp sáng',
  mono: 'Đen trắng',
  'canva-blue': 'Business Wave',
  'mint-finance': 'Mint Finance',
  'warm-proposal': 'Warm Proposal',
  'violet-studio': 'Violet Studio',
  'reference-blue-corporate': 'Corporate Blue Reference',
  'blue-sidebar': 'Blue Sidebar',
  'executive-navy': 'Executive Navy',
  'sky-minimal': 'Sky Minimal'
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

function updateStudioStepHealth() {
  const result = validateQuote();
  const issues = [
    ...result.errors.map(message => ({ tone: 'error', message })),
    ...result.warnings.map(message => ({ tone: 'warn', message }))
  ];

  const stageTone = new Map();
  issues.forEach((issue) => {
    const target = validationTargetForMessage(issue.message);
    const stage = STUDIO_STAGE_BY_TAB[target?.tab] || target?.tab || 'general';
    const current = stageTone.get(stage);
    if (issue.tone === 'error' || current !== 'error') stageTone.set(stage, issue.tone);
  });

  document.querySelectorAll('[data-studio-step]').forEach((button) => {
    const stage = button.dataset.studioStep;
    let tone = stageTone.get(stage) || 'ready';
    if (stage === 'export') {
      tone = result.errors.length ? 'error' : result.warnings.length ? 'warn' : 'ready';
    }
    button.classList.remove('step-ready', 'step-warn', 'step-error');
    button.classList.add('step-' + tone);
    const label = STUDIO_WORKFLOW.find(item => item.tab === stage)?.label || stage;
    const status = tone === 'error' ? 'có lỗi cần sửa' : tone === 'warn' ? 'có mục cần kiểm tra' : 'sẵn sàng';
    button.title = label + ' · ' + status;
    button.dataset.health = tone;
  });
}

const WORKSPACE_SHELL_META = {
  dashboard: ['Trang chủ', 'Tổng quan và thao tác nhanh'],
  history: ['Quản lý báo giá', 'Tìm kiếm, mở lại và theo dõi trạng thái'],
  master: ['Khách hàng & sản phẩm', 'Danh mục dữ liệu dùng lại'],
  system: ['Thiết bị & hệ thống', 'Thiết bị, Device Gate và kết nối quản trị'],
  settings: ['Cài đặt ứng dụng', 'Khởi động, giao diện và lưu dữ liệu'],
  export: ['Xuất bản & dữ liệu', 'PDF, Excel, OCR và sao lưu']
};

function syncStudioContext(tab = '') {
  const shell = document.querySelector('.shell');
  const workspaceMode = Boolean(shell?.classList.contains('app-workspace'));
  const globalTitle = document.getElementById('studioGlobalTitle');
  const workspaceSubtitle = document.getElementById('workspaceShellSubtitle');

  document.querySelectorAll('[data-shell-quote-only]').forEach((element) => {
    element.hidden = workspaceMode;
  });
  document.querySelectorAll('[data-shell-workspace-only]').forEach((element) => {
    element.hidden = !workspaceMode;
  });

  if (workspaceMode) {
    const meta = WORKSPACE_SHELL_META[tab] || ['Tunggiabao Workspace', 'Không gian làm việc thống nhất'];
    if (globalTitle) globalTitle.textContent = meta[0];
    if (workspaceSubtitle) workspaceSubtitle.textContent = meta[1];
    return;
  }

  const quoteStatus = document.getElementById('studioQuoteStatus');
  if (quoteStatus) {
    const currentStatus = state.quoteStatus || 'draft';
    quoteStatus.textContent = statusLabel(currentStatus);
    quoteStatus.className = 'studio-status-badge status-' + currentStatus;
  }

  const globalQuoteNo = document.getElementById('studioGlobalQuoteNo');
  const globalHistoryState = document.getElementById('studioGlobalHistoryState');
  const quoteNo = String(state.quoteNo || '').trim();
  if (globalTitle) globalTitle.textContent = quoteNo ? 'Báo giá ' + quoteNo : 'Báo giá mới';
  if (globalQuoteNo) globalQuoteNo.textContent = quoteNo || '—';
  if (globalHistoryState) {
    const historyMode = currentQuoteHistoryState();
    globalHistoryState.textContent = historyMode === 'saved'
      ? 'Đã lưu lịch sử'
      : historyMode === 'dirty'
        ? 'Có thay đổi chưa lưu'
        : 'Chưa lưu lịch sử';
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

const CONTENT_BLOCK_ORDER = ['general','customer','products','payment','terms','signature','custom-text'];

const CONTENT_BLOCKS = {
  general: {
    tab: 'general',
    title: 'THÔNG TIN CHUNG',
    displayTitle: 'Thông tin chung',
    subtitle: 'Logo, doanh nghiệp, mã báo giá và ngày lập.',
    focusId: 'companyName',
    icon: '▤',
    defaultSummary: 'Doanh nghiệp, mã báo giá, ngày lập',
    selectors: ['#pane-general > [data-content-workspace-section="general"]']
  },
  customer: {
    tab: 'customer',
    title: 'KHÁCH HÀNG',
    displayTitle: 'Khách hàng',
    subtitle: 'Người nhận và đơn vị mua hàng.',
    focusId: 'customerName',
    icon: '●',
    defaultSummary: 'Người nhận và đơn vị mua hàng',
    selectors: ['#pane-customer > [data-content-workspace-section="customer"]']
  },
  products: {
    tab: 'products',
    title: 'SẢN PHẨM / DỊCH VỤ',
    displayTitle: 'Sản phẩm / Dịch vụ',
    subtitle: 'Danh sách hàng hóa, quy cách, số lượng và đơn giá.',
    focusId: 'productEditor',
    icon: '◆',
    defaultSummary: 'Danh sách, quy cách, số lượng và giá'
  },
  payment: {
    tab: 'payment',
    title: 'THANH TOÁN',
    displayTitle: 'Thanh toán',
    subtitle: 'VAT, giảm giá, tổng tiền và tài khoản.',
    focusId: 'discountPct',
    icon: '₫',
    defaultSummary: 'VAT, giảm giá, tổng tiền và tài khoản',
    selectors: ['#pane-payment > [data-content-workspace-section="payment"]']
  },
  terms: {
    tab: 'terms',
    title: 'ĐIỀU KHOẢN',
    displayTitle: 'Điều khoản',
    subtitle: 'Nội dung thương mại và chính sách áp dụng.',
    focusId: 'termsTitle',
    icon: '≡',
    defaultSummary: 'Chính sách và nội dung thương mại',
    selectors: ['#pane-terms > [data-content-workspace-section="terms"]']
  },
  signature: {
    tab: 'terms',
    title: 'CHỮ KÝ',
    displayTitle: 'Chữ ký',
    subtitle: 'Ngày tháng, chức danh, ghi chú và người ký.',
    focusId: 'dateLine',
    icon: '✎',
    defaultSummary: 'Ngày tháng, chức danh và người ký',
    selectors: ['#pane-terms > [data-content-workspace-section="signature"]']
  },
  'custom-text': {
    tab: 'general',
    title: 'VĂN BẢN TÙY CHỈNH',
    displayTitle: 'Văn bản tùy chỉnh',
    subtitle: 'Lời mở đầu, lời kết và chân trang.',
    focusId: 'intro',
    icon: 'T',
    defaultSummary: 'Lời mở đầu, lời kết và chân trang',
    selectors: [
      '[data-custom-text-source="intro"]',
      '[data-custom-text-source="closing"]',
      '[data-custom-text-source="footer"]'
    ]
  }
};

const CUSTOM_TEXT_SECTION_META = {
  intro: ['Lời mở đầu', 'Nội dung giới thiệu xuất hiện trước bảng sản phẩm.'],
  closing: ['Lời kết', 'Thông điệp kết thúc phần điều khoản thương mại.'],
  footer: ['Chân trang', 'Thông tin ngắn ở cuối mỗi bản báo giá.']
};

const CONTENT_WORKSPACE_WIDTHS = [1040, 1200, 1360, 1480];
const DEFAULT_CONTENT_WORKSPACE_WIDTH = 1200;

let activeContentBlock = '';
let contentWorkspaceLastFocus = null;
let contentWorkspaceMounted = [];

function setActiveContentBlock(block = '') {
  activeContentBlock = CONTENT_BLOCKS[block] ? block : '';
  document.querySelectorAll('[data-content-block]').forEach((button) => {
    button.classList.toggle('active', Boolean(activeContentBlock) && button.dataset.contentBlock === activeContentBlock);
  });
}

function setContentLibraryMode(mode, block = '') {
  const editor = document.querySelector('.content-library');
  if (!editor) return;
  const next = mode === 'detail' ? 'detail' : 'home';
  editor.dataset.contentMode = next;
  setActiveContentBlock(next === 'detail' ? block : '');
  const detailHead = document.getElementById('contentLibraryDetailHead');
  if (detailHead) detailHead.hidden = next !== 'detail';
}

function showContentLibraryHome({ focusSearch = false } = {}) {
  setContentLibraryMode('home');
  if (focusSearch) {
    requestAnimationFrame(() => document.getElementById('contentLibrarySearch')?.focus());
  }
}

function contentBlockStatus(block) {
  const clean = (value) => String(value || '').trim();
  const namedProducts = (Array.isArray(state?.products) ? state.products : []).filter(product => clean(product?.name));
  const termCount = clean(state?.termsText).split(/\n+/).map(line => line.trim()).filter(Boolean).length;

  if (block === 'general') {
    const company = clean(state?.companyName);
    const quoteNo = clean(state?.quoteNo);
    const quoteDate = clean(state?.quoteDate);
    const filled = [company, quoteNo, quoteDate].filter(Boolean).length;
    return {
      state: filled === 3 ? 'complete' : filled ? 'partial' : 'empty',
      complete: filled === 3,
      summary: company && quoteNo ? company + ' · ' + quoteNo : quoteNo || company || CONTENT_BLOCKS.general.defaultSummary
    };
  }
  if (block === 'customer') {
    const primary = clean(state?.customerCompany) || clean(state?.customerName);
    const contact = clean(state?.customerContact) || clean(state?.customerPhone);
    const any = [primary, contact, clean(state?.customerAddress), clean(state?.customerEmail)].some(Boolean);
    return {
      state: primary ? 'complete' : any ? 'partial' : 'empty',
      complete: Boolean(primary),
      summary: primary ? primary + (contact ? ' · ' + contact : '') : CONTENT_BLOCKS.customer.defaultSummary
    };
  }
  if (block === 'products') {
    return {
      state: namedProducts.length ? 'complete' : 'empty',
      complete: namedProducts.length > 0,
      summary: namedProducts.length ? namedProducts.length + ' sản phẩm / dịch vụ có dữ liệu' : CONTENT_BLOCKS.products.defaultSummary
    };
  }
  if (block === 'payment') {
    const payment = clean(state?.paymentMethod);
    const bank = clean(state?.bankName) || clean(state?.bankAccount);
    const configured = Boolean(state?.showTotals || state?.showPaymentBlock || payment || bank || Number(state?.vatPct) || Number(state?.discountPct) || Number(state?.otherFee));
    const details = [];
    if (Number(state?.vatPct)) details.push('VAT ' + Number(state.vatPct) + '%');
    if (Number(state?.discountPct)) details.push('Giảm ' + Number(state.discountPct) + '%');
    if (payment) details.push(payment);
    return {
      state: configured ? 'complete' : 'empty',
      complete: configured,
      summary: details.slice(0, 2).join(' · ') || (configured ? (clean(state?.currency) || 'Đã thiết lập') : CONTENT_BLOCKS.payment.defaultSummary)
    };
  }
  if (block === 'terms') {
    return {
      state: termCount ? 'complete' : 'empty',
      complete: termCount > 0,
      summary: termCount ? termCount + ' điều khoản thương mại' : CONTENT_BLOCKS.terms.defaultSummary
    };
  }
  if (block === 'signature') {
    const date = clean(state?.dateLine);
    const signer = clean(state?.rightName) || clean(state?.rightTitle) || clean(state?.leftName) || clean(state?.leftTitle);
    const any = Boolean(date || signer);
    return {
      state: date && signer ? 'complete' : any ? 'partial' : 'empty',
      complete: Boolean(date && signer),
      summary: signer ? signer + (date ? ' · Đã có ngày ký' : '') : CONTENT_BLOCKS.signature.defaultSummary
    };
  }
  if (block === 'custom-text') {
    const values = [clean(state?.intro), clean(state?.closingText), clean(state?.footerText)];
    const count = values.filter(Boolean).length;
    return {
      state: count >= 2 ? 'complete' : count ? 'partial' : 'empty',
      complete: count >= 2,
      summary: count ? count + '/3 vùng văn bản đã có nội dung' : CONTENT_BLOCKS['custom-text'].defaultSummary
    };
  }
  return { state: 'empty', complete: false, summary: CONTENT_BLOCKS[block]?.defaultSummary || '' };
}

function renderContentBlockSummaries() {
  let completed = 0;
  const incomplete = [];

  CONTENT_BLOCK_ORDER.forEach((block) => {
    const status = contentBlockStatus(block);
    if (status.complete) completed += 1;
    else incomplete.push(CONTENT_BLOCKS[block]?.displayTitle || block);

    const button = document.querySelector('#contentBlockList [data-content-block="' + block + '"]');
    if (!button) return;
    const summary = button.querySelector('small');
    const marker = button.querySelector('em');
    if (summary) summary.textContent = status.summary;
    button.dataset.contentState = status.state;
    button.classList.toggle('is-complete', status.state === 'complete');
    button.classList.toggle('is-partial', status.state === 'partial');
    if (marker) marker.textContent = status.state === 'complete' ? '✓' : status.state === 'partial' ? '•' : '›';
  });

  setText('contentCompletionLabel', completed + '/7 khối');
  const bar = document.getElementById('contentCompletionBar');
  if (bar) bar.style.width = Math.round((completed / CONTENT_BLOCK_ORDER.length) * 100) + '%';
  const hint = document.getElementById('contentCompletionHint');
  if (hint) {
    hint.textContent = incomplete.length
      ? 'Tiếp theo: ' + incomplete.slice(0, 2).join(' · ')
      : 'Nội dung chính đã hoàn thiện; có thể kiểm tra và xuất PDF.';
  }
}

function normalizedContentWorkspaceWidth(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_CONTENT_WORKSPACE_WIDTH;
  return CONTENT_WORKSPACE_WIDTHS.reduce((closest, candidate) =>
    Math.abs(candidate - numeric) < Math.abs(closest - numeric) ? candidate : closest
  , DEFAULT_CONTENT_WORKSPACE_WIDTH);
}

function currentContentWorkspaceWidth() {
  const ui = getUiState();
  return normalizedContentWorkspaceWidth(ui.contentWorkspaceWidth);
}

function applyContentWorkspaceWidth(width, { persist = false } = {}) {
  const next = normalizedContentWorkspaceWidth(width);
  const dialog = document.getElementById('contentWorkspaceDialog');
  if (dialog) dialog.style.setProperty('--content-workspace-width', next + 'px');
  setText('contentWorkspaceWidthLabel', next + ' px');
  if (persist) {
    const ui = getUiState();
    ui.contentWorkspaceWidth = next;
    saveUiState(ui);
  }
  return next;
}

function stepContentWorkspaceWidth(direction) {
  const current = currentContentWorkspaceWidth();
  const index = Math.max(0, CONTENT_WORKSPACE_WIDTHS.indexOf(current));
  const nextIndex = Math.max(0, Math.min(CONTENT_WORKSPACE_WIDTHS.length - 1, index + direction));
  return applyContentWorkspaceWidth(CONTENT_WORKSPACE_WIDTHS[nextIndex], { persist: true });
}

function contentWorkspaceFocusable() {
  const modal = document.getElementById('contentWorkspaceModal');
  if (!modal || modal.hidden) return [];
  return Array.from(modal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true' && getComputedStyle(element).display !== 'none');
}

function restoreContentWorkspaceNodes() {
  for (let index = contentWorkspaceMounted.length - 1; index >= 0; index -= 1) {
    const item = contentWorkspaceMounted[index];
    if (item.placeholder?.parentNode) item.placeholder.parentNode.insertBefore(item.node, item.placeholder);
    item.placeholder?.remove?.();
    if (item.wasCollapsed) item.node.classList?.add?.('card-collapsed');
    item.node.removeAttribute?.('data-workspace-mounted');
  }
  contentWorkspaceMounted = [];
  const mount = document.getElementById('contentWorkspaceMount');
  if (mount) mount.innerHTML = '';
}

function mountContentWorkspaceNodes(block) {
  const mount = document.getElementById('contentWorkspaceMount');
  const config = CONTENT_BLOCKS[block];
  if (!mount || !config?.selectors) return 0;
  mount.innerHTML = '';

  let mounted = 0;
  config.selectors.forEach((selector) => {
    Array.from(document.querySelectorAll(selector)).forEach((node) => {
      const parent = node.parentNode;
      if (!parent || node.closest('#contentWorkspaceModal')) return;
      const placeholder = document.createComment('content-workspace:' + block);
      parent.insertBefore(placeholder, node);
      const wasCollapsed = Boolean(node.classList?.contains?.('card-collapsed'));
      if (wasCollapsed) node.classList.remove('card-collapsed');
      node.setAttribute?.('data-workspace-mounted', 'true');
      contentWorkspaceMounted.push({ node, placeholder, wasCollapsed });

      if (block === 'custom-text') {
        const key = node.dataset.customTextSource || '';
        const meta = CUSTOM_TEXT_SECTION_META[key] || ['Văn bản', 'Nội dung tùy chỉnh của báo giá.'];
        const section = document.createElement('section');
        section.className = 'content-workspace-custom-section';
        const title = document.createElement('h3');
        title.textContent = meta[0];
        const help = document.createElement('p');
        help.textContent = meta[1];
        section.append(title, help, node);
        mount.appendChild(section);
      } else {
        mount.appendChild(node);
      }
      mounted += 1;
    });
  });
  return mounted;
}


const CONTENT_WORKSPACE_GUIDES = {
  general: {
    title: 'Hoàn tất phần nhận diện và số báo giá',
    detail: 'Dùng thao tác nhanh cho ngày lập, mã báo giá và metadata A4 mà không rời vùng nhập.'
  },
  customer: {
    title: 'Tái sử dụng khách hàng đã lưu',
    detail: 'Tìm theo tên, công ty hoặc SĐT; nạp trực tiếp vào báo giá hiện tại hoặc lưu khách đang nhập vào danh bạ.'
  },
  payment: {
    title: 'Thiết lập tiền và thanh toán nhanh',
    detail: 'Áp VAT, giảm giá, phương thức thanh toán và bật các khối tổng tiền bằng một lần bấm.'
  },
  terms: {
    title: 'Soạn điều khoản theo các mảnh chuẩn',
    detail: 'Chèn các điều khoản thường dùng mà không ghi đè những dòng đã có.'
  },
  signature: {
    title: 'Chuẩn hóa phần ký',
    detail: 'Điền dòng ngày tháng và bố cục ký hai bên, đồng thời giữ nguyên họ tên đã nhập.'
  },
  'custom-text': {
    title: 'Điền nhanh văn bản mẫu',
    detail: 'Có thể dùng lại lời mở đầu, lời kết hoặc chân trang chuẩn rồi tiếp tục chỉnh tay.'
  }
};

function applyContentWorkspacePatch(patch, notice = '') {
  Object.entries(patch || {}).forEach(([key, value]) => {
    state[key] = value;
  });
  if (['companyAddressDetail','companyProvince','companyWard'].some(key => Object.prototype.hasOwnProperty.call(patch || {}, key))) {
    syncLegacyCompanyAddress();
  }
  const persisted = save();
  syncInputs();
  render();
  renderContentBlockSummaries();
  updateContentWorkspaceStatus();
  if (notice) toast(persisted ? notice : notice + ' · chưa thể ghi bộ nhớ chính');
  return persisted;
}

function workspaceToolButton(label, handler, { primary = false, className = '' } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = (className || 'content-workspace-chip') + (primary ? ' primary' : '');
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function appendWorkspaceToolGroup(container, label, actions) {
  const group = document.createElement('div');
  group.className = 'content-workspace-quick-group';
  const heading = document.createElement('span');
  heading.textContent = label;
  const row = document.createElement('div');
  row.className = 'content-workspace-chip-row';
  actions.forEach(action => {
    row.appendChild(workspaceToolButton(action.label, action.run, { primary: Boolean(action.primary) }));
  });
  group.append(heading, row);
  container.appendChild(group);
}

function appendUniqueWorkspaceTerms(lines, notice) {
  const current = String(state.termsText || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
  const seen = new Set(current.map(canonicalSearchText));
  (Array.isArray(lines) ? lines : []).forEach(line => {
    const clean = String(line || '').trim();
    const key = canonicalSearchText(clean);
    if (clean && key && !seen.has(key)) {
      current.push(clean);
      seen.add(key);
    }
  });
  applyContentWorkspacePatch({ termsText: current.join('\n'), showTerms: true }, notice);
}

function renderContentWorkspaceCustomerResults(list, query = '') {
  if (!list) return;
  list.innerHTML = '';
  const needle = canonicalSearchText(query);
  const customers = getCustomerLibrary()
    .filter(customer => {
      if (!needle) return true;
      return [customer.name, customer.company, customer.phone, customer.email, customer.contact]
        .some(value => canonicalSearchText(value).includes(needle));
    })
    .slice(0, 5);

  if (!customers.length) {
    const empty = document.createElement('div');
    empty.className = 'content-workspace-empty-note';
    empty.textContent = getCustomerLibrary().length
      ? 'Không tìm thấy khách phù hợp.'
      : 'Danh bạ chưa có khách hàng. Nhập thông tin bên trái rồi bấm “Lưu khách hiện tại”.';
    list.appendChild(empty);
    return;
  }

  customers.forEach(customer => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.workspaceAction = 'use-customer';
    const title = document.createElement('b');
    title.textContent = customer.company || customer.name || 'Khách hàng';
    const detail = document.createElement('small');
    detail.textContent = [customer.name !== title.textContent ? customer.name : '', customer.phone, customer.email]
      .filter(Boolean).join(' · ') || 'Nạp khách hàng này';
    button.append(title, detail);
    button.addEventListener('click', () => {
      useCustomer(customer, { navigate: false, focus: false, notify: false });
      updateContentWorkspaceStatus('customer');
      renderContentBlockSummaries();
      toast('Đã nạp khách hàng từ danh bạ');
    });
    list.appendChild(button);
  });
}

function renderContentWorkspaceAssist(block = activeContentBlock) {
  const guide = CONTENT_WORKSPACE_GUIDES[block] || {
    title: 'Gợi ý theo khối đang mở',
    detail: 'Các thao tác dùng trực tiếp dữ liệu báo giá hiện tại.'
  };
  setText('contentWorkspaceGuideTitle', guide.title);
  setText('contentWorkspaceGuideDetail', guide.detail);

  const tools = document.getElementById('contentWorkspaceQuickTools');
  if (!tools) return;
  tools.innerHTML = '';

  if (block === 'general') {
    appendWorkspaceToolGroup(tools, 'Báo giá', [
      { label: 'Ngày hôm nay', run: () => applyContentWorkspacePatch({ quoteDate: localDateISO() }, 'Đã cập nhật ngày lập') },
      { label: 'Tạo mã mới', run: () => applyContentWorkspacePatch({ quoteNo: generateUniqueQuoteNo() }, 'Đã tạo mã báo giá mới') }
    ]);
    const showMeta = workspaceToolButton('Hiện số / ngày trên A4', () => {
      applyContentWorkspacePatch({ showQuoteMeta: true }, 'Đã bật metadata báo giá');
    }, { primary: true, className: 'content-workspace-tool-button' });
    showMeta.dataset.workspaceAction = 'show-quote-meta';
    tools.appendChild(showMeta);
    return;
  }

  if (block === 'customer') {
    const saveCustomer = workspaceToolButton('＋ Lưu khách hiện tại vào danh bạ', () => {
      saveCurrentCustomerToLibrary();
      const list = document.getElementById('contentWorkspaceCustomerResults');
      const search = document.getElementById('contentWorkspaceCustomerSearch');
      renderContentWorkspaceCustomerResults(list, search?.value || '');
    }, { primary: true, className: 'content-workspace-tool-button' });
    saveCustomer.dataset.workspaceAction = 'save-customer';
    tools.appendChild(saveCustomer);

    const search = document.createElement('input');
    search.id = 'contentWorkspaceCustomerSearch';
    search.className = 'content-workspace-customer-search';
    search.type = 'search';
    search.autocomplete = 'off';
    search.placeholder = 'Tìm tên, công ty, SĐT…';
    search.setAttribute('aria-label', 'Tìm khách hàng đã lưu');

    const list = document.createElement('div');
    list.id = 'contentWorkspaceCustomerResults';
    list.className = 'content-workspace-customer-list';
    search.addEventListener('input', () => renderContentWorkspaceCustomerResults(list, search.value));
    tools.append(search, list);
    renderContentWorkspaceCustomerResults(list);
    return;
  }

  if (block === 'payment') {
    appendWorkspaceToolGroup(tools, 'VAT', [0, 5, 8, 10].map(value => ({
      label: value + '%',
      run: () => applyContentWorkspacePatch({ vatPct: value }, 'Đã đặt VAT ' + value + '%')
    })));
    appendWorkspaceToolGroup(tools, 'Giảm giá', [0, 5, 10].map(value => ({
      label: value + '%',
      run: () => applyContentWorkspacePatch({ discountPct: value }, 'Đã đặt giảm giá ' + value + '%')
    })));
    appendWorkspaceToolGroup(tools, 'Phương thức', [
      { label: 'Chuyển khoản', run: () => applyContentWorkspacePatch({ paymentMethod: 'Chuyển khoản' }, 'Đã chọn chuyển khoản') },
      { label: 'Tiền mặt', run: () => applyContentWorkspacePatch({ paymentMethod: 'Tiền mặt' }, 'Đã chọn tiền mặt') },
      { label: 'TM / CK', run: () => applyContentWorkspacePatch({ paymentMethod: 'Tiền mặt hoặc chuyển khoản' }, 'Đã chọn tiền mặt hoặc chuyển khoản') }
    ]);
    const showPayment = workspaceToolButton('Hiện tổng tiền + thanh toán trên A4', () => {
      applyContentWorkspacePatch({ showTotals: true, showPaymentBlock: true }, 'Đã bật khối tổng tiền và thanh toán');
    }, { primary: true, className: 'content-workspace-tool-button' });
    showPayment.dataset.workspaceAction = 'show-payment';
    tools.appendChild(showPayment);
    return;
  }

  if (block === 'terms') {
    appendWorkspaceToolGroup(tools, 'Chèn nhanh', [
      {
        label: 'Bộ chuẩn',
        run: () => appendUniqueWorkspaceTerms(String(defaults.termsText || '').split(/\n+/), 'Đã bổ sung bộ điều khoản chuẩn')
      },
      {
        label: 'Giao hàng 1–3 ngày',
        run: () => appendUniqueWorkspaceTerms(['Thời gian giao hàng: 1 - 3 ngày kể từ khi xác nhận đơn hàng.'], 'Đã bổ sung điều khoản giao hàng')
      },
      {
        label: 'Thanh toán TM / CK',
        run: () => appendUniqueWorkspaceTerms(['Phương thức thanh toán: Tiền mặt hoặc chuyển khoản.'], 'Đã bổ sung điều khoản thanh toán')
      },
      {
        label: 'Hiệu lực 7 ngày',
        run: () => appendUniqueWorkspaceTerms(['Bảng báo giá có hiệu lực trong vòng 7 ngày kể từ ngày phát hành.'], 'Đã bổ sung thời hạn hiệu lực')
      }
    ]);
    const showTerms = workspaceToolButton('Hiện điều khoản trên A4', () => {
      applyContentWorkspacePatch({ showTerms: true }, 'Đã bật khối điều khoản');
    }, { primary: true, className: 'content-workspace-tool-button' });
    showTerms.dataset.workspaceAction = 'show-terms';
    tools.appendChild(showTerms);
    return;
  }

  if (block === 'signature') {
    appendWorkspaceToolGroup(tools, 'Chữ ký', [
      {
        label: 'Dòng ngày hiện tại',
        run: () => applyContentWorkspacePatch({ dateLine: defaultSignatureDateLine(new Date()) }, 'Đã cập nhật dòng ngày tháng')
      },
      {
        label: 'Bố cục ký 2 bên',
        run: () => {
          const patch = { showSignature: true };
          if (!String(state.leftTitle || '').trim()) patch.leftTitle = defaults.leftTitle;
          if (!String(state.rightTitle || '').trim()) patch.rightTitle = defaults.rightTitle;
          if (!String(state.leftNote || '').trim()) patch.leftNote = defaults.leftNote;
          if (!String(state.rightNote || '').trim()) patch.rightNote = defaults.rightNote;
          applyContentWorkspacePatch(patch, 'Đã chuẩn hóa bố cục chữ ký');
        }
      }
    ]);
    const showSignature = workspaceToolButton('Hiện chữ ký trên A4', () => {
      applyContentWorkspacePatch({ showSignature: true }, 'Đã bật chữ ký');
    }, { primary: true, className: 'content-workspace-tool-button' });
    showSignature.dataset.workspaceAction = 'show-signature';
    tools.appendChild(showSignature);
    return;
  }

  if (block === 'custom-text') {
    appendWorkspaceToolGroup(tools, 'Văn bản mẫu', [
      { label: 'Lời mở đầu chuẩn', run: () => applyContentWorkspacePatch({ intro: defaults.intro }, 'Đã dùng lời mở đầu chuẩn') },
      { label: 'Lời kết chuẩn', run: () => applyContentWorkspacePatch({ closingText: defaults.closingText }, 'Đã dùng lời kết chuẩn') },
      { label: 'Chân trang chuẩn', run: () => applyContentWorkspacePatch({ footerText: defaults.footerText }, 'Đã dùng chân trang chuẩn') }
    ]);
  }
}

function updateContentWorkspaceStatus(block = activeContentBlock) {
  const status = contentBlockStatus(block);
  const titleMap = {
    complete: 'Khối nội dung đã sẵn sàng',
    partial: 'Còn thông tin có thể bổ sung',
    empty: 'Khối này chưa có đủ dữ liệu'
  };
  const detailMap = {
    complete: 'Dữ liệu đang dùng chung với báo giá và đã được cập nhật vào bản xem trước.',
    partial: 'Bạn có thể bổ sung thêm rồi bấm Xong; bản nháp vẫn được tự động lưu.',
    empty: 'Nhập thông tin cần thiết trong vùng làm việc lớn bên trái.'
  };
  setText('contentWorkspaceStatusTitle', titleMap[status.state] || titleMap.empty);
  setText('contentWorkspaceStatusDetail', detailMap[status.state] || detailMap.empty);
  setText('contentWorkspaceBlockState', status.state === 'complete' ? '✓ Đã đủ thông tin chính' : status.state === 'partial' ? '• Đang hoàn thiện' : '○ Chưa hoàn thiện');
  setText('contentWorkspaceFooterStatus', '✓ Tự động lưu vào bản nháp hiện tại');
}

function closeContentWorkspace({ restoreFocus = true, clearActive = true } = {}) {
  const modal = document.getElementById('contentWorkspaceModal');
  if (!modal || modal.hidden) return;
  restoreContentWorkspaceNodes();
  modal.hidden = true;
  document.body.classList.remove('content-workspace-open');
  if (clearActive) setActiveContentBlock('');
  renderContentBlockSummaries();
  if (restoreFocus) requestAnimationFrame(() => contentWorkspaceLastFocus?.focus?.());
}

function openContentWorkspace(block, { focusFirst = true } = {}) {
  const config = CONTENT_BLOCKS[block];
  const modal = document.getElementById('contentWorkspaceModal');
  const dialog = document.getElementById('contentWorkspaceDialog');
  if (!config || !modal || !dialog || block === 'products') return false;

  closeProductWorkspace({ restoreFocus: false });
  closeContentWorkspace({ restoreFocus: false, clearActive: false });
  contentWorkspaceLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  setActiveContentBlock(block);

  dialog.dataset.block = block;
  setText('contentWorkspaceIcon', config.icon);
  setText('contentWorkspaceTitle', config.displayTitle || config.title);
  setText('contentWorkspaceSubtitle', config.subtitle);
  applyContentWorkspaceWidth(currentContentWorkspaceWidth());

  const mounted = mountContentWorkspaceNodes(block);
  if (!mounted) {
    setActiveContentBlock('');
    return false;
  }

  const index = CONTENT_BLOCK_ORDER.indexOf(block);
  const prev = document.getElementById('contentWorkspacePrev');
  const next = document.getElementById('contentWorkspaceNext');
  if (prev) prev.disabled = index <= 0;
  if (next) next.disabled = index < 0 || index >= CONTENT_BLOCK_ORDER.length - 1;

  modal.hidden = false;
  document.body.classList.add('content-workspace-open');
  updateContentWorkspaceStatus(block);
  renderContentWorkspaceAssist(block);

  requestAnimationFrame(() => {
    const mount = document.getElementById('contentWorkspaceMount');
    if (mount) mount.scrollTop = 0;
    const target = focusFirst ? document.getElementById(config.focusId) : dialog;
    target?.focus?.();
  });
  return true;
}

function openContentBlock(block) {
  const config = CONTENT_BLOCKS[block];
  if (!config) return false;

  if (document.querySelector('.shell')?.classList.contains('app-workspace')) {
    openTab('general', { keepContentMode: true, keepContentWorkspace: true });
  }
  showContentLibraryHome();
  setActiveContentBlock(block);

  if (block === 'products') {
    closeContentWorkspace({ restoreFocus: false, clearActive: false });
    openProductWorkspace({ focusFirst: false });
    return true;
  }
  return openContentWorkspace(block);
}

document.getElementById('contentWorkspaceModal')?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeContentWorkspace();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    closeContentWorkspace();
    return;
  }
  if (event.key !== 'Tab') return;
  const items = contentWorkspaceFocusable();
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

document.getElementById('contentWorkspaceModal')?.addEventListener('pointerdown', (event) => {
  if (event.target === event.currentTarget) closeContentWorkspace();
});

document.getElementById('contentWorkspaceModal')?.addEventListener('input', () => {
  requestAnimationFrame(() => {
    renderContentBlockSummaries();
    updateContentWorkspaceStatus();
  });
});
document.getElementById('contentWorkspaceModal')?.addEventListener('change', () => {
  requestAnimationFrame(() => {
    renderContentBlockSummaries();
    updateContentWorkspaceStatus();
  });
});

document.getElementById('closeContentWorkspace')?.addEventListener('click', () => closeContentWorkspace());
document.getElementById('doneContentWorkspace')?.addEventListener('click', () => closeContentWorkspace());
document.getElementById('contentWorkspaceOpenPreview')?.addEventListener('click', () => openTab('view'));
document.getElementById('contentWorkspaceWidthDown')?.addEventListener('click', () => stepContentWorkspaceWidth(-1));
document.getElementById('contentWorkspaceWidthUp')?.addEventListener('click', () => stepContentWorkspaceWidth(1));
document.getElementById('contentWorkspaceWidthReset')?.addEventListener('click', () => applyContentWorkspaceWidth(DEFAULT_CONTENT_WORKSPACE_WIDTH, { persist: true }));
document.getElementById('contentWorkspacePrev')?.addEventListener('click', () => {
  const index = CONTENT_BLOCK_ORDER.indexOf(activeContentBlock);
  if (index > 0) openContentBlock(CONTENT_BLOCK_ORDER[index - 1]);
});
document.getElementById('contentWorkspaceNext')?.addEventListener('click', () => {
  const index = CONTENT_BLOCK_ORDER.indexOf(activeContentBlock);
  if (index >= 0 && index < CONTENT_BLOCK_ORDER.length - 1) {
    const persisted = save();
    if (!persisted) toast('Đã chuyển khối; bản nháp chưa thể ghi vào bộ nhớ chính');
    openContentBlock(CONTENT_BLOCK_ORDER[index + 1]);
  }
});

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

function openTab(tab, options = {}) {
  setMobileMoreMenu(false);
  if (!options.keepContentWorkspace) closeContentWorkspace({ restoreFocus: false });
  if (tab !== 'products') closeProductWorkspace({ restoreFocus: false });
  if (tab !== 'dashboard') closeDashboardSearchResults();
  const shell = document.querySelector('.shell');
  const appWorkspace = ['dashboard', 'history', 'master', 'system', 'settings', 'export'].includes(tab);

  document.querySelectorAll('.nav button[data-tab]').forEach((el) => {
    const active = el.dataset.tab === tab;
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
  const paneTitle = document.getElementById('paneTitle');
  const paneSub = document.getElementById('paneSub');
  if (paneTitle && tabMeta[tab]) paneTitle.textContent = tabMeta[tab][0];
  if (paneSub && tabMeta[tab]) paneSub.textContent = tabMeta[tab][1];

  if (appWorkspace) {
    showContentLibraryHome();
  } else if (!options.keepContentMode) {
    if (tab === 'general') showContentLibraryHome();
    else if (CONTENT_BLOCKS[tab]) setContentLibraryMode('detail', tab);
  }

  syncStudioContext(tab);
  if (tab !== 'design') document.getElementById('designPanel')?.classList.remove('open');
  if (appWorkspace) setPreviewCustomizer(false);
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'export') renderExportCenter();
  if (tab === 'system') renderSystemWorkspace();
  if (tab === 'settings') renderSettingsWorkspace();
  if (tab === 'design') {
    setDesignInspectorTab('design');
    document.getElementById('designPanel').classList.add('open');
    setMajorPanelState('design', false);
  }
  if (tab === 'presets') renderPresets();
  if (tab === 'history') renderHistory();
  if (tab === 'master') {
    renderMasterData();
    offerDataLibraryImportRecovery();
  }
  setTimeout(enhanceCollapsibleCards, 0);
}

document.querySelectorAll('.nav button[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => openTab(btn.dataset.tab));
});

document.getElementById('studioBackHome')?.addEventListener('click', () => openTab('dashboard'));
document.getElementById('contentLibraryBack')?.addEventListener('click', () => showContentLibraryHome({ focusSearch: false }));
document.querySelectorAll('[data-content-block]').forEach((button) => {
  button.addEventListener('click', () => openContentBlock(button.dataset.contentBlock));
});

document.getElementById('contentLibrarySearch')?.addEventListener('input', (event) => {
  const query = String(event.target.value || '').trim().toLocaleLowerCase('vi');
  document.querySelectorAll('#contentBlockList [data-content-block]').forEach((button) => {
    const haystack = String(button.dataset.searchText || button.textContent || '').toLocaleLowerCase('vi');
    button.hidden = Boolean(query) && !haystack.includes(query);
  });
  document.querySelectorAll('#contentTemplateGrid [data-content-theme]').forEach((button) => {
    const haystack = String(button.title || button.textContent || '').toLocaleLowerCase('vi');
    button.hidden = Boolean(query) && !haystack.includes(query);
  });
});

document.querySelectorAll('[data-open-inspector]').forEach((button) => {
  button.addEventListener('click', () => {
    setDesignInspectorTab(button.dataset.openInspector || 'design');
    setMajorPanelState('design', false);
    document.getElementById('designPanel')?.classList.add('open');
  });
});

document.getElementById('studioGlobalSave')?.addEventListener('click', saveCurrentQuote);
document.getElementById('studioGlobalPreview')?.addEventListener('click', () => openTab('view'));
document.getElementById('closeStudioGuidance')?.addEventListener('click', () => {
  const panel = document.getElementById('studioGuidancePanel');
  if (panel) panel.hidden = true;
});

const STUDIO_COMMANDS = [
  { label: 'Thông tin chung', hint: 'Khối nội dung', run: () => openContentBlock('general') },
  { label: 'Khách hàng', hint: 'Khối nội dung', run: () => openContentBlock('customer') },
  { label: 'Sản phẩm / Dịch vụ', hint: 'Khối nội dung', run: () => openContentBlock('products') },
  { label: 'Thanh toán', hint: 'Khối nội dung', run: () => openContentBlock('payment') },
  { label: 'Điều khoản', hint: 'Khối nội dung', run: () => openContentBlock('terms') },
  { label: 'Chữ ký', hint: 'Khối nội dung', run: () => openContentBlock('signature') },
  { label: 'Văn bản tùy chỉnh', hint: 'Khối nội dung', run: () => openContentBlock('custom-text') },
  { label: 'Lưu nháp', hint: 'Thao tác', run: () => saveCurrentQuote() },
  { label: 'Xem trước A4', hint: 'Thao tác', run: () => openTab('view') },
  { label: 'Kiểm tra báo giá', hint: 'Thao tác', run: () => { updateDocumentHealth(); renderStudioGuidance(); } },
  { label: 'Quản lý báo giá', hint: 'Ứng dụng', run: () => openTab('history') },
  { label: 'Khách hàng & sản phẩm', hint: 'Ứng dụng', run: () => openTab('master') },
  { label: 'Cài đặt ứng dụng', hint: 'Ứng dụng', run: () => openTab('settings') }
];

function closeStudioCommandPalette() {
  const input = document.getElementById('studioCommandSearch');
  const results = document.getElementById('studioCommandResults');
  if (results) {
    results.hidden = true;
    results.innerHTML = '';
  }
  input?.setAttribute('aria-expanded', 'false');
}

function openStudioCommandPalette(initialQuery = '') {
  const input = document.getElementById('studioCommandSearch');
  if (!input) return;
  input.value = initialQuery;
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function renderStudioCommandResults(query) {
  const results = document.getElementById('studioCommandResults');
  const input = document.getElementById('studioCommandSearch');
  if (!results || !input) return;
  const needle = String(query || '').trim().toLocaleLowerCase('vi');
  const matches = STUDIO_COMMANDS
    .filter((command) => !needle || (command.label + ' ' + command.hint).toLocaleLowerCase('vi').includes(needle))
    .slice(0, 8);
  results.innerHTML = '';
  matches.forEach((command, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    const label = document.createElement('span');
    label.textContent = command.label;
    const hint = document.createElement('small');
    hint.textContent = command.hint;
    button.append(label, hint);
    button.addEventListener('click', () => {
      closeStudioCommandPalette();
      input.value = '';
      command.run();
    });
    results.appendChild(button);
  });
  results.hidden = !matches.length;
  input.setAttribute('aria-expanded', matches.length ? 'true' : 'false');
}

document.getElementById('studioCommandSearch')?.addEventListener('input', (event) => {
  renderStudioCommandResults(event.target.value);
});
document.getElementById('studioCommandSearch')?.addEventListener('focus', (event) => {
  renderStudioCommandResults(event.target.value);
});
document.getElementById('studioCommandSearch')?.addEventListener('keydown', (event) => {
  const results = document.getElementById('studioCommandResults');
  const options = Array.from(results?.querySelectorAll('[role="option"]') || []);
  if (event.key === 'Escape') {
    event.preventDefault();
    closeStudioCommandPalette();
    event.currentTarget.blur();
    return;
  }
  if (!options.length) return;
  let index = options.findIndex((option) => option.getAttribute('aria-selected') === 'true');
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    index = event.key === 'ArrowDown'
      ? Math.min(options.length - 1, index + 1)
      : Math.max(0, index - 1);
    options.forEach((option, itemIndex) => option.setAttribute('aria-selected', itemIndex === index ? 'true' : 'false'));
  } else if (event.key === 'Enter') {
    event.preventDefault();
    (options[index >= 0 ? index : 0])?.click();
  }
});
document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest?.('.studio-command-search')) closeStudioCommandPalette();
});

document.getElementById('studioTopMenu')?.addEventListener('click', () => openStudioCommandPalette(''));
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openStudioCommandPalette('');
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveCurrentQuote();
  }
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
  closeProductWorkspace({ restoreFocus: false });
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
let selectedProductRows = new Set();
let selectedCustomerLibraryIds = new Set();
let selectedProductCatalogIds = new Set();

function selectedProductIndices() {
  selectedProductRows = new Set(
    [...selectedProductRows].filter(index => Number.isInteger(index) && index >= 0 && index < state.products.length)
  );
  return [...selectedProductRows].sort((a, b) => a - b);
}

function syncProductBulkActionInput() {
  const action = document.getElementById('productBulkAction');
  const value = document.getElementById('productBulkValue');
  if (!action || !value) return;
  const needsValue = ['group','unit','price'].includes(action.value);
  value.disabled = !needsValue;
  value.hidden = !needsValue;
  value.type = action.value === 'price' ? 'number' : 'text';
  value.placeholder = action.value === 'group'
    ? 'Nhập nhóm hàng'
    : action.value === 'unit'
      ? 'Nhập ĐVT'
      : action.value === 'price'
        ? 'VD: 5 hoặc -10'
        : '';
  if (action.value === 'price') {
    value.step = '0.1';
    value.min = '-100';
  } else {
    value.removeAttribute('step');
    value.removeAttribute('min');
  }
}

function syncProductBulkBar() {
  const indices = selectedProductIndices();
  const bar = document.getElementById('productBulkBar');
  const count = document.getElementById('productBulkCount');
  const selectAll = document.getElementById('selectAllProducts');
  if (bar) bar.hidden = indices.length === 0;
  if (count) count.textContent = indices.length + ' dòng đã chọn';
  if (selectAll) {
    selectAll.checked = state.products.length > 0 && indices.length === state.products.length;
    selectAll.indeterminate = indices.length > 0 && indices.length < state.products.length;
  }
  syncProductBulkActionInput();
}

function clearProductSelection({ rerender = true } = {}) {
  selectedProductRows.clear();
  if (rerender) renderEditorProducts();
  else syncProductBulkBar();
}

function setupProductBulkActions() {
  document.getElementById('selectAllProducts')?.addEventListener('change', (event) => {
    selectedProductRows = event.currentTarget.checked
      ? new Set(state.products.map((_, index) => index))
      : new Set();
    renderEditorProducts();
  });
  document.getElementById('clearProductSelection')?.addEventListener('click', () => clearProductSelection());
  document.getElementById('productBulkAction')?.addEventListener('change', syncProductBulkActionInput);
  document.getElementById('applyProductBulk')?.addEventListener('click', applyProductBulkAction);
}

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

function focusProductCell(index, key = 'name') {
  requestAnimationFrame(() => {
    const card = document.querySelector('#productEditor .product-card[data-product-index="' + index + '"]');
    const target = card?.querySelector('[data-product-key="' + key + '"]');
    target?.focus();
    target?.select?.();
  });
}

function focusProductName(index) {
  focusProductCell(index, 'name');
}

function appendBlankProduct({ focusKey = 'name' } = {}) {
  state.products.push({ group: '', name: '', pack: '', unit: '', qty: 1, price: 0, note: '' });
  const nextIndex = state.products.length - 1;
  collapsedProducts.delete(nextIndex);
  save();
  renderEditorProducts();
  render();
  focusProductCell(nextIndex, focusKey);
  return nextIndex;
}

function refreshCustomerEntrySuggestions() {
  const customers = getCustomerLibrary();
  ensureSuggestionList('customerNameSuggestions', customers.map(item => item.name));
  ensureSuggestionList('customerCompanySuggestions', customers.map(item => item.company));
  ensureSuggestionList('customerPhoneSuggestions', customers.map(item => item.phone));
}

function matchCustomerSuggestion(field, rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return null;
  const customers = getCustomerLibrary();
  if (field === 'phone') {
    const normalized = canonicalLibraryPhone(value);
    return customers.find(item => canonicalLibraryPhone(item.phone) === normalized) || null;
  }
  const canonical = canonicalLibraryText(value);
  return customers.find(item => canonicalLibraryText(item?.[field]) === canonical) || null;
}

function setupCustomerEntryAutocomplete() {
  refreshCustomerEntrySuggestions();
  document.querySelectorAll('[data-customer-autocomplete]').forEach((input) => {
    input.addEventListener('change', () => {
      const customer = matchCustomerSuggestion(input.dataset.customerAutocomplete, input.value);
      if (!customer) return;
      useCustomer(customer, { navigate: false, focus: false, notify: true });
    });
  });
}

function ensureSuggestionList(id, values) {
  let list = document.getElementById(id);
  if (!list) {
    list = document.createElement('datalist');
    list.id = id;
    document.body.appendChild(list);
  }
  list.innerHTML = '';
  [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
    .slice(0, 300)
    .forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      list.appendChild(option);
    });
}

function refreshProductEntrySuggestions() {
  const catalog = getProductCatalog();
  ensureSuggestionList('productNameSuggestions', catalog.map(item => item.name));
  ensureSuggestionList('productGroupSuggestions', [
    ...catalog.map(item => item.group),
    ...state.products.map(item => item.group)
  ]);
  ensureSuggestionList('productUnitSuggestions', [
    'Cái','Bộ','Hộp','Khay','Gói','Túi','Chai','Thùng','Kg','g','Lít','ml','m','m²',
    ...catalog.map(item => item.unit),
    ...state.products.map(item => item.unit)
  ]);
}

function productCellIssue(product, key) {
  const name = String(product?.name || '').trim();
  const qty = Number(product?.qty);
  const price = Number(product?.price);

  if (key === 'name' && !name && productHasDraftContent(product)) {
    return { tone: 'error', message: 'Cần nhập tên sản phẩm.' };
  }
  if (key === 'qty' && name) {
    if (!Number.isFinite(qty)) return { tone: 'error', message: 'Số lượng không hợp lệ.' };
    if (qty < 0) return { tone: 'warning', message: 'Số lượng không được âm.' };
    if (qty === 0 && (state.showQty || state.showAmount || state.showTotals)) {
      return { tone: 'warning', message: 'Số lượng đang bằng 0.' };
    }
  }
  if (key === 'price' && name) {
    if (!Number.isFinite(price)) return { tone: 'error', message: 'Đơn giá không hợp lệ.' };
    if (price < 0) return { tone: 'warning', message: 'Đơn giá không được âm.' };
    if (price === 0 && state.showPrice) return { tone: 'warning', message: 'Chưa có đơn giá.' };
  }
  return null;
}

function syncProductRowValidation(card, product) {
  if (!card) return;
  card.querySelectorAll('[data-product-key]').forEach((input) => {
    const key = input.dataset.productKey;
    const field = input.closest('.product-field');
    if (!field) return;
    field.classList.remove('cell-error', 'cell-warning');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    field.querySelector('.product-cell-validation')?.remove();

    const issue = productCellIssue(product, key);
    if (!issue) return;
    field.classList.add(issue.tone === 'error' ? 'cell-error' : 'cell-warning');
    input.setAttribute('aria-invalid', 'true');
    const message = document.createElement('small');
    message.className = 'product-cell-validation';
    message.id = 'product-cell-' + card.dataset.productIndex + '-' + key + '-message';
    message.setAttribute('role', 'status');
    message.textContent = issue.message;
    input.setAttribute('aria-describedby', message.id);
    field.appendChild(message);
  });
}

function productField(label, key, value, type, onInput, className = '') {
  const wrap = document.createElement('label');
  wrap.className = 'product-field ' + className;
  wrap.dataset.productField = key;
  const title = document.createElement('span');
  title.textContent = label;
  const input = key === 'note' ? document.createElement('textarea') : document.createElement('input');
  if (key !== 'note') input.type = type || 'text';
  input.dataset.productKey = key;
  input.value = value == null ? '' : value;
  if (type === 'number') {
    input.min = '0';
    input.step = key === 'price' ? '1000' : '1';
    input.inputMode = 'decimal';
  }
  if (key === 'name') {
    input.placeholder = 'Tên hàng hóa / dịch vụ';
    input.setAttribute('list', 'productNameSuggestions');
    input.setAttribute('autocomplete', 'off');
  }
  if (key === 'group') {
    input.setAttribute('list', 'productGroupSuggestions');
    input.setAttribute('autocomplete', 'off');
  }
  if (key === 'pack') input.placeholder = 'VD: Hộp 10 quả';
  if (key === 'unit') {
    input.placeholder = 'VD: Hộp, kg, cái';
    input.setAttribute('list', 'productUnitSuggestions');
    input.setAttribute('autocomplete', 'off');
  }
  input.addEventListener('input', () => onInput(input));
  input.addEventListener('keydown', (event) => {
    const card = input.closest('.product-card');
    const rowIndex = Number(card?.dataset.productIndex);
    if (!Number.isInteger(rowIndex)) return;

    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const targetIndex = rowIndex + (event.key === 'ArrowDown' ? 1 : -1);
      if (targetIndex >= 0 && targetIndex < state.products.length) {
        event.preventDefault();
        focusProductCell(targetIndex, key);
      }
      return;
    }

    if (event.key === 'Enter' && key !== 'note' && !event.shiftKey) {
      event.preventDefault();
      if (rowIndex >= state.products.length - 1) appendBlankProduct({ focusKey: 'name' });
      else focusProductCell(rowIndex + 1, key);
      return;
    }

    if (event.key === 'Tab' && !event.shiftKey && key === 'note') {
      event.preventDefault();
      if (rowIndex >= state.products.length - 1) appendBlankProduct({ focusKey: 'name' });
      else focusProductCell(rowIndex + 1, 'name');
    }
  });
  wrap.append(title, input);
  return wrap;
}

function renderEditorProducts() {
  const list = document.getElementById('productEditor');
  list.innerHTML = '';
  const fragment = document.createDocumentFragment();
  refreshProductEntrySuggestions();

  state.products.forEach((product, index) => {
    const card = document.createElement('article');
    card.className = 'product-card product-grid-row' + (collapsedProducts.has(index) ? ' collapsed' : '');
    card.dataset.productIndex = String(index);

    const head = document.createElement('div');
    head.className = 'product-card-head';

    const identity = document.createElement('div');
    identity.className = 'product-card-identity';
    const selectWrap = document.createElement('label');
    selectWrap.className = 'product-row-select-wrap';
    const selectRow = document.createElement('input');
    selectRow.type = 'checkbox';
    selectRow.className = 'product-row-select';
    selectRow.checked = selectedProductRows.has(index);
    selectRow.setAttribute('aria-label', 'Chọn sản phẩm ' + (index + 1));
    selectRow.addEventListener('change', () => {
      if (selectRow.checked) selectedProductRows.add(index);
      else selectedProductRows.delete(index);
      syncProductBulkBar();
      card.classList.toggle('bulk-selected', selectRow.checked);
    });
    selectWrap.appendChild(selectRow);
    const badge = document.createElement('span');
    badge.className = 'product-index';
    badge.textContent = String(index + 1);
    const titleWrap = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = product.name || 'Sản phẩm chưa đặt tên';
    const amount = document.createElement('span');
    amount.className = 'product-live-total';
    amount.textContent = money(Number(product.qty || 0) * Number(product.price || 0));
    titleWrap.append(title, amount);
    identity.append(selectWrap, badge, titleWrap);
    card.classList.toggle('bulk-selected', selectRow.checked);

    const actions = document.createElement('div');
    actions.className = 'product-card-actions';

    const collapse = document.createElement('button');
    collapse.className = 'mini-action';
    collapse.type = 'button';
    collapse.title = collapsedProducts.has(index) ? 'Mở rộng' : 'Thu gọn';
    collapse.setAttribute('aria-label', collapse.title + ' sản phẩm ' + (index + 1));
    collapse.textContent = collapsedProducts.has(index) ? '＋' : '−';
    collapse.addEventListener('click', () => {
      if (collapsedProducts.has(index)) collapsedProducts.delete(index);
      else collapsedProducts.add(index);
      renderEditorProducts();
    });

    const up = document.createElement('button');
    up.className = 'mini-action';
    up.type = 'button';
    up.title = 'Đưa lên';
    up.setAttribute('aria-label', 'Đưa sản phẩm ' + (index + 1) + ' lên');
    up.textContent = '↑';
    up.disabled = index === 0;
    up.addEventListener('click', () => {
      if (index === 0) return;
      [state.products[index - 1], state.products[index]] = [state.products[index], state.products[index - 1]];
      selectedProductRows.clear();
      save(); renderEditorProducts(); render();
    });

    const down = document.createElement('button');
    down.className = 'mini-action';
    down.type = 'button';
    down.title = 'Đưa xuống';
    down.setAttribute('aria-label', 'Đưa sản phẩm ' + (index + 1) + ' xuống');
    down.textContent = '↓';
    down.disabled = index === state.products.length - 1;
    down.addEventListener('click', () => {
      if (index >= state.products.length - 1) return;
      [state.products[index + 1], state.products[index]] = [state.products[index], state.products[index + 1]];
      selectedProductRows.clear();
      save(); renderEditorProducts(); render();
    });

    const duplicate = document.createElement('button');
    duplicate.className = 'mini-action';
    duplicate.type = 'button';
    duplicate.title = 'Nhân bản';
    duplicate.setAttribute('aria-label', 'Nhân bản sản phẩm ' + (index + 1));
    duplicate.textContent = '⧉';
    duplicate.addEventListener('click', () => {
      state.products.splice(index + 1, 0, clone(product));
      selectedProductRows.clear();
      save(); renderEditorProducts(); render();
    });

    const remove = document.createElement('button');
    remove.className = 'mini-action danger-icon';
    remove.type = 'button';
    remove.title = 'Xóa';
    remove.setAttribute('aria-label', 'Xóa sản phẩm ' + (index + 1));
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      if (productHasDraftContent(product) && !confirm('Xóa sản phẩm này khỏi báo giá?')) return;
      state.products.splice(index, 1);
      if (!state.products.length) state.products.push({ group: '', name: '', pack: '', unit: '', qty: 1, price: 0, note: '' });
      collapsedProducts = new Set();
      selectedProductRows.clear();
      save(); renderEditorProducts(); render();
    });

    actions.append(collapse, up, down, duplicate, remove);
    head.append(identity, actions);

    const body = document.createElement('div');
    body.className = 'product-card-body';

    const updateProduct = (key, input, numeric = false) => {
      if (numeric) {
        const raw = String(input.value || '').trim();
        const value = raw === '' ? 0 : Number(raw);
        product[key] = Number.isFinite(value) ? value : 0;
      } else {
        product[key] = input.value;
      }
      if (key === 'name') title.textContent = product.name || 'Sản phẩm chưa đặt tên';
      amount.textContent = money(Number(product.qty || 0) * Number(product.price || 0));
      save();
      renderPreviewProducts();
      renderTotals();
      updateDocumentHealth();
      syncStudioContext('products');
      refreshOpenStudioGuidance();
      syncProductRowValidation(card, product);
      requestAnimationFrame(updatePageEstimate);
    };

    body.append(
      productField('Nhóm hàng', 'group', product.group, 'text', input => updateProduct('group', input), 'wide'),
      productField('Tên sản phẩm', 'name', product.name, 'text', input => updateProduct('name', input), 'wide'),
      productField('Quy cách', 'pack', product.pack, 'text', input => updateProduct('pack', input)),
      productField('Đơn vị tính', 'unit', product.unit, 'text', input => updateProduct('unit', input)),
      productField('Số lượng', 'qty', product.qty, 'number', input => updateProduct('qty', input, true)),
      productField('Đơn giá', 'price', product.price, 'number', input => updateProduct('price', input, true)),
      productField('Ghi chú', 'note', product.note, 'text', input => updateProduct('note', input), 'wide')
    );

    const nameInput = body.querySelector('[data-product-key="name"]');
    nameInput?.addEventListener('change', () => {
      const requested = canonicalLibraryText(nameInput.value);
      if (!requested) return;
      const selected = getProductCatalog().find(item =>
        canonicalLibraryText(item.name) === requested
      );
      if (!selected) return;
      const currencyMatches = normalizeCatalogCurrency(selected.currency || 'VND') === normalizeCatalogCurrency(state.currency);
      product.group = selected.group || product.group || '';
      product.name = selected.name || product.name || '';
      product.pack = selected.pack || '';
      product.unit = selected.unit || '';
      product.price = currencyMatches ? normalizeNonNegativeNumber(selected.price) : 0;
      product.note = selected.note || '';
      if (!normalizeNonNegativeNumber(product.qty)) product.qty = 1;
      save();
      renderEditorProducts();
      render();
      focusProductCell(index, 'qty');
      toast(currencyMatches
        ? 'Đã điền thông tin từ danh mục'
        : 'Đã điền sản phẩm; đơn giá để 0 vì khác loại tiền tệ');
    });

    card.append(head, body);
    syncProductRowValidation(card, product);
    fragment.appendChild(card);
  });
  list.appendChild(fragment);

  const collapseButton = document.getElementById('collapseAllProducts');
  if (collapseButton) {
    collapseButton.textContent = collapsedProducts.size === state.products.length ? 'Mở tất cả' : 'Thu gọn tất cả';
  }
  syncProductBulkBar();
  renderProductLaunchSummary();
}

function renderProductLaunchSummary() {
  const meaningful = state.products.filter(productHasDraftContent);
  const subtotal = state.products.reduce((sum, product) =>
    sum + normalizeNonNegativeNumber(product.qty) * normalizeNonNegativeNumber(product.price), 0);

  setText('productLaunchCount', state.products.length + ' dòng');
  setText('productLaunchFilledCount', String(meaningful.length));
  setText('productLaunchSubtotal', money(subtotal));
  setText('productWorkspaceCount', state.products.length + ' dòng');
  setText('productWorkspaceSubtotal', money(subtotal));

  const list = document.getElementById('productLaunchList');
  if (!list) return;
  list.innerHTML = '';
  const visible = meaningful.slice(0, 4);
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'product-launch-empty';
    empty.textContent = 'Chưa có sản phẩm. Mở cửa sổ nhập để thêm dữ liệu.';
    list.appendChild(empty);
    return;
  }

  visible.forEach((product, index) => {
    const row = document.createElement('div');
    row.className = 'product-launch-row';
    const order = document.createElement('span');
    order.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('b');
    name.textContent = String(product.name || '').trim() || 'Sản phẩm chưa đặt tên';
    const amount = document.createElement('small');
    amount.textContent = money(normalizeNonNegativeNumber(product.qty) * normalizeNonNegativeNumber(product.price));
    row.append(order, name, amount);
    list.appendChild(row);
  });

  if (meaningful.length > visible.length) {
    const more = document.createElement('div');
    more.className = 'product-launch-row';
    more.innerHTML = '<span>…</span><b>Còn ' + (meaningful.length - visible.length) + ' sản phẩm</b><small>Mở để xem</small>';
    list.appendChild(more);
  }
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
  const inspectorTableFontSizeValue = document.getElementById('inspectorTableFontSizeValue');
  if (inspectorTableFontSizeValue) inspectorTableFontSizeValue.textContent = Number(state.tableFontSize || 9).toFixed(1) + ' px';

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

  document.querySelectorAll('.tpl').forEach((el) => el.classList.toggle('active', el.dataset.theme === state.theme));
  document.querySelectorAll('[data-content-theme]').forEach((el) => el.classList.toggle('active', el.dataset.contentTheme === state.theme));
  document.querySelectorAll('.color').forEach((el) => el.classList.toggle('active', el.dataset.color === state.accent));
  $$('[data-title-align]').forEach((el) => el.classList.toggle('active', el.dataset.titleAlign === (state.previewTitleAlign || 'center')));
  const activeTemplate = document.querySelector('.tpl[data-theme="' + state.theme + '"]');
  const description = document.getElementById('templateDescription');
  if (description && activeTemplate) description.textContent = activeTemplate.dataset.description || '';
  const inspectorThemeName = document.getElementById('inspectorThemeName');
  if (inspectorThemeName) inspectorThemeName.textContent = THEME_LABELS[state.theme] || state.theme || 'Chuẩn công ty';
  const inspectorThemePreview = document.getElementById('inspectorThemePreview');
  if (inspectorThemePreview) inspectorThemePreview.style.setProperty('--theme-accent', state.accent || '#0b8f83');
  updateDocumentHealth();
  renderContentBlockSummaries();
  if (!document.getElementById('contentWorkspaceModal')?.hidden) updateContentWorkspaceStatus();
  syncStudioContext(document.querySelector('.pane.active')?.id?.replace('pane-', '') || '');
  refreshOpenStudioGuidance();
  syncLayoutEditModeUI();
  requestAnimationFrame(() => {
    updatePageEstimate();
    if (document.querySelector('.shell')?.classList.contains('report-view')) fitReportView();
  });
}

let toastTimer = null;
function toast(message, action = null) {
  const el = document.getElementById('toast');
  if (!el) return;
  if (toastTimer) clearTimeout(toastTimer);
  el.innerHTML = '';
  const text = document.createElement('span');
  text.textContent = message;
  el.appendChild(text);
  if (action?.label && typeof action.onClick === 'function') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-action';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      action.onClick();
      el.classList.remove('show');
    }, { once: true });
    el.appendChild(button);
  }
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), action?.duration || 1600);
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

function productRowsForExport() {
  return buildProductExportRows(state.products);
}

function excelNumberFormat(currency) {
  if (currency === 'USD') return '$#,##0.00';
  if (currency === 'RUB') return '#,##0.00 "₽"';
  return '#,##0';
}

function applyProfessionalQuotationSheet(XLSX, sheet, model) {
  sheet['!cols'] = [
    { wch: 8 }, { wch: 24 }, { wch: 38 }, { wch: 20 }, { wch: 12 },
    { wch: 12 }, { wch: 17 }, { wch: 18 }, { wch: 28 }
  ];
  sheet['!merges'] = model.mergeRows.map((row) => ({
    s: { r: row, c: 0 },
    e: { r: row, c: 8 }
  }));
  if (model.productLastDataRow >= model.productHeaderRow) {
    sheet['!autofilter'] = {
      ref: `A${model.productHeaderRow + 1}:I${Math.max(model.productHeaderRow + 1, model.productLastDataRow + 1)}`
    };
  }
  sheet['!margins'] = { left: 0.3, right: 0.3, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 };
  sheet['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  const numberFormat = excelNumberFormat(model.currency);
  model.moneyCells.forEach(({ row, col }) => {
    const address = XLSX.utils.encode_cell({ r: row, c: col });
    if (sheet[address]) sheet[address].z = numberFormat;
  });
}

function applyProfessionalDataSheet(XLSX, sheet, rowCount) {
  sheet['!cols'] = [
    { wch: 8 }, { wch: 22 }, { wch: 38 }, { wch: 20 }, { wch: 12 },
    { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 28 }
  ];
  if (rowCount > 0) sheet['!autofilter'] = { ref: `A1:I${rowCount}` };
  for (let row = 1; row < rowCount; row += 1) {
    [6, 7].forEach((col) => {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      if (sheet[address]) sheet[address].z = '#,##0.00';
    });
  }
}

function exportCurrentQuoteCsv() {
  const csv = csvFromRows(productRowsForExport());
  const name = sanitizePcFileName(state.quoteNo || state.quoteTitle || 'bao-gia', 'bao-gia') + '.csv';
  download(name, csv, 'text/csv;charset=utf-8');
  toast('Đã xuất file CSV');
}

async function exportCurrentQuoteExcel() {
  if (!runPreflight({ forExport: true })) return;
  try {
    const XLSX = await import('xlsx');
    const model = quotationWorkbookModel(state);
    const sheet = XLSX.utils.aoa_to_sheet(model.rows);
    applyProfessionalQuotationSheet(XLSX, sheet, model);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Bảng báo giá');

    const dataRows = productRowsForExport();
    const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);
    applyProfessionalDataSheet(XLSX, dataSheet, dataRows.length);
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Dữ liệu sản phẩm');

    workbook.Props = {
      Title: state.quoteTitle || 'Bảng báo giá',
      Subject: state.quoteNo ? `Báo giá ${state.quoteNo}` : 'Bảng báo giá',
      Author: state.companyName || 'PriceReport',
      Company: state.companyName || '',
      Comments: 'Xuất từ PriceReport · dữ liệu sản phẩm và báo cáo được tách thành hai sheet.'
    };

    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', cellStyles: true });
    const name = sanitizePcFileName(state.quoteNo || state.quoteTitle || 'bao-gia', 'bao-gia') + '.xlsx';
    downloadBlob(name, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    toast('Đã xuất Excel báo giá chuyên nghiệp');
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
let smartImportSheetCandidates = [];
let lastImportUndoSnapshot = null;


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
  const pastePanel = document.getElementById('smartPastePanel');
  const pasteText = document.getElementById('smartPasteText');
  const sheetPicker = document.getElementById('smartImportSheetPicker');
  const sheetSelect = document.getElementById('smartImportSheetSelect');
  if (review) review.hidden = true;
  if (apply) apply.disabled = true;
  if (raw) raw.value = '';
  if (rawBox) rawBox.hidden = true;
  if (previewWrap) previewWrap.hidden = true;
  if (preview) preview.removeAttribute('src');
  if (excelInput) excelInput.value = '';
  if (handwritingInput) handwritingInput.value = '';
  if (pastePanel) pastePanel.hidden = true;
  if (pasteText) pasteText.value = '';
  smartImportSheetCandidates = [];
  if (sheetPicker) sheetPicker.hidden = true;
  if (sheetSelect) sheetSelect.innerHTML = '';
  if (smartImportImageUrl) URL.revokeObjectURL(smartImportImageUrl);
  smartImportImageUrl = '';
  document.querySelectorAll('[data-import-field]').forEach((input) => { input.value = ''; });
  const mapping = document.getElementById('smartImportMapping');
  if (mapping) mapping.hidden = true;
  const mappingRows = document.getElementById('smartImportMappingRows');
  if (mappingRows) mappingRows.innerHTML = '';
  const productPreview = document.getElementById('smartImportProductPreview');
  if (productPreview) productPreview.innerHTML = '';
  const issues = document.getElementById('smartImportIssues');
  const issueList = document.getElementById('smartImportIssueList');
  if (issues) issues.hidden = true;
  if (issueList) issueList.innerHTML = '';
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

const IMPORT_MAPPING_TARGETS = [
  ['name', 'Tên sản phẩm'],
  ['group', 'Nhóm hàng'],
  ['pack', 'Quy cách'],
  ['unit', 'ĐVT'],
  ['qty', 'Số lượng'],
  ['price', 'Đơn giá'],
  ['note', 'Ghi chú']
];

function rebuildSmartImportProductsFromMapping() {
  const meta = smartImportDraft?.spreadsheetMeta;
  if (!meta || !Array.isArray(meta.rows)) return;
  const rebuilt = parseMappedSpreadsheetRows(meta.rows, {
    headerIndex: meta.headerIndex,
    mapping: meta.mapping,
    excludedRows: meta.excludedRows
  });
  smartImportDraft.products = rebuilt.products;
  smartImportDraft.groups = rebuilt.groups;
  meta.invalidRows = rebuilt.invalidRows;
  meta.duplicates = rebuilt.duplicates;
}

function renderSmartImportProductPreview() {
  const host = document.getElementById('smartImportProductPreview');
  if (!host) return;
  host.innerHTML = '';
  const products = Array.isArray(smartImportDraft?.products) ? smartImportDraft.products : [];
  const rows = products.slice(0, 5);
  rows.forEach((product, index) => {
    const row = document.createElement('div');
    row.className = 'import-product-preview-row';
    const cells = [
      String(index + 1),
      product.name || '—',
      product.unit || '—',
      String(product.qty ?? 1),
      new Intl.NumberFormat('vi-VN').format(Number(product.price || 0))
    ];
    cells.forEach((value) => {
      const cell = document.createElement('span');
      cell.textContent = value;
      row.appendChild(cell);
    });
    host.appendChild(row);
  });
  if (products.length > rows.length) {
    const more = document.createElement('div');
    more.className = 'import-product-preview-more';
    more.textContent = '… và ' + (products.length - rows.length) + ' dòng khác';
    host.appendChild(more);
  }
}

function renderSmartImportMapping() {
  const section = document.getElementById('smartImportMapping');
  const host = document.getElementById('smartImportMappingRows');
  const status = document.getElementById('smartImportMappingStatus');
  if (!section || !host) return;
  const meta = smartImportDraft?.spreadsheetMeta;
  if (!meta || !Array.isArray(meta.rows) || !Array.isArray(meta.headers)) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  host.innerHTML = '';
  const mappingEntries = Object.entries(meta.mapping || {});
  meta.headers.forEach((header, sourceIndex) => {
    const headerText = String(header || '').trim();
    if (!headerText) return;
    const current = mappingEntries.find(([, index]) => Number(index) === sourceIndex)?.[0] || '';
    const row = document.createElement('div');
    row.className = 'import-mapping-row';

    const source = document.createElement('div');
    source.className = 'import-mapping-source';
    const sourceName = document.createElement('strong');
    sourceName.textContent = headerText;
    const confidence = document.createElement('small');
    const confidenceValue = current ? Number(meta.confidence?.[current] || 0) : 0;
    confidence.textContent = current
      ? 'Độ tin cậy ' + Math.round(confidenceValue * 100) + '%'
      : 'Chưa dùng cột này';
    source.append(sourceName, confidence);

    const arrow = document.createElement('span');
    arrow.className = 'import-mapping-arrow';
    arrow.textContent = '→';

    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Ánh xạ cột ' + headerText);
    const ignore = document.createElement('option');
    ignore.value = '';
    ignore.textContent = 'Bỏ qua';
    select.appendChild(ignore);
    IMPORT_MAPPING_TARGETS.forEach(([key, label]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = label;
      option.selected = current === key;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      const nextField = select.value;
      const nextMapping = { ...(meta.mapping || {}) };
      Object.entries(nextMapping).forEach(([field, index]) => {
        if (Number(index) === sourceIndex || (nextField && field === nextField)) delete nextMapping[field];
      });
      if (nextField) nextMapping[nextField] = sourceIndex;
      meta.mapping = nextMapping;
      meta.confidence = { ...(meta.confidence || {}), ...(nextField ? { [nextField]: 1 } : {}) };
      rebuildSmartImportProductsFromMapping();
      renderSmartImportReview();
    });

    row.append(source, arrow, select);
    host.appendChild(row);
  });

  const invalidCount = Array.isArray(meta.invalidRows) ? meta.invalidRows.length : 0;
  const duplicateCount = Array.isArray(meta.duplicates) ? meta.duplicates.length : 0;
  if (status) {
    const flags = [];
    if (invalidCount) flags.push(invalidCount + ' dòng cần kiểm tra');
    if (duplicateCount) flags.push(duplicateCount + ' nhóm có thể trùng');
    status.textContent = smartImportDraft.products.length + ' dòng hợp lệ' +
      (flags.length ? ' • ' + flags.join(' • ') : ' • mapping sẵn sàng');
    status.dataset.tone = flags.length ? 'warn' : 'ok';
  }
  renderSmartImportProductPreview();
}

function renderSmartImportIssues() {
  const section = document.getElementById('smartImportIssues');
  const list = document.getElementById('smartImportIssueList');
  const summary = document.getElementById('smartImportIssueSummary');
  if (!section || !list) return;

  const meta = smartImportDraft?.spreadsheetMeta;
  const invalidRows = Array.isArray(meta?.invalidRows) ? meta.invalidRows : [];
  const duplicates = Array.isArray(meta?.duplicates) ? meta.duplicates : [];
  list.innerHTML = '';

  const reasonLabels = {
    'missing-name': 'Thiếu tên sản phẩm',
    'invalid-price': 'Đơn giá không hợp lệ',
    'negative-price': 'Đơn giá âm',
    'negative-qty': 'Số lượng âm'
  };

  invalidRows.forEach((issue) => {
    const item = document.createElement('div');
    item.className = 'import-issue-item issue-error';
    const title = document.createElement('strong');
    title.textContent = 'Dòng ' + issue.rowNumber;
    const detail = document.createElement('span');
    const reasons = (issue.reasons || []).map(reason => reasonLabels[reason] || reason);
    detail.textContent = reasons.length ? reasons.join(' • ') : 'Cần kiểm tra';

    const editor = document.createElement('div');
    editor.className = 'import-issue-editor';
    const rowIndex = Number(issue.rowNumber) - 1;
    const rawRow = Array.isArray(meta?.rows?.[rowIndex]) ? meta.rows[rowIndex] : [];
    const fields = [
      ['name', 'Tên sản phẩm', 'text'],
      ['qty', 'Số lượng', 'text'],
      ['price', 'Đơn giá', 'text']
    ];
    const controls = {};

    fields.forEach(([field, labelText, inputType]) => {
      const sourceIndex = meta?.mapping?.[field];
      if (sourceIndex == null) return;
      const label = document.createElement('label');
      const caption = document.createElement('span');
      caption.textContent = labelText;
      const input = document.createElement('input');
      input.type = inputType;
      input.value = String(rawRow[sourceIndex] ?? '');
      input.dataset.issueField = field;
      label.append(caption, input);
      editor.appendChild(label);
      controls[field] = { input, sourceIndex };
    });

    const actions = document.createElement('div');
    actions.className = 'import-issue-actions';
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'btn primary';
    saveButton.textContent = 'Sửa và kiểm tra lại';
    saveButton.addEventListener('click', () => {
      if (!meta || !Array.isArray(meta.rows) || rowIndex < 0 || rowIndex >= meta.rows.length) return;
      const nextRow = Array.isArray(meta.rows[rowIndex]) ? [...meta.rows[rowIndex]] : [];
      Object.values(controls).forEach(({ input, sourceIndex }) => {
        nextRow[sourceIndex] = input.value;
      });
      meta.rows[rowIndex] = nextRow;
      rebuildSmartImportProductsFromMapping();
      renderSmartImportReview();
      const stillInvalid = (meta.invalidRows || []).some(row => Number(row.rowNumber) === Number(issue.rowNumber));
      setSmartImportProgress(
        stillInvalid
          ? 'Dòng ' + issue.rowNumber + ' vẫn chưa hợp lệ. Kiểm tra lại dữ liệu vừa sửa.'
          : 'Đã sửa dòng ' + issue.rowNumber + ' và đưa lại vào danh sách nhập.',
        stillInvalid ? 'error' : 'success'
      );
    });
    actions.appendChild(saveButton);

    const note = document.createElement('small');
    note.textContent = 'Dòng này chưa được đưa vào báo giá cho tới khi kiểm tra lại thành công.';
    item.append(title, detail, editor, actions, note);
    list.appendChild(item);
  });

  duplicates.forEach((group) => {
    const item = document.createElement('div');
    item.className = 'import-issue-item issue-warn';
    const title = document.createElement('strong');
    title.textContent = 'Có thể trùng dữ liệu';
    const detail = document.createElement('span');
    const rowLabels = (group.rowNumbers || []).map(rowNumber => 'dòng ' + rowNumber);
    detail.textContent = [
      (group.names || []).filter(Boolean)[0] || 'Sản phẩm',
      rowLabels.length ? rowLabels.join(', ') : ''
    ].filter(Boolean).join(' • ');

    const note = document.createElement('small');
    note.textContent = 'Mặc định đang giữ tất cả. Chỉ bỏ hoặc gộp khi bạn chọn rõ ràng.';
    const actions = document.createElement('div');
    actions.className = 'import-issue-actions import-duplicate-actions';

    (group.rowNumbers || []).slice(1).forEach((rowNumber) => {
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'btn';
      skip.textContent = 'Bỏ dòng ' + rowNumber;
      skip.addEventListener('click', () => {
        const previousExcluded = [...(meta.excludedRows || [])];
        meta.excludedRows = [...new Set([...previousExcluded, Number(rowNumber)])];
        rebuildSmartImportProductsFromMapping();
        renderSmartImportReview();
        toast('Đã bỏ dòng ' + rowNumber + ' khỏi lần nhập này', {
          label: 'Hoàn tác',
          duration: 6000,
          onClick: () => {
            meta.excludedRows = previousExcluded;
            rebuildSmartImportProductsFromMapping();
            renderSmartImportReview();
          }
        });
      });
      actions.appendChild(skip);
    });

    const samePrice = Array.isArray(group.prices) && group.prices.length > 1 &&
      group.prices.every(price => Number(price) === Number(group.prices[0]));
    const canMergeQuantity = samePrice && meta?.mapping?.qty != null &&
      Array.isArray(group.quantities) && group.quantities.every(qty => Number.isFinite(Number(qty))) &&
      Array.isArray(group.rowNumbers) && group.rowNumbers.length > 1;

    if (canMergeQuantity) {
      const mergeButton = document.createElement('button');
      mergeButton.type = 'button';
      mergeButton.className = 'btn primary';
      mergeButton.textContent = 'Gộp số lượng';
      mergeButton.addEventListener('click', () => {
        const [firstRowNumber, ...otherRowNumbers] = group.rowNumbers.map(Number);
        const firstRowIndex = firstRowNumber - 1;
        if (!Array.isArray(meta.rows?.[firstRowIndex])) return;

        const previousRow = [...meta.rows[firstRowIndex]];
        const previousExcluded = [...(meta.excludedRows || [])];
        const qtyIndex = meta.mapping.qty;
        const totalQty = group.quantities.reduce((sum, qty) => sum + Number(qty || 0), 0);
        const nextRow = [...meta.rows[firstRowIndex]];
        nextRow[qtyIndex] = totalQty;
        meta.rows[firstRowIndex] = nextRow;
        meta.excludedRows = [...new Set([...previousExcluded, ...otherRowNumbers])];

        rebuildSmartImportProductsFromMapping();
        renderSmartImportReview();
        toast('Đã gộp ' + group.rowNumbers.length + ' dòng cùng giá thành một dòng', {
          label: 'Hoàn tác',
          duration: 6000,
          onClick: () => {
            meta.rows[firstRowIndex] = previousRow;
            meta.excludedRows = previousExcluded;
            rebuildSmartImportProductsFromMapping();
            renderSmartImportReview();
          }
        });
      });
      actions.appendChild(mergeButton);
    }

    item.append(title, detail, note, actions);
    list.appendChild(item);
  });

  const total = invalidRows.length + duplicates.length;
  section.hidden = total === 0;
  if (summary) summary.textContent = total + ' mục';
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
  const invalidRows = smartImportDraft.spreadsheetMeta?.invalidRows || [];
  const duplicates = smartImportDraft.spreadsheetMeta?.duplicates || [];
  const mappingMessages = [
    ...(invalidRows.length
      ? ['Có ' + invalidRows.length + ' dòng chưa hợp lệ (thiếu dữ liệu hoặc có số âm); các dòng này chưa được nhập.']
      : []),
    ...(duplicates.length
      ? ['Phát hiện ' + duplicates.length + ' nhóm sản phẩm có khả năng bị trùng. Hệ thống giữ nguyên, không tự xóa.']
      : [])
  ];
  const messages = [...new Set([...(smartImportDraft.warnings || []), ...mappingMessages, ...(smartImportDraft.unmatched || []).slice(0, 4)])];
  messages.forEach((message) => {
    const item = document.createElement('div');
    item.textContent = message;
    warnings.appendChild(item);
  });
  warnings.hidden = !messages.length;

  renderSmartImportMapping();
  renderSmartImportIssues();
  review.hidden = false;
  apply.disabled = false;
}

function openSmartPaste(initialText = '') {
  openSmartImport();
  const panel = document.getElementById('smartPastePanel');
  const textarea = document.getElementById('smartPasteText');
  if (panel) panel.hidden = false;
  if (textarea) {
    if (initialText) textarea.value = initialText;
    requestAnimationFrame(() => textarea.focus());
  }
}

function parseSmartPasteText() {
  const textarea = document.getElementById('smartPasteText');
  const raw = String(textarea?.value || '');
  const parsed = parsePastedTable(raw);
  if (!parsed.products.length) {
    setSmartImportProgress(parsed.warnings?.[0] || 'Chưa nhận diện được dòng sản phẩm từ dữ liệu dán.', 'error');
    return false;
  }
  smartImportDraft = mergeSmartImportSource(parsed);
  renderSmartImportReview();
  setSmartImportProgress('Đã nhận ' + parsed.products.length + ' dòng từ dữ liệu dán. Kiểm tra mapping trước khi áp dụng.', 'success');
  return true;
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
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames || [];
  if (!sheetNames.length) throw new Error('Workbook không có sheet.');

  const candidates = sheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });
    const parsed = parseSpreadsheetRows(rows);
    const fieldCount = Object.values(parsed.fields || {}).filter(value => String(value || '').trim()).length;
    const score = parsed.products.length * 12 + parsed.groups.length * 4 + fieldCount;

    parsed.sheetName = sheetName;
    parsed.sheetCount = sheetNames.length;
    if (parsed.spreadsheetMeta) {
      parsed.spreadsheetMeta = {
        ...parsed.spreadsheetMeta,
        rows: rows.map((row) => Array.isArray(row) ? [...row] : [])
      };
      const rebuilt = parseMappedSpreadsheetRows(parsed.spreadsheetMeta.rows, {
        headerIndex: parsed.spreadsheetMeta.headerIndex,
        mapping: parsed.spreadsheetMeta.mapping
      });
      parsed.products = rebuilt.products;
      parsed.groups = rebuilt.groups;
      parsed.spreadsheetMeta.invalidRows = rebuilt.invalidRows;
      parsed.spreadsheetMeta.duplicates = rebuilt.duplicates;
    }

    return { sheetName, parsed, score };
  }).sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (sheetNames.length > 1) {
    best.parsed.warnings = [...(best.parsed.warnings || []),
      'Workbook có ' + sheetNames.length + ' sheet; hệ thống đã chọn trước sheet “' + best.sheetName + '”. Bạn có thể đổi sheet ở bước kiểm tra.'];
  }
  return { parsed: best.parsed, candidates };
}

function renderSmartImportSheetPicker() {
  const picker = document.getElementById('smartImportSheetPicker');
  const select = document.getElementById('smartImportSheetSelect');
  const hint = document.getElementById('smartImportSheetHint');
  if (!picker || !select) return;

  if (smartImportSheetCandidates.length <= 1) {
    picker.hidden = true;
    select.innerHTML = '';
    if (hint) hint.textContent = '—';
    return;
  }

  const current = smartImportDraft?.sheetName || smartImportSheetCandidates[0]?.sheetName || '';
  select.innerHTML = '';
  smartImportSheetCandidates.forEach((candidate) => {
    const option = document.createElement('option');
    option.value = candidate.sheetName;
    option.textContent = candidate.sheetName + ' • ' + candidate.parsed.products.length + ' dòng nhận dạng';
    option.selected = candidate.sheetName === current;
    select.appendChild(option);
  });
  picker.hidden = false;
  if (hint) {
    const selected = smartImportSheetCandidates.find(candidate => candidate.sheetName === select.value);
    const invalid = selected?.parsed?.spreadsheetMeta?.invalidRows?.length || 0;
    hint.textContent = selected
      ? selected.parsed.products.length + ' dòng hợp lệ' + (invalid ? ' • ' + invalid + ' dòng cần kiểm tra' : '')
      : 'Chọn sheet để xem trước dữ liệu.';
  }
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

function undoLastImport() {
  if (!lastImportUndoSnapshot) return;
  const undoSnapshot = clone(lastImportUndoSnapshot);
  state = merge(undoSnapshot);
  syncLegacyCompanyAddress();
  const persisted = save();
  if (persisted) lastImportUndoSnapshot = null;
  else lastImportUndoSnapshot = undoSnapshot;
  syncInputs();
  resetCollapsedProductsForState();
  renderEditorProducts();
  render();
  if (persisted) {
    toast('Đã hoàn tác lần nhập dữ liệu gần nhất');
  } else {
    toast('Đã hoàn tác tạm thời; chưa thể lưu vào trình duyệt', {
      label: 'Thử lưu lại',
      onClick: undoLastImport,
      duration: 6000
    });
  }
}

function applySmartImportDraft() {
  if (!smartImportDraft) return;
  syncDraftFromImportReview();
  const appliedFields = supplementImportFields(smartImportDraft);
  const previousState = clone(state);

  const next = Object.assign({}, state, appliedFields, smartImportDraft.layoutHints || {});
  const shouldReplaceProducts = document.getElementById('replaceImportedProducts')?.checked !== false;
  if (shouldReplaceProducts && Array.isArray(smartImportDraft.products) && smartImportDraft.products.length) {
    next.products = smartImportDraft.products.map((product) => ({
      group: String(product.group || ''),
      name: String(product.name || ''),
      pack: String(product.pack || ''),
      unit: String(product.unit || ''),
      qty: normalizeNonNegativeNumber(product.qty ?? 1),
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
  if (!persisted) {
    state = merge(previousState);
    syncLegacyCompanyAddress();
    clearRecoverySnapshot();
    updateAutosaveIndicator('error');
    setSmartImportProgress('Không thể lưu dữ liệu vào bộ nhớ chính. Chưa áp dụng import; dữ liệu kiểm tra vẫn được giữ để thử lại.', 'error');
    toast('Chưa áp dụng dữ liệu nhập vì bộ nhớ trình duyệt chưa ghi được');
    return false;
  }

  syncInputs();
  resetCollapsedProductsForState();
  renderEditorProducts();
  render();
  closeSmartImport({ discard: true });
  openTab('general');
  lastImportUndoSnapshot = previousState;
  toast('Đã áp dụng dữ liệu nhập vào báo giá', {
    label: 'Hoàn tác',
    onClick: undoLastImport,
    duration: 6000
  });
  return true;
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
  document.getElementById('closeSmartPastePanel')?.addEventListener('click', () => {
    const panel = document.getElementById('smartPastePanel');
    if (panel) panel.hidden = true;
  });
  document.getElementById('parseSmartPaste')?.addEventListener('click', parseSmartPasteText);
  document.getElementById('smartImportSheetSelect')?.addEventListener('change', (event) => {
    const selected = smartImportSheetCandidates.find(candidate => candidate.sheetName === event.currentTarget.value);
    if (!selected) return;
    syncDraftFromImportReview();
    const manualValues = collectImportReviewFields();
    smartImportDraft = mergeImportDraft(null, selected.parsed);
    smartImportDraft.fields = Object.assign({}, smartImportDraft.fields || {});
    smartImportDraft.fieldSources = Object.assign({}, smartImportDraft.fieldSources || {});
    smartImportManualFields.forEach((key) => {
      smartImportDraft.fields[key] = manualValues[key] || '';
      smartImportDraft.fieldSources[key] = 'manual';
    });
    renderSmartImportSheetPicker();
    renderSmartImportReview();
    setSmartImportProgress('Đã chuyển sang sheet “' + selected.sheetName + '”: ' + selected.parsed.products.length + ' sản phẩm.', 'success');
  });

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
      const result = await parseExcelFile(file);
      smartImportSheetCandidates = result.candidates;
      smartImportDraft = mergeSmartImportSource(result.parsed);
      renderSmartImportSheetPicker();
      renderSmartImportReview();
      setSmartImportProgress('Đã đọc sheet “' + result.parsed.sheetName + '”: ' + result.parsed.products.length + ' sản phẩm.', 'success');
    } catch (error) {
      console.error('Excel smart import failed:', error);
      setSmartImportProgress('Không thể đọc file Excel. Hãy kiểm tra định dạng hoặc thử file khác.', 'error');
    } finally {
      setSmartImportBusy(false);
      event.target.value = '';
    }
  });

  document.getElementById('pasteProducts')?.addEventListener('click', () => openSmartPaste());
  document.getElementById('importProductsExcel')?.addEventListener('click', () => {
    openSmartImport();
    document.getElementById('excelSmartImportInput')?.click();
  });
  document.getElementById('addProductTop')?.addEventListener('click', () => {
    document.getElementById('addProduct')?.click();
  });
  document.getElementById('productWorkspaceModal')?.addEventListener('paste', (event) => {
    const text = String(event.clipboardData?.getData('text/plain') || '');
    if (!text.includes('\t') || !text.includes('\n')) return;
    event.preventDefault();
    openSmartPaste(text);
    parseSmartPasteText();
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

let productWorkspaceLastFocus = null;

function productWorkspaceFocusable() {
  const modal = document.getElementById('productWorkspaceModal');
  if (!modal || modal.hidden) return [];
  return Array.from(modal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

function openProductWorkspace({ focusFirst = true } = {}) {
  const modal = document.getElementById('productWorkspaceModal');
  if (!modal) return;
  if (modal.hidden) {
    productWorkspaceLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  modal.hidden = false;
  document.body.classList.add('product-workspace-open');
  renderProductLaunchSummary();
  requestAnimationFrame(() => {
    const target = focusFirst
      ? document.querySelector('#productEditor [data-product-key="name"]') || document.getElementById('addProductTop')
      : document.getElementById('productWorkspaceTitle');
    target?.focus?.();
  });
}

function closeProductWorkspace({ restoreFocus = true } = {}) {
  const modal = document.getElementById('productWorkspaceModal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('product-workspace-open');
  renderProductLaunchSummary();
  if (activeContentBlock === 'products') setActiveContentBlock('');
  renderContentBlockSummaries();
  if (restoreFocus) requestAnimationFrame(() => productWorkspaceLastFocus?.focus?.());
}

document.getElementById('productWorkspaceModal')?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeProductWorkspace();
    return;
  }
  if (event.key !== 'Tab') return;
  const items = productWorkspaceFocusable();
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

document.getElementById('productWorkspaceModal')?.addEventListener('pointerdown', (event) => {
  if (event.target === event.currentTarget) closeProductWorkspace();
});
document.getElementById('openProductWorkspace')?.addEventListener('click', () => openProductWorkspace());
document.getElementById('openProductWorkspaceBottom')?.addEventListener('click', () => openProductWorkspace());
document.getElementById('closeProductWorkspace')?.addEventListener('click', () => closeProductWorkspace());
document.getElementById('doneProductWorkspace')?.addEventListener('click', () => closeProductWorkspace());

bindInputs();
setupCustomerEntryAutocomplete();
setupProductBulkActions();
setupMajorPanelToggles();
enhanceCollapsibleCards();
renderEditorProducts();
render();
renderProductLaunchSummary();
offerDraftRecovery();

document.getElementById('applyTungGiaBaoProfile')?.addEventListener('click', () => {
  applyTungGiaBaoToCurrentQuote();
});

document.getElementById('addProduct').addEventListener('click', () => {
  appendBlankProduct({ focusKey: 'name' });
});

document.getElementById('collapseAllProducts').addEventListener('click', () => {
  if (collapsedProducts.size === state.products.length) collapsedProducts.clear();
  else collapsedProducts = new Set(state.products.map((_, index) => index));
  renderEditorProducts();
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
  mono: '#30343a',
  'canva-blue': '#2563eb',
  'mint-finance': '#13a88a',
  'warm-proposal': '#ef7f4d',
  'violet-studio': '#7657d6',
  'reference-blue-corporate': '#1f6fe5',
  'blue-sidebar': '#1557a6',
  'executive-navy': '#172b4d',
  'sky-minimal': '#4b9be8'
};

const THEME_FONTS = {
  modern: 'Times New Roman',
  corporate: 'Arial',
  minimal: 'Arial',
  classic: 'Georgia',
  emerald: 'Arial',
  warm: 'Georgia',
  premium: 'Arial',
  mono: 'Arial',
  'canva-blue': 'Arial',
  'mint-finance': 'Arial',
  'warm-proposal': 'Arial',
  'violet-studio': 'Arial',
  'reference-blue-corporate': 'Arial',
  'blue-sidebar': 'Arial',
  'executive-navy': 'Arial',
  'sky-minimal': 'Arial'
};

const THEME_PROFILES = {
  modern: { showWebEmail: false, showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  corporate: { showWebEmail: false, showQuoteMeta: true, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  minimal: { showWebEmail: false, showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'airy', previewTableDensity: 'standard' },
  classic: { showWebEmail: false, showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  emerald: { showWebEmail: false, showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  warm: { showWebEmail: false, showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  premium: { showWebEmail: false, showQuoteMeta: true, previewTitleAlign: 'center', previewSpacing: 'standard', previewTableDensity: 'standard' },
  mono: { showWebEmail: false, showQuoteMeta: false, previewTitleAlign: 'center', previewSpacing: 'compact', previewTableDensity: 'compact' },
  'canva-blue': { showWebEmail: true, showQuoteMeta: true, previewTitleAlign: 'left', previewSpacing: 'standard', previewTableDensity: 'standard' },
  'mint-finance': { showWebEmail: true, showQuoteMeta: true, previewTitleAlign: 'left', previewSpacing: 'airy', previewTableDensity: 'standard' },
  'warm-proposal': { showWebEmail: true, showQuoteMeta: true, previewTitleAlign: 'left', previewSpacing: 'standard', previewTableDensity: 'standard' },
  'violet-studio': { showWebEmail: true, showQuoteMeta: true, previewTitleAlign: 'left', previewSpacing: 'standard', previewTableDensity: 'standard' },
  'reference-blue-corporate': { showWebEmail: true, showQuoteMeta: true, previewTitleAlign: 'left', previewSpacing: 'standard', previewTableDensity: 'standard' },
  'blue-sidebar': { showWebEmail: true, showQuoteMeta: true, previewTitleAlign: 'left', previewSpacing: 'standard', previewTableDensity: 'standard' },
  'executive-navy': { showWebEmail: true, showQuoteMeta: true, previewTitleAlign: 'left', previewSpacing: 'standard', previewTableDensity: 'standard' },
  'sky-minimal': { showWebEmail: true, showQuoteMeta: true, previewTitleAlign: 'left', previewSpacing: 'airy', previewTableDensity: 'standard' }
};

const THEME_PROFILE_FIELDS = [
  'theme','accent','docFont','showWebEmail','showQuoteMeta',
  'previewTitleAlign','previewSpacing','previewTableDensity'
];

let templateLibraryCategory = 'all';
let templateLibraryLastFocus = null;
let templateLibraryPreview = null;

function captureThemeProfileState() {
  return Object.fromEntries(THEME_PROFILE_FIELDS.map((key) => [key, state[key]]));
}

function restoreThemeProfileState(snapshot, { persist = false } = {}) {
  if (!snapshot) return;
  THEME_PROFILE_FIELDS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) state[key] = snapshot[key];
  });
  if (persist) save();
  syncInputs();
  render();
}

function setThemeState(themeName, { persist = true } = {}) {
  const next = Object.prototype.hasOwnProperty.call(THEME_ACCENTS, themeName) ? themeName : 'modern';
  state.theme = next;
  if (THEME_ACCENTS[next]) state.accent = THEME_ACCENTS[next];
  if (THEME_FONTS[next]) state.docFont = THEME_FONTS[next];
  Object.assign(state, THEME_PROFILES[next] || {});
  if (persist && state.logoTreatment === 'custom' && !state.logoBackdropColor) state.logoBackdropColor = state.accent;
  if (persist) save();
  syncInputs();
  render();
  return next;
}

function applyTheme(themeName) {
  return setThemeState(themeName, { persist: true });
}

function templateLibraryFocusable() {
  const modal = document.getElementById('templateLibraryModal');
  if (!modal || modal.hidden) return [];
  return [...modal.querySelectorAll('button:not([disabled]):not([hidden]),input:not([disabled]):not([hidden])')]
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function filterTemplateLibrary() {
  const query = String(document.getElementById('templateLibrarySearch')?.value || '').trim().toLowerCase();
  const cards = [...document.querySelectorAll('[data-template-library-theme]')];
  let visible = 0;
  cards.forEach((card) => {
    const categories = String(card.dataset.categories || '').split(/\s+/).filter(Boolean);
    const categoryMatch = templateLibraryCategory === 'all' || categories.includes(templateLibraryCategory);
    const haystack = (String(card.dataset.search || '') + ' ' + String(card.textContent || '')).toLowerCase();
    const queryMatch = !query || haystack.includes(query);
    card.hidden = !(categoryMatch && queryMatch);
    if (!card.hidden) visible += 1;
    card.classList.toggle('selected', card.dataset.templateLibraryTheme === state.theme);
  });
  const count = document.getElementById('templateLibraryCount');
  if (count) count.textContent = visible + ' mẫu';
  const empty = document.getElementById('templateLibraryEmpty');
  if (empty) empty.hidden = visible !== 0;
}

function openTemplateLibrary({ restoreSearch = false } = {}) {
  const modal = document.getElementById('templateLibraryModal');
  if (!modal) return;
  templateLibraryLastFocus = document.activeElement;
  modal.hidden = false;
  document.body.classList.add('template-library-open');
  document.getElementById('toggleInspectorTemplates')?.setAttribute('aria-expanded', 'true');
  if (!restoreSearch) {
    templateLibraryCategory = 'all';
    const search = document.getElementById('templateLibrarySearch');
    if (search) search.value = '';
    document.querySelectorAll('[data-template-category]').forEach((button) => {
      button.classList.toggle('active', button.dataset.templateCategory === 'all');
    });
  }
  filterTemplateLibrary();
  requestAnimationFrame(() => document.getElementById('templateLibrarySearch')?.focus());
}

function closeTemplateLibrary({ restoreFocus = true } = {}) {
  const modal = document.getElementById('templateLibraryModal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('template-library-open');
  document.getElementById('toggleInspectorTemplates')?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) templateLibraryLastFocus?.focus?.();
}

function setTemplatePreviewControls(active) {
  const back = document.getElementById('templatePreviewBack');
  const apply = document.getElementById('templatePreviewApply');
  const exit = document.getElementById('exitReportView');
  if (back) back.hidden = !active;
  if (apply) apply.hidden = !active;
  if (exit && document.querySelector('.shell')?.classList.contains('report-view')) exit.hidden = Boolean(active);
}

function previewTemplateFromLibrary(themeName) {
  const snapshot = captureThemeProfileState();
  const next = setThemeState(themeName, { persist: false });
  templateLibraryPreview = { theme: next, snapshot };
  closeTemplateLibrary({ restoreFocus: false });
  openTab('view');
  setTemplatePreviewControls(true);
}

function cancelTemplateLibraryPreview({ reopenLibrary = true } = {}) {
  const preview = templateLibraryPreview;
  if (!preview) {
    openTab('general');
    return;
  }
  templateLibraryPreview = null;
  restoreThemeProfileState(preview.snapshot, { persist: false });
  setTemplatePreviewControls(false);
  openTab('design');
  if (reopenLibrary) openTemplateLibrary({ restoreSearch: true });
}

function confirmTemplateLibraryPreview() {
  if (!templateLibraryPreview) return;
  const appliedTheme = templateLibraryPreview.theme;
  templateLibraryPreview = null;
  save();
  setTemplatePreviewControls(false);
  openTab('design');
  toast('Đã áp dụng mẫu ' + (THEME_LABELS[appliedTheme] || appliedTheme));
}

document.querySelectorAll('.tpl').forEach((el) => {
  el.addEventListener('mouseenter', () => {
    const description = document.getElementById('templateDescription');
    if (description) description.textContent = el.dataset.description || '';
  });
  el.addEventListener('mouseleave', () => {
    const active = document.querySelector('.tpl.active');
    const description = document.getElementById('templateDescription');
    if (description && active) description.textContent = active.dataset.description || '';
  });
  el.addEventListener('click', () => applyTheme(el.dataset.theme));
});

document.querySelectorAll('[data-content-theme]').forEach((el) => {
  el.addEventListener('click', () => applyTheme(el.dataset.contentTheme));
});

document.getElementById('toggleInspectorTemplates')?.addEventListener('click', () => openTemplateLibrary());
document.getElementById('openTemplateLibraryFromContent')?.addEventListener('click', (event) => {
  event.preventDefault();
  openTemplateLibrary();
});
document.getElementById('closeTemplateLibrary')?.addEventListener('click', () => closeTemplateLibrary());
document.getElementById('templateLibrarySearch')?.addEventListener('input', filterTemplateLibrary);
document.querySelectorAll('[data-template-category]').forEach((button) => {
  button.addEventListener('click', () => {
    templateLibraryCategory = button.dataset.templateCategory || 'all';
    document.querySelectorAll('[data-template-category]').forEach((item) => item.classList.toggle('active', item === button));
    filterTemplateLibrary();
  });
});
document.querySelectorAll('[data-template-library-theme]').forEach((card) => {
  card.addEventListener('click', () => previewTemplateFromLibrary(card.dataset.templateLibraryTheme));
});
document.getElementById('templatePreviewBack')?.addEventListener('click', () => cancelTemplateLibraryPreview({ reopenLibrary: true }));
document.getElementById('templatePreviewApply')?.addEventListener('click', confirmTemplateLibraryPreview);
document.getElementById('templateLibraryModal')?.addEventListener('click', (event) => {
  if (event.target === event.currentTarget) closeTemplateLibrary();
});
document.getElementById('templateLibraryModal')?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeTemplateLibrary();
    return;
  }
  if (event.key !== 'Tab') return;
  const items = templateLibraryFocusable();
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

$$('.color').forEach((el) => {
  el.addEventListener('click', () => {
    state.accent = el.dataset.color;
    save();
    render();
  });
});

function setDesignInspectorTab(tab) {
  const panel = document.getElementById('designPanel');
  if (!panel) return;
  const next = ['design','content','check'].includes(tab) ? tab : 'design';
  panel.dataset.inspectorTab = next;
  panel.querySelectorAll('[data-inspector-tab]').forEach((button) => {
    const active = button.dataset.inspectorTab === next;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  panel.querySelectorAll('[data-inspector-view]').forEach((view) => {
    view.hidden = view.dataset.inspectorView !== next;
  });
  if (next === 'check') updateDocumentHealth();
}

document.querySelectorAll('#designPanel [data-inspector-tab]').forEach((button) => {
  button.addEventListener('click', () => setDesignInspectorTab(button.dataset.inspectorTab));
});
document.querySelectorAll('#designPanel [data-inspector-open-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.inspectorOpenTab;
    if (CONTENT_BLOCKS[target]) openContentBlock(target);
    else openTab(target);
  });
});
document.getElementById('inspectorRunCheck')?.addEventListener('click', () => {
  updateDocumentHealth();
  renderStudioGuidance();
});
document.getElementById('inspectorPreviewQuote')?.addEventListener('click', () => openTab('view'));

document.getElementById('openDesign').addEventListener('click', () => {
  setDesignInspectorTab('design');
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
document.getElementById('exportCsv')?.addEventListener('click', exportCurrentQuoteCsv);
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


let dataLibraryImportDraft = null;
let dataLibraryImportLastFocus = null;
let dataLibraryImportReadToken = 0;
let dataLibraryOperationHistory = [];

function dataLibraryModeLabel(mode) {
  return mode === 'customer' ? 'Khách hàng' : 'Sản phẩm';
}

function dataLibraryOperationStateLabel(state) {
  if (state === 'undo-available') return 'Có thể hoàn tác';
  if (state === 'undone') return 'Đã hoàn tác';
  return 'Đã hoàn tất';
}

function renderDataLibraryOperationHistory() {
  const panel = document.getElementById('dataLibraryActivity');
  const list = document.getElementById('dataLibraryActivityList');
  if (!panel || !list) return;
  panel.hidden = dataLibraryOperationHistory.length === 0;
  list.innerHTML = '';
  dataLibraryOperationHistory.forEach(entry => {
    const row = document.createElement('article');
    row.className = 'data-library-activity-item';
    row.dataset.state = entry.state;

    const meta = document.createElement('div');
    meta.className = 'data-library-activity-meta';
    const scope = document.createElement('strong');
    scope.textContent = dataLibraryModeLabel(entry.mode);
    const time = document.createElement('span');
    time.textContent = new Date(entry.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    meta.append(scope, time);

    const summary = document.createElement('p');
    summary.textContent = entry.summary;

    const state = document.createElement('span');
    state.className = 'data-library-activity-state';
    state.textContent = dataLibraryOperationStateLabel(entry.state);

    row.append(meta, summary, state);
    list.appendChild(row);
  });
}

function recordDataLibraryOperation(mode, summary, state = 'committed') {
  const entry = {
    id: String(Date.now()) + '-' + String(Math.random()).slice(2),
    mode,
    summary: String(summary || ''),
    state,
    at: Date.now()
  };
  dataLibraryOperationHistory = [entry, ...dataLibraryOperationHistory]
    .slice(0, DATA_LIBRARY_OPERATION_HISTORY_LIMIT);
  renderDataLibraryOperationHistory();
  return entry.id;
}

function setDataLibraryOperationState(id, state) {
  const entry = dataLibraryOperationHistory.find(item => item.id === id);
  if (!entry) return false;
  entry.state = state;
  renderDataLibraryOperationHistory();
  return true;
}

function refreshDataLibraryAfterMutation(mode) {
  if (mode === 'customer') {
    selectedCustomerLibraryIds.clear();
    refreshCustomerEntrySuggestions();
  } else {
    selectedProductCatalogIds.clear();
    refreshProductEntrySuggestions();
  }
  renderMasterData();
  renderDashboard();
}

function restoreDataLibrarySnapshot(mode, items) {
  const snapshot = clone(Array.isArray(items) ? items : []);
  const restored = mode === 'customer'
    ? setCustomerLibrary(snapshot)
    : setProductCatalog(snapshot);
  if (!restored) return false;
  refreshDataLibraryAfterMutation(mode);
  return true;
}

function offerDataLibraryUndo(mode, previousItems, message) {
  const snapshot = clone(Array.isArray(previousItems) ? previousItems : []);
  const operationId = recordDataLibraryOperation(mode, message, 'undo-available');
  let settled = false;
  const settleTimer = setTimeout(() => {
    if (settled) return;
    settled = true;
    setDataLibraryOperationState(operationId, 'committed');
  }, 8000);

  toast(message + ' • Có thể hoàn tác trong 8 giây.', {
    label: 'Hoàn tác',
    duration: 8000,
    onClick: () => {
      if (settled || !restoreDataLibrarySnapshot(mode, snapshot)) return;
      settled = true;
      clearTimeout(settleTimer);
      setDataLibraryOperationState(operationId, 'undone');
      toast(mode === 'customer'
        ? 'Đã hoàn tác thay đổi danh bạ khách hàng'
        : 'Đã hoàn tác thay đổi danh mục sản phẩm');
    }
  });
}

let dataLibraryImportRecoveryPromptedAt = 0;

function clearDataLibraryImportRecovery() {
  try {
    sessionStorage.removeItem(DATA_LIBRARY_IMPORT_RECOVERY);
  } catch (error) {
    console.warn('Data Library import recovery could not be cleared.', error);
  }
  dataLibraryImportRecoveryPromptedAt = 0;
}

function writeDataLibraryImportRecovery() {
  if (!dataLibraryImportDraft?.candidates?.length) return false;
  try {
    const payload = {
      schemaVersion: 1,
      savedAt: Date.now(),
      mode: dataLibraryImportDraft.mode,
      fileName: String(dataLibraryImportDraft.fileName || ''),
      sheetName: String(dataLibraryImportDraft.sheetName || ''),
      duplicateChoices: clone(dataLibraryImportDraft.duplicateChoices || {}),
      ignoredInvalidRows: clone(dataLibraryImportDraft.ignoredInvalidRows || {}),
      candidates: dataLibraryImportDraft.candidates.map(candidate => ({
        sheetName: String(candidate.sheetName || ''),
        rows: Array.isArray(candidate.rows) ? candidate.rows : []
      }))
    };
    const serialized = JSON.stringify(payload);
    if (serialized.length > DATA_LIBRARY_IMPORT_RECOVERY_MAX_CHARS) {
      clearDataLibraryImportRecovery();
      console.warn('Data Library import recovery skipped because the parsed review exceeds the safe session limit.');
      return false;
    }
    sessionStorage.setItem(DATA_LIBRARY_IMPORT_RECOVERY, serialized);
    dataLibraryImportRecoveryPromptedAt = 0;
    return true;
  } catch (error) {
    console.warn('Data Library import recovery could not be stored.', error);
    return false;
  }
}

function readDataLibraryImportRecovery() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(DATA_LIBRARY_IMPORT_RECOVERY) || 'null');
    if (!parsed) return null;
    if (parsed.schemaVersion !== 1 || !['customer','product'].includes(parsed.mode)) {
      clearDataLibraryImportRecovery();
      return null;
    }
    const savedAt = Number(parsed.savedAt);
    const now = Date.now();
    const clockSkewLimit = 5 * 60 * 1000;
    if (
      !Number.isFinite(savedAt) ||
      savedAt <= 0 ||
      savedAt > now + clockSkewLimit ||
      now - savedAt > DATA_LIBRARY_IMPORT_RECOVERY_TTL_MS
    ) {
      clearDataLibraryImportRecovery();
      return null;
    }
    const candidates = (Array.isArray(parsed.candidates) ? parsed.candidates : [])
      .flatMap(candidate => {
        if (!candidate || !Array.isArray(candidate.rows)) return [];
        const normalized = normalizeLibraryImportCandidate(
          parsed.mode,
          String(candidate.sheetName || 'Sheet'),
          candidate.rows
        );
        return normalized.items.length || normalized.invalidRows.length ? [normalized] : [];
      });
    if (!candidates.length) {
      clearDataLibraryImportRecovery();
      return null;
    }
    const requestedSheet = String(parsed.sheetName || '');
    const sheetName = candidates.some(candidate => candidate.sheetName === requestedSheet)
      ? requestedSheet
      : candidates[0].sheetName;
    return {
      savedAt,
      mode: parsed.mode,
      fileName: String(parsed.fileName || 'Phiên nhập dữ liệu'),
      sheetName,
      candidates,
      duplicateChoices: parsed.duplicateChoices && typeof parsed.duplicateChoices === 'object'
        ? parsed.duplicateChoices
        : {},
      ignoredInvalidRows: parsed.ignoredInvalidRows && typeof parsed.ignoredInvalidRows === 'object'
        ? parsed.ignoredInvalidRows
        : {}
    };
  } catch (error) {
    console.warn('Data Library import recovery is invalid and will be discarded.', error);
    clearDataLibraryImportRecovery();
    return null;
  }
}

function restoreDataLibraryImportRecovery(recovery) {
  if (!recovery?.candidates?.length) return false;
  dataLibraryImportDraft = {
    mode: recovery.mode,
    fileName: recovery.fileName,
    sheetName: recovery.sheetName,
    candidates: recovery.candidates,
    duplicateChoices: clone(recovery.duplicateChoices || {}),
    ignoredInvalidRows: clone(recovery.ignoredInvalidRows || {})
  };
  dataLibraryImportLastFocus = document.querySelector('[data-tab="master"]');
  const modal = document.getElementById('dataLibraryImportModal');
  if (!modal) return false;
  modal.hidden = false;
  document.body.classList.add('data-library-import-open');
  renderDataLibraryImport();
  const sheetSelect = document.getElementById('dataLibraryImportSheetSelect');
  const apply = document.getElementById('applyDataLibraryImport');
  if (sheetSelect && !sheetSelect.closest('[hidden]')) sheetSelect.focus();
  else apply?.focus?.();
  return true;
}

function offerDataLibraryImportRecovery() {
  if (dataLibraryImportDraft) return;
  const recovery = readDataLibraryImportRecovery();
  if (!recovery || dataLibraryImportRecoveryPromptedAt === recovery.savedAt) return;
  dataLibraryImportRecoveryPromptedAt = recovery.savedAt;
  const savedTime = new Date(recovery.savedAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const remainingMs = Math.max(0, DATA_LIBRARY_IMPORT_RECOVERY_TTL_MS - (Date.now() - recovery.savedAt));
  const remainingText = remainingMs >= 60 * 60 * 1000
    ? Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000))) + ' giờ'
    : Math.max(1, Math.ceil(remainingMs / (60 * 1000))) + ' phút';
  toast('Có phiên nhập dữ liệu chưa áp dụng từ ' + savedTime + '. Tự xóa sau khoảng ' + remainingText + '.', {
    label: 'Khôi phục',
    duration: 12000,
    onClick: () => restoreDataLibraryImportRecovery(recovery)
  });
}

function dataLibraryImportKey(mode, item) {
  return mode === 'customer' ? customerKey(item) : catalogKey(item);
}

function dataLibraryDuplicateGroups(mode, items) {
  const groups = new Map();
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    const key = dataLibraryImportKey(mode, item);
    if (!key) return;
    const indexes = groups.get(key) || [];
    indexes.push(index);
    groups.set(key, indexes);
  });
  return [...groups.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([key, indexes]) => ({ key, indexes }));
}

function normalizeLibraryImportCandidate(mode, sheetName, rows) {
  let items = [];
  let invalidRows = [];
  if (mode === 'customer') {
    const parsed = parseCustomerSpreadsheetRows(rows);
    items = (parsed.customers || []).map(customer => ({
      name: String(customer.name || ''),
      company: String(customer.company || ''),
      address: String(customer.address || ''),
      phone: String(customer.phone || ''),
      email: String(customer.email || ''),
      contact: String(customer.contact || '')
    }));
    invalidRows = parsed.invalidRows || [];
  } else {
    const parsed = parseSpreadsheetRows(rows);
    if (parsed.spreadsheetMeta?.mapping) {
      const rebuilt = parseMappedSpreadsheetRows(rows, {
        headerIndex: parsed.spreadsheetMeta.headerIndex,
        mapping: parsed.spreadsheetMeta.mapping
      });
      items = rebuilt.products || [];
      invalidRows = rebuilt.invalidRows || [];
    } else {
      items = parsed.products || [];
    }
    items = items.map(product => ({
      group: String(product.group || ''),
      name: String(product.name || ''),
      pack: String(product.pack || ''),
      unit: String(product.unit || ''),
      price: normalizeNonNegativeNumber(product.price),
      currency: normalizeCatalogCurrency(product.currency || state.currency || 'VND'),
      note: String(product.note || '')
    }));
  }

  const duplicateGroups = dataLibraryDuplicateGroups(mode, items);
  const duplicateKeys = new Set(duplicateGroups.map(group => group.key));
  const existing = mode === 'customer' ? getCustomerLibrary() : getProductCatalog();
  const existingKeys = new Set(existing.map(item => dataLibraryImportKey(mode, item)).filter(Boolean));
  const accepted = items.filter(item => {
    const key = dataLibraryImportKey(mode, item);
    return key && !duplicateKeys.has(key);
  });
  const updateCount = accepted.filter(item => existingKeys.has(dataLibraryImportKey(mode, item))).length;

  return {
    mode,
    sheetName,
    rows,
    items,
    accepted,
    invalidRows,
    duplicateGroups,
    duplicateKeys,
    updateCount,
    score: accepted.length * 12 - invalidRows.length * 2 - duplicateGroups.length * 4
  };
}

async function readDataLibraryWorkbook(file, mode) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const fileName = String(file?.name || '').toLowerCase();
  const workbook = fileName.endsWith('.csv')
    ? XLSX.read(new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, ''), { type: 'string', raw: true })
    : XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames || [];
  if (!sheetNames.length) throw new Error('Workbook không có sheet dữ liệu.');
  const candidates = sheetNames.map(sheetName => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: true
    });
    return normalizeLibraryImportCandidate(mode, sheetName, rows);
  }).sort((a, b) => b.score - a.score);
  return candidates;
}

function currentDataLibraryImportCandidate() {
  if (!dataLibraryImportDraft?.candidates?.length) return null;
  return dataLibraryImportDraft.candidates.find(candidate =>
    candidate.sheetName === dataLibraryImportDraft.sheetName
  ) || dataLibraryImportDraft.candidates[0];
}

function dataLibraryImportReviewState(candidate) {
  if (!candidate) return {
    accepted: [],
    unresolvedDuplicateGroups: [],
    unresolvedInvalidRows: [],
    ignoredInvalidRows: [],
    updateCount: 0
  };
  const sheetName = candidate.sheetName;
  const choices = dataLibraryImportDraft?.duplicateChoices?.[sheetName] || {};
  const ignoredRows = new Set(
    (dataLibraryImportDraft?.ignoredInvalidRows?.[sheetName] || [])
      .map(value => Number(value))
      .filter(Number.isFinite)
  );
  const accepted = candidate.items.filter((item, index) => {
    const key = dataLibraryImportKey(candidate.mode, item);
    if (!key) return false;
    if (!candidate.duplicateKeys.has(key)) return true;
    const selectedIndex = Number(choices[key]);
    return Number.isInteger(selectedIndex) && selectedIndex === index;
  });
  const unresolvedDuplicateGroups = candidate.duplicateGroups.filter(group => {
    const selectedIndex = Number(choices[group.key]);
    return !Number.isInteger(selectedIndex) || !group.indexes.includes(selectedIndex);
  });
  const unresolvedInvalidRows = candidate.invalidRows.filter(row => !ignoredRows.has(Number(row.rowNumber)));
  const ignoredInvalidRows = candidate.invalidRows.filter(row => ignoredRows.has(Number(row.rowNumber)));
  const existing = candidate.mode === 'customer' ? getCustomerLibrary() : getProductCatalog();
  const existingKeys = new Set(existing.map(item => dataLibraryImportKey(candidate.mode, item)).filter(Boolean));
  const updateCount = accepted.filter(item => existingKeys.has(dataLibraryImportKey(candidate.mode, item))).length;
  return { accepted, unresolvedDuplicateGroups, unresolvedInvalidRows, ignoredInvalidRows, updateCount };
}

function chooseDataLibraryImportDuplicate(sheetName, key, itemIndex) {
  if (!dataLibraryImportDraft) return;
  if (!dataLibraryImportDraft.duplicateChoices) dataLibraryImportDraft.duplicateChoices = {};
  if (!dataLibraryImportDraft.duplicateChoices[sheetName]) dataLibraryImportDraft.duplicateChoices[sheetName] = {};
  dataLibraryImportDraft.duplicateChoices[sheetName][key] = Number(itemIndex);
  writeDataLibraryImportRecovery();
  renderDataLibraryImport();
  requestAnimationFrame(() => focusNextDataLibraryImportIssue({ fromStart: true }));
}

function ignoreDataLibraryImportInvalidRow(sheetName, rowNumber) {
  if (!dataLibraryImportDraft) return;
  if (!dataLibraryImportDraft.ignoredInvalidRows) dataLibraryImportDraft.ignoredInvalidRows = {};
  const current = new Set(
    (dataLibraryImportDraft.ignoredInvalidRows[sheetName] || [])
      .map(value => Number(value))
      .filter(Number.isFinite)
  );
  current.add(Number(rowNumber));
  dataLibraryImportDraft.ignoredInvalidRows[sheetName] = [...current];
  writeDataLibraryImportRecovery();
  renderDataLibraryImport();
  requestAnimationFrame(() => focusNextDataLibraryImportIssue({ fromStart: true }));
}

function dataLibraryImportItemSummary(mode, item) {
  if (mode === 'customer') {
    return [item.name, item.company, item.phone, item.email].filter(Boolean).join(' • ') || 'Khách hàng chưa đủ thông tin';
  }
  return [
    item.name,
    item.group,
    [item.unit, item.pack].filter(Boolean).join(' / '),
    moneyForCurrency(item.price, item.currency)
  ].filter(Boolean).join(' • ') || 'Sản phẩm chưa đủ thông tin';
}

function focusNextDataLibraryImportIssue({ fromStart = false } = {}) {
  const list = document.getElementById('dataLibraryImportIssueList');
  const apply = document.getElementById('applyDataLibraryImport');
  if (!list) return false;
  const unresolved = [...list.querySelectorAll('[data-review-unresolved="true"]')];
  if (!unresolved.length) {
    if (apply && !apply.disabled) {
      apply.focus?.({ preventScroll: true });
      apply.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      return true;
    }
    return false;
  }
  const focused = document.activeElement?.closest?.('[data-review-unresolved="true"]');
  const marked = list.querySelector('[data-review-current="true"]');
  const current = fromStart ? null : (focused || marked);
  const currentIndex = current ? unresolved.indexOf(current) : -1;
  const next = currentIndex < 0
    ? unresolved[0]
    : unresolved[(currentIndex + 1) % unresolved.length];
  unresolved.forEach(card => {
    delete card.dataset.reviewCurrent;
  });
  next.dataset.reviewCurrent = 'true';
  const target = next.querySelector('button:not([disabled]), input:not([disabled])') || next;
  if (!next.hasAttribute('tabindex')) next.tabIndex = -1;
  target.focus?.({ preventScroll: true });
  next.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  return true;
}

function focusInitialDataLibraryImportReview() {
  const sheetRow = document.getElementById('dataLibraryImportSheetRow');
  const sheetSelect = document.getElementById('dataLibraryImportSheetSelect');
  if (sheetRow && !sheetRow.hidden && sheetSelect && !sheetSelect.disabled) {
    sheetSelect.focus?.();
    return true;
  }
  if (focusNextDataLibraryImportIssue({ fromStart: true })) return true;
  const apply = document.getElementById('applyDataLibraryImport');
  if (apply && !apply.disabled) {
    apply.focus?.();
    return true;
  }
  document.getElementById('cancelDataLibraryImport')?.focus?.();
  return false;
}

function trapDataLibraryImportTab(event, modal) {
  if (event.key !== 'Tab' || !modal || modal.hidden) return false;
  const controls = [...modal.querySelectorAll(
    'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(element => !element.closest('[hidden]'));
  if (!controls.length) return false;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

function closeDataLibraryImport({ restoreFocus = true, discardRecovery = false } = {}) {
  dataLibraryImportReadToken += 1;
  const modal = document.getElementById('dataLibraryImportModal');
  if (modal) modal.hidden = true;
  document.body.classList.remove('data-library-import-open');
  document.getElementById('customerLibraryExcelInput')?.setAttribute('value', '');
  document.getElementById('productLibraryExcelInput')?.setAttribute('value', '');
  if (discardRecovery) clearDataLibraryImportRecovery();
  if (restoreFocus) dataLibraryImportLastFocus?.focus?.();
  dataLibraryImportDraft = null;
}

function renderDataLibraryImport() {
  const candidate = currentDataLibraryImportCandidate();
  const modal = document.getElementById('dataLibraryImportModal');
  if (!candidate || !modal) return;

  const isCustomer = candidate.mode === 'customer';
  const reviewState = dataLibraryImportReviewState(candidate);
  setText('dataLibraryImportTitle', isCustomer ? 'KIỂM TRA DANH BẠ TRƯỚC KHI NHẬP' : 'KIỂM TRA DANH MỤC TRƯỚC KHI NHẬP');
  setText('dataLibraryImportSubtitle', (dataLibraryImportDraft.fileName || 'File dữ liệu') + ' • ' + candidate.sheetName);
  setText('dataLibraryImportValidCount', reviewState.accepted.length);
  setText('dataLibraryImportUpdateCount', reviewState.updateCount);
  setText('dataLibraryImportInvalidCount', reviewState.unresolvedInvalidRows.length);
  setText('dataLibraryImportDuplicateCount', reviewState.unresolvedDuplicateGroups.length);

  const unresolvedTotal = reviewState.unresolvedDuplicateGroups.length + reviewState.unresolvedInvalidRows.length;
  const resolvedDuplicateCount = candidate.duplicateGroups.length - reviewState.unresolvedDuplicateGroups.length;
  const completion = document.getElementById('dataLibraryImportCompletion');
  if (completion) {
    const hadReviewIssues = candidate.duplicateGroups.length > 0 || candidate.invalidRows.length > 0;
    if (unresolvedTotal > 0) {
      completion.dataset.state = 'warning';
      setText('dataLibraryImportCompletionTitle', 'Còn ' + unresolvedTotal + ' vấn đề cần xử lý');
      setText(
        'dataLibraryImportCompletionDetail',
        'Có thể áp dụng ' + reviewState.accepted.length + ' dòng an toàn; ' +
          unresolvedTotal + ' vấn đề chưa xử lý sẽ không được nhập.'
      );
    } else if (hadReviewIssues) {
      completion.dataset.state = 'ready';
      setText('dataLibraryImportCompletionTitle', 'Đã xử lý xong toàn bộ vấn đề');
      const resolvedParts = [];
      if (resolvedDuplicateCount) resolvedParts.push('đã chọn bản giữ cho ' + resolvedDuplicateCount + ' nhóm trùng');
      if (reviewState.ignoredInvalidRows.length) resolvedParts.push('đã xác nhận bỏ qua ' + reviewState.ignoredInvalidRows.length + ' dòng lỗi');
      setText(
        'dataLibraryImportCompletionDetail',
        (resolvedParts.length ? resolvedParts.join(' • ') + '. ' : '') +
          reviewState.accepted.length + ' dòng đã sẵn sàng để áp dụng.'
      );
    } else {
      completion.dataset.state = 'ready';
      setText('dataLibraryImportCompletionTitle', 'Dữ liệu đã sẵn sàng');
      setText('dataLibraryImportCompletionDetail', reviewState.accepted.length + ' dòng hợp lệ, không có lỗi hoặc nhóm trùng cần xử lý.');
    }
  }

  const sheetRow = document.getElementById('dataLibraryImportSheetRow');
  const sheetSelect = document.getElementById('dataLibraryImportSheetSelect');
  if (sheetRow && sheetSelect) {
    sheetRow.hidden = dataLibraryImportDraft.candidates.length <= 1;
    sheetSelect.innerHTML = '';
    dataLibraryImportDraft.candidates.forEach(item => {
      const option = document.createElement('option');
      option.value = item.sheetName;
      option.textContent = item.sheetName + ' • ' + dataLibraryImportReviewState(item).accepted.length + ' dòng áp dụng';
      option.selected = item.sheetName === candidate.sheetName;
      sheetSelect.appendChild(option);
    });
  }

  const notice = document.getElementById('dataLibraryImportNotice');
  if (notice) {
    const messages = [];
    if (reviewState.unresolvedInvalidRows.length) messages.push(reviewState.unresolvedInvalidRows.length + ' dòng lỗi chưa xác nhận bỏ qua');
    if (reviewState.unresolvedDuplicateGroups.length) messages.push(reviewState.unresolvedDuplicateGroups.length + ' nhóm trùng không được tự gộp, đang chờ bạn chọn bản giữ');
    if (reviewState.ignoredInvalidRows.length) messages.push(reviewState.ignoredInvalidRows.length + ' dòng lỗi đã xác nhận bỏ qua');
    if (reviewState.updateCount) messages.push(reviewState.updateCount + ' bản ghi có sẵn sẽ được cập nhật');
    notice.textContent = messages.length
      ? messages.join(' • ') + '. Hệ thống chỉ áp dụng các dòng bạn đã xác nhận an toàn.'
      : 'Dữ liệu hợp lệ. Bạn có thể áp dụng vào thư viện.';
    notice.dataset.tone = reviewState.unresolvedInvalidRows.length || reviewState.unresolvedDuplicateGroups.length ? 'warning' : 'ready';
  }

  const issues = document.getElementById('dataLibraryImportIssues');
  const issueList = document.getElementById('dataLibraryImportIssueList');
  if (issues && issueList) {
    issueList.innerHTML = '';
    const choices = dataLibraryImportDraft?.duplicateChoices?.[candidate.sheetName] || {};
    const ignoredRows = new Set(
      (dataLibraryImportDraft?.ignoredInvalidRows?.[candidate.sheetName] || [])
        .map(value => Number(value))
        .filter(Number.isFinite)
    );
    const showResolved = Boolean(document.getElementById('dataLibraryImportShowResolved')?.checked);
    setText('dataLibraryImportUnresolvedCount', unresolvedTotal + ' chưa xử lý');
    const nextIssueButton = document.getElementById('dataLibraryImportNextIssue');
    if (nextIssueButton) nextIssueButton.disabled = unresolvedTotal === 0;
    candidate.duplicateGroups.forEach((group, groupIndex) => {
      const card = document.createElement('article');
      card.className = 'data-library-import-issue-card';
      const title = document.createElement('div');
      title.className = 'data-library-import-issue-title';
      const selectedIndex = Number(choices[group.key]);
      const resolved = Number.isInteger(selectedIndex) && group.indexes.includes(selectedIndex);
      if (resolved && !showResolved) return;
      card.dataset.reviewUnresolved = resolved ? 'false' : 'true';
      card.dataset.reviewResolved = resolved ? 'true' : 'false';
      title.innerHTML = '<strong>Nhóm trùng ' + (groupIndex + 1) + '</strong><span>' + (resolved ? 'Đã chọn bản giữ' : 'Chọn đúng 1 dòng để tiếp tục') + '</span>';
      card.appendChild(title);
      group.indexes.forEach(itemIndex => {
        const item = candidate.items[itemIndex];
        if (!item) return;
        const option = document.createElement('div');
        option.className = 'data-library-import-issue-option';
        const summary = document.createElement('span');
        summary.textContent = dataLibraryImportItemSummary(candidate.mode, item);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = selectedIndex === itemIndex ? 'Đang giữ dòng này' : 'Giữ dòng này';
        button.setAttribute('aria-pressed', selectedIndex === itemIndex ? 'true' : 'false');
        button.addEventListener('click', () => chooseDataLibraryImportDuplicate(candidate.sheetName, group.key, itemIndex));
        option.append(summary, button);
        card.appendChild(option);
      });
      issueList.appendChild(card);
    });
    candidate.invalidRows.forEach(row => {
      const resolved = ignoredRows.has(Number(row.rowNumber));
      if (resolved && !showResolved) return;
      const card = document.createElement('article');
      card.className = 'data-library-import-issue-card invalid';
      card.dataset.reviewUnresolved = resolved ? 'false' : 'true';
      card.dataset.reviewResolved = resolved ? 'true' : 'false';
      const sourceRow = Array.isArray(candidate.rows?.[Number(row.rowNumber) - 1])
        ? candidate.rows[Number(row.rowNumber) - 1]
        : [];
      const title = document.createElement('div');
      title.className = 'data-library-import-issue-title';
      const reasons = Array.isArray(row.reasons) ? row.reasons.join(', ') : (row.reason || 'Dữ liệu không hợp lệ');
      title.innerHTML = '<strong>Dòng ' + row.rowNumber + (resolved ? ' đã bỏ qua' : ' chưa hợp lệ') + '</strong><span>' + reasons + '</span>';
      const raw = document.createElement('div');
      raw.className = 'data-library-import-invalid-raw';
      raw.textContent = sourceRow.map(value => String(value ?? '')).filter(Boolean).join(' • ') || 'Dòng trống hoặc không đủ dữ liệu nhận diện.';
      card.append(title, raw);
      if (!resolved) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = 'Xác nhận bỏ qua dòng này';
        button.addEventListener('click', () => ignoreDataLibraryImportInvalidRow(candidate.sheetName, row.rowNumber));
        card.appendChild(button);
      }
      issueList.appendChild(card);
    });
    issues.hidden = candidate.duplicateGroups.length === 0 && candidate.invalidRows.length === 0;
  }

  const head = document.getElementById('dataLibraryImportPreviewHead');
  const body = document.getElementById('dataLibraryImportPreviewBody');
  if (head && body) {
    head.innerHTML = '';
    body.innerHTML = '';
    const headers = isCustomer
      ? ['Trạng thái', 'Khách hàng', 'Công ty', 'SĐT', 'Email']
      : ['Trạng thái', 'Sản phẩm', 'Nhóm', 'ĐVT / Quy cách', 'Đơn giá'];
    headers.forEach(label => {
      const span = document.createElement('span');
      span.textContent = label;
      head.appendChild(span);
    });

    const existing = isCustomer ? getCustomerLibrary() : getProductCatalog();
    const existingKeys = new Set(existing.map(item => dataLibraryImportKey(candidate.mode, item)).filter(Boolean));
    candidate.items.slice(0, 80).forEach(item => {
      const key = dataLibraryImportKey(candidate.mode, item);
      const row = document.createElement('div');
      row.className = 'data-library-import-preview-row';
      const duplicate = candidate.duplicateKeys.has(key);
      const selectedIndex = Number(dataLibraryImportDraft?.duplicateChoices?.[candidate.sheetName]?.[key]);
      const duplicateSelected = duplicate && Number.isInteger(selectedIndex) && selectedIndex === candidate.items.indexOf(item);
      const duplicateResolved = duplicate && Number.isInteger(selectedIndex);
      const status = duplicate
        ? (duplicateSelected ? 'Đã chọn' : duplicateResolved ? 'Bỏ qua' : 'Cần chọn')
        : existingKeys.has(key) ? 'Cập nhật' : 'Mới';
      row.dataset.state = duplicate ? (duplicateSelected ? 'update' : 'duplicate') : existingKeys.has(key) ? 'update' : 'new';
      const values = isCustomer
        ? [status, item.name || '—', item.company || '—', item.phone || '—', item.email || '—']
        : [status, item.name || '—', item.group || '—', [item.unit, item.pack].filter(Boolean).join(' / ') || '—', moneyForCurrency(item.price, item.currency)];
      values.forEach(value => {
        const cell = document.createElement('span');
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    if (candidate.items.length > 80) {
      const more = document.createElement('div');
      more.className = 'data-library-import-more';
      more.textContent = 'Đang xem 80/' + candidate.items.length + ' dòng. Toàn bộ dòng hợp lệ vẫn được xử lý khi áp dụng.';
      body.appendChild(more);
    }
  }

  const apply = document.getElementById('applyDataLibraryImport');
  if (apply) {
    apply.disabled = reviewState.accepted.length === 0;
    if (!reviewState.accepted.length) {
      apply.textContent = 'Không có dòng đã xác nhận để áp dụng';
      apply.dataset.reviewState = 'empty';
    } else if (unresolvedTotal > 0) {
      apply.textContent = 'Áp dụng ' + reviewState.accepted.length + ' dòng an toàn • bỏ qua ' + unresolvedTotal + ' vấn đề';
      apply.dataset.reviewState = 'warning';
    } else {
      apply.textContent = 'Áp dụng ' + reviewState.accepted.length + ' dòng đã kiểm tra';
      apply.dataset.reviewState = 'ready';
    }
  }
}

function resetDataLibraryImportReviewForLoading(fileName) {
  setText('dataLibraryImportSubtitle', 'Đang đọc ' + String(fileName || 'file dữ liệu') + '...');
  setText('dataLibraryImportValidCount', '0');
  setText('dataLibraryImportUpdateCount', '0');
  setText('dataLibraryImportInvalidCount', '0');
  setText('dataLibraryImportDuplicateCount', '0');

  const sheetRow = document.getElementById('dataLibraryImportSheetRow');
  const sheetSelect = document.getElementById('dataLibraryImportSheetSelect');
  if (sheetRow) sheetRow.hidden = true;
  if (sheetSelect) sheetSelect.innerHTML = '';

  const notice = document.getElementById('dataLibraryImportNotice');
  if (notice) {
    notice.textContent = 'Đang đọc và nhận diện dữ liệu mới...';
    notice.dataset.tone = 'working';
  }

  const completion = document.getElementById('dataLibraryImportCompletion');
  if (completion) completion.dataset.state = 'pending';
  setText('dataLibraryImportCompletionTitle', 'Đang kiểm tra dữ liệu');
  setText('dataLibraryImportCompletionDetail', 'Hệ thống sẽ báo rõ khi phần kiểm tra đã hoàn tất.');

  const head = document.getElementById('dataLibraryImportPreviewHead');
  const body = document.getElementById('dataLibraryImportPreviewBody');
  if (head) head.innerHTML = '';
  if (body) body.innerHTML = '';
  const issues = document.getElementById('dataLibraryImportIssues');
  const issueList = document.getElementById('dataLibraryImportIssueList');
  const showResolved = document.getElementById('dataLibraryImportShowResolved');
  if (issues) issues.hidden = true;
  if (issueList) issueList.innerHTML = '';
  if (showResolved) showResolved.checked = false;
  setText('dataLibraryImportUnresolvedCount', '0 chưa xử lý');
  const nextIssueButton = document.getElementById('dataLibraryImportNextIssue');
  if (nextIssueButton) nextIssueButton.disabled = true;

  const apply = document.getElementById('applyDataLibraryImport');
  if (apply) {
    apply.disabled = true;
    apply.textContent = 'Đang đọc dữ liệu...';
  }
}

async function openDataLibraryImport(file, mode, trigger) {
  if (!file) return;
  const readToken = ++dataLibraryImportReadToken;
  dataLibraryImportLastFocus = trigger || document.activeElement;
  const modal = document.getElementById('dataLibraryImportModal');
  if (!modal) return;
  dataLibraryImportDraft = null;
  modal.hidden = false;
  document.body.classList.add('data-library-import-open');
  resetDataLibraryImportReviewForLoading(file.name);
  try {
    const candidates = await readDataLibraryWorkbook(file, mode);
    if (readToken !== dataLibraryImportReadToken) return;
    dataLibraryImportDraft = {
      mode,
      fileName: file.name,
      candidates,
      sheetName: candidates[0]?.sheetName || '',
      duplicateChoices: {},
      ignoredInvalidRows: {}
    };
    if (!candidates[0] || (!candidates[0].items.length && !candidates[0].invalidRows.length)) {
      throw new Error('Không nhận diện được dữ liệu phù hợp trong file.');
    }
    writeDataLibraryImportRecovery();
    renderDataLibraryImport();
    focusInitialDataLibraryImportReview();
  } catch (error) {
    if (readToken !== dataLibraryImportReadToken) return;
    console.error('Data Library import failed:', error);
    closeDataLibraryImport({ restoreFocus: false });
    alert('Không thể đọc dữ liệu thư viện từ file này. Hãy kiểm tra tiêu đề cột và định dạng Excel/CSV.');
    dataLibraryImportLastFocus?.focus?.();
  }
}

function applyDataLibraryImport() {
  const candidate = currentDataLibraryImportCandidate();
  const reviewState = dataLibraryImportReviewState(candidate);
  if (!candidate || !reviewState.accepted.length) return;
  const acceptedItems = reviewState.accepted;

  let previousItems = [];
  if (candidate.mode === 'customer') {
    const next = getCustomerLibrary();
    previousItems = clone(next);
    const indexByKey = new Map(next.map((item, index) => [customerKey(item), index]));
    acceptedItems.forEach(customer => {
      const key = customerKey(customer);
      const existingIndex = indexByKey.get(key);
      const item = {
        id: existingIndex != null
          ? next[existingIndex].id
          : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
        ...customer
      };
      if (existingIndex != null) next[existingIndex] = item;
      else {
        indexByKey.set(key, next.length);
        next.push(item);
      }
    });
    if (!setCustomerLibrary(next)) return;
    selectedCustomerLibraryIds.clear();
    refreshCustomerEntrySuggestions();
  } else {
    const next = getProductCatalog();
    previousItems = clone(next);
    const indexByKey = new Map(next.map((item, index) => [catalogKey(item), index]));
    acceptedItems.forEach(product => {
      const normalized = {
        group: product.group || '',
        name: product.name || '',
        pack: product.pack || '',
        unit: product.unit || '',
        price: normalizeNonNegativeNumber(product.price),
        currency: normalizeCatalogCurrency(product.currency || 'VND'),
        note: product.note || ''
      };
      const key = catalogKey(normalized);
      const existingIndex = indexByKey.get(key);
      const item = {
        id: existingIndex != null
          ? next[existingIndex].id
          : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
        ...normalized
      };
      if (existingIndex != null) next[existingIndex] = item;
      else {
        indexByKey.set(key, next.length);
        next.push(item);
      }
    });
    if (!setProductCatalog(next)) return;
    selectedProductCatalogIds.clear();
    refreshProductEntrySuggestions();
  }

  const applied = acceptedItems.length;
  const updated = reviewState.updateCount;
  clearDataLibraryImportRecovery();
  closeDataLibraryImport({ restoreFocus: false });
  renderMasterData();
  renderDashboard();
  offerDataLibraryUndo(
    candidate.mode,
    previousItems,
    'Đã áp dụng ' + applied + ' dòng' + (updated ? ' • cập nhật ' + updated + ' bản ghi' : '')
  );
}

function customerLibraryRowsForExport() {
  return [
    ['Tên khách hàng', 'Công ty', 'SĐT', 'Email', 'Địa chỉ', 'Người liên hệ'],
    ...getCustomerLibrary().map(item => [
      item.name || '', item.company || '', item.phone || '', item.email || '', item.address || '', item.contact || ''
    ])
  ];
}

function productLibraryRowsForExport() {
  return [
    ['Nhóm hàng', 'Tên SP', 'Quy cách', 'ĐVT', 'Đơn giá', 'Tiền tệ', 'Ghi chú'],
    ...getProductCatalog().map(item => [
      item.group || '', item.name || '', item.pack || '', item.unit || '',
      normalizeNonNegativeNumber(item.price), normalizeCatalogCurrency(item.currency || 'VND'), item.note || ''
    ])
  ];
}

function exportDataLibraryCsv(mode) {
  const rows = mode === 'customer' ? customerLibraryRowsForExport() : productLibraryRowsForExport();
  const base = mode === 'customer' ? 'danh-ba-khach-hang' : 'danh-muc-san-pham';
  download(base + '.csv', csvFromRows(rows), 'text/csv;charset=utf-8');
  toast('Đã xuất ' + (mode === 'customer' ? 'danh bạ khách hàng' : 'danh mục sản phẩm') + ' dạng CSV');
}

async function exportDataLibraryExcel(mode) {
  try {
    const rows = mode === 'customer' ? customerLibraryRowsForExport() : productLibraryRowsForExport();
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = mode === 'customer'
      ? [{wch:24},{wch:26},{wch:16},{wch:28},{wch:36},{wch:22}]
      : [{wch:18},{wch:34},{wch:20},{wch:12},{wch:16},{wch:12},{wch:28}];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, mode === 'customer' ? 'Khách hàng' : 'Sản phẩm');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const base = mode === 'customer' ? 'danh-ba-khach-hang' : 'danh-muc-san-pham';
    downloadBlob(base + '.xlsx', new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    toast('Đã xuất ' + (mode === 'customer' ? 'danh bạ khách hàng' : 'danh mục sản phẩm') + ' dạng Excel');
  } catch (error) {
    console.error('Data Library Excel export failed:', error);
    alert('Không thể xuất Excel từ thư viện dữ liệu.');
  }
}

document.getElementById('saveCurrentCustomer').addEventListener('click', saveCurrentCustomerToLibrary);
document.getElementById('saveCurrentProducts').addEventListener('click', saveCurrentProductsToCatalog);
document.getElementById('saveProductsToCatalogTop')?.addEventListener('click', saveCurrentProductsToCatalog);
document.getElementById('customerLibrarySearch').addEventListener('input', renderMasterData);
document.getElementById('customerLibraryFilter')?.addEventListener('change', renderMasterData);
document.getElementById('productCatalogSearch').addEventListener('input', renderMasterData);
document.getElementById('productCatalogGroupFilter')?.addEventListener('change', renderMasterData);
document.getElementById('productCatalogCurrencyFilter')?.addEventListener('change', renderMasterData);
document.getElementById('productCatalogDuplicateOnly')?.addEventListener('change', renderMasterData);

document.getElementById('clearCustomerLibrarySelection')?.addEventListener('click', () => {
  selectedCustomerLibraryIds.clear();
  renderMasterData();
});
document.getElementById('deleteSelectedCustomers')?.addEventListener('click', () => {
  const ids = new Set(selectedCustomerLibraryIds);
  if (!ids.size || !confirm('Xóa ' + ids.size + ' khách hàng đã chọn khỏi danh bạ?')) return;
  const before = getCustomerLibrary();
  if (!setCustomerLibrary(before.filter(item => !ids.has(item.id)))) return;
  refreshDataLibraryAfterMutation('customer');
  offerDataLibraryUndo('customer', before, 'Đã xóa ' + ids.size + ' khách hàng');
});
document.getElementById('clearProductCatalogSelection')?.addEventListener('click', () => {
  selectedProductCatalogIds.clear();
  renderMasterData();
});
document.getElementById('deleteSelectedCatalogProducts')?.addEventListener('click', () => {
  const ids = new Set(selectedProductCatalogIds);
  if (!ids.size || !confirm('Xóa ' + ids.size + ' sản phẩm đã chọn khỏi danh mục?')) return;
  const before = getProductCatalog();
  if (!setProductCatalog(before.filter(item => !ids.has(item.id)))) return;
  refreshDataLibraryAfterMutation('product');
  offerDataLibraryUndo('product', before, 'Đã xóa ' + ids.size + ' sản phẩm khỏi danh mục');
});
document.getElementById('addSelectedCatalogProducts')?.addEventListener('click', () => {
  const ids = new Set(selectedProductCatalogIds);
  const selected = getProductCatalog().filter(item => ids.has(item.id));
  const changed = addCatalogProductsToQuote(selected);
  if (changed) selectedProductCatalogIds.clear();
});


document.getElementById('importCustomerLibraryExcel')?.addEventListener('click', (event) => {
  dataLibraryImportLastFocus = event.currentTarget;
  document.getElementById('customerLibraryExcelInput')?.click();
});
document.getElementById('importProductLibraryExcel')?.addEventListener('click', (event) => {
  dataLibraryImportLastFocus = event.currentTarget;
  document.getElementById('productLibraryExcelInput')?.click();
});
document.getElementById('customerLibraryExcelInput')?.addEventListener('change', async (event) => {
  const input = event.currentTarget;
  const file = input.files?.[0];
  await openDataLibraryImport(file, 'customer', dataLibraryImportLastFocus);
  input.value = '';
});
document.getElementById('productLibraryExcelInput')?.addEventListener('change', async (event) => {
  const input = event.currentTarget;
  const file = input.files?.[0];
  await openDataLibraryImport(file, 'product', dataLibraryImportLastFocus);
  input.value = '';
});
document.getElementById('exportCustomerLibraryExcel')?.addEventListener('click', () => exportDataLibraryExcel('customer'));
document.getElementById('exportCustomerLibraryCsv')?.addEventListener('click', () => exportDataLibraryCsv('customer'));
document.getElementById('exportProductLibraryExcel')?.addEventListener('click', () => exportDataLibraryExcel('product'));
document.getElementById('exportProductLibraryCsv')?.addEventListener('click', () => exportDataLibraryCsv('product'));
document.getElementById('dataLibraryImportSheetSelect')?.addEventListener('change', (event) => {
  if (!dataLibraryImportDraft) return;
  dataLibraryImportDraft.sheetName = event.currentTarget.value;
  writeDataLibraryImportRecovery();
  renderDataLibraryImport();
});
document.getElementById('dataLibraryImportNextIssue')?.addEventListener('click', () => {
  focusNextDataLibraryImportIssue();
});
document.getElementById('dataLibraryImportShowResolved')?.addEventListener('change', () => {
  renderDataLibraryImport();
  if (!document.getElementById('dataLibraryImportShowResolved')?.checked) {
    focusNextDataLibraryImportIssue({ fromStart: true });
  }
});
document.getElementById('applyDataLibraryImport')?.addEventListener('click', applyDataLibraryImport);
document.getElementById('cancelDataLibraryImport')?.addEventListener('click', () => closeDataLibraryImport({ discardRecovery: true }));
document.getElementById('closeDataLibraryImport')?.addEventListener('click', () => closeDataLibraryImport());
document.getElementById('dataLibraryImportModal')?.addEventListener('click', (event) => {
  if (event.target === event.currentTarget) closeDataLibraryImport();
});
document.addEventListener('keydown', (event) => {
  const modal = document.getElementById('dataLibraryImportModal');
  if (!modal || modal.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDataLibraryImport();
    return;
  }
  trapDataLibraryImportTab(event, modal);
});

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
    if (name && qty < 0) warnings.push('Dòng sản phẩm ' + (index + 1) + ' "' + name + '" có số lượng âm.');
    else if (name && (data.showQty || data.showAmount || data.showTotals) && qty === 0) warnings.push('Dòng sản phẩm ' + (index + 1) + ' "' + name + '" có số lượng bằng 0.');
    if (name && price < 0) warnings.push('Dòng sản phẩm ' + (index + 1) + ' "' + name + '" có đơn giá âm.');
    else if (name && data.showPrice && price === 0) warnings.push('Dòng sản phẩm ' + (index + 1) + ' "' + name + '" chưa có đơn giá.');
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

function validationTargetForMessage(message) {
  const text = String(message || '');
  const productField = /số lượng/i.test(text) ? 'qty' : /đơn giá/i.test(text) ? 'price' : 'name';
  const productRowMatch = text.match(/Dòng sản phẩm\s+(\d+)/i);
  if (productRowMatch) {
    return {
      tab: 'products',
      productIndex: Math.max(0, Number(productRowMatch[1]) - 1),
      productKey: productField
    };
  }
  if (/chưa có sản phẩm hợp lệ/i.test(text)) {
    return { tab: 'products', productIndex: 0, productKey: 'name' };
  }
  const productNameMatch = text.match(/Sản phẩm\s+"([^"]+)"/i);
  if (productNameMatch) {
    const productName = productNameMatch[1].trim();
    const productIndex = (Array.isArray(state.products) ? state.products : [])
      .findIndex(product => String(product?.name || '').trim() === productName);
    return {
      tab: 'products',
      productIndex: productIndex >= 0 ? productIndex : null,
      productKey: productField
    };
  }

  if (/Có giảm giá\/VAT\/phí khác nhưng bảng tổng cộng đang bị ẩn/i.test(text)) {
    return { tab: 'payment', fieldId: 'showTotals' };
  }
  if (/đã bao gồm\s*VAT/i.test(text)) {
    return { tab: 'terms', fieldId: 'termsText' };
  }
  if (/Thông tin tài khoản ngân hàng đang nhập dở/i.test(text)) {
    const fieldId = !state.bankName ? 'bankName' : !state.bankAccount ? 'bankAccount' : !state.bankOwner ? 'bankOwner' : 'bankName';
    return { tab: 'payment', fieldId };
  }

  const rules = [
    [/tên công ty|email công ty|logo/i, { tab: 'general', fieldId: /email công ty/i.test(text) ? 'companyEmail' : (/logo/i.test(text) ? 'logoInput' : 'companyName') }],
    [/tiêu đề báo giá/i, { tab: 'general', fieldId: 'quoteTitle' }],
    [/kính gửi/i, { tab: 'general', fieldId: 'recipientLine' }],
    [/số báo giá/i, { tab: 'general', fieldId: 'quoteNo' }],
    [/ngày báo giá/i, { tab: 'general', fieldId: 'quoteDate' }],
    [/email khách hàng/i, { tab: 'customer', fieldId: 'customerEmail' }],
    [/ngân hàng|tài khoản/i, { tab: 'payment', fieldId: 'bankName' }],
    [/điều khoản/i, { tab: 'terms', fieldId: 'termsText' }],
    [/chữ ký|chức danh/i, { tab: 'terms', fieldId: 'rightTitle' }]
  ];
  for (const [pattern, target] of rules) {
    if (pattern.test(text)) return target;
  }
  return { tab: 'general', fieldId: null };
}

function focusValidationTarget(target, returnTarget = null) {
  if (!target) return;
  openTab(target.tab || 'general');
  requestAnimationFrame(() => {
    const installReturnKey = (field) => {
      if (!field || !returnTarget) return;
      if (field._studioGuidanceReturnKeyHandler) {
        field.removeEventListener('keydown', field._studioGuidanceReturnKeyHandler);
      }
      const returnKey = returnTarget.dataset?.validationKey || '';
      const handleReturnKey = (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        field.removeEventListener('keydown', handleReturnKey);
        delete field._studioGuidanceReturnKeyHandler;
        const currentIssue = returnKey
          ? Array.from(document.querySelectorAll('#studioGuidanceList .studio-guidance-item'))
            .find(item => item.dataset.validationKey === returnKey)
          : null;
        const connectedReturnTarget = returnTarget.isConnected ? returnTarget : null;
        const fallback = document.getElementById('closeStudioGuidance') || document.getElementById('studioCheckQuote');
        (currentIssue || connectedReturnTarget || fallback)?.focus?.();
      };
      field._studioGuidanceReturnKeyHandler = handleReturnKey;
      field.addEventListener('keydown', handleReturnKey);
    };

    if (Number.isInteger(target.productIndex)) {
      const card = document.querySelector('#productEditor .product-card[data-product-index="' + target.productIndex + '"]');
      const productKey = target.productKey || 'name';
      const input = card?.querySelector('[data-product-key="' + productKey + '"]')
        || card?.querySelector('[data-product-key="name"], input, select, textarea');
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus?.();
      installReturnKey(input);
      return;
    }
    const field = target.fieldId ? document.getElementById(target.fieldId) : null;
    field?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    field?.focus?.();
    installReturnKey(field);
  });
}

function renderStudioGuidance({ focusFirst = false } = {}) {
  const panel = document.getElementById('studioGuidancePanel');
  const list = document.getElementById('studioGuidanceList');
  const summary = document.getElementById('studioGuidanceSummary');
  if (!panel || !list || !summary) return;

  const result = validateQuote();
  const items = [
    ...result.errors.map(message => ({ tone: 'error', label: 'Cần sửa', message })),
    ...result.warnings.map(message => ({ tone: 'warn', label: 'Kiểm tra', message }))
  ];

  list.innerHTML = '';
  if (!items.length) {
    summary.textContent = 'Báo giá đã sẵn sàng để in.';
    panel.hidden = false;
    const ready = document.createElement('div');
    ready.className = 'studio-guidance-ready';
    ready.textContent = '✓ Không phát hiện lỗi nghiệp vụ.';
    list.appendChild(ready);
    return;
  }

  summary.textContent = result.errors.length
    ? result.errors.length + ' lỗi • ' + result.warnings.length + ' mục cần kiểm tra'
    : result.warnings.length + ' mục cần kiểm tra';

  items.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-guidance-item ' + item.tone;
    button.dataset.validationIndex = String(index);
    const target = validationTargetForMessage(item.message);
    button.dataset.validationKey = [
      item.tone,
      target?.tab || '',
      Number.isInteger(target?.productIndex) ? String(target.productIndex) : '',
      target?.productKey || '',
      target?.fieldId || '',
      item.message
    ].join('|');

    const badge = document.createElement('span');
    badge.className = 'studio-guidance-tone';
    badge.textContent = item.label;

    const message = document.createElement('strong');
    message.textContent = item.message;

    const action = document.createElement('small');
    action.textContent = 'Bấm để tới chỗ cần xử lý';

    button.append(badge, message, action);
    button.addEventListener('click', () => focusValidationTarget(target, button));
    list.appendChild(button);
  });

  panel.hidden = false;
  if (focusFirst && items.length) focusValidationTarget(validationTargetForMessage(items[0].message));
}

function refreshOpenStudioGuidance() {
  const panel = document.getElementById('studioGuidancePanel');
  if (panel && !panel.hidden) renderStudioGuidance();
}

function renderInspectorCheckSummary(result = validateQuote()) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
  const errorCount = document.getElementById('inspectorErrorCount');
  const warningCount = document.getElementById('inspectorWarningCount');
  const list = document.getElementById('inspectorIssueList');
  if (errorCount) errorCount.textContent = String(errors.length);
  if (warningCount) warningCount.textContent = String(warnings.length);
  if (!list) return;
  list.innerHTML = '';
  const issues = [
    ...errors.map((message) => ({ tone: 'error', message })),
    ...warnings.map((message) => ({ tone: 'warn', message }))
  ].slice(0, 3);
  if (!issues.length) {
    const ready = document.createElement('div');
    ready.className = 'inspector-issue empty';
    ready.textContent = '✓ Không phát hiện lỗi nghiệp vụ.';
    list.appendChild(ready);
    return;
  }
  issues.forEach((issue) => {
    const item = document.createElement('div');
    item.className = 'inspector-issue ' + issue.tone;
    item.textContent = issue.message;
    list.appendChild(item);
  });
}

function updateDocumentHealth() {
  const result = validateQuote();
  const badges = [
    document.getElementById('documentHealth'),
    document.getElementById('studioDocumentHealth'),
    document.getElementById('studioGlobalHealth'),
    document.getElementById('inspectorHealthStatus')
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
  renderInspectorCheckSummary(result);
}

function runPreflight({ forPrint = false, forExport = false } = {}) {
  const result = validateQuote();
  updateDocumentHealth();
  const action = forPrint ? 'in/xuất PDF' : forExport ? 'xuất báo cáo' : 'hoàn tất';
  if (result.errors.length) {
    alert('Chưa thể ' + action + ':\n\n• ' + result.errors.join('\n• '));
    return false;
  }
  if ((forPrint || forExport) && result.warnings.length) {
    return confirm('Báo giá có ' + result.warnings.length + ' mục cần kiểm tra:\n\n• ' + result.warnings.join('\n• ') + '\n\nVẫn tiếp tục ' + action + '?');
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

function canonicalLibraryText(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('vi-VN');
}

function canonicalSearchText(value) {
  return canonicalLibraryText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function canonicalLibraryPhone(value) {
  let phone = normalizePhone(value);
  if (phone.startsWith('0084') && phone.length >= 12) phone = '0' + phone.slice(4);
  else if (phone.startsWith('84') && phone.length >= 11) phone = '0' + phone.slice(2);
  return phone;
}

function customerKey(customer) {
  const phone = canonicalLibraryPhone(customer.phone);
  if (phone) return 'phone:' + phone;
  const nameCompany = [customer.name, customer.company].map(canonicalLibraryText).filter(Boolean).join('|');
  if (nameCompany) return 'name:' + nameCompany;
  const email = canonicalLibraryText(customer.email);
  return email ? 'email:' + email : '';
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
  refreshCustomerEntrySuggestions();
  renderMasterData();
  toast(index >= 0 ? 'Đã cập nhật khách hàng' : 'Đã lưu khách hàng');
}

function useCustomer(customer, options = {}) {
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
  if (options.navigate !== false) openTab('general');
  if (options.focus !== false) requestAnimationFrame(() => document.getElementById('quickCustomerName')?.focus());
  if (options.notify !== false) {
    toast(persisted ? 'Đã nạp khách hàng' : 'Đã nạp khách hàng tạm thời; chưa autosave được');
  }
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
  return [product.group, product.name, product.pack, product.unit].map(canonicalLibraryText).join('|');
}

function catalogKey(product) {
  return productKey(product) + '|' + normalizeCatalogCurrency(product?.currency || 'VND');
}

function saveProductsToCatalog(products, { notify = true } = {}) {
  const validProducts = (Array.isArray(products) ? products : [])
    .filter(product => String(product?.name || '').trim());
  if (!validProducts.length) return 0;
  const items = getProductCatalog();
  let changed = 0;
  validProducts.forEach(product => {
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
  if (!setProductCatalog(items)) return 0;
  refreshProductEntrySuggestions();
  renderMasterData();
  if (notify) toast('Đã lưu ' + changed + ' sản phẩm vào danh mục');
  return changed;
}

function saveCurrentProductsToCatalog() {
  const products = state.products.filter(product => String(product.name || '').trim());
  if (!products.length) {
    toast('Báo giá hiện tại chưa có sản phẩm để lưu.');
    return;
  }
  saveProductsToCatalog(products);
}

function applyProductBulkAction() {
  const indices = selectedProductIndices();
  if (!indices.length) return;
  const action = document.getElementById('productBulkAction')?.value || '';
  const input = document.getElementById('productBulkValue');
  const rawValue = String(input?.value || '').trim();

  if (['group','unit'].includes(action) && !rawValue) {
    toast(action === 'group' ? 'Hãy nhập nhóm hàng cần áp dụng.' : 'Hãy nhập đơn vị tính cần áp dụng.');
    input?.focus();
    return;
  }

  if (action === 'price') {
    const percent = Number(rawValue);
    if (!Number.isFinite(percent) || percent < -100) {
      toast('Phần trăm điều chỉnh giá phải là số và không nhỏ hơn -100%.');
      input?.focus();
      return;
    }
    indices.forEach(index => {
      const current = Number(state.products[index]?.price || 0);
      state.products[index].price = Math.max(0, Math.round((current * (1 + percent / 100)) * 100) / 100);
    });
  } else if (action === 'group') {
    indices.forEach(index => { state.products[index].group = rawValue; });
  } else if (action === 'unit') {
    indices.forEach(index => { state.products[index].unit = rawValue; });
  } else if (action === 'duplicate') {
    const copies = indices.map(index => clone(state.products[index]));
    state.products.push(...copies);
  } else if (action === 'catalog') {
    const changed = saveProductsToCatalog(indices.map(index => state.products[index]), { notify: false });
    toast(changed ? 'Đã lưu ' + changed + ' sản phẩm đã chọn vào danh mục' : 'Các dòng đã chọn chưa có tên sản phẩm.');
    return;
  } else if (action === 'delete') {
    if (!confirm('Xóa ' + indices.length + ' dòng sản phẩm đã chọn?')) return;
    const selected = new Set(indices);
    state.products = state.products.filter((_, index) => !selected.has(index));
    if (!state.products.length) state.products.push({ group: '', name: '', pack: '', unit: '', qty: 1, price: 0, note: '' });
  } else {
    return;
  }

  selectedProductRows.clear();
  collapsedProducts = new Set();
  const persisted = save();
  renderEditorProducts();
  render();
  if (input) input.value = '';
  toast(persisted ? 'Đã áp dụng thao tác cho ' + indices.length + ' dòng' : 'Đã thay đổi tạm thời; chưa autosave được');
}

function addCatalogProductsToQuote(products, { notify = true } = {}) {
  const items = Array.isArray(products) ? products : [];
  if (!items.length) return 0;
  const targetCurrency = normalizeCatalogCurrency(state.currency);
  let changed = 0;
  let currencyMismatch = 0;

  items.forEach((product) => {
    const key = productKey(product);
    if (!key.replace(/\|/g, '')) return;
    const sourceCurrency = normalizeCatalogCurrency(product.currency || 'VND');
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
    if (!currencyMatches) currencyMismatch += 1;
    changed += 1;
  });

  if (!changed) return 0;
  const persisted = save();
  renderEditorProducts();
  render();
  openTab('products');
  if (notify) {
    const mismatchText = currencyMismatch
      ? ' • ' + currencyMismatch + ' dòng khác tiền tệ để giá 0'
      : '';
    toast((persisted ? 'Đã thêm ' : 'Đã thêm tạm thời ') + changed + ' sản phẩm vào báo giá' + mismatchText);
  }
  return changed;
}

function addCatalogProduct(product) {
  return addCatalogProductsToQuote([product]);
}

function catalogDuplicateKeySet(products) {
  const counts = new Map();
  (Array.isArray(products) ? products : []).forEach((product) => {
    const key = catalogKey(product);
    const identity = productKey(product);
    if (!identity.replace(/\|/g, '')) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
}

function syncMasterBulkBars() {
  const customerBar = document.getElementById('customerLibraryBulkBar');
  const customerCount = document.getElementById('customerLibraryBulkCount');
  const productBar = document.getElementById('productCatalogBulkBar');
  const productCount = document.getElementById('productCatalogBulkCount');

  if (customerBar) customerBar.hidden = selectedCustomerLibraryIds.size === 0;
  if (customerCount) customerCount.textContent = selectedCustomerLibraryIds.size + ' khách hàng đã chọn';
  if (productBar) productBar.hidden = selectedProductCatalogIds.size === 0;
  if (productCount) productCount.textContent = selectedProductCatalogIds.size + ' sản phẩm đã chọn';
}

function syncProductGroupFilter(allProducts) {
  const select = document.getElementById('productCatalogGroupFilter');
  if (!select) return '';
  const previous = select.value;
  const groups = [...new Set(
    (Array.isArray(allProducts) ? allProducts : [])
      .map(item => String(item.group || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'vi'));

  select.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'Tất cả nhóm';
  select.appendChild(all);
  groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    select.appendChild(option);
  });
  select.value = groups.includes(previous) ? previous : '';
  return select.value;
}

function renderMasterData() {
  const customerList = document.getElementById('customerLibraryList');
  const productList = document.getElementById('productCatalogList');
  if (!customerList || !productList) return;

  const customerQuery = canonicalSearchText(document.getElementById('customerLibrarySearch')?.value || '');
  const productQuery = canonicalSearchText(document.getElementById('productCatalogSearch')?.value || '');
  const customerFilter = document.getElementById('customerLibraryFilter')?.value || '';
  const productCurrency = document.getElementById('productCatalogCurrencyFilter')?.value || '';
  const duplicateOnly = Boolean(document.getElementById('productCatalogDuplicateOnly')?.checked);

  const allCustomers = getCustomerLibrary();
  const allProducts = getProductCatalog();
  const productGroup = syncProductGroupFilter(allProducts);
  const duplicateKeys = catalogDuplicateKeySet(allProducts);

  const customerIds = new Set(allCustomers.map(item => item.id));
  selectedCustomerLibraryIds = new Set([...selectedCustomerLibraryIds].filter(id => customerIds.has(id)));
  const productIds = new Set(allProducts.map(item => item.id));
  selectedProductCatalogIds = new Set([...selectedProductCatalogIds].filter(id => productIds.has(id)));

  const customers = allCustomers.filter(item => {
    const haystack = canonicalSearchText(
      [item.name, item.company, item.phone, item.email, item.address, item.contact].filter(Boolean).join(' ')
    );
    if (customerQuery && !haystack.includes(customerQuery)) return false;
    if (customerFilter === 'has-phone' && !canonicalLibraryPhone(item.phone)) return false;
    if (customerFilter === 'missing-phone' && canonicalLibraryPhone(item.phone)) return false;
    if (customerFilter === 'has-email' && !String(item.email || '').trim()) return false;
    if (customerFilter === 'missing-email' && String(item.email || '').trim()) return false;
    return true;
  });

  const products = allProducts.filter(item => {
    const haystack = canonicalSearchText(
      [item.group, item.name, item.pack, item.unit, item.note, item.currency].filter(Boolean).join(' ')
    );
    if (productQuery && !haystack.includes(productQuery)) return false;
    if (productGroup && item.group !== productGroup) return false;
    if (productCurrency && normalizeCatalogCurrency(item.currency || 'VND') !== productCurrency) return false;
    if (duplicateOnly && !duplicateKeys.has(catalogKey(item))) return false;
    return true;
  });

  setText('customerLibraryCount', allCustomers.length);
  setText('productCatalogCount', allProducts.length);
  setText('customerLibraryResultCount', customers.length);
  setText('productCatalogResultCount', products.length);
  setText('productCatalogDuplicateCount', duplicateKeys.size + ' nhóm trùng');
  const duplicateSummary = document.getElementById('productCatalogDuplicateSummary');
  if (duplicateSummary) duplicateSummary.hidden = duplicateKeys.size === 0;

  customerList.innerHTML = '';
  const customerFragment = document.createDocumentFragment();
  if (!customers.length) {
    customerList.innerHTML = '<div class="history-empty" role="status">Chưa có khách hàng phù hợp.</div>';
  } else {
    customers.forEach(customer => {
      const row = document.createElement('div');
      row.className = 'master-item master-table-row customer-table-grid';

      const nameCell = document.createElement('div');
      nameCell.className = 'master-cell master-name-cell master-select-cell';
      const select = document.createElement('input');
      select.type = 'checkbox';
      select.className = 'master-row-select';
      select.checked = selectedCustomerLibraryIds.has(customer.id);
      select.setAttribute('aria-label', 'Chọn khách hàng ' + (customer.name || customer.company || ''));
      select.addEventListener('change', () => {
        if (select.checked) selectedCustomerLibraryIds.add(customer.id);
        else selectedCustomerLibraryIds.delete(customer.id);
        row.classList.toggle('bulk-selected', select.checked);
        syncMasterBulkBars();
      });
      const identity = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = customer.name || customer.company || 'Khách hàng';
      const contact = document.createElement('small');
      contact.textContent = customer.contact || 'Chưa có người liên hệ';
      identity.append(name, contact);
      nameCell.append(select, identity);
      row.classList.toggle('bulk-selected', select.checked);

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
        const before = getCustomerLibrary();
        if (!setCustomerLibrary(before.filter(item => item.id !== customer.id))) return;
        refreshDataLibraryAfterMutation('customer');
        offerDataLibraryUndo('customer', before, 'Đã xóa khách hàng khỏi danh bạ');
      });
      actions.append(use, del);
      row.append(nameCell, companyCell, contactCell, addressCell, actions);
      customerFragment.appendChild(row);
    });
    customerList.appendChild(customerFragment);
  }

  productList.innerHTML = '';
  const productFragment = document.createDocumentFragment();
  if (!products.length) {
    productList.innerHTML = '<div class="history-empty" role="status">Chưa có sản phẩm phù hợp.</div>';
  } else {
    products.forEach(product => {
      const row = document.createElement('div');
      row.className = 'master-item master-table-row product-table-grid';
      const productCurrencyCode = normalizeCatalogCurrency(product.currency || 'VND');

      const nameCell = document.createElement('div');
      nameCell.className = 'master-cell master-name-cell master-select-cell';
      const select = document.createElement('input');
      select.type = 'checkbox';
      select.className = 'master-row-select';
      select.checked = selectedProductCatalogIds.has(product.id);
      select.setAttribute('aria-label', 'Chọn sản phẩm ' + (product.name || ''));
      select.addEventListener('change', () => {
        if (select.checked) selectedProductCatalogIds.add(product.id);
        else selectedProductCatalogIds.delete(product.id);
        row.classList.toggle('bulk-selected', select.checked);
        syncMasterBulkBars();
      });
      const identity = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = product.name || 'Sản phẩm';
      const currency = document.createElement('small');
      currency.textContent = productCurrencyCode + (duplicateKeys.has(catalogKey(product)) ? ' • Có thể trùng' : '');
      identity.append(name, currency);
      nameCell.append(select, identity);
      row.classList.toggle('bulk-selected', select.checked);

      const groupCell = document.createElement('div');
      groupCell.className = 'master-cell master-group-cell';
      groupCell.textContent = product.group || '—';

      const packCell = document.createElement('div');
      packCell.className = 'master-cell master-pack-cell';
      packCell.textContent = [product.pack, product.unit].filter(Boolean).join(' / ') || '—';

      const priceCell = document.createElement('div');
      priceCell.className = 'master-cell master-price-cell';
      priceCell.textContent = moneyForCurrency(Number(product.price || 0), productCurrencyCode);

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
        const before = getProductCatalog();
        if (!setProductCatalog(before.filter(item => item.id !== product.id))) return;
        refreshDataLibraryAfterMutation('product');
        offerDataLibraryUndo('product', before, 'Đã xóa sản phẩm khỏi danh mục');
      });
      actions.append(add, del);
      row.append(nameCell, groupCell, packCell, priceCell, noteCell, actions);
      productFragment.appendChild(row);
    });
    productList.appendChild(productFragment);
  }
  syncMasterBulkBars();
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

  ['autoArrangeLayoutToolbar','autoArrangeLayoutPanel','runLayoutSuggestion'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => {
      autoArrangePreview();
      if (id === 'runLayoutSuggestion') toast('Đã tối ưu bố cục bằng bộ sắp xếp cục bộ');
    });
  });

  document.getElementById('resetBlockPositions')?.addEventListener('click', () => {
    state.layoutOffsets = {};
    applyLayoutOffsets();
    const persisted = save();
    selectLayoutBlock('');
    toast(persisted ? 'Đã đưa các khối về vị trí chuẩn' : 'Đã đặt lại vị trí tạm thời; chưa autosave được');
  });

  const resizeLogo = (delta) => {
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
  const toolbarHeight = document.querySelector('.preview-tools')?.offsetHeight || 52;
  const availableWidth = Math.max(280, preview.clientWidth - 36);
  const availableHeight = Math.max(360, preview.clientHeight - toolbarHeight - 28);
  const paperWidth = paper.offsetWidth || (210 / 25.4) * 96;
  const a4Height = (297 / 25.4) * 96;
  const scale = Math.min(1, availableWidth / paperWidth, availableHeight / a4Height);
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
    const preview = document.querySelector('.preview');
    if (preview) {
      preview.scrollTop = 0;
      preview.scrollLeft = 0;
    }
    requestAnimationFrame(() => requestAnimationFrame(fitReportView));
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

document.getElementById('exitReportView')?.addEventListener('click', () => {
  if (templateLibraryPreview) cancelTemplateLibraryPreview({ reopenLibrary: true });
  else openTab('general');
});
document.getElementById('actual').addEventListener('click', () => setZoom(100));
document.getElementById('fit').addEventListener('click', () => {
  const preview = document.querySelector('.preview');
  const paper = document.getElementById('paper');
  if (!preview || !paper) return;
  const available = Math.max(300, preview.clientWidth - 70);
  const targetPaperWidth = Math.min(706, available);
  const width = paper.offsetWidth || (210 / 25.4) * 96;
  setZoom(Math.floor((targetPaperWidth / width) * 100));
});
document.getElementById('zoomOut').addEventListener('click', () => setZoom(zoom - 10));
document.getElementById('zoomIn').addEventListener('click', () => setZoom(zoom + 10));
document.getElementById('wideView').addEventListener('click', () => {
  const shell = document.querySelector('.shell');
  const enabled = shell.classList.toggle('wide-preview');
  const button = document.getElementById('wideView');
  button?.setAttribute('aria-label', enabled ? 'Thoát màn hình rộng' : 'Màn hình rộng');
  button?.setAttribute('title', enabled ? 'Thoát màn hình rộng' : 'Màn hình rộng');
  requestAnimationFrame(() => document.getElementById('fit').click());
});

function setPreviewOverflowMenu(open) {
  const menu = document.getElementById('previewOverflowMenu');
  const button = document.getElementById('toolbarMenu');
  if (!menu || !button) return;
  const enabled = Boolean(open);
  menu.hidden = !enabled;
  button.setAttribute('aria-expanded', enabled ? 'true' : 'false');
}
document.getElementById('toolbarMenu')?.addEventListener('click', (event) => {
  event.stopPropagation();
  const menu = document.getElementById('previewOverflowMenu');
  setPreviewOverflowMenu(Boolean(menu?.hidden));
});
document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest?.('.preview-right-tools')) setPreviewOverflowMenu(false);
});
document.getElementById('previewOverflowMenu')?.addEventListener('click', (event) => {
  if (event.target.closest('button')) setPreviewOverflowMenu(false);
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
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
  });
}
