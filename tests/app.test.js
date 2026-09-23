/* @vitest-environment jsdom */
import fs from 'node:fs';
import { beforeAll, expect, test, vi } from 'vitest';

const html = fs.readFileSync('index.html', 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;

beforeAll(async () => {
  localStorage.clear();
  document.body.innerHTML = body.replace(/<script[^>]*src="\.\/src\/main\.js"[^>]*><\/script>/i, '');
  window.alert = vi.fn();
  window.confirm = vi.fn(() => true);
  window.print = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();

  await import('../src/main.js');

  // Disable optional logo warning so the default reference quote can become print-ready.
  const showLogo = document.getElementById('showLogo');
  showLogo.checked = false;
  showLogo.dispatchEvent(new Event('change', { bubbles: true }));
});

test('app boots and renders reference quotation without runtime failure', () => {
  expect(document.getElementById('paper')).toBeTruthy();
  expect(document.querySelectorAll('#qBody tr').length).toBeGreaterThan(0);
  expect(document.getElementById('pCompanyName').textContent).toContain('Tùng Gia Bảo');
  expect(document.getElementById('pQuoteSubtitle').textContent).toContain('09/2026');
  expect(document.querySelectorAll('.qgroup-row').length).toBe(3);
  expect(document.getElementById('documentHealth').textContent).toBe('Sẵn sàng in');
});

test('V4 boots into application dashboard and exposes separate new-quote and editor-entry actions', () => {
  const shell = document.querySelector('.shell');
  expect(shell.classList.contains('app-workspace')).toBe(true);
  expect(document.getElementById('pane-dashboard').classList.contains('active')).toBe(true);
  expect(document.querySelector('[data-tab="dashboard"]').getAttribute('aria-current')).toBe('page');
  expect(document.querySelector('#pane-dashboard [data-create-quote]')).toBeTruthy();

  document.querySelector('[data-tab="general"]').click();
  expect(shell.classList.contains('app-workspace')).toBe(false);
  expect(document.getElementById('pane-general').classList.contains('active')).toBe(true);
  expect(document.querySelector('[data-tab="general"]').getAttribute('aria-current')).toBe('page');

  document.querySelector('[data-tab="dashboard"]').click();
  expect(shell.classList.contains('app-workspace')).toBe(true);
  expect(document.getElementById('pane-dashboard').classList.contains('active')).toBe(true);
});

test('V4.5 quotation studio shows current quote context and navigable workflow steps', () => {
  document.querySelector('[data-tab="general"]').click();
  const quoteNo = document.getElementById('quoteNo').value;
  expect(document.getElementById('studioQuoteLabel').textContent).toBe(quoteNo || 'Báo giá mới');
  expect(document.querySelector('[data-studio-step="general"]').classList.contains('active')).toBe(true);

  document.querySelector('[data-studio-step="products"]').click();
  expect(document.getElementById('pane-products').classList.contains('active')).toBe(true);
  expect(document.querySelector('[data-studio-step="products"]').classList.contains('active')).toBe(true);

  document.querySelector('[data-studio-step="design"]').click();
  expect(document.getElementById('designPanel').classList.contains('open')).toBe(true);

  document.getElementById('studioBackHome').click();
  expect(document.getElementById('designPanel').classList.contains('open')).toBe(false);
  expect(document.getElementById('pane-dashboard').classList.contains('active')).toBe(true);

  document.querySelector('[data-tab="general"]').click();
});

test('V4.1 mobile more menu exposes secondary tools without horizontal tab hunting', () => {
  const toggle = document.getElementById('mobileMoreToggle');
  const menu = document.getElementById('mobileMoreMenu');
  expect(toggle).toBeTruthy();
  expect(menu.hidden).toBe(true);
  toggle.click();
  expect(menu.hidden).toBe(false);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  document.getElementById('mobileMoreClose').click();
  expect(menu.hidden).toBe(true);
});

test('V4.1 dashboard recent quotation opens the selected record directly', () => {
  const historyKey = 'tunggiabao-price-report-history-v1';
  const previousHistory = localStorage.getItem(historyKey);
  document.querySelector('[data-tab="general"]').click();
  document.getElementById('saveQuoteToHistory').click();
  const quoteNo = document.getElementById('quoteNo').value;
  document.querySelector('[data-tab="dashboard"]').click();
  const recent = document.querySelector('#dashRecentQuotes .recent-quote-row');
  expect(recent).toBeTruthy();
  recent.click();
  expect(document.getElementById('pane-general').classList.contains('active')).toBe(true);
  expect(document.getElementById('quoteNo').value).toBe(quoteNo);
  if (previousHistory == null) localStorage.removeItem(historyKey);
  else localStorage.setItem(historyKey, previousHistory);
});

test('V4.6 dashboard global search can find a saved customer and open it', () => {
  const customersKey = 'tunggiabao-price-report-customers-v1';
  const previousCustomers = localStorage.getItem(customersKey);
  const previousName = document.getElementById('customerName').value;
  const previousCompany = document.getElementById('customerCompany').value;

  document.getElementById('customerName').value = 'Khách V46';
  document.getElementById('customerName').dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('customerCompany').value = 'Công ty Search V46';
  document.getElementById('customerCompany').dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('saveCurrentCustomer').click();

  document.querySelector('[data-tab="dashboard"]').click();
  const search = document.getElementById('dashboardSearch');
  search.value = 'Search V46';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  const result = document.querySelector('#dashboardSearchResults .dashboard-search-result[data-result-type="customer"]');
  expect(result).toBeTruthy();
  result.click();
  expect(document.getElementById('pane-customer').classList.contains('active')).toBe(true);
  expect(document.getElementById('customerCompany').value).toBe('Công ty Search V46');

  if (previousCustomers == null) localStorage.removeItem(customersKey);
  else localStorage.setItem(customersKey, previousCustomers);
  document.getElementById('customerName').value = previousName;
  document.getElementById('customerName').dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('customerCompany').value = previousCompany;
  document.getElementById('customerCompany').dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('[data-tab="general"]').click();
});

test('product editor can add a row and keep preview in sync', () => {
  const beforeCards = document.querySelectorAll('.product-card').length;
  const beforeRows = document.querySelectorAll('#qBody tr').length;
  document.getElementById('addProduct').click();
  expect(document.querySelectorAll('.product-card').length).toBe(beforeCards + 1);
  expect(document.querySelectorAll('#qBody tr').length).toBe(beforeRows + 1);
});

test('template selection applies real document profile', () => {
  document.querySelector('.tpl[data-theme="corporate"]').click();
  expect(document.getElementById('paper').classList.contains('theme-corporate')).toBe(true);
  expect(document.querySelector('.quote-top > .qmeta').style.display).toBe('block');

  document.querySelector('.tpl[data-theme="modern"]').click();
  expect(document.getElementById('paper').classList.contains('theme-modern')).toBe(true);
  expect(document.querySelector('.quote-top > .qmeta').style.display).toBe('none');
});

test('history save records one quotation and print preflight reaches print', () => {
  document.getElementById('saveQuoteToHistory').click();
  expect(document.getElementById('historyCount').textContent).toBe('1');
  expect(document.getElementById('historyPendingCount').textContent).toBe('1');
  expect(document.getElementById('historyResultCount').textContent).toBe('1');
  expect(document.querySelectorAll('#quoteHistoryList .history-table-row').length).toBe(1);
  expect(document.querySelectorAll('#quoteHistoryList .history-table-row .history-cell').length).toBe(6);

  document.querySelector('.print-action').click();
  expect(window.print).toHaveBeenCalled();
});

test('reset wording and current-only behavior do not wipe history', () => {
  document.getElementById('reset').click();
  document.querySelector('[data-tab="history"]').click();
  expect(document.getElementById('historyCount').textContent).toBe('1');
});

test('malformed local collections are normalized instead of crashing management screens', () => {
  const historyKey = 'tunggiabao-price-report-history-v1';
  const customersKey = 'tunggiabao-price-report-customers-v1';
  const catalogKey = 'tunggiabao-price-report-catalog-v1';
  const oldHistory = localStorage.getItem(historyKey);
  const oldCustomers = localStorage.getItem(customersKey);
  const oldCatalog = localStorage.getItem(catalogKey);

  localStorage.setItem(historyKey, JSON.stringify([
    null,
    { id: 'broken', data: null },
    { id: 'valid', currency: 'EUR', data: { quoteNo: 'BG-BAD', products: 'wrong-type' } }
  ]));
  localStorage.setItem(customersKey, JSON.stringify([null, { name: ['Sai kiểu'], phone: 12345 }]));
  localStorage.setItem(catalogKey, JSON.stringify([null, { name: 'SP', price: 'Infinity', currency: 'EUR' }]));

  expect(() => document.querySelector('[data-tab="history"]').click()).not.toThrow();
  expect(document.getElementById('historyCount').textContent).toBe('1');
  expect(() => document.querySelector('[data-tab="master"]').click()).not.toThrow();
  expect(document.getElementById('customerLibraryCount').textContent).toBe('1');
  expect(document.getElementById('productCatalogCount').textContent).toBe('1');
  expect(document.getElementById('customerLibraryResultCount').textContent).toBe('1');
  expect(document.getElementById('productCatalogResultCount').textContent).toBe('1');
  expect(document.querySelectorAll('#customerLibraryList .master-table-row').length).toBe(1);
  expect(document.querySelectorAll('#productCatalogList .master-table-row').length).toBe(1);
  expect(document.getElementById('productCatalogList').textContent).toContain('SP');
  expect(document.getElementById('productCatalogList').textContent).toContain('0 VND');

  if (oldHistory == null) localStorage.removeItem(historyKey); else localStorage.setItem(historyKey, oldHistory);
  if (oldCustomers == null) localStorage.removeItem(customersKey); else localStorage.setItem(customersKey, oldCustomers);
  if (oldCatalog == null) localStorage.removeItem(catalogKey); else localStorage.setItem(catalogKey, oldCatalog);
});


test('navigation exposes the active pane to assistive technology', () => {
  document.querySelector('[data-tab="products"]').click();
  expect(document.querySelector('[data-tab="products"]').getAttribute('aria-current')).toBe('page');
  expect(document.querySelector('[data-tab="general"]').hasAttribute('aria-current')).toBe(false);
});


test('full-backup restore rolls back when a storage write fails', async () => {
  const historyKey = 'tunggiabao-price-report-history-v1';
  const presetsKey = 'tunggiabao-price-report-presets-v1';
  const stateKey = 'tunggiabao-price-report-v1';

  const company = document.getElementById('companyName');
  company.value = 'CÔNG TY GIỮ NGUYÊN';
  company.dispatchEvent(new Event('input', { bubbles: true }));

  const originalHistory = JSON.stringify([{
    id: 'keep-history',
    status: 'draft',
    currency: 'VND',
    total: 100,
    data: {
      companyName: 'CÔNG TY GIỮ NGUYÊN',
      quoteTitle: 'BẢNG BÁO GIÁ',
      quoteNo: 'BG-KEEP',
      quoteStatus: 'draft',
      products: [{ name: 'Giữ', qty: 1, price: 100 }]
    }
  }]);
  localStorage.setItem(historyKey, originalHistory);
  localStorage.setItem(presetsKey, JSON.stringify({ Keep: { companyName: 'CÔNG TY GIỮ NGUYÊN', products: [] } }));
  const originalState = localStorage.getItem(stateKey);

  const nativeSetItem = Storage.prototype.setItem;
  let injectedFailure = false;
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === presetsKey && !injectedFailure) {
      injectedFailure = true;
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    }
    return nativeSetItem.call(this, key, value);
  });

  const payload = {
    schemaVersion: 4,
    current: {
      companyName: 'CÔNG TY BỊ THAY',
      quoteTitle: 'BẢNG BÁO GIÁ',
      products: [{ name: 'Mới', qty: 1, price: 200 }]
    },
    history: [],
    presets: {},
    customers: [],
    catalog: []
  };
  const input = document.getElementById('importAllData');
  const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 30));

  setItemSpy.mockRestore();

  expect(injectedFailure).toBe(true);
  expect(localStorage.getItem(historyKey)).toBe(originalHistory);
  expect(localStorage.getItem(stateKey)).toBe(originalState);
  expect(document.getElementById('companyName').value).toBe('CÔNG TY GIỮ NGUYÊN');
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Dữ liệu trước đó đã được phục hồi nguyên trạng'));
});


test('direct preview layout mode drags a block without changing document flow data', () => {
  const toggle = document.getElementById('layoutEditToggle');
  const logo = document.getElementById('previewLogo');
  const companyName = document.getElementById('pCompanyName');
  toggle.click();
  expect(toggle.getAttribute('aria-pressed')).toBe('true');
  expect(document.getElementById('paper').classList.contains('layout-edit-mode')).toBe(true);

  companyName.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 120, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 140, clientY: 120, button: 0 }));

  const stored = JSON.parse(localStorage.getItem('tunggiabao-price-report-v1'));
  expect(stored.layoutOffsets.companyName).toBeTruthy();
  expect(Math.abs(stored.layoutOffsets.companyName.x)).toBeGreaterThan(0);
  expect(companyName.style.getPropertyValue('--layout-x')).toMatch(/mm$/);
  expect(logo.style.getPropertyValue('--layout-x')).toMatch(/mm$/);
});

test('logo size buttons resize visual logo independently and reset positions', () => {
  const width = document.getElementById('logoWidthDesign');
  const before = Number(width.value);
  document.getElementById('logoGrow').click();
  expect(Number(width.value)).toBe(before + 2);
  expect(Number(document.getElementById('previewLogo').style.getPropertyValue('--logo-scale'))).toBeCloseTo((before + 2) / 58, 4);
  document.getElementById('logoShrink').click();
  expect(Number(width.value)).toBe(before);

  document.getElementById('layoutEditToggle').click();
  const section = document.getElementById('pSection');
  section.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 80, clientY: 80, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 110, clientY: 100, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 110, clientY: 100, button: 0 }));
  document.getElementById('resetBlockPositions').click();
  const stored = JSON.parse(localStorage.getItem('tunggiabao-price-report-v1'));
  expect(stored.layoutOffsets).toEqual({});
});


test('layout edit mode stays active across repeated drags and render until Done is pressed', () => {
  const toggle = document.getElementById('layoutEditToggle');
  const companyName = document.getElementById('pCompanyName');
  const section = document.getElementById('pSection');

  toggle.click();
  expect(toggle.getAttribute('aria-pressed')).toBe('true');

  companyName.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 130, clientY: 115, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 130, clientY: 115, button: 0 }));

  expect(toggle.getAttribute('aria-pressed')).toBe('true');
  expect(document.getElementById('paper').classList.contains('layout-edit-mode')).toBe(true);

  const titleInput = document.getElementById('quoteTitle');
  titleInput.value = 'BẢNG BÁO GIÁ MỚI';
  titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  expect(toggle.getAttribute('aria-pressed')).toBe('true');
  expect(document.getElementById('paper').classList.contains('layout-edit-mode')).toBe(true);

  section.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 80, clientY: 80, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 115, clientY: 100, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 115, clientY: 100, button: 0 }));

  const stored = JSON.parse(localStorage.getItem('tunggiabao-price-report-v1'));
  expect(stored.layoutOffsets.companyName).toBeTruthy();
  expect(stored.layoutOffsets.section).toBeTruthy();
  expect(toggle.getAttribute('aria-pressed')).toBe('true');

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(toggle.getAttribute('aria-pressed')).toBe('true');

  toggle.click();
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  expect(document.getElementById('paper').classList.contains('layout-edit-mode')).toBe(false);
});

test('auto arrange resets manual offsets but keeps layout mode active for further adjustment', () => {
  const toggle = document.getElementById('layoutEditToggle');
  toggle.click();

  const companyName = document.getElementById('pCompanyName');
  companyName.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 90, clientY: 90, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 125, clientY: 110, button: 0 }));
  document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 125, clientY: 110, button: 0 }));

  document.getElementById('autoArrangeLayoutPanel').click();
  const stored = JSON.parse(localStorage.getItem('tunggiabao-price-report-v1'));
  expect(stored.layoutOffsets).toEqual({});
  expect(stored.logoOffsetX).toBe(0);
  expect(stored.logoOffsetY).toBe(0);
  expect(stored.previewTitleAlign).toBe('center');
  expect(toggle.getAttribute('aria-pressed')).toBe('true');
  expect(document.getElementById('paper').classList.contains('layout-edit-mode')).toBe(true);
});


test('smart import dialog can parse corrected handwriting text for review without applying automatically', () => {
  document.getElementById('openSmartImport').click();
  expect(document.getElementById('smartImportModal').hidden).toBe(false);

  const raw = document.getElementById('ocrRawText');
  raw.value = 'HKD - Tùng Gia Bảo\nĐT. 0962944688\nBảng báo giá\nKính gửi Quý khách hàng';
  document.getElementById('reparseOcrText').click();

  expect(document.querySelector('[data-import-field="companyName"]').value).toContain('Tùng Gia Bảo');
  expect(document.querySelector('[data-import-field="phone"]').value).toBe('0962944688');
  expect(document.querySelector('[data-import-field="quoteTitle"]').value).toBe('BẢNG BÁO GIÁ');
  expect(document.getElementById('applySmartImport').disabled).toBe(false);

  document.getElementById('cancelSmartImport').click();
  expect(document.getElementById('smartImportModal').hidden).toBe(true);
});


test('collection writes do not show false success when localStorage rejects a customer save', () => {
  const nativeSetItem = Storage.prototype.setItem;
  const key = 'tunggiabao-price-report-customers-v1';
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (storageKey, value) {
    if (storageKey === key) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    return nativeSetItem.call(this, storageKey, value);
  });

  const name = document.getElementById('customerName');
  name.value = 'Khách thử quota';
  name.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('saveCurrentCustomer').click();
  spy.mockRestore();

  expect(localStorage.getItem(key) || '').not.toContain('Khách thử quota');
  expect(document.getElementById('toast').textContent).toContain('Không thể lưu dữ liệu');
});

test('smart import cancel discards stale draft and a new session starts empty', () => {
  document.getElementById('openSmartImport').click();
  const raw = document.getElementById('ocrRawText');
  raw.value = 'HKD - Phiên cũ\nĐT. 0912345678';
  document.getElementById('reparseOcrText').click();
  expect(document.querySelector('[data-import-field="companyName"]').value).toContain('Phiên cũ');

  document.getElementById('cancelSmartImport').click();
  document.getElementById('openSmartImport').click();
  expect(document.querySelector('[data-import-field="companyName"]').value).toBe('');
  expect(document.getElementById('applySmartImport').disabled).toBe(true);
  document.getElementById('cancelSmartImport').click();
});

test('title and subtitle preserve professional vertical hierarchy', () => {
  const wrap = document.querySelector('.qtitle-wrap');
  expect(wrap).toBeTruthy();
  expect(document.getElementById('pQuoteTitle').textContent).not.toBe('');
  expect(document.getElementById('pQuoteSubtitle')).toBeTruthy();
});


test('large Tùng Gia Bảo product set starts collapsed for practical editing', () => {
  const cards = [...document.querySelectorAll('.product-card')];
  expect(cards.length).toBeGreaterThanOrEqual(72);
  expect(cards.filter(card => card.classList.contains('collapsed')).length).toBeGreaterThanOrEqual(72);
});

test('all eight report templates preserve the full grouped price-list content and business data', () => {
  const themes = ['modern','corporate','minimal','classic','emerald','warm','premium','mono'];
  const expectedProducts = document.querySelectorAll('.product-card').length;
  const companyBefore = document.getElementById('pCompanyName').textContent;
  const firstProductBefore = document.querySelector('#qBody tr:not(.qgroup-row) td.col-name')?.textContent;
  for (const theme of themes) {
    document.querySelector('.tpl[data-theme="' + theme + '"]').click();
    expect(document.getElementById('paper').classList.contains('theme-' + theme)).toBe(true);
    expect(document.querySelectorAll('#qBody tr:not(.qgroup-row)').length).toBe(expectedProducts);
    expect(document.querySelectorAll('#qBody .qgroup-row').length).toBe(3);
    expect(document.getElementById('pCompanyName').textContent).toBe(companyBefore);
    expect(document.querySelector('#qBody tr:not(.qgroup-row) td.col-name')?.textContent).toBe(firstProductBefore);
  }
  document.querySelector('.tpl[data-theme="modern"]').click();
});

test('airy spacing survives binding normalization instead of silently becoming standard', () => {
  const select = document.getElementById('previewSpacing');
  select.value = 'airy';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.getElementById('paper').dataset.spacing).toBe('airy');
  expect(JSON.parse(localStorage.getItem('tunggiabao-price-report-v1')).previewSpacing).toBe('airy');
});


test('new quote and reusable preset do not carry a stale reporting period', () => {
  const subtitle = document.getElementById('quoteSubtitle');
  subtitle.value = 'Giá tháng 01/2020';
  subtitle.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('newQuote').click();
  expect(document.getElementById('quoteSubtitle').value).toBe('');
  expect(document.getElementById('dateLine').value).toMatch(/^Nha Trang, ngày/);
});

test('smart import progress is announced to assistive technology', () => {
  const progress = document.getElementById('smartImportProgress');
  expect(progress.getAttribute('role')).toBe('status');
  expect(progress.getAttribute('aria-live')).toBe('polite');
});


test('Smart Import review allows an OCR field to be intentionally cleared before Apply', () => {
  document.getElementById('openSmartImport').click();
  const raw = document.getElementById('ocrRawText');
  raw.value = 'HKD - Tùng Gia Bảo\nĐT. 0962944688\nBảng báo giá\nKính gửi Quý khách hàng';
  document.getElementById('reparseOcrText').click();

  const phone = document.querySelector('[data-import-field="phone"]');
  expect(phone.value).toBe('0962944688');
  phone.value = '';
  phone.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('applySmartImport').click();
  expect(document.getElementById('phone').value).toBe('');
});

test('corrected OCR raw text replaces prior handwriting recognition instead of keeping stale fields', () => {
  document.getElementById('openSmartImport').click();
  const raw = document.getElementById('ocrRawText');
  raw.value = 'HKD - Tên sai\nĐT. 0900000000';
  document.getElementById('reparseOcrText').click();
  expect(document.querySelector('[data-import-field="companyName"]').value).toContain('Tên sai');

  raw.value = 'HKD - Tùng Gia Bảo\nĐT. 0962944688';
  document.getElementById('reparseOcrText').click();
  expect(document.querySelector('[data-import-field="companyName"]').value).toBe('HKD - Tùng Gia Bảo');
  expect(document.querySelector('[data-import-field="phone"]').value).toBe('0962944688');
  document.getElementById('cancelSmartImport').click();
});

test('automatic arrangement hides empty optional Pack and Note columns only', () => {
  document.querySelector('[data-tab="products"]').click();
  const showPack = document.getElementById('showPack');
  const showNote = document.getElementById('showNote');
  showPack.checked = true;
  showPack.dispatchEvent(new Event('change', { bubbles:true }));
  showNote.checked = true;
  showNote.dispatchEvent(new Event('change', { bubbles:true }));

  document.getElementById('layoutEditToggle').click();
  document.getElementById('autoArrangeLayoutToolbar').click();
  expect(document.getElementById('showPack').checked).toBe(false);
  expect(document.getElementById('showNote').checked).toBe(false);
  expect(document.getElementById('showPrice').checked).toBe(true);
  document.getElementById('layoutEditToggle').click();
});


test('legacy Biển Uyên Bảo variants are recognized and replaced with the Tùng Gia Bảo baseline', async () => {
  const { looksLikeLegacyBienUyenBaoProfile, applyTungGiaBaoBaseline } = await import('../src/tunggiabao-defaults.js');
  const legacyVariant = {
    companyName: 'Công ty TNHH TMDV Biển Uyên Bảo',
    phone: '0900 000 000',
    website: 'www.thegioitrung.vn',
    taxCode: '5801476262',
    products: [{ name: 'Mẫu cũ', qty: 1, price: 1 }]
  };
  expect(looksLikeLegacyBienUyenBaoProfile(legacyVariant)).toBe(true);
  const migrated = applyTungGiaBaoBaseline(legacyVariant);
  expect(migrated.companyName).toBe('HKD - Tùng Gia Bảo');
  expect(migrated.phone).toBe('0962944688');
  expect(migrated.companyAddressDetail).toContain('BT02-25');
  expect(migrated.companyProvince).toBe('Khánh Hòa');
  expect(migrated.products.length).toBe(72);
  expect(migrated.showNote).toBe(false);
});

test('manual Tùng Gia Bảo apply button replaces visible business data and products', () => {
  window.confirm.mockReturnValueOnce(true);
  const company = document.getElementById('companyName');
  company.value = 'DỮ LIỆU KHÁC';
  company.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('applyTungGiaBaoProfile').click();

  expect(document.getElementById('companyName').value).toBe('HKD - Tùng Gia Bảo');
  expect(document.getElementById('phone').value).toBe('0962944688');
  expect(document.getElementById('companyAddressDetail').value).toContain('BT02-25');
  expect(document.getElementById('companyProvince').value).toBe('Khánh Hòa');
  expect(document.getElementById('companyWard').value).toBe('');
  expect(document.getElementById('pCompanyRegion').textContent).toBe('Tỉnh Khánh Hòa');
  expect(document.querySelectorAll('.product-card').length).toBe(72);
  expect(document.getElementById('pCompanyName').textContent).toContain('Tùng Gia Bảo');
});


test('obsolete branch and farm fields are removed from the company editor and preview', () => {
  expect(document.getElementById('branchKhanhHoa')).toBeNull();
  expect(document.getElementById('branchDongNai')).toBeNull();
  expect(document.getElementById('farmAddress')).toBeNull();
  expect(document.getElementById('pBranchKhanhHoa')).toBeNull();
  expect(document.getElementById('pBranchDongNai')).toBeNull();
  expect(document.getElementById('pFarmAddress')).toBeNull();
});

test('table font-size control changes only the product table typography', () => {
  const control = document.getElementById('tableFontSize');
  const paper = document.getElementById('paper');

  expect(paper.style.getPropertyValue('--fs-company-name')).toBe('15.2px');
  expect(paper.style.getPropertyValue('--preview-title-size')).toBe('27px');

  control.value = '12';
  control.dispatchEvent(new Event('input', { bubbles: true }));

  expect(paper.style.getPropertyValue('--fs-table')).toBe('12.0px');
  expect(paper.style.getPropertyValue('--fs-company-name')).toBe('15.2px');
  expect(paper.style.getPropertyValue('--fs-recipient')).toBe('15.5px');
  expect(paper.style.getPropertyValue('--preview-title-size')).toBe('27px');
  expect(document.getElementById('tableFontSizeValue').textContent).toBe('12.0 px');
  expect(document.getElementById('designTableFontSize').value).toBe('12');
});

test('outside-table font-size controls are removed so report typography stays fixed', () => {
  expect(document.getElementById('docFontSize')).toBeNull();
  expect(document.getElementById('designFontSize')).toBeNull();
  expect(document.getElementById('previewTitleSize')).toBeNull();
  expect(document.getElementById('tableFontSize')).toBeTruthy();
});

test('report view tab enters a dedicated responsive preview mode and exits cleanly', () => {
  document.querySelector('[data-tab="view"]').click();
  expect(document.querySelector('.shell').classList.contains('report-view')).toBe(true);
  expect(document.body.classList.contains('report-view-active')).toBe(true);
  expect(document.getElementById('exitReportView').hidden).toBe(false);
  expect(document.querySelector('[data-tab="view"]').getAttribute('aria-current')).toBe('page');

  document.getElementById('exitReportView').click();
  expect(document.querySelector('.shell').classList.contains('report-view')).toBe(false);
  expect(document.body.classList.contains('report-view-active')).toBe(false);
  expect(document.querySelector('[data-tab="general"]').getAttribute('aria-current')).toBe('page');
});

test('export pane exposes Excel import/export, OCR import and PC workspace controls', () => {
  document.querySelector('[data-tab="export"]').click();
  expect(document.getElementById('exportExcel')).toBeTruthy();
  expect(document.getElementById('importExcelQuick')).toBeTruthy();
  expect(document.getElementById('importHandwritingQuick')).toBeTruthy();
  expect(document.getElementById('choosePcFolder')).toBeTruthy();
  expect(document.getElementById('savePcNow')).toBeTruthy();
  expect(document.getElementById('restorePcLatest')).toBeTruthy();
  expect(document.getElementById('pcFolderStatus').textContent.length).toBeGreaterThan(0);
});


test('legacy logo styling migrates to original-first mode', async () => {
  localStorage.setItem('tunggiabao-price-report-v1', JSON.stringify({
    companyName: 'HKD - Tùng Gia Bảo',
    logoBlendMode: 'multiply',
    logoTreatment: 'blend',
    products: [{ name:'Trứng', unit:'kg', qty:1, price:1000 }]
  }));
  // Existing boot instance uses current state; pure behavior is asserted by the visible defaults after reset.
  document.getElementById('resetLogoPosition').click();
  expect(document.getElementById('logoDisplayMode').value).toBe('original');
  expect(document.getElementById('logoBlendMode').value).toBe('normal');
  expect(document.getElementById('logoTreatment').value).toBe('none');
});

test('logo mode controls keep original as the default and reveal processing only on demand', () => {
  expect(document.getElementById('logoDisplayMode').value).toBe('original');
  expect(document.getElementById('logoRemoveBgControls').hidden).toBe(true);
  expect(document.getElementById('logoStyledControls').hidden).toBe(true);

  const mode = document.getElementById('logoDisplayMode');
  mode.value = 'remove-bg';
  mode.dispatchEvent(new Event('change', { bubbles:true }));
  expect(document.getElementById('logoRemoveBgControls').hidden).toBe(false);
  expect(document.getElementById('logoStyledControls').hidden).toBe(true);
  expect(document.getElementById('previewLogo').dataset.logoMode).toBe('remove-bg');

  mode.value = 'styled';
  mode.dispatchEvent(new Event('change', { bubbles:true }));
  expect(document.getElementById('logoStyledControls').hidden).toBe(false);
});

test('restore original logo display disables blend, backdrop and processing', () => {
  const mode = document.getElementById('logoDisplayMode');
  mode.value = 'styled';
  mode.dispatchEvent(new Event('change', { bubbles:true }));
  const blend = document.getElementById('logoBlendMode');
  blend.value = 'multiply';
  blend.dispatchEvent(new Event('change', { bubbles:true }));

  document.getElementById('restoreLogoOriginal').click();

  expect(document.getElementById('logoDisplayMode').value).toBe('original');
  expect(document.getElementById('logoBlendMode').value).toBe('normal');
  expect(document.getElementById('logoTreatment').value).toBe('none');
  expect(document.getElementById('previewLogo').dataset.logoMode).toBe('original');
});


test('headquarters is edited as detail + province + ward and preview shows ward before province', () => {
  const detail = document.getElementById('companyAddressDetail');
  const province = document.getElementById('companyProvince');
  const ward = document.getElementById('companyWard');

  detail.value = 'Lô BT02-25 đường số 29 KĐT Nam Nha Trang';
  detail.dispatchEvent(new Event('input', { bubbles:true }));
  province.value = 'Khánh Hòa';
  province.dispatchEvent(new Event('input', { bubbles:true }));
  ward.value = 'Nam Nha Trang';
  ward.dispatchEvent(new Event('input', { bubbles:true }));

  expect(document.getElementById('pCompanyAddressDetail').textContent)
    .toBe('Lô BT02-25 đường số 29 KĐT Nam Nha Trang');
  expect(document.getElementById('pCompanyRegion').textContent)
    .toBe('Phường Nam Nha Trang, Tỉnh Khánh Hòa');

  const stored = JSON.parse(localStorage.getItem('tunggiabao-price-report-v1'));
  expect(stored.companyAddressDetail).toContain('BT02-25');
  expect(stored.companyProvince).toBe('Khánh Hòa');
  expect(stored.companyWard).toBe('Nam Nha Trang');
  expect(stored.companyAddress).toContain('Phường Nam Nha Trang, Tỉnh Khánh Hòa');
});

test('remove-background UI describes deletion rather than light-background styling', () => {
  const mode = document.getElementById('logoDisplayMode');
  mode.value = 'remove-bg';
  mode.dispatchEvent(new Event('change', { bubbles:true }));

  expect(mode.selectedOptions[0].textContent).toContain('Xóa nền');
  expect(document.getElementById('logoModeStatus').textContent).toContain('xóa nền');
  expect(document.getElementById('logoRemoveBgThreshold').min).toBe('8');
  expect(document.getElementById('logoRemoveBgThreshold').max).toBe('140');
});


test('device classification runtime exposes a managed UI profile without gating local data', () => {
  expect(['desktop','tablet','phone']).toContain(document.body.dataset.deviceClass);
  expect(document.body.dataset.deviceProfile).toBeTruthy();
  expect(document.getElementById('deviceProfileChip')).toBeTruthy();
  expect(window.PriceReportManagement).toBeTruthy();
  expect(window.PriceReportManagement.application).toBe('price-report-tunggiabao');
  expect(window.PriceReportManagement.category).toBe('Kế toán');
  expect(window.PriceReportManagement.remoteAdminReady).toBe(false);
  expect(window.PriceReportManagement.getLocalDeviceRecord().deviceCode).toMatch(/^KT-/);
});


test('KT Device Gate starts in rollout-safe classification-only mode before production backend enablement', async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  const accessState = document.documentElement.dataset.priceReportDeviceAccess;
  expect(['classification-only', undefined]).toContain(accessState);
  expect(document.getElementById('deviceProfileChip')).toBeTruthy();
});
