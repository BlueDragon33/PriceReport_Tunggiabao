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
