import './styles.css';
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

const STORAGE = 'tunggiabao-price-report-v1';
const PRESETS = 'tunggiabao-price-report-presets-v1';
const HISTORY = 'tunggiabao-price-report-history-v1';
const CUSTOMERS = 'tunggiabao-price-report-customers-v1';
const CATALOG = 'tunggiabao-price-report-catalog-v1';
const UI_STATE = 'tunggiabao-price-report-ui-v2';
const LOGO_STORAGE = 'tunggiabao-price-report-logo-v1';

const LAYOUT_BLOCK_KEYS = [
  'logo','company','companyName','companyAddress','branchKhanhHoa','branchDongNai','farmAddress',
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
  logoTreatment: 'blend',
  logoBlendMode: 'multiply',
  logoBackdropColor: '#0b8f83',
  logoBackdropOpacity: 6,
  logoBackdropRadius: 14,
  logoBackdropBorder: 'none',
  docFontSize: 12.2,
  previewTitleAlign: 'center',
  previewTitleSize: 25,
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
  merged.logoBackdropOpacity = normalizeBoundedNumber(merged.logoBackdropOpacity, 0, 100, defaults.logoBackdropOpacity);
  merged.logoBackdropRadius = normalizeBoundedNumber(merged.logoBackdropRadius, 0, 24, defaults.logoBackdropRadius);
  merged.docFontSize = normalizeBoundedNumber(merged.docFontSize, 9, 18, defaults.docFontSize);
  merged.previewTitleSize = normalizeBoundedNumber(merged.previewTitleSize, 20, 32, defaults.previewTitleSize);
  merged.previewHeaderGap = normalizeBoundedNumber(merged.previewHeaderGap, 2, 12, defaults.previewHeaderGap);
  merged.previewMetaWidth = normalizeBoundedNumber(merged.previewMetaWidth, 38, 56, defaults.previewMetaWidth);
  merged.previewLineHeight = normalizeBoundedNumber(merged.previewLineHeight, 1.15, 1.5, defaults.previewLineHeight);
  merged.layoutOffsets = normalizeLayoutOffsets(merged.layoutOffsets);

  const hasPreviewLayout = data && Object.prototype.hasOwnProperty.call(data, 'previewSpacing');
  if (!hasPreviewLayout) {
    merged.previewTitleAlign = 'center';
    merged.previewTitleSize = 25;
    merged.previewSpacing = 'standard';
    merged.previewTableDensity = 'standard';
    merged.previewHeaderGap = 4;
    merged.previewMetaWidth = 44;
    merged.previewLineHeight = 1.26;
    merged.showQuoteMeta = false;
    if (merged.theme === 'modern') merged.docFont = 'Times New Roman';
    else if (merged.docFont === 'Times New Roman' && ['corporate','minimal','premium','mono'].includes(merged.theme)) merged.docFont = 'Arial';
  }

  const hasAdvancedLogo = data && Object.prototype.hasOwnProperty.call(data, 'logoBlendMode');
  if (!hasAdvancedLogo) {
    merged.logoTreatment = 'blend';
    merged.logoBlendMode = 'multiply';
    merged.logoBackdropColor = merged.accent || '#0b8f83';
    merged.logoBackdropOpacity = 6;
    merged.logoBackdropRadius = 14;
    merged.logoBackdropBorder = 'none';
    merged.logoPadding = Math.min(4, Math.max(0, Number(merged.logoPadding || 2)));
  }

  const stringKeys = [
    'logo','companyName','companyAddress','branchKhanhHoa','branchDongNai','farmAddress',
    'taxCode','phone','website','companyEmail','slogan','quoteTitle','quoteSubtitle','quoteNo','quoteDate',
    'historyRecordId','validity','recipientLine','intro','sectionTitle','customerName',
    'customerCompany','customerAddress','customerPhone','customerEmail','customerContact',
    'paymentMethod','bankName','bankAccount','bankOwner','termsTitle','termsText','closingText',
    'dateLine','leftTitle','rightTitle','leftNote','rightNote','leftName','rightName','footerText',
    'accent','docFont','logoTreatment','logoBlendMode','logoBackdropColor','logoBackdropBorder',
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

const save = () => safeStore(STORAGE, JSON.stringify(stateForStorage()));

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

const tabMeta = {
  general: ['THÔNG TIN CÔNG TY', 'Thông tin doanh nghiệp, khách hàng và báo giá.'],
  history: ['QUẢN LÝ BÁO GIÁ', 'Lưu, tìm kiếm, mở lại và nhân bản các báo giá.'],
  master: ['DANH MỤC', 'Tái sử dụng khách hàng và sản phẩm thường dùng.'],
  customer: ['KHÁCH HÀNG', 'Thông tin người nhận và đơn vị mua hàng.'],
  products: ['SẢN PHẨM', 'Danh mục, số lượng, đơn giá và cột hiển thị.'],
  payment: ['THANH TOÁN', 'Chiết khấu, VAT, tổng tiền và tài khoản.'],
  terms: ['ĐIỀU KHOẢN', 'Điều khoản thương mại, ngày tháng và chữ ký.'],
  design: ['THIẾT KẾ', 'Mẫu trình bày, màu sắc và định dạng A4.'],
  view: ['XEM BÁO CÁO', 'Chế độ đọc toàn màn hình cho điện thoại và máy tính bảng.'],
  export: ['XUẤT / NHẬP / IN', 'PDF, Excel, OCR và sao lưu dữ liệu.'],
  presets: ['LƯU MẪU', 'Lưu các cấu hình báo giá để dùng lại.']
};

function openTab(tab) {
  $$('.nav button[data-tab]').forEach((el) => {
    const active = el.dataset.tab === tab;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });

  if (tab === 'view') {
    setReportViewMode(true);
    return;
  }

  setReportViewMode(false);
  $$('.pane').forEach((el) => el.classList.toggle('active', el.id === 'pane-' + tab));
  document.getElementById('paneTitle').textContent = tabMeta[tab][0];
  document.getElementById('paneSub').textContent = tabMeta[tab][1];
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

$$('.nav button[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => openTab(btn.dataset.tab));
});

function applyTungGiaBaoToCurrentQuote({ confirmReplace = true } = {}) {
  if (confirmReplace && !window.confirm('Thay thông tin doanh nghiệp và danh sách sản phẩm hiện tại bằng dữ liệu Tùng Gia Bảo? Thiết kế, logo và dữ liệu khách hàng vẫn được giữ.')) {
    return false;
  }
  const currentLogo = state.logo;
  state = merge(applyTungGiaBaoBaseline(state));
  state.logo = currentLogo;
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
      } else if (el.type === 'number' || el.type === 'range' || ['docFontSize','logoWidth','logoPadding','logoOffsetX','logoOffsetY','logoBackdropOpacity','logoBackdropRadius','previewTitleSize','previewHeaderGap','previewMetaWidth','previewLineHeight'].includes(key)) {
        let value = Number(el.value || 0);
        if (key === 'discountPct' || key === 'vatPct' || key === 'logoBackdropOpacity') value = Math.min(100, Math.max(0, value));
        else if (key === 'logoWidth') value = Math.min(90, Math.max(18, value));
        else if (key === 'logoPadding') value = Math.min(12, Math.max(0, value));
        else if (key === 'logoOffsetX') value = Math.min(40, Math.max(-40, value));
        else if (key === 'logoOffsetY') value = Math.min(30, Math.max(-30, value));
        else if (key === 'logoBackdropRadius') value = Math.min(24, Math.max(0, value));
        else if (['otherFee'].includes(key)) value = normalizeNonNegativeNumber(value);
        else if (['marginX','marginTop','marginBottom'].includes(key)) value = Math.min(30, Math.max(6, value));
        else if (key === 'docFontSize') value = Math.min(18, Math.max(9, value));
        else if (key === 'previewTitleSize') value = Math.min(32, Math.max(20, value));
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

function productField(label, key, value, type, onInput, className = '') {
  const wrap = document.createElement('label');
  wrap.className = 'product-field ' + className;
  const title = document.createElement('span');
  title.textContent = label;
  const input = key === 'note' ? document.createElement('textarea') : document.createElement('input');
  if (key !== 'note') input.type = type || 'text';
  input.value = value == null ? '' : value;
  if (type === 'number') {
    input.min = '0';
    input.step = key === 'price' ? '1000' : '1';
  }
  input.addEventListener('input', () => onInput(input));
  wrap.append(title, input);
  return wrap;
}

function renderEditorProducts() {
  const list = document.getElementById('productEditor');
  list.innerHTML = '';

  state.products.forEach((product, index) => {
    const card = document.createElement('article');
    card.className = 'product-card' + (collapsedProducts.has(index) ? ' collapsed' : '');

    const head = document.createElement('div');
    head.className = 'product-card-head';

    const identity = document.createElement('div');
    identity.className = 'product-card-identity';
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
    identity.append(badge, titleWrap);

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
      save(); renderEditorProducts(); render();
    });

    const remove = document.createElement('button');
    remove.className = 'mini-action danger-icon';
    remove.type = 'button';
    remove.title = 'Xóa';
    remove.setAttribute('aria-label', 'Xóa sản phẩm ' + (index + 1));
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      if (state.products.length > 1 && !confirm('Xóa sản phẩm này?')) return;
      state.products.splice(index, 1);
      if (!state.products.length) state.products.push({ group: '', name: '', pack: '', unit: '', qty: 1, price: 0, note: '' });
      collapsedProducts = new Set();
      save(); renderEditorProducts(); render();
    });

    actions.append(collapse, up, down, duplicate, remove);
    head.append(identity, actions);

    const body = document.createElement('div');
    body.className = 'product-card-body';

    const updateProduct = (key, input, numeric = false) => {
      if (numeric) {
        const value = normalizeNonNegativeNumber(input.value);
        product[key] = value;
        if (Number(input.value) !== value) input.value = String(value);
      } else {
        product[key] = input.value;
      }
      if (key === 'name') title.textContent = product.name || 'Sản phẩm chưa đặt tên';
      amount.textContent = money(Number(product.qty || 0) * Number(product.price || 0));
      save();
      renderPreviewProducts();
      renderTotals();
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

    card.append(head, body);
    list.appendChild(card);
  });

  const collapseButton = document.getElementById('collapseAllProducts');
  if (collapseButton) {
    collapseButton.textContent = collapsedProducts.size === state.products.length ? 'Mở tất cả' : 'Thu gọn tất cả';
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

  let activeGroup = null;
  let groupIndex = 0;
  state.products.forEach((product, index) => {
    const productGroup = String(product.group || '').trim();
    if (productGroup && productGroup !== activeGroup) {
      activeGroup = productGroup;
      groupIndex = 0;
      const groupRow = document.createElement('tr');
      groupRow.className = 'qgroup-row';
      const groupCell = document.createElement('td');
      groupCell.colSpan = Math.max(1, cols.length);
      groupCell.textContent = productGroup;
      groupRow.appendChild(groupCell);
      body.appendChild(groupRow);
    }
    groupIndex += 1;

    const row = document.createElement('tr');
    cols.forEach(([, key]) => {
      const td = document.createElement('td');
      let value = '';
      if (key === 'stt') value = productGroup ? groupIndex : index + 1;
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

function renderLogo() {
  const preview = document.getElementById('previewLogo');
  const editor = document.getElementById('logoEdit');
  const designPreview = document.getElementById('logoDesignPreview');
  const targets = [preview, editor, designPreview].filter(Boolean);

  const validTreatments = ['blend','soft','clean','custom','none'];
  const treatment = validTreatments.includes(state.logoTreatment) ? state.logoTreatment : 'blend';
  const backgroundColor = state.logoBackdropColor || state.accent || '#0b8f83';
  const opacity = Math.min(100, Math.max(0, Number(state.logoBackdropOpacity || 0)));
  const radius = Math.min(24, Math.max(0, Number(state.logoBackdropRadius || 0)));
  const borderEnabled = state.logoBackdropBorder === 'soft';

  targets.forEach(target => {
    target.innerHTML = '';
    target.classList.remove('logo-treatment-blend','logo-treatment-soft','logo-treatment-clean','logo-treatment-custom','logo-treatment-none');
    target.classList.add('logo-treatment-' + treatment);
    target.style.borderRadius = radius + 'mm';
    target.style.borderColor = borderEnabled ? hexToRgba(backgroundColor, Math.max(16, opacity + 10)) : 'transparent';
    target.style.borderWidth = borderEnabled ? '1px' : '0';
    target.style.borderStyle = 'solid';

    if (treatment === 'custom') target.style.background = hexToRgba(backgroundColor, opacity);
    else if (treatment === 'soft') target.style.background = hexToRgba(state.accent || backgroundColor, Math.max(4, Math.min(14, opacity || 8)));
    else if (treatment === 'clean') target.style.background = '#ffffff';
    else target.style.background = 'transparent';
  });

  preview.style.padding = Math.max(0, Number(state.logoPadding || 0)) + 'mm';
  preview.style.setProperty('--logo-x', Number(state.logoOffsetX || 0) + 'mm');
  preview.style.setProperty('--logo-y', Number(state.logoOffsetY || 0) + 'mm');
  preview.style.setProperty('--logo-scale', String(Math.min(90, Math.max(18, Number(state.logoWidth || 58))) / 58));
  preview.style.setProperty('--logo-wash', hexToRgba(state.accent || backgroundColor, Math.max(3, Math.min(12, opacity || 6))));

  const buildImage = (target, isPaper = false) => {
    const img = document.createElement('img');
    img.src = state.logo;
    img.alt = 'Logo doanh nghiệp';
    img.style.mixBlendMode = ['multiply','darken'].includes(state.logoBlendMode) ? state.logoBlendMode : 'normal';
    if (isPaper) {
      img.style.width = '58mm';
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      img.draggable = false;
    }
    target.appendChild(img);
  };

  if (state.showLogo && state.logo) {
    buildImage(preview, true);
    buildImage(editor);
    if (designPreview) buildImage(designPreview);
  } else {
    preview.innerHTML = '';
    editor.innerHTML = '<div class="logo-placeholder muted-logo">Chưa có logo</div>';
    if (designPreview) designPreview.innerHTML = '<div class="logo-placeholder muted-logo">Chưa có logo</div>';
  }

  const widthValue = document.getElementById('logoWidthValue');
  if (widthValue) widthValue.textContent = Math.round(Number(state.logoWidth || 56)) + ' mm';
  const opacityValue = document.getElementById('logoBackdropOpacityValue');
  if (opacityValue) opacityValue.textContent = opacity + '%';
  const titleSizeValue = document.getElementById('previewTitleSizeValue');
  if (titleSizeValue) titleSizeValue.textContent = Math.round(Number(state.previewTitleSize || 25)) + ' px';
  const docFontSizeValue = document.getElementById('docFontSizeValue');
  if (docFontSizeValue) docFontSizeValue.textContent = Number(state.docFontSize || 12.2).toFixed(1) + ' px';

  const docHead = document.querySelector('.doc-head');
  if (docHead) {
    docHead.classList.toggle('no-logo', !state.showLogo);
    if (state.showLogo) {
      docHead.style.removeProperty('grid-template-columns');
    } else {
      docHead.style.gridTemplateColumns = '1fr';
    }
  }
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
  const docFontScale = Number(state.docFontSize || 12.2) / 12.2;
  paper.style.fontSize = state.docFontSize + 'px';
  paper.style.setProperty('--doc-font-scale', String(docFontScale));
  [
    ['--fs-company', 9.6],
    ['--fs-company-name', 13.2],
    ['--fs-subtitle', 11.2],
    ['--fs-meta', 9.6],
    ['--fs-recipient', 13.5],
    ['--fs-intro', 10.5],
    ['--fs-section', 11.5],
    ['--fs-table', 9],
    ['--fs-summary', 9.4],
    ['--fs-summary-grand', 10.2],
    ['--fs-words', 9.8],
    ['--fs-small-heading', 10.5],
    ['--fs-payment', 9.4],
    ['--fs-terms', 9.5],
    ['--fs-signature', 9.5],
    ['--fs-footer', 8.4]
  ].forEach(([name, base]) => paper.style.setProperty(name, (base * docFontScale).toFixed(2) + 'px'));
  paper.style.fontFamily = '"' + state.docFont + '", serif';
  paper.style.lineHeight = Number(state.previewLineHeight || 1.26);
  paper.style.setProperty('--preview-title-size', Number(state.previewTitleSize || 25) + 'px');
  paper.style.setProperty('--preview-header-gap', Number(state.previewHeaderGap || 4) + 'mm');
  paper.style.setProperty('--preview-meta-width', Number(state.previewMetaWidth || 44) + 'mm');
  paper.dataset.titleAlign = state.previewTitleAlign || 'center';
  paper.dataset.spacing = state.previewSpacing || 'standard';
  paper.dataset.tableDensity = state.previewTableDensity || 'standard';

  [
    ['pCompanyName','companyName'],['pCompanyAddress','companyAddress'],['pBranchKhanhHoa','branchKhanhHoa'],
    ['pBranchDongNai','branchDongNai'],['pFarmAddress','farmAddress'],['pTaxCode','taxCode'],['pPhone','phone'],
    ['pWebsite','website'],['pCompanyEmail','companyEmail'],['pQuoteTitle','quoteTitle'],['pQuoteSubtitle','quoteSubtitle'],['pQuoteNo','quoteNo'],
    ['pValidity','validity'],['pRecipient','recipientLine'],['pIntro','intro'],['pSection','sectionTitle'],
    ['pTermsTitle','termsTitle'],['pClosing','closingText'],['pDate','dateLine'],['pDateLeft','dateLine'],
    ['pLeftTitle','leftTitle'],['pRightTitle','rightTitle'],['pLeftNote','leftNote'],['pRightNote','rightNote'],
    ['pLeftName','leftName'],['pRightName','rightName'],['pFooter','footerText'],
    ['pSlogan','slogan'],['pPaymentMethod','paymentMethod'],['pBankName','bankName'],
    ['pBankAccount','bankAccount'],['pBankOwner','bankOwner']
  ].forEach(([id, key]) => setText(id, state[key]));

  setText('pQuoteDate', formatDate(state.quoteDate));
  renderLogo();
  applyLayoutOffsets();

  $$('[data-company-key]').forEach((el) => {
    const key = el.dataset.companyKey;
    const hasValue = Boolean(String(state[key] || '').trim());
    const webGate = !el.classList.contains('webemail') || state.showWebEmail;
    el.style.display = hasValue && webGate ? 'block' : 'none';
  });

  const customer = [state.customerName,state.customerCompany,state.customerAddress,state.customerPhone,state.customerEmail]
    .filter(Boolean).join(' • ');
  setText('pCustomer', customer);
  document.getElementById('pCustomer').style.display = state.showCustomer && customer ? 'block' : 'none';

  const terms = document.getElementById('pTerms');
  terms.innerHTML = '';
  String(state.termsText || '').split(/\n+/).filter(Boolean).forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    terms.appendChild(li);
  });
  document.getElementById('termsBox').style.display = state.showTerms ? 'block' : 'none';
  document.getElementById('signatures').style.display = state.showSignature ? 'grid' : 'none';

  const quoteMeta = document.querySelector('.quote-top > .qmeta');
  if (quoteMeta) quoteMeta.style.display = state.showQuoteMeta ? 'block' : 'none';
  paper.classList.toggle('meta-hidden', !state.showQuoteMeta);

  const hasPayment = [state.paymentMethod, state.bankName, state.bankAccount, state.bankOwner].some(Boolean);
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
  if (state.companyAddress) rows.push(['Địa chỉ:', state.companyAddress]);
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

bindInputs();
setupMajorPanelToggles();
enhanceCollapsibleCards();
renderEditorProducts();
render();

document.getElementById('applyTungGiaBaoProfile')?.addEventListener('click', () => {
  applyTungGiaBaoToCurrentQuote();
});

document.getElementById('addProduct').addEventListener('click', () => {
  state.products.push({ group: '', name: '', pack: '', unit: '', qty: 1, price: 0, note: '' });
  save();
  renderEditorProducts();
  render();
});

document.getElementById('productFocusToggle').addEventListener('click', () => {
  const shell = document.querySelector('.shell');
  const enabled = shell.classList.toggle('product-focus');
  document.getElementById('productFocusToggle').textContent = enabled ? '↙ Thu gọn vùng nhập' : '⛶ Mở rộng vùng nhập';
  requestAnimationFrame(() => document.getElementById('fit').click());
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
  state.logoTreatment = 'blend';
  state.logoBlendMode = 'multiply';
  state.logoBackdropColor = state.accent || '#0b8f83';
  state.logoBackdropOpacity = 6;
  state.logoBackdropRadius = 14;
  state.logoBackdropBorder = 'none';
  save();
  syncInputs();
  render();
  toast('Đã căn lại logo');
});

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

  if (file.size > 1500000) {
    alert('Logo quá lớn. Hãy chọn ảnh nhỏ hơn khoảng 1,5 MB để tránh đầy bộ nhớ trình duyệt.');
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
  if (confirm('Lưu báo giá hiện tại vào lịch sử trước khi tạo báo giá mới?')) {
    if (saveCurrentQuote()) createNewQuote();
    return;
  }
  if (confirm('Tạo báo giá mới mà không lưu báo giá hiện tại vào lịch sử?')) createNewQuote();
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
    if (!name && (qty > 0 || price > 0)) warnings.push('Dòng sản phẩm ' + (index + 1) + ' chưa có tên.');
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
  const badge = document.getElementById('documentHealth');
  if (!badge) return;
  const result = validateQuote();
  badge.classList.remove('ok','warn','error');
  if (result.errors.length) {
    badge.classList.add('error');
    badge.textContent = result.errors.length + ' lỗi cần sửa';
  } else if (result.warnings.length) {
    badge.classList.add('warn');
    badge.textContent = result.warnings.length + ' mục cần kiểm tra';
  } else {
    badge.classList.add('ok');
    badge.textContent = 'Sẵn sàng in';
  }
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

const STATUS_LABELS = {
  draft: 'Bản nháp',
  sent: 'Đã gửi',
  accepted: 'Đã chấp nhận',
  rejected: 'Từ chối',
  expired: 'Hết hiệu lực'
};

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
  let existingIndex = state.historyRecordId
    ? items.findIndex(item => item.id === state.historyRecordId)
    : -1;

  if (existingIndex < 0 && state.quoteNo) {
    const collision = items.some(item => item?.data?.quoteNo === state.quoteNo);
    if (collision) {
      state.quoteNo = generateUniqueQuoteNo();
      toast('Mã báo giá trùng; đã đổi thành ' + state.quoteNo);
    }
  }

  const id = existingIndex >= 0
    ? items[existingIndex].id
    : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  state.historyRecordId = id;

  const historyData = clone(state);
  historyData.logo = '';
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
  if (!setHistory(items)) return false;
  const currentSaved = save();
  syncInputs();
  renderHistory();
  toast(currentSaved
    ? (existingIndex >= 0 ? 'Đã cập nhật báo giá' : 'Đã lưu báo giá')
    : 'Đã lưu vào lịch sử; trạng thái hiện tại chưa thể autosave');
  saveCurrentToPc({ notify: false }).catch((error) => console.warn('PC autosave skipped:', error));
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
    logoTreatment: state.logoTreatment,
    logoBlendMode: state.logoBlendMode,
    logoBackdropColor: state.logoBackdropColor,
    logoBackdropOpacity: state.logoBackdropOpacity,
    logoBackdropRadius: state.logoBackdropRadius,
    logoBackdropBorder: state.logoBackdropBorder,
    docFontSize: state.docFontSize,
    previewTitleAlign: state.previewTitleAlign,
    previewTitleSize: state.previewTitleSize,
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
  const acceptedEl = document.getElementById('historyAcceptedCount');
  if (acceptedEl) acceptedEl.textContent = String(acceptedCount);

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
    list.innerHTML = '<div class="history-empty">Chưa có báo giá phù hợp.</div>';
    return;
  }

  items.forEach(record => {
    const data = record.data || {};
    const row = document.createElement('div');
    row.className = 'history-item';

    const info = document.createElement('div');
    info.className = 'history-info';
    const titleLine = document.createElement('div');
    titleLine.className = 'history-title-line';
    const title = document.createElement('strong');
    title.textContent = quoteLabel(data);
    const badge = document.createElement('span');
    const currentStatus = data.quoteStatus || record.status || 'draft';
    badge.className = 'status-badge status-' + currentStatus;
    badge.textContent = statusLabel(currentStatus);
    titleLine.append(title, badge);

    const meta = document.createElement('span');
    const customer = data.customerName || data.customerCompany || 'Chưa nhập khách hàng';
    const recordCurrency = normalizeCatalogCurrency(record.currency || data.currency || 'VND');
    meta.textContent = customer + ' • ' + formatDate(data.quoteDate || '') + ' • ' +
      moneyForCurrency(Number(record.total ?? calcTotal(data)), recordCurrency);
    info.append(titleLine, meta);

    const actions = document.createElement('div');
    actions.className = 'history-actions';
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
      toast('Đã xóa báo giá');
    });

    actions.append(open, copy, del);
    row.append(info, actions);
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
  openTab('customer');
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

  const customers = getCustomerLibrary().filter(item => {
    const haystack = [item.name, item.company, item.phone, item.email].filter(Boolean).join(' ').toLowerCase();
    return !customerQuery || haystack.includes(customerQuery);
  });
  customerList.innerHTML = '';
  if (!customers.length) {
    customerList.innerHTML = '<div class="history-empty">Chưa có khách hàng phù hợp.</div>';
  } else {
    customers.forEach(customer => {
      const row = document.createElement('div');
      row.className = 'master-item';
      const info = document.createElement('div');
      info.className = 'master-info';
      const title = document.createElement('strong');
      title.textContent = customer.name || customer.company || 'Khách hàng';
      const meta = document.createElement('span');
      meta.textContent = [customer.company, customer.phone, customer.email].filter(Boolean).join(' • ');
      info.append(title, meta);

      const actions = document.createElement('div');
      actions.className = 'master-actions';
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
      });
      actions.append(use, del);
      row.append(info, actions);
      customerList.appendChild(row);
    });
  }

  const products = getProductCatalog().filter(item => {
    const haystack = [item.group, item.name, item.pack, item.unit, item.note].filter(Boolean).join(' ').toLowerCase();
    return !productQuery || haystack.includes(productQuery);
  });
  productList.innerHTML = '';
  if (!products.length) {
    productList.innerHTML = '<div class="history-empty">Chưa có sản phẩm phù hợp.</div>';
  } else {
    products.forEach(product => {
      const row = document.createElement('div');
      row.className = 'master-item';
      const info = document.createElement('div');
      info.className = 'master-info';
      const title = document.createElement('strong');
      title.textContent = product.name || 'Sản phẩm';
      const meta = document.createElement('span');
      const productCurrency = normalizeCatalogCurrency(product.currency || 'VND');
      meta.textContent = [product.group, product.pack, product.unit, moneyForCurrency(Number(product.price || 0), productCurrency)]
        .filter(Boolean).join(' • ');
      info.append(title, meta);

      const actions = document.createElement('div');
      actions.className = 'master-actions';
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
      });
      actions.append(add, del);
      row.append(info, actions);
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
    state.companyName,state.companyAddress,state.branchKhanhHoa,state.branchDongNai,state.farmAddress,
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
  state.previewTitleSize = String(state.quoteTitle || '').trim().length > 28 ? 22 : 25;
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
    document.getElementById(id)?.addEventListener('click', autoArrangePreview);
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
    requestAnimationFrame(() => document.getElementById('fit')?.click());
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

setTimeout(() => document.getElementById('fit').click(), 60);
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
