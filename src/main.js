import './styles.css';

const STORAGE = 'tunggiabao-price-report-v1';
const PRESETS = 'tunggiabao-price-report-presets-v1';
const HISTORY = 'tunggiabao-price-report-history-v1';

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
  quoteDate: new Date().toISOString().slice(0, 10),
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
  showWebEmail: true,
  showTerms: true,
  showSignature: true,
  compactTable: false,
  docFont: 'Times New Roman',
  marginX: 13,
  marginTop: 13,
  marginBottom: 12,
  logoWidth: 60,
  docFontSize: 12.2,
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
  return Object.assign(clone(defaults), data || {}, {
    products: Array.isArray(data && data.products) ? data.products : clone(defaults.products)
  });
}
let state;
try {
  state = merge(JSON.parse(localStorage.getItem(STORAGE)));
} catch {
  state = clone(defaults);
}

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const save = () => localStorage.setItem(STORAGE, JSON.stringify(state));
const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value == null ? '' : value;
};

const tabMeta = {
  general: ['THÔNG TIN CHUNG', 'Logo, doanh nghiệp và thông tin báo giá.'],
  history: ['QUẢN LÝ BÁO GIÁ', 'Lưu, tìm kiếm, mở lại và nhân bản các báo giá.'],
  customer: ['KHÁCH HÀNG', 'Thông tin người nhận và đơn vị mua hàng.'],
  products: ['SẢN PHẨM', 'Danh mục, số lượng, đơn giá và cột hiển thị.'],
  payment: ['THANH TOÁN', 'Chiết khấu, VAT, tổng tiền và tài khoản.'],
  terms: ['ĐIỀU KHOẢN', 'Điều khoản thương mại, ngày tháng và chữ ký.'],
  design: ['THIẾT KẾ', 'Mẫu trình bày, màu sắc và định dạng A4.'],
  export: ['XUẤT / IN', 'Xuất PDF và sao lưu dữ liệu.'],
  presets: ['LƯU MẪU', 'Lưu các cấu hình báo giá để dùng lại.']
};

function openTab(tab) {
  $$('.nav button[data-tab]').forEach((el) => el.classList.toggle('active', el.dataset.tab === tab));
  $$('.pane').forEach((el) => el.classList.toggle('active', el.id === 'pane-' + tab));
  document.getElementById('paneTitle').textContent = tabMeta[tab][0];
  document.getElementById('paneSub').textContent = tabMeta[tab][1];
  if (tab === 'design') document.getElementById('designPanel').classList.add('open');
  if (tab === 'presets') renderPresets();
  if (tab === 'history') renderHistory();
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
      if (el.type === 'checkbox') state[key] = el.checked;
      else if (el.type === 'number') state[key] = Number(el.value || 0);
      else state[key] = el.value;
      save();
      render();
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

function renderEditorProducts() {
  const body = document.getElementById('productEditor');
  body.innerHTML = '';
  state.products.forEach((product, index) => {
    const row = document.createElement('tr');
    const numberCell = document.createElement('td');
    numberCell.textContent = String(index + 1);
    row.appendChild(numberCell);

    [['name','text'],['pack','text'],['unit','text'],['qty','number'],['price','number'],['note','text']].forEach(([key, type]) => {
      const cell = document.createElement('td');
      const input = document.createElement('input');
      input.type = type;
      input.value = product[key] == null ? '' : product[key];
      input.addEventListener('input', () => {
        product[key] = type === 'number' ? Number(input.value || 0) : input.value;
        save();
        renderPreviewProducts();
        renderTotals();
      });
      cell.appendChild(input);
      row.appendChild(cell);
    });

    const actionCell = document.createElement('td');
    const remove = document.createElement('button');
    remove.className = 'btn danger';
    remove.textContent = 'Xóa';
    remove.addEventListener('click', () => {
      state.products.splice(index, 1);
      save();
      renderEditorProducts();
      render();
    });
    actionCell.appendChild(remove);
    row.appendChild(actionCell);
    body.appendChild(row);
  });
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
  head.innerHTML = '';
  body.innerHTML = '';

  const hrow = document.createElement('tr');
  cols.forEach(([label]) => {
    const th = document.createElement('th');
    th.textContent = label;
    hrow.appendChild(th);
  });
  head.appendChild(hrow);

  state.products.forEach((product, index) => {
    const row = document.createElement('tr');
    cols.forEach(([, key]) => {
      const td = document.createElement('td');
      let value = '';
      if (key === 'stt') value = index + 1;
      else if (key === 'price') value = money(product.price);
      else if (key === 'amount') value = money(Number(product.qty || 0) * Number(product.price || 0));
      else value = product[key] == null ? '' : product[key];
      td.textContent = value;
      if (['stt','unit','qty'].includes(key)) td.className = 'center';
      if (['price','amount'].includes(key)) td.className = 'num';
      row.appendChild(td);
    });
    body.appendChild(row);
  });

  $$('.qtable th,.qtable td').forEach((el) => {
    el.style.padding = state.compactTable ? '1.2mm 1mm' : '2mm 1.4mm';
  });
}

function renderTotals() {
  const subtotal = state.products.reduce((sum, p) => sum + Number(p.qty || 0) * Number(p.price || 0), 0);
  const discount = subtotal * Number(state.discountPct || 0) / 100;
  const taxable = subtotal - discount;
  const vat = taxable * Number(state.vatPct || 0) / 100;
  const fee = Number(state.otherFee || 0);
  const total = taxable + vat + fee;

  setText('sub', money(subtotal));
  setText('disc', '- ' + money(discount));
  setText('vat', money(vat));
  setText('fee', money(fee));
  setText('grand', money(total));

  document.getElementById('discRow').style.display = discount ? 'table-row' : 'none';
  document.getElementById('vatRow').style.display = vat ? 'table-row' : 'none';
  document.getElementById('feeRow').style.display = fee ? 'table-row' : 'none';
  document.getElementById('summary').style.display = state.showTotals && state.showAmount ? 'table' : 'none';

  const words = document.getElementById('words');
  words.style.display = state.showTotals && state.showAmount && state.showWords && state.currency === 'VND' ? 'block' : 'none';
  words.textContent = 'Bằng chữ: ' + numberToWords(total) + ' đồng.';
}

function renderLogo() {
  const preview = document.getElementById('previewLogo');
  const editor = document.getElementById('logoEdit');
  preview.innerHTML = '';
  editor.innerHTML = '';

  if (state.showLogo && state.logo) {
    const a = document.createElement('img');
    const b = document.createElement('img');
    a.src = state.logo;
    b.src = state.logo;
    a.style.width = state.logoWidth + 'mm';
    preview.appendChild(a);
    editor.appendChild(b);
  } else if (state.showLogo) {
    preview.innerHTML = '<div class="logo-text">THẾ GIỚI TRỨNG®</div>';
    editor.innerHTML = '<div class="logo-placeholder">THẾ GIỚI TRỨNG®</div>';
  } else {
    preview.innerHTML = '';
    editor.innerHTML = '<div class="logo-placeholder">Logo đang ẩn trên bản in</div>';
  }
  const docHead = document.querySelector('.doc-head');
  if (docHead) docHead.classList.toggle('no-logo', !state.showLogo);
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

  const hasPayment = [state.paymentMethod, state.bankName, state.bankAccount, state.bankOwner].some(Boolean);
  document.getElementById('paymentPrint').style.display = state.showPaymentBlock && hasPayment ? 'block' : 'none';
  document.getElementById('pSlogan').style.display = state.showSlogan && state.slogan ? 'inline' : 'none';
  document.getElementById('footerSep').style.display = state.showSlogan && state.slogan && state.footerText ? 'inline' : 'none';

  renderPreviewProducts();
  renderTotals();

  $$('.tpl').forEach((el) => el.classList.toggle('active', el.dataset.theme === state.theme));
  $$('.color').forEach((el) => el.classList.toggle('active', el.dataset.color === state.accent));
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

bindInputs();
renderEditorProducts();
render();

document.getElementById('addProduct').addEventListener('click', () => {
  state.products.push({ name: '', pack: '', unit: '', qty: 1, price: 0, note: '' });
  save();
  renderEditorProducts();
  render();
});

document.getElementById('logoInput').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.logo = reader.result;
    save();
    render();
    toast('Đã cập nhật logo');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
});

document.getElementById('clearLogo').addEventListener('click', () => {
  state.logo = '';
  save();
  render();
});

$$('.tpl').forEach((el) => {
  el.addEventListener('click', () => {
    state.theme = el.dataset.theme;
    save();
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

document.getElementById('openDesign').addEventListener('click', () => document.getElementById('designPanel').classList.add('open'));
document.getElementById('closeDesign').addEventListener('click', () => document.getElementById('designPanel').classList.remove('open'));

$$('.print-action').forEach((el) => el.addEventListener('click', () => window.print()));

document.getElementById('exportJson').addEventListener('click', () => {
  download('bao-gia-du-lieu.json', JSON.stringify(state, null, 2), 'application/json');
});

document.getElementById('exportSnapshot').addEventListener('click', () => {
  download('bao-gia-snapshot.json', JSON.stringify(state, null, 2), 'application/json');
});

document.getElementById('importJson').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = merge(JSON.parse(reader.result));
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

document.getElementById('saveQuoteToHistory').addEventListener('click', saveCurrentQuote);
document.getElementById('newQuote').addEventListener('click', () => {
  if (confirm('Tạo báo giá mới? Dữ liệu hiện tại vẫn có thể lưu vào lịch sử trước khi tạo mới.')) createNewQuote();
});
document.getElementById('quoteSearch').addEventListener('input', renderHistory);

document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Khôi phục toàn bộ dữ liệu về mẫu ban đầu?')) return;
  state = clone(defaults);
  save();
  syncInputs();
  renderEditorProducts();
  render();
  toast('Đã khôi phục mẫu');
});

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY)) || [];
  } catch {
    return [];
  }
}

function setHistory(items) {
  localStorage.setItem(HISTORY, JSON.stringify(items));
}

function calcTotal(data) {
  const products = Array.isArray(data.products) ? data.products : [];
  const subtotal = products.reduce((sum, p) => sum + Number(p.qty || 0) * Number(p.price || 0), 0);
  const discountPct = Math.min(100, Math.max(0, Number(data.discountPct || 0)));
  const discount = subtotal * discountPct / 100;
  const taxable = subtotal - discount;
  const vat = taxable * Math.max(0, Number(data.vatPct || 0)) / 100;
  return taxable + vat + Math.max(0, Number(data.otherFee || 0));
}

function quoteLabel(data) {
  return data.quoteNo || 'Chưa có số báo giá';
}

function saveCurrentQuote() {
  const items = getHistory();
  const now = new Date().toISOString();
  const existingIndex = state.quoteNo
    ? items.findIndex(item => item.data && item.data.quoteNo === state.quoteNo)
    : -1;
  const record = {
    id: existingIndex >= 0 ? items[existingIndex].id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    savedAt: now,
    total: calcTotal(state),
    data: clone(state)
  };
  if (existingIndex >= 0) items[existingIndex] = record;
  else items.unshift(record);
  setHistory(items);
  renderHistory();
  toast(existingIndex >= 0 ? 'Đã cập nhật báo giá' : 'Đã lưu báo giá');
}

function loadQuoteRecord(record) {
  state = merge(record.data);
  save();
  syncInputs();
  renderEditorProducts();
  render();
  openTab('general');
  toast('Đã mở ' + quoteLabel(record.data));
}

function duplicateQuoteRecord(record) {
  state = merge(clone(record.data));
  const base = state.quoteNo || 'BG';
  state.quoteNo = base + '-COPY';
  state.quoteDate = new Date().toISOString().slice(0, 10);
  save();
  syncInputs();
  renderEditorProducts();
  render();
  openTab('general');
  toast('Đã nhân bản báo giá');
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
    docFontSize: state.docFontSize
  };
  state = Object.assign(clone(defaults), keep);
  const count = getHistory().length + 1;
  const d = new Date();
  const stamp = String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  state.quoteNo = 'BG-' + stamp + '-' + String(count).padStart(3, '0');
  state.quoteDate = d.toISOString().slice(0, 10);
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
  const items = all.filter(record => {
    const data = record.data || {};
    return !query || [data.quoteNo, data.customerName, data.customerCompany, data.customerPhone]
      .filter(Boolean).join(' ').toLowerCase().includes(query);
  });

  document.getElementById('historyCount').textContent = String(all.length);
  const revenue = all.reduce((sum, record) => sum + Number(record.total || calcTotal(record.data || {})), 0);
  document.getElementById('historyRevenue').textContent = new Intl.NumberFormat('vi-VN').format(revenue) + ' ₫';

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
    const title = document.createElement('strong');
    title.textContent = quoteLabel(data);
    const meta = document.createElement('span');
    const customer = data.customerName || data.customerCompany || 'Chưa nhập khách hàng';
    meta.textContent = customer + ' • ' + formatDate(data.quoteDate || '') + ' • ' +
      new Intl.NumberFormat('vi-VN').format(Number(record.total || calcTotal(data))) + ' ₫';
    info.append(title, meta);

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

function getPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESETS)) || {};
  } catch {
    return {};
  }
}

document.getElementById('savePreset').addEventListener('click', () => {
  const name = document.getElementById('presetName').value.trim();
  if (!name) {
    alert('Nhập tên mẫu.');
    return;
  }
  const presets = getPresets();
  presets[name] = clone(state);
  localStorage.setItem(PRESETS, JSON.stringify(presets));
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
      state = merge(presets[name]);
      save();
      syncInputs();
      renderEditorProducts();
      render();
      toast('Đã nạp mẫu');
    });

    del.addEventListener('click', () => {
      delete presets[name];
      localStorage.setItem(PRESETS, JSON.stringify(presets));
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
}

document.getElementById('actual').addEventListener('click', () => setZoom(100));
document.getElementById('fit').addEventListener('click', () => {
  const available = document.querySelector('.preview').clientWidth - 40;
  const width = document.getElementById('paper').offsetWidth;
  setZoom(Math.floor((available / width) * 100));
});

setTimeout(() => document.getElementById('fit').click(), 60);
window.addEventListener('resize', () => {
  if (window.innerWidth > 1050) document.getElementById('fit').click();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
