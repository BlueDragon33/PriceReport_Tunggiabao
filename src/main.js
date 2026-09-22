import './styles.css';
import {
  calcQuoteTotal,
  historyTotalsByCurrency,
  nextDuplicateQuoteNo,
  normalizeCatalogCurrency,
  normalizeNonNegativeNumber,
  normalizePhone,
  localDateISO
} from './core.js';

const STORAGE = 'tunggiabao-price-report-v1';
const PRESETS = 'tunggiabao-price-report-presets-v1';
const HISTORY = 'tunggiabao-price-report-history-v1';
const CUSTOMERS = 'tunggiabao-price-report-customers-v1';
const CATALOG = 'tunggiabao-price-report-catalog-v1';
const UI_STATE = 'tunggiabao-price-report-ui-v2';
const LOGO_STORAGE = 'tunggiabao-price-report-logo-v1';

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
  products: [
    { name: 'Trứng gà tươi', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 100, price: 28000, note: '' },
    { name: 'Trứng gà Omega-3', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 50, price: 32000, note: '' },
    { name: 'Trứng vịt tươi', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 50, price: 30000, note: '' },
    { name: 'Trứng gà thảo mộc', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 30, price: 35000, note: '' },
    { name: 'Trứng lồng đào', pack: 'Khay 30 quả', unit: 'Khay', qty: 10, price: 85000, note: '' }
  ]
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));
function merge(data) {
  const rawProducts = Array.isArray(data && data.products) ? data.products : clone(defaults.products);
  const merged = Object.assign(clone(defaults), data || {}, {
    products: rawProducts.map((product) => ({
      name: String(product?.name || ''),
      pack: String(product?.pack || ''),
      unit: String(product?.unit || ''),
      qty: normalizeNonNegativeNumber(product?.qty),
      price: normalizeNonNegativeNumber(product?.price),
      note: String(product?.note || '')
    }))
  });
  if (!merged.products.length) merged.products = [{ name: '', pack: '', unit: '', qty: 1, price: 0, note: '' }];
  if (merged.theme === 'blue') merged.theme = 'corporate';
  if (!['modern','corporate','minimal','classic','emerald','warm','premium','mono'].includes(merged.theme)) merged.theme = 'modern';
  if (!['VND','USD','RUB'].includes(String(merged.currency || '').toUpperCase())) merged.currency = 'VND';
  else merged.currency = String(merged.currency).toUpperCase();
  merged.discountPct = Math.min(100, Math.max(0, Number(merged.discountPct || 0)));
  merged.vatPct = Math.min(100, Math.max(0, Number(merged.vatPct || 0)));
  merged.otherFee = normalizeNonNegativeNumber(merged.otherFee);
  merged.marginX = Math.min(30, Math.max(6, Number(merged.marginX || defaults.marginX)));
  merged.marginTop = Math.min(30, Math.max(6, Number(merged.marginTop || defaults.marginTop)));
  merged.marginBottom = Math.min(30, Math.max(6, Number(merged.marginBottom || defaults.marginBottom)));

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
    'taxCode','phone','website','companyEmail','slogan','quoteTitle','quoteNo','quoteDate',
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
    'showCustomer','showStt','showPrice','showAmount','showNote','showTotals','showWords',
    'showPaymentBlock','showLogo','showSlogan','showWebEmail','showTerms','showSignature',
    'showQuoteMeta','compactTable'
  ];
  booleanKeys.forEach((key) => {
    const value = merged[key];
    if (typeof value === 'string') merged[key] = value.toLowerCase() === 'true';
    else merged[key] = Boolean(value);
  });

  if (!['draft','sent','accepted','rejected','expired'].includes(merged.quoteStatus)) merged.quoteStatus = 'draft';
  if (!['center','left','right'].includes(merged.previewTitleAlign)) merged.previewTitleAlign = 'center';
  if (!['compact','standard','comfortable'].includes(merged.previewTableDensity)) merged.previewTableDensity = 'standard';
  if (!['compact','standard','relaxed'].includes(merged.previewSpacing)) merged.previewSpacing = 'standard';

  return merged;
}
let state;
try {
  const rawStored = JSON.parse(localStorage.getItem(STORAGE));
  state = merge(rawStored);
  const separateLogo = localStorage.getItem(LOGO_STORAGE);
  state.logo = separateLogo || String(rawStored?.logo || '');
  if (!separateLogo && rawStored?.logo) {
    localStorage.setItem(LOGO_STORAGE, rawStored.logo);
    const migrated = clone(rawStored);
    delete migrated.logo;
    localStorage.setItem(STORAGE, JSON.stringify(migrated));
  }
} catch {
  state = clone(defaults);
  try { state.logo = localStorage.getItem(LOGO_STORAGE) || ''; } catch {}
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
  export: ['XUẤT / IN', 'Xuất PDF và sao lưu dữ liệu.'],
  presets: ['LƯU MẪU', 'Lưu các cấu hình báo giá để dùng lại.']
};

function openTab(tab) {
  $$('.nav button[data-tab]').forEach((el) => {
    const active = el.dataset.tab === tab;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
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

function bindInputs() {
  $$('[data-bind]').forEach((el) => {
    const key = el.dataset.bind;
    if (el.type === 'checkbox') el.checked = Boolean(state[key]);
    else el.value = state[key] == null ? '' : state[key];

    const onChange = () => {
      if (el.type === 'checkbox') {
        state[key] = el.checked;
      } else if (el.type === 'number' || el.type === 'range' || ['docFontSize','logoWidth','logoPadding','logoOffsetY','logoBackdropOpacity','logoBackdropRadius','previewTitleSize','previewHeaderGap','previewMetaWidth','previewLineHeight'].includes(key)) {
        let value = Number(el.value || 0);
        if (key === 'discountPct' || key === 'vatPct' || key === 'logoBackdropOpacity') value = Math.min(100, Math.max(0, value));
        else if (key === 'logoWidth') value = Math.min(70, Math.max(28, value));
        else if (key === 'logoPadding') value = Math.min(12, Math.max(0, value));
        else if (key === 'logoOffsetY') value = Math.min(10, Math.max(-10, value));
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
      if (!state.products.length) state.products.push({ name: '', pack: '', unit: '', qty: 1, price: 0, note: '' });
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
  cols.push(['Tên sản phẩm', 'name'], ['Quy cách', 'pack'], ['ĐVT', 'unit'], ['Số lượng', 'qty']);
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

  state.products.forEach((product, index) => {
    const row = document.createElement('tr');
    cols.forEach(([, key]) => {
      const td = document.createElement('td');
      let value = '';
      if (key === 'stt') value = index + 1;
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
  const discountPct = Math.min(100, Math.max(0, Number(state.discountPct || 0)));
  const vatPct = Math.min(100, Math.max(0, Number(state.vatPct || 0)));
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
  preview.style.transform = 'translateY(' + Number(state.logoOffsetY || 0) + 'mm)';
  preview.style.setProperty('--logo-wash', hexToRgba(state.accent || backgroundColor, Math.max(3, Math.min(12, opacity || 6))));

  const buildImage = (target, isPaper = false) => {
    const img = document.createElement('img');
    img.src = state.logo;
    img.alt = 'Logo doanh nghiệp';
    img.style.mixBlendMode = ['multiply','darken'].includes(state.logoBlendMode) ? state.logoBlendMode : 'normal';
    if (isPaper) img.style.width = Math.min(70, Math.max(28, Number(state.logoWidth || 56))) + 'mm';
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
  paper.style.setProperty('--doc', state.accent);
  paper.style.paddingLeft = state.marginX + 'mm';
  paper.style.paddingRight = state.marginX + 'mm';
  paper.style.paddingTop = state.marginTop + 'mm';
  paper.style.paddingBottom = state.marginBottom + 'mm';
  paper.style.fontSize = state.docFontSize + 'px';
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
    ['pWebsite','website'],['pCompanyEmail','companyEmail'],['pQuoteTitle','quoteTitle'],['pQuoteNo','quoteNo'],
    ['pValidity','validity'],['pRecipient','recipientLine'],['pIntro','intro'],['pSection','sectionTitle'],
    ['pTermsTitle','termsTitle'],['pClosing','closingText'],['pDate','dateLine'],['pDateLeft','dateLine'],
    ['pLeftTitle','leftTitle'],['pRightTitle','rightTitle'],['pLeftNote','leftNote'],['pRightNote','rightNote'],
    ['pLeftName','leftName'],['pRightName','rightName'],['pFooter','footerText'],
    ['pSlogan','slogan'],['pPaymentMethod','paymentMethod'],['pBankName','bankName'],
    ['pBankAccount','bankAccount'],['pBankOwner','bankOwner']
  ].forEach(([id, key]) => setText(id, state[key]));

  setText('pQuoteDate', formatDate(state.quoteDate));
  renderLogo();

  $$('.webemail').forEach((el) => {
    el.style.display = state.showWebEmail ? 'block' : 'none';
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
  requestAnimationFrame(updatePageEstimate);
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
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

document.getElementById('addProduct').addEventListener('click', () => {
  state.products.push({ name: '', pack: '', unit: '', qty: 1, price: 0, note: '' });
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
  state.logoWidth = 56;
  state.logoPadding = 2;
  state.logoOffsetY = 0;
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
    try {
      const imported = JSON.parse(reader.result);
      if (!isPlainObject(imported)) throw new Error('invalid quote schema');
      state = merge(imported);
      state.historyRecordId = '';
      saveLogoAsset(state.logo || '');
      save();
      syncInputs();
      renderEditorProducts();
      render();
      toast('Đã nhập dữ liệu');
    } catch {
      alert('File JSON không hợp lệ.');
    }
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
});

document.getElementById('exportAllData').addEventListener('click', () => {
  const payload = {
    schemaVersion: 4,
    exportedAt: new Date().toISOString(),
    current: clone(state),
    history: getHistory(),
    presets: getPresets(),
    customers: getCustomerLibrary(),
    catalog: getProductCatalog()
  };
  download('PriceReport_Tunggiabao-backup.json', JSON.stringify(payload, null, 2), 'application/json');
});

document.getElementById('importAllData').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
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
      state = restoredState;
      saveLogoAsset(state.logo || '');
      setHistory(restoredHistory);
      safeStore(PRESETS, JSON.stringify(restoredPresets));
      setCustomerLibrary(restoredCustomers);
      setProductCatalog(restoredCatalog);
      save();
      syncInputs();
      renderEditorProducts();
      render();
      renderHistory();
      renderPresets();
      renderMasterData();
      toast('Đã khôi phục toàn bộ dữ liệu');
    } catch {
      alert('File sao lưu không hợp lệ hoặc không đúng định dạng PriceReport.');
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
    if (name && qty <= 0) warnings.push('Sản phẩm "' + name + '" có số lượng bằng 0.');
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
  save();
  syncInputs();
  renderHistory();
  toast(existingIndex >= 0 ? 'Đã cập nhật báo giá' : 'Đã lưu báo giá');
  return true;
}

function loadQuoteRecord(record) {
  const activeLogo = state.logo;
  const recordLogo = String(record?.data?.logo || '');
  state = merge(record.data);
  state.logo = recordLogo || activeLogo;
  if (recordLogo) saveLogoAsset(recordLogo);
  state.historyRecordId = record.id || '';
  save();
  syncInputs();
  renderEditorProducts();
  render();
  openTab('general');
  toast('Đã mở ' + quoteLabel(record.data));
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
  save();
  syncInputs();
  renderEditorProducts();
  render();
  openTab('general');
  toast('Đã nhân bản thành ' + state.quoteNo);
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
    logoOffsetY: state.logoOffsetY,
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
    rightNote: state.rightNote
  };
  state = Object.assign(clone(defaults), keep);
  state.products = [{ name: '', pack: '', unit: '', qty: 1, price: 0, note: '' }];
  const d = new Date();
  state.quoteNo = generateUniqueQuoteNo();
  state.quoteDate = d.toISOString().slice(0, 10);
  state.quoteStatus = 'draft';
  state.historyRecordId = '';
  save();
  syncInputs();
  renderEditorProducts();
  render();
  openTab('general');
  toast('Đã tạo báo giá mới');
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
      setHistory(getHistory().filter(item => item.id !== record.id));
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
  setCustomerLibrary(items);
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
  save();
  syncInputs();
  render();
  openTab('customer');
  toast('Đã nạp khách hàng');
}

function normalizeProductCatalog(items) {
  const source = Array.isArray(items) ? items : [];
  return source.flatMap((item, index) => {
    if (!isPlainObject(item)) return [];
    return [{
      id: String(item.id || ('product-' + (index + 1))),
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
  return [product.name, product.pack, product.unit].map(value => String(value || '').trim().toLowerCase()).join('|');
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
  setProductCatalog(items);
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
      name: product.name || '',
      pack: product.pack || '',
      unit: product.unit || '',
      qty: 1,
      price: catalogPrice,
      note: product.note || ''
    });
  }
  save();
  renderEditorProducts();
  render();
  openTab('products');
  toast(currencyMatches ? 'Đã thêm sản phẩm vào báo giá' : 'Đã thêm sản phẩm; đơn giá để 0 vì khác loại tiền tệ');
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
        setCustomerLibrary(getCustomerLibrary().filter(item => item.id !== customer.id));
        renderMasterData();
      });
      actions.append(use, del);
      row.append(info, actions);
      customerList.appendChild(row);
    });
  }

  const products = getProductCatalog().filter(item => {
    const haystack = [item.name, item.pack, item.unit, item.note].filter(Boolean).join(' ').toLowerCase();
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
      meta.textContent = [product.pack, product.unit, moneyForCurrency(Number(product.price || 0), productCurrency)]
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
        setProductCatalog(getProductCatalog().filter(item => item.id !== product.id));
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
  preset.quoteStatus = 'draft';
  preset.customerName = 'QUÝ KHÁCH HÀNG';
  preset.customerCompany = '';
  preset.customerAddress = '';
  preset.customerPhone = '';
  preset.customerEmail = '';
  preset.customerContact = '';
  preset.recipientLine = 'Kính gửi: QUÝ KHÁCH HÀNG';
  preset.discountPct = 0;
  preset.otherFee = 0;
  preset.products = [{ name: '', pack: '', unit: '', qty: 1, price: 0, note: '' }];
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
  safeStore(PRESETS, JSON.stringify(presets));
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
      save();
      syncInputs();
      renderEditorProducts();
      render();
      toast('Đã nạp mẫu');
    });

    del.addEventListener('click', () => {
      delete presets[name];
      safeStore(PRESETS, JSON.stringify(presets));
      renderPresets();
    });

    actions.append(use, del);
    row.append(title, actions);
    card.appendChild(row);
    box.appendChild(card);
  });
}

$$('.clickable').forEach((el) => {
  el.addEventListener('click', () => {
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
function setZoom(value) {
  zoom = Math.max(50, Math.min(120, value));
  document.getElementById('paperWrap').style.transform = 'scale(' + (zoom / 100) + ')';
  document.getElementById('zoomText').textContent = zoom + '%';
  document.getElementById('paperWrap').style.marginBottom =
    (((zoom / 100) - 1) * document.getElementById('paper').offsetHeight) + 'px';
  updatePageEstimate();
}

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
  toast('Đã mở công cụ Xuất / In');
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
  save();
  syncInputs();
  render();
  toast('Đã khôi phục bố cục chuẩn hiện đại');
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
  if (window.innerWidth > 1050) document.getElementById('fit').click();
  requestAnimationFrame(updatePageEstimate);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  setPreviewCustomizer(false);
  document.getElementById('designPanel')?.classList.remove('open');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
