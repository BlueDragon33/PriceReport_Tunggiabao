export const STORAGE_KEY = 'price-report:tunggiabao:v1';
export const PRESET_KEY = 'price-report:tunggiabao:presets:v1';

export const DEFAULT_STATE = {
  company: {
    brandName: 'THẾ GIỚI TRỨNG®',
    name: 'CÔNG TY TNHH TMDV BIỂN UYÊN BẢO',
    address: '12/1 đường 3/4, Phường Xuân Hương - Đà Lạt, Lâm Đồng',
    branchKhanhHoa: 'Số 55 Nguyễn Xiển, P Bắc Nha Trang, Khánh Hòa',
    branchDongNai: 'Tổ 8, Khu phố 3A, Phường Trảng Dài, Đồng Nai',
    farm: 'Ấp Bàu Mây, Xã Tân Phú, Tỉnh Đồng Nai',
    taxCode: '5801476262',
    phone: '0888.458.222',
    website: 'www.thegioitrung.vn',
    email: 'contact@thegioitrung.vn',
    slogan: 'Foods for health'
  },
  customer: { name: 'QUÝ KHÁCH HÀNG', company: '', address: '', phone: '', email: '', contact: '' },
  quote: {
    title: 'BẢNG BÁO GIÁ',
    number: 'BG-2026-001',
    date: new Date().toISOString().slice(0, 10),
    validity: '7 ngày',
    recipient: 'Kính gửi: QUÝ KHÁCH HÀNG',
    intro: 'Công ty TNHH TM DV Biển Uyên Bảo xin trân trọng gửi đến Quý khách hàng bảng báo giá sản phẩm của chúng tôi như sau:',
    productSectionTitle: 'I. CÁC SẢN PHẨM TRỨNG'
  },
  products: [
    { id: cryptoRandomId(), name: 'Trứng gà tươi', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 100, price: 28000, note: '' },
    { id: cryptoRandomId(), name: 'Trứng gà Omega-3', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 50, price: 32000, note: '' },
    { id: cryptoRandomId(), name: 'Trứng vịt tươi', pack: 'Hộp 10 quả', unit: 'Hộp', qty: 50, price: 30000, note: '' }
  ],
  finance: { currency: 'VND', discountPct: 0, vatPct: 0, otherFee: 0, paymentMethod: 'Tiền mặt hoặc chuyển khoản', bankName: '', bankAccount: '', bankOwner: '' },
  terms: {
    title: 'II. ĐIỀU KHOẢN THƯƠNG MẠI',
    lines: [
      'Giá trên đã bao gồm VAT (nếu có), chi phí giao hàng tùy theo khu vực.',
      'Thời gian giao hàng: 1 - 3 ngày kể từ khi xác nhận đơn hàng.',
      'Phương thức thanh toán: Tiền mặt hoặc chuyển khoản.',
      'Bảng báo giá có hiệu lực trong vòng 7 ngày kể từ ngày phát hành.'
    ],
    closing: 'Rất mong được hợp tác cùng Quý khách hàng!'
  },
  signature: {
    dateLine: 'Đà Lạt, ngày ..... tháng ..... năm ........',
    leftTitle: 'KHÁCH HÀNG',
    rightTitle: 'ĐẠI DIỆN CÔNG TY',
    leftNote: '(Ký, ghi rõ họ tên)',
    rightNote: '(Ký, ghi rõ họ tên, đóng dấu)',
    leftName: '',
    rightName: ''
  },
  display: {
    theme: 'modern',
    accent: '#0b8f83',
    fontFamily: 'Times New Roman',
    fontSize: 12.2,
    marginX: 13,
    marginTop: 13,
    marginBottom: 12,
    logoWidth: 61,
    showLogo: true,
    showCustomerBlock: false,
    showWebsiteEmail: true,
    showTerms: true,
    showSignature: true,
    showStt: true,
    showPrice: true,
    showAmount: true,
    showNote: false,
    showTotals: true,
    showAmountWords: true,
    compactTable: false
  },
  footer: 'Vì sức khỏe cộng đồng  •  0888.458.222  •  contact@thegioitrung.vn  •  www.thegioitrung.vn',
  logoDataUrl: ''
};

export function cryptoRandomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

export function normalizeState(input = {}) {
  const base = deepClone(DEFAULT_STATE);
  return {
    ...base,
    ...input,
    company: { ...base.company, ...(input.company || {}) },
    customer: { ...base.customer, ...(input.customer || {}) },
    quote: { ...base.quote, ...(input.quote || {}) },
    finance: { ...base.finance, ...(input.finance || {}) },
    terms: { ...base.terms, ...(input.terms || {}) },
    signature: { ...base.signature, ...(input.signature || {}) },
    display: { ...base.display, ...(input.display || {}) },
    products: Array.isArray(input.products) ? input.products.map((p) => ({ id: p.id || cryptoRandomId(), ...p })) : base.products
  };
}

export function calculateTotals(state) {
  const subtotal = (state.products || []).reduce((sum, item) => sum + number(item.qty) * number(item.price), 0);
  const discount = subtotal * number(state.finance?.discountPct) / 100;
  const taxable = subtotal - discount;
  const vat = taxable * number(state.finance?.vatPct) / 100;
  const otherFee = number(state.finance?.otherFee);
  return { subtotal, discount, taxable, vat, otherFee, grandTotal: taxable + vat + otherFee };
}

export function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value, currency = 'VND') {
  const digits = currency === 'VND' ? 0 : 2;
  return `${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(number(value))} ${currency}`;
}

const DIGITS = ['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
function readTriple(num, full) {
  const hundred = Math.floor(num / 100);
  const ten = Math.floor((num % 100) / 10);
  const one = num % 10;
  let out = '';
  if (hundred || full) {
    out += `${DIGITS[hundred]} trăm`;
    if (!ten && one) out += ' lẻ';
  }
  if (ten > 1) {
    out += `${out ? ' ' : ''}${DIGITS[ten]} mươi`;
    if (one === 1) out += ' mốt';
    else if (one === 5) out += ' lăm';
    else if (one) out += ` ${DIGITS[one]}`;
  } else if (ten === 1) {
    out += `${out ? ' ' : ''}mười`;
    if (one === 5) out += ' lăm';
    else if (one) out += ` ${DIGITS[one]}`;
  } else if (one) {
    out += `${out ? ' ' : ''}${DIGITS[one]}`;
  }
  return out;
}

export function numberToVietnamese(value) {
  let n = Math.round(number(value));
  if (n === 0) return 'Không';
  if (n < 0) return `Âm ${numberToVietnamese(-n).toLowerCase()}`;
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const groups = [];
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
  const parts = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    if (!groups[i]) continue;
    const full = i < groups.length - 1 && groups[i] < 100;
    parts.push(`${readTriple(groups[i], full)}${scales[i] ? ` ${scales[i]}` : ''}`);
  }
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(iso);
}

export function safeJsonParse(text, fallback = null) {
  if (text == null || text === '') return fallback;
  try { const parsed = JSON.parse(text); return parsed ?? fallback; } catch { return fallback; }
}
