export const TUNGGIABAO_PROFILE = {
  companyName: 'HKD - Tùng Gia Bảo',
  companyAddress: 'Lô BT02-25 đường số 29 KĐT Nam Nha Trang',
  branchKhanhHoa: '',
  branchDongNai: '',
  farmAddress: '',
  taxCode: '',
  phone: '0962944688',
  website: '',
  companyEmail: '',
  slogan: '',
  quoteTitle: 'BẢNG BÁO GIÁ',
  quoteSubtitle: 'Giá lương thực, thực phẩm tháng 09/2026',
  quoteNo: '',
  validity: '',
  recipientLine: 'Kính gửi: QUÝ KHÁCH HÀNG',
  intro: 'HKD chúng tôi xin gửi tới quý khách hàng bảng báo giá như sau:',
  sectionTitle: 'DANH MỤC HÀNG HÓA',
  dateLine: 'Nha Trang, ngày ..... tháng 09 năm 2026',
  rightTitle: 'ĐẠI DIỆN HKD',
  rightName: 'HKD TÙNG GIA BẢO',
  footerText: '0962944688'
};

const GROUPS = [
  {
    group: 'CÁC SẢN PHẨM TRỨNG',
    items: [
      ['Trứng gà đỏ','kg',39000],
      ['Trứng gà ta','quả',3500],
      ['Trứng vịt lạt','quả',3670],
      ['Trứng vịt muối','quả',4400],
      ['Trứng vịt bắc thảo','quả',4500],
      ['Trứng cút','quả',650],
      ['Lòng đỏ vịt muối','quả',4500],
      ['Trứng gà non (lạnh)','kg',147000]
    ]
  },
  {
    group: 'CÁC SẢN PHẨM THỊT GIA CẦM',
    items: [
      ['Gà ta thả vườn ls (không lòng mề)','kg',115000],
      ['Gà ta thả vườn ls (có lòng mề)','kg',110000],
      ['Gà ta ls (không lòng mề)','kg',89000],
      ['Gà ta ls (có lòng mề)','kg',84000],
      ['Gà Tam Hoàng ls (không lòng mề)','kg',84000],
      ['Gà Tam Hoàng ls (có lòng mề)','kg',78000],
      ['Vịt ls (không lòng mề)','kg',89000],
      ['Ức gà phi lê','kg',76000],
      ['Đùi gà góc tư','kg',73000],
      ['Đùi tỏi gà','kg',84000],
      ['Cánh gà','kg',84000],
      ['Gan gà','kg',21000],
      ['Mỡ gà','kg',26000],
      ['Chân gà','kg',105000],
      ['Xương gà','kg',21000],
      ['Đầu gà','kg',21000],
      ['Nội tạng gà (mề, tim, gan, cật)','kg',63000],
      ['Cút thịt','kg',98000]
    ]
  },
  {
    group: 'CÁC SẢN PHẨM THỊT HEO',
    items: [
      ['Bao tử heo','kg',136500],['Bì heo','kg',63000],['Cật heo','kg',42000],
      ['Cốc lết','kg',105000],['Cốc lết rút xương','kg',120000],['Da heo','kg',63000],
      ['Đùi heo xay','kg',105000],['Đuôi heo','kg',136000],['Gan heo','kg',21000],
      ['Giò heo','kg',110000],['Giò heo rút xương','kg',110000],['Giò sống','kg',136000],
      ['Heo phile','kg',126000],['Heo sắt','kg',115500],['Huyết heo','kg',26000],
      ['Lưỡi heo','kg',126000],['Mông tảng','kg',105000],['Mông xay','kg',105000],
      ['Mỡ gáy heo','kg',78000],['Mỡ heo khổ','kg',78000],['Nạc dăm','kg',115000],
      ['Nạc dăm đầu giòn','kg',115000],['Nạc đùi','kg',110000],['Nạc vai','kg',110000],
      ['Nạc xay','kg',105000],['Nách heo','kg',105000],['Não heo','kg',36000],
      ['Sườn già','kg',126000],['Sườn non','kg',173000],['Sườn tảng','kg',162000],
      ['Tai heo','kg',89000],['Thịt ba chỉ','kg',147000],['Thịt ba chỉ rút xương','kg',162000],
      ['Thịt heo đùi','kg',105000],['Thịt heo mông','kg',105000],['Thịt heo xay','kg',99000],
      ['Thịt nọng xay','kg',78000],['Thịt thăn','kg',110000],['Thịt vai','kg',120000],
      ['Tim heo','kg',178000],['Xương cổ','kg',99000],['Xương đuôi','kg',84000],
      ['Xương heo','kg',84000],['Xương ống trắng','kg',63000],['Xương ống trắng có thịt','kg',73500],
      ['Xương sống','kg',84000]
    ]
  }
];

export const TUNGGIABAO_PRODUCTS = GROUPS.flatMap(({ group, items }) =>
  items.map(([name, unit, price]) => ({
    group,
    name,
    pack: '',
    unit,
    qty: 1,
    price,
    note: ''
  }))
);


const legacyText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');

export function looksLikeLegacyBienUyenBaoProfile(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  let score = 0;
  const company = legacyText(data.companyName);
  const intro = legacyText(data.intro);
  const address = legacyText(data.companyAddress);
  const footer = legacyText(data.footerText);
  const phone = String(data.phone || '').replace(/\D/g, '');

  if (company.includes('bien uyen bao')) score += 4;
  if (String(data.website || '').toLowerCase().includes('thegioitrung.vn')) score += 2;
  if (String(data.companyEmail || '').toLowerCase().includes('contact@thegioitrung.vn')) score += 2;
  if (String(data.taxCode || '').replace(/\D/g, '') === '5801476262') score += 2;
  if (phone === '0888458222') score += 1;
  if (address.includes('da lat') && address.includes('3/4')) score += 1;
  if (intro.includes('bien uyen bao')) score += 2;
  if (footer.includes('thegioitrung.vn') || footer.includes('bien uyen bao')) score += 1;
  return score >= 3;
}

export function applyTungGiaBaoBaseline(data = {}) {
  return Object.assign({}, data || {}, TUNGGIABAO_PROFILE, {
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
}
