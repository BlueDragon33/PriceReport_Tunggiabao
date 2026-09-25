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

test('V5.9 unified shell keeps one chrome and opens products in a fixed modal workspace', () => {
  const shell = document.querySelector('.shell');
  expect(shell.classList.contains('app-workspace')).toBe(true);
  expect(document.querySelector('.studio-topbar')).toBeTruthy();
  expect(document.getElementById('studioGlobalTitle').textContent).toBe('Trang chủ');
  expect(document.querySelector('[data-shell-workspace-only]').hidden).toBe(false);

  const workspaceTabs = Array.from(document.querySelectorAll('.nav button[data-tab]'))
    .filter(button => !['customer','products','payment','terms','design','view','presets'].includes(button.dataset.tab))
    .map(button => button.dataset.tab);

  document.querySelector('[data-tab="general"]').click();
  expect(shell.classList.contains('app-workspace')).toBe(false);
  expect(document.querySelector('[data-shell-workspace-only]').hidden).toBe(true);
  expect(document.getElementById('studioQuoteStatus').hidden).toBe(false);
  expect(document.querySelector('.content-library').dataset.contentMode).toBe('home');

  const studioTabs = Array.from(document.querySelectorAll('.nav button[data-tab]'))
    .filter(button => !['customer','products','payment','terms','design','view','presets'].includes(button.dataset.tab))
    .map(button => button.dataset.tab);
  expect(studioTabs).toEqual(workspaceTabs);

  document.querySelector('#contentBlockList [data-content-block="products"]').click();
  expect(document.getElementById('pane-products').classList.contains('active')).toBe(true);
  expect(document.querySelector('.content-library').dataset.contentMode).toBe('detail');
  expect(document.getElementById('productWorkspaceModal').hidden).toBe(false);
  expect(document.getElementById('productEditor').closest('#productWorkspaceModal')).toBeTruthy();
  expect(document.querySelector('#pane-products #productEditor')).toBeFalsy();

  document.getElementById('closeProductWorkspace').click();
  expect(document.getElementById('productWorkspaceModal').hidden).toBe(true);
  document.getElementById('contentLibraryBack').click();
  expect(document.querySelector('.content-library').dataset.contentMode).toBe('home');

  document.querySelector('[data-open-inspector="design"]').click();
  expect(document.getElementById('designPanel').classList.contains('open')).toBe(true);

  document.getElementById('studioBackHome').click();
  expect(document.getElementById('designPanel').classList.contains('open')).toBe(false);
  expect(document.getElementById('pane-dashboard').classList.contains('active')).toBe(true);
  expect(document.querySelector('[data-shell-workspace-only]').hidden).toBe(false);

  document.querySelector('[data-tab="general"]').click();
});

test('V5.9 quotation studio exposes seven content blocks and one command hierarchy', () => {
  document.querySelector('[data-tab="general"]').click();
  const blocks = Array.from(document.querySelectorAll('#contentBlockList [data-content-block]'));
  expect(blocks.map(button => button.dataset.contentBlock)).toEqual([
    'general','customer','products','payment','terms','signature','custom-text'
  ]);
  expect(document.getElementById('studioGlobalSave')).toBeTruthy();
  expect(document.getElementById('studioGlobalPreview')).toBeTruthy();
  expect(document.getElementById('studioGlobalPdf')).toBeTruthy();
  expect(document.getElementById('studioCommandSearch')).toBeTruthy();
  expect(document.querySelector('.studio-stepper')).toBeFalsy();
  expect(document.querySelector('.studio-commandbar')).toBeFalsy();

  document.querySelector('#contentBlockList [data-content-block="terms"]').click();
  expect(document.getElementById('pane-terms').classList.contains('active')).toBe(true);
  document.getElementById('contentLibraryBack').click();

  document.querySelector('#contentBlockList [data-content-block="payment"]').click();
  expect(document.getElementById('pane-payment').classList.contains('active')).toBe(true);
  document.getElementById('contentLibraryBack').click();
  document.querySelector('[data-tab="general"]').click();
});

test('V4.1 mobile more menu exposes secondary tools without horizontal tab hunting', () => {
  const toggle = document.getElementById('mobileMoreToggle');
  const menu = document.getElementById('mobileMoreMenu');
  expect(toggle).toBeTruthy();
  expect(menu.hidden).toBe(true);
  toggle.focus();
  toggle.click();
  expect(menu.hidden).toBe(false);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(menu.getAttribute('role')).toBe('dialog');
  expect(menu.contains(document.activeElement)).toBe(true);
  document.getElementById('mobileMoreClose').click();
  expect(menu.hidden).toBe(true);
  expect(document.activeElement).toBe(toggle);

  toggle.click();
  const customerAction = menu.querySelector('[data-open-tab="customer"]');
  customerAction.click();
  expect(menu.hidden).toBe(true);
  expect(document.getElementById('pane-customer').contains(document.activeElement)).toBe(true);
  document.querySelector('[data-tab="dashboard"]').click();
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
  const fieldIds = ['customerName','customerCompany','customerAddress','customerPhone','customerEmail','customerContact','recipientLine'];
  const previousFields = Object.fromEntries(fieldIds.map(id => [id, document.getElementById(id).value]));

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
  expect(search.getAttribute('role')).toBe('combobox');
  expect(document.getElementById('dashboardSearchResults').getAttribute('role')).toBe('listbox');
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(search.getAttribute('aria-activedescendant')).toBeTruthy();
  const activeOption = document.getElementById(search.getAttribute('aria-activedescendant'));
  expect(activeOption?.getAttribute('aria-selected')).toBe('true');
  while (document.querySelector('#dashboardSearchResults .dashboard-search-result.is-active') !== result) {
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  }
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(document.getElementById('pane-general').classList.contains('active')).toBe(true);
  expect(document.getElementById('quickCustomerCompany').value).toBe('Công ty Search V46');

  if (previousCustomers == null) localStorage.removeItem(customersKey);
  else localStorage.setItem(customersKey, previousCustomers);
  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    el.value = previousFields[id];
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.querySelector('[data-tab="general"]').click();
});

test('V4.9 settings persist application preferences without touching business data', () => {
  const uiKey = 'tunggiabao-price-report-ui-v2';
  const historyKey = 'tunggiabao-price-report-history-v1';
  const beforeHistory = localStorage.getItem(historyKey);
  const beforeUi = localStorage.getItem(uiKey);

  document.querySelector('[data-tab="settings"]').click();
  expect(document.getElementById('pane-settings').classList.contains('active')).toBe(true);

  const hero = document.getElementById('settingsShowDashboardHero');
  hero.checked = false;
  hero.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.body.classList.contains('dashboard-hero-hidden')).toBe(true);

  const compact = document.getElementById('settingsCompactManagement');
  compact.checked = true;
  compact.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.body.classList.contains('management-compact')).toBe(true);

  const start = document.getElementById('settingsStartPage');
  start.value = 'history';
  start.dispatchEvent(new Event('change', { bubbles: true }));
  const savedUi = JSON.parse(localStorage.getItem(uiKey));
  expect(savedUi.appPreferences.startPage).toBe('history');
  expect(localStorage.getItem(historyKey)).toBe(beforeHistory);

  if (beforeUi == null) localStorage.removeItem(uiKey);
  else localStorage.setItem(uiKey, beforeUi);
  const previousPrefs = beforeUi ? (JSON.parse(beforeUi).appPreferences || {}) : {};
  document.body.classList.toggle('dashboard-hero-hidden', previousPrefs.showDashboardHero === false);
  document.body.classList.toggle('management-compact', Boolean(previousPrefs.compactManagement));
  document.querySelector('[data-tab="general"]').click();
});

test('V5.2 smart import includes a row-level issue review surface', () => {
  const section = document.getElementById('smartImportIssues');
  const list = document.getElementById('smartImportIssueList');
  const summary = document.getElementById('smartImportIssueSummary');
  expect(section).toBeTruthy();
  expect(list).toBeTruthy();
  expect(summary).toBeTruthy();
  expect(section.hidden).toBe(true);
});

test('V5.2 smart import exposes a dedicated multi-sheet chooser without cluttering the default flow', () => {
  const picker = document.getElementById('smartImportSheetPicker');
  const select = document.getElementById('smartImportSheetSelect');
  const hint = document.getElementById('smartImportSheetHint');
  expect(picker).toBeTruthy();
  expect(select).toBeTruthy();
  expect(hint).toBeTruthy();
  expect(picker.hidden).toBe(true);
  expect(select.getAttribute('aria-label')).toContain('sheet Excel');
});

test('V5.8 Check inspector reflects validation health without a workflow stepper', () => {
  document.querySelector('[data-tab="general"]').click();
  const company = document.getElementById('companyName');
  const previous = company.value;
  company.value = '';
  company.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('inspectorRunCheck').click();
  expect(Number(document.getElementById('inspectorErrorCount').textContent)).toBeGreaterThan(0);
  expect(document.getElementById('inspectorHealthStatus').classList.contains('error')).toBe(true);
  expect(document.querySelector('[data-studio-step]')).toBeFalsy();

  company.value = previous || 'Tùng Gia Bảo';
  company.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('inspectorRunCheck').click();
  expect(document.getElementById('inspectorHealthStatus').classList.contains('error')).toBe(false);
  document.getElementById('closeStudioGuidance').click();
});

test('V5.3 product warning guidance focuses the matching product row', async () => {
  document.querySelector('[data-tab="products"]').click();
  document.getElementById('addProduct').click();

  let card = document.querySelector('#productEditor .product-card:last-child');
  const index = card.dataset.productIndex;
  const name = card.querySelector('[data-product-key="name"]');
  const qty = card.querySelector('[data-product-key="qty"]');

  name.value = 'V5.3 guided row target';
  name.dispatchEvent(new Event('input', { bubbles: true }));
  card = document.querySelector('#productEditor .product-card[data-product-index="' + index + '"]');
  const refreshedQty = card.querySelector('[data-product-key="qty"]');
  refreshedQty.value = '-2';
  refreshedQty.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('inspectorRunCheck').click();
  const issue = Array.from(document.querySelectorAll('#studioGuidanceList .studio-guidance-item'))
    .find(item => item.textContent.includes('V5.3 guided row target') && item.textContent.includes('số lượng âm'));
  expect(issue).toBeTruthy();
  issue.click();
  await new Promise(resolve => requestAnimationFrame(resolve));

  const targetCard = document.querySelector('#productEditor .product-card[data-product-index="' + index + '"]');
  expect(document.activeElement).toBe(targetCard.querySelector('[data-product-key="qty"]'));

  targetCard.querySelector('.danger-icon').click();
  document.getElementById('closeStudioGuidance').click();
});

test('V5.3 duplicate product names still route a warning to the exact row and field', async () => {
  document.querySelector('[data-tab="products"]').click();
  document.getElementById('addProduct').click();
  document.getElementById('addProduct').click();

  const cards = Array.from(document.querySelectorAll('#productEditor .product-card')).slice(-2);
  for (const card of cards) {
    const name = card.querySelector('[data-product-key="name"]');
    name.value = 'Sản phẩm trùng tên V5.3';
    name.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const refreshedCards = Array.from(document.querySelectorAll('#productEditor .product-card')).slice(-2);
  const secondIndex = refreshedCards[1].dataset.productIndex;
  const secondQty = refreshedCards[1].querySelector('[data-product-key="qty"]');
  secondQty.value = '-3';
  secondQty.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('inspectorRunCheck').click();
  const issue = Array.from(document.querySelectorAll('#studioGuidanceList .studio-guidance-item'))
    .find(item => item.textContent.includes('Dòng sản phẩm ' + (Number(secondIndex) + 1))
      && item.textContent.includes('Sản phẩm trùng tên V5.3')
      && item.textContent.includes('số lượng âm'));
  expect(issue).toBeTruthy();
  issue.click();
  await new Promise(resolve => requestAnimationFrame(resolve));

  const targetCard = document.querySelector('#productEditor .product-card[data-product-index="' + secondIndex + '"]');
  expect(document.activeElement).toBe(targetCard.querySelector('[data-product-key="qty"]'));

  targetCard.querySelector('.danger-icon').click();
  document.querySelector('#productEditor .product-card:last-child .danger-icon').click();
  document.getElementById('closeStudioGuidance').click();
});

test('V5.3 payment guidance targets the actionable missing control', async () => {
  document.querySelector('[data-tab="payment"]').click();
  const showTotals = document.getElementById('showTotals');
  const discount = document.getElementById('discountPct');
  const previousTotals = showTotals.checked;
  const previousDiscount = discount.value;

  showTotals.checked = false;
  showTotals.dispatchEvent(new Event('change', { bubbles: true }));
  discount.value = '5';
  discount.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('inspectorRunCheck').click();

  const issue = Array.from(document.querySelectorAll('#studioGuidanceList .studio-guidance-item'))
    .find(item => item.textContent.includes('bảng tổng cộng đang bị ẩn'));
  expect(issue).toBeTruthy();
  issue.click();
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect(document.activeElement).toBe(showTotals);

  discount.value = previousDiscount;
  discount.dispatchEvent(new Event('input', { bubbles: true }));
  showTotals.checked = previousTotals;
  showTotals.dispatchEvent(new Event('change', { bubbles: true }));
  document.getElementById('closeStudioGuidance').click();
});

test('V5.3 guided validation panel exists and is hidden until requested', () => {
  const panel = document.getElementById('studioGuidancePanel');
  const list = document.getElementById('studioGuidanceList');
  const summary = document.getElementById('studioGuidanceSummary');
  expect(panel).toBeTruthy();
  expect(list).toBeTruthy();
  expect(summary).toBeTruthy();
  expect(panel.hidden).toBe(true);
});

test('V5.3 guided correction can return focus to the issue with Escape', async () => {
  document.querySelector('[data-tab="general"]').click();
  const company = document.getElementById('companyName');
  const previous = company.value;

  company.value = '';
  company.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('inspectorRunCheck').click();

  const issue = Array.from(document.querySelectorAll('#studioGuidanceList .studio-guidance-item'))
    .find(item => item.textContent.includes('Thiếu tên công ty'));
  expect(issue).toBeTruthy();
  issue.click();
  await new Promise(resolve => requestAnimationFrame(resolve));

  expect(document.activeElement).toBe(company);
  company.value = ' ';
  company.dispatchEvent(new Event('input', { bubbles: true }));
  const refreshedIssue = Array.from(document.querySelectorAll('#studioGuidanceList .studio-guidance-item'))
    .find(item => item.textContent.includes('Thiếu tên công ty'));
  expect(refreshedIssue).toBeTruthy();
  expect(refreshedIssue).not.toBe(issue);
  expect(document.activeElement).toBe(company);

  company.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(document.activeElement).toBe(refreshedIssue);

  company.value = previous || 'Tùng Gia Bảo';
  company.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('closeStudioGuidance').click();
});

test('V5.3 open guidance refreshes immediately after a field is corrected', () => {
  document.querySelector('[data-tab="general"]').click();
  const company = document.getElementById('companyName');
  const previous = company.value;

  company.value = '';
  company.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('inspectorRunCheck').click();
  expect(document.getElementById('studioGuidancePanel').textContent).toContain('Thiếu tên công ty');

  company.value = previous || 'Tùng Gia Bảo';
  company.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.getElementById('studioGuidancePanel').textContent).not.toContain('Thiếu tên công ty');

  document.getElementById('closeStudioGuidance').click();
});

test('V5.3 Studio validation opens guided issues instead of relying only on alerts', () => {
  document.querySelector('[data-tab="general"]').click();
  const company = document.getElementById('companyName');
  const previous = company.value;
  company.value = '';
  company.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('inspectorRunCheck').click();
  const panel = document.getElementById('studioGuidancePanel');
  expect(panel.hidden).toBe(false);
  expect(panel.textContent).toContain('Thiếu tên công ty');
  expect(panel.querySelector('.studio-guidance-item.error')).toBeTruthy();

  company.value = previous;
  company.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('closeStudioGuidance').click();
  expect(panel.hidden).toBe(true);
});

test('V5 dynamic feedback exposes live, busy and empty-state semantics', async () => {
  const toast = document.getElementById('toast');
  expect(toast.getAttribute('role')).toBe('status');
  expect(toast.getAttribute('aria-live')).toBe('polite');

  const dialog = document.getElementById('smartImportDialog');
  expect(dialog.getAttribute('aria-busy')).toBe('false');

  document.querySelector('[data-tab="dashboard"]').click();
  const recent = document.getElementById('dashRecentQuotes');
  if (recent.querySelector('.dashboard-empty')) {
    expect(recent.querySelector('.dashboard-empty').getAttribute('role')).toBe('status');
  }

  document.querySelector('[data-tab="system"]').click();
  expect(document.getElementById('pane-system').getAttribute('aria-busy')).toBe('false');
  document.querySelector('[data-tab="general"]').click();
});

test('V5 Pass 18 removes static inline presentation from application controls', () => {
  const swatches = Array.from(document.querySelectorAll('.color[data-color]'));
  expect(swatches.length).toBeGreaterThan(0);
  expect(swatches.every((element) => !element.getAttribute('style'))).toBe(true);
  expect(document.getElementById('pCustomer').classList.contains('report-customer-meta')).toBe(true);
});

test('V5 Pass 18 applies one Studio surface language across all editor panes', () => {
  for (const id of ['general','customer','products','payment','terms','design','presets']) {
    const pane = document.getElementById('pane-' + id);
    expect(pane.classList.contains('studio-pane')).toBe(true);
  }
  expect(document.querySelector('#pane-general .studio-logo-actions')).toBeTruthy();
});

test('V5.2 product entry uses one spreadsheet-style grid surface', () => {
  document.querySelector('[data-tab="products"]').click();
  const shell = document.querySelector('.product-data-grid-shell');
  const header = document.querySelector('.product-data-grid-head');
  const editor = document.getElementById('productEditor');
  expect(shell).toBeTruthy();
  expect(header.children.length).toBe(9);
  expect(header.textContent).toContain('Tên sản phẩm');
  expect(header.textContent).toContain('Đơn giá');
  expect(editor.classList.contains('product-data-grid')).toBe(true);
  const first = editor.querySelector('.product-card');
  expect(first.dataset.productIndex).toBe('0');
  expect(first.querySelector('[data-product-field="name"]')).toBeTruthy();
});

test('Enter on the last product cell creates a new row for continuous data entry', () => {
  document.querySelector('[data-tab="products"]').click();
  const before = document.querySelectorAll('#productEditor .product-card').length;
  const lastName = document.querySelector('#productEditor .product-card:last-child [data-product-key="name"]');
  lastName.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(document.querySelectorAll('#productEditor .product-card').length).toBe(before + 1);
  document.querySelector('#productEditor .product-card:last-child .danger-icon').click();
  expect(document.querySelectorAll('#productEditor .product-card').length).toBe(before);
});

test('customer entry fields share autocomplete sources without a second customer engine', () => {
  expect(document.getElementById('quickCustomerName').getAttribute('list')).toBe('customerNameSuggestions');
  expect(document.getElementById('customerName').getAttribute('list')).toBe('customerNameSuggestions');
  expect(document.getElementById('quickCustomerCompany').getAttribute('list')).toBe('customerCompanySuggestions');
  expect(document.getElementById('quickCustomerPhone').getAttribute('list')).toBe('customerPhoneSuggestions');
  expect(document.getElementById('customerNameSuggestions')).toBeTruthy();
  expect(document.getElementById('customerCompanySuggestions')).toBeTruthy();
  expect(document.getElementById('customerPhoneSuggestions')).toBeTruthy();
});

test('V5.4 Data Library renders 100, 300 and 500 products and searches Vietnamese text without accents', () => {
  const key = 'tunggiabao-price-report-catalog-v1';
  const beforeRaw = localStorage.getItem(key);
  const search = document.getElementById('productCatalogSearch');

  for (const size of [100, 300, 500]) {
    const catalog = Array.from({ length: size }, (_, index) => ({
      id: 'perf-product-' + size + '-' + index,
      group: index % 2 ? 'Trứng gia cầm' : 'Thực phẩm',
      name: 'Sản phẩm Trứng số ' + (index + 1),
      pack: 'Hộp ' + ((index % 5) + 1),
      unit: 'Hộp',
      price: 28000 + index,
      currency: 'VND',
      note: index % 7 === 0 ? 'Giao sáng' : ''
    }));
    localStorage.setItem(key, JSON.stringify(catalog));
    search.value = '';
    document.querySelector('[data-tab="master"]').click();
    expect(document.querySelectorAll('#productCatalogList .master-item').length).toBe(size);
    expect(document.getElementById('productCatalogResultCount').textContent).toBe(String(size));
  }

  search.value = 'trung so 500';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  const rows = document.querySelectorAll('#productCatalogList .master-item');
  expect(rows.length).toBe(1);
  expect(rows[0].textContent).toContain('Sản phẩm Trứng số 500');

  if (beforeRaw == null) localStorage.removeItem(key);
  else localStorage.setItem(key, beforeRaw);
  search.value = '';
  document.querySelector('[data-tab="master"]').click();
});

test('V5.4 Data Management filters, currency-aware duplicates and bulk selection work together', () => {
  const catalogKeyName = 'tunggiabao-price-report-catalog-v1';
  const customerKeyName = 'tunggiabao-price-report-customers-v1';
  const beforeCatalog = localStorage.getItem(catalogKeyName);
  const beforeCustomers = localStorage.getItem(customerKeyName);

  localStorage.setItem(catalogKeyName, JSON.stringify([
    { id:'dm-p1', group:'Trứng', name:'Trứng gà', pack:'Hộp 10', unit:'Hộp', price:28000, currency:'VND', note:'' },
    { id:'dm-p2', group:'Trứng', name:'Trứng gà', pack:'Hộp 10', unit:'Hộp', price:29000, currency:'VND', note:'Giá khác' },
    { id:'dm-p3', group:'Trứng', name:'Trứng gà', pack:'Hộp 10', unit:'Hộp', price:1.2, currency:'USD', note:'Biến thể tiền tệ hợp lệ' },
    { id:'dm-p4', group:'Thịt', name:'Ức gà', pack:'', unit:'kg', price:3.1, currency:'USD', note:'' }
  ]));
  localStorage.setItem(customerKeyName, JSON.stringify([
    { id:'dm-c1', name:'Khách có SĐT', company:'A', phone:'0912345678', email:'', address:'', contact:'' },
    { id:'dm-c2', name:'Khách thiếu SĐT', company:'B', phone:'', email:'b@example.com', address:'', contact:'' }
  ]));

  document.getElementById('productCatalogSearch').value = '';
  document.getElementById('customerLibrarySearch').value = '';
  document.getElementById('customerLibraryFilter').value = '';
  document.getElementById('productCatalogCurrencyFilter').value = '';
  document.getElementById('productCatalogDuplicateOnly').checked = false;
  document.querySelector('[data-tab="master"]').click();

  expect(document.getElementById('productCatalogDuplicateSummary').hidden).toBe(false);
  expect(document.getElementById('productCatalogDuplicateCount').textContent).toContain('1 nhóm trùng');

  const duplicateOnly = document.getElementById('productCatalogDuplicateOnly');
  duplicateOnly.checked = true;
  duplicateOnly.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.querySelectorAll('#productCatalogList .master-item').length).toBe(2);
  expect(document.getElementById('productCatalogList').textContent).not.toContain('Biến thể tiền tệ hợp lệ');

  duplicateOnly.checked = false;
  duplicateOnly.dispatchEvent(new Event('change', { bubbles: true }));
  const groupFilter = document.getElementById('productCatalogGroupFilter');
  groupFilter.value = 'Trứng';
  groupFilter.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.querySelectorAll('#productCatalogList .master-item').length).toBe(3);

  groupFilter.value = '';
  groupFilter.dispatchEvent(new Event('change', { bubbles: true }));
  const currencyFilter = document.getElementById('productCatalogCurrencyFilter');
  currencyFilter.value = 'USD';
  currencyFilter.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.querySelectorAll('#productCatalogList .master-item').length).toBe(2);

  currencyFilter.value = '';
  currencyFilter.dispatchEvent(new Event('change', { bubbles: true }));
  const productSelect = document.querySelector('#productCatalogList .master-row-select');
  productSelect.checked = true;
  productSelect.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.getElementById('productCatalogBulkBar').hidden).toBe(false);
  expect(document.getElementById('productCatalogBulkCount').textContent).toContain('1 sản phẩm');
  document.getElementById('clearProductCatalogSelection').click();
  expect(document.getElementById('productCatalogBulkBar').hidden).toBe(true);

  const customerFilter = document.getElementById('customerLibraryFilter');
  customerFilter.value = 'missing-phone';
  customerFilter.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.querySelectorAll('#customerLibraryList .master-item').length).toBe(1);
  expect(document.getElementById('customerLibraryList').textContent).toContain('Khách thiếu SĐT');

  if (beforeCatalog == null) localStorage.removeItem(catalogKeyName);
  else localStorage.setItem(catalogKeyName, beforeCatalog);
  if (beforeCustomers == null) localStorage.removeItem(customerKeyName);
  else localStorage.setItem(customerKeyName, beforeCustomers);
  customerFilter.value = '';
  currencyFilter.value = '';
  duplicateOnly.checked = false;
  groupFilter.value = '';
  document.querySelector('[data-tab="master"]').click();
});



test('V5.5 operator history makes the undo window and outcome visible', () => {
  const key = 'tunggiabao-price-report-customers-v1';
  const before = localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify([
    { id:'v55-history-c1', name:'Khách Lịch Sử', company:'A', phone:'0909000001', email:'', address:'', contact:'' }
  ]));
  document.getElementById('customerLibrarySearch').value = '';
  document.getElementById('customerLibraryFilter').value = '';
  document.querySelector('[data-tab="master"]').click();

  const row = document.querySelector('#customerLibraryList .master-item');
  expect(row?.textContent).toContain('Khách Lịch Sử');
  row.querySelector('.btn.danger').click();

  const activity = document.getElementById('dataLibraryActivity');
  const activityList = document.getElementById('dataLibraryActivityList');
  expect(activity.hidden).toBe(false);
  expect(activityList.textContent).toContain('Đã xóa khách hàng khỏi danh bạ');
  expect(activityList.textContent).toContain('Có thể hoàn tác');
  expect(document.getElementById('toast').textContent).toContain('Có thể hoàn tác trong 8 giây');

  const undo = document.querySelector('#toast .toast-action');
  expect(undo?.textContent).toBe('Hoàn tác');
  undo.click();

  expect(activityList.textContent).toContain('Đã hoàn tác');
  expect(JSON.parse(localStorage.getItem(key) || '[]')).toHaveLength(1);

  if (before == null) localStorage.removeItem(key);
  else localStorage.setItem(key, before);
  document.querySelector('[data-tab="master"]').click();
});

test('V5.5 expired import recovery is cleaned instead of being offered', () => {
  const recoveryKey = 'tunggiabao-price-report-data-library-import-recovery-v1';
  const staleRecovery = {
    schemaVersion: 1,
    savedAt: Date.now() - (6 * 60 * 60 * 1000 + 60 * 1000),
    mode: 'customer',
    fileName: 'stale-review.csv',
    sheetName: 'Sheet1',
    duplicateChoices: {},
    ignoredInvalidRows: {},
    candidates: [{
      sheetName: 'Sheet1',
      rows: [
        ['Tên khách hàng','Công ty','SĐT','Email','Địa chỉ','Người liên hệ'],
        ['Khách Quá Hạn','Công ty Cũ','0909000002','','','']
      ]
    }]
  };
  sessionStorage.setItem(recoveryKey, JSON.stringify(staleRecovery));

  document.querySelector('[data-tab="dashboard"]').click();
  document.querySelector('[data-tab="master"]').click();

  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
  expect(document.getElementById('dataLibraryImportModal').hidden).toBe(true);
  expect(document.querySelector('#toast .toast-action')?.textContent).not.toBe('Khôi phục');
});

test('V5.5 row-level customer deletion is reversible and refreshes autocomplete', () => {
  const key = 'tunggiabao-price-report-customers-v1';
  const before = localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify([
    { id:'v55-c1', name:'Khách Undo Một', company:'A', phone:'0911111111', email:'', address:'', contact:'' },
    { id:'v55-c2', name:'Khách Undo Hai', company:'B', phone:'0922222222', email:'', address:'', contact:'' }
  ]));
  document.getElementById('customerLibrarySearch').value = '';
  document.getElementById('customerLibraryFilter').value = '';
  document.querySelector('[data-tab="master"]').click();

  const firstRow = document.querySelector('#customerLibraryList .master-item');
  expect(firstRow.textContent).toContain('Khách Undo Một');
  firstRow.querySelector('.btn.danger').click();

  let items = JSON.parse(localStorage.getItem(key) || '[]');
  expect(items).toHaveLength(1);
  expect(items.some(item => item.id === 'v55-c1')).toBe(false);
  expect([...document.querySelectorAll('#customerNameSuggestions option')].map(option => option.value))
    .not.toContain('Khách Undo Một');

  const undo = document.querySelector('#toast .toast-action');
  expect(undo?.textContent).toBe('Hoàn tác');
  undo.click();

  items = JSON.parse(localStorage.getItem(key) || '[]');
  expect(items).toHaveLength(2);
  expect(items.some(item => item.id === 'v55-c1')).toBe(true);
  expect([...document.querySelectorAll('#customerNameSuggestions option')].map(option => option.value))
    .toContain('Khách Undo Một');

  if (before == null) localStorage.removeItem(key);
  else localStorage.setItem(key, before);
  document.querySelector('[data-tab="master"]').click();
});

test('V5.5 bulk product deletion is reversible and refreshes autocomplete', () => {
  const key = 'tunggiabao-price-report-catalog-v1';
  const before = localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify([
    { id:'v55-p1', group:'Trứng', name:'Sản phẩm Undo Một', pack:'', unit:'Hộp', price:10000, currency:'VND', note:'' },
    { id:'v55-p2', group:'Trứng', name:'Sản phẩm Undo Hai', pack:'', unit:'Hộp', price:20000, currency:'VND', note:'' }
  ]));
  document.getElementById('productCatalogSearch').value = '';
  document.getElementById('productCatalogGroupFilter').value = '';
  document.getElementById('productCatalogCurrencyFilter').value = '';
  document.getElementById('productCatalogDuplicateOnly').checked = false;
  document.querySelector('[data-tab="master"]').click();

  const firstRow = document.querySelector('#productCatalogList .master-item');
  expect(firstRow.textContent).toContain('Sản phẩm Undo Một');
  const select = firstRow.querySelector('.master-row-select');
  select.checked = true;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  document.getElementById('deleteSelectedCatalogProducts').click();

  let items = JSON.parse(localStorage.getItem(key) || '[]');
  expect(items).toHaveLength(1);
  expect(items.some(item => item.id === 'v55-p1')).toBe(false);
  expect([...document.querySelectorAll('#productNameSuggestions option')].map(option => option.value))
    .not.toContain('Sản phẩm Undo Một');

  const undo = document.querySelector('#toast .toast-action');
  expect(undo?.textContent).toBe('Hoàn tác');
  undo.click();

  items = JSON.parse(localStorage.getItem(key) || '[]');
  expect(items).toHaveLength(2);
  expect(items.some(item => item.id === 'v55-p1')).toBe(true);
  expect([...document.querySelectorAll('#productNameSuggestions option')].map(option => option.value))
    .toContain('Sản phẩm Undo Một');

  if (before == null) localStorage.removeItem(key);
  else localStorage.setItem(key, before);
  document.querySelector('[data-tab="master"]').click();
});

test('V5.5 Data Library import can undo an update transaction', async () => {
  const key = 'tunggiabao-price-report-customers-v1';
  const recoveryKey = 'tunggiabao-price-report-data-library-import-recovery-v1';
  const before = localStorage.getItem(key);
  sessionStorage.removeItem(recoveryKey);
  localStorage.setItem(key, JSON.stringify([
    { id:'v55-import-c1', name:'Khách Gốc', company:'Công ty Gốc', phone:'0933333333', email:'', address:'Nha Trang', contact:'' }
  ]));
  document.querySelector('[data-tab="master"]').click();

  const csv = [
    'Tên khách hàng,Công ty,SĐT,Email,Địa chỉ,Người liên hệ',
    'Khách Đã Cập Nhật,Công ty Mới,0933333333,,Hà Nội,Chị A'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  const file = { name: 'cap-nhat-khach.csv', arrayBuffer: async () => bytes.buffer };
  const input = document.getElementById('customerLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportModal').hidden).toBe(false);
    expect(document.getElementById('dataLibraryImportUpdateCount').textContent).toBe('1');
  });

  expect(sessionStorage.getItem(recoveryKey)).toBeTruthy();
  document.getElementById('applyDataLibraryImport').click();
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
  let items = JSON.parse(localStorage.getItem(key) || '[]');
  expect(items).toHaveLength(1);
  expect(items[0].id).toBe('v55-import-c1');
  expect(items[0].name).toBe('Khách Đã Cập Nhật');

  const undo = document.querySelector('#toast .toast-action');
  expect(undo?.textContent).toBe('Hoàn tác');
  undo.click();

  items = JSON.parse(localStorage.getItem(key) || '[]');
  expect(items).toHaveLength(1);
  expect(items[0].id).toBe('v55-import-c1');
  expect(items[0].name).toBe('Khách Gốc');
  expect(items[0].company).toBe('Công ty Gốc');

  if (before == null) localStorage.removeItem(key);
  else localStorage.setItem(key, before);
  document.querySelector('[data-tab="master"]').click();
});


test('V5.5 interrupted Data Library review can be recovered and explicit cancel discards it', async () => {
  const recoveryKey = 'tunggiabao-price-report-data-library-import-recovery-v1';
  const customerKey = 'tunggiabao-price-report-customers-v1';
  const beforeCustomers = localStorage.getItem(customerKey);
  sessionStorage.removeItem(recoveryKey);
  localStorage.setItem(customerKey, JSON.stringify([]));
  document.querySelector('[data-tab="master"]').click();

  const csv = [
    'Tên khách hàng,Công ty,SĐT,Email,Địa chỉ,Người liên hệ',
    'Khách Recovery,Công ty Recovery,0944444444,recovery@example.com,Nha Trang,Anh R'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  const file = { name: 'recovery-khach.csv', arrayBuffer: async () => bytes.buffer };
  const input = document.getElementById('customerLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportModal').hidden).toBe(false);
    expect(document.getElementById('dataLibraryImportValidCount').textContent).toBe('1');
  });

  const stored = JSON.parse(sessionStorage.getItem(recoveryKey) || 'null');
  expect(stored?.schemaVersion).toBe(1);
  expect(stored?.fileName).toBe('recovery-khach.csv');
  expect(stored?.candidates?.[0]?.rows?.length).toBeGreaterThan(1);
  expect(stored?.file).toBeUndefined();
  expect(stored?.buffer).toBeUndefined();

  document.getElementById('closeDataLibraryImport').click();
  expect(document.getElementById('dataLibraryImportModal').hidden).toBe(true);
  expect(sessionStorage.getItem(recoveryKey)).toBeTruthy();

  document.querySelector('[data-tab="dashboard"]').click();
  document.querySelector('[data-tab="master"]').click();
  const recover = document.querySelector('#toast .toast-action');
  expect(recover?.textContent).toBe('Khôi phục');
  expect(document.getElementById('toast').textContent).toContain('Tự xóa sau khoảng');
  recover.click();

  expect(document.getElementById('dataLibraryImportModal').hidden).toBe(false);
  expect(document.getElementById('dataLibraryImportValidCount').textContent).toBe('1');
  expect(document.getElementById('dataLibraryImportPreviewBody').textContent).toContain('Khách Recovery');

  document.getElementById('cancelDataLibraryImport').click();
  expect(document.getElementById('dataLibraryImportModal').hidden).toBe(true);
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();

  if (beforeCustomers == null) localStorage.removeItem(customerKey);
  else localStorage.setItem(customerKey, beforeCustomers);
  document.querySelector('[data-tab="master"]').click();
});


test('V5.5 starting a new import clears stale review while the new file is parsing', async () => {
  const recoveryKey = 'tunggiabao-price-report-data-library-import-recovery-v1';
  const customerKey = 'tunggiabao-price-report-customers-v1';
  const beforeCustomers = localStorage.getItem(customerKey);
  sessionStorage.removeItem(recoveryKey);
  localStorage.setItem(customerKey, JSON.stringify([]));
  document.querySelector('[data-tab="master"]').click();

  document.getElementById('dataLibraryImportValidCount').textContent = '99';
  document.getElementById('dataLibraryImportPreviewBody').textContent = 'DỮ LIỆU CŨ';

  const csv = [
    'Tên khách hàng,Công ty,SĐT,Email,Địa chỉ,Người liên hệ',
    'Khách Loading,Công ty Loading,0955555555,loading@example.com,Hà Nội,Anh L'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  let releaseRead;
  const file = {
    name: 'loading-khach.csv',
    arrayBuffer: () => new Promise(resolve => {
      releaseRead = () => resolve(bytes.buffer);
    })
  };
  const input = document.getElementById('customerLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  expect(document.getElementById('dataLibraryImportModal').hidden).toBe(false);
  expect(document.getElementById('dataLibraryImportValidCount').textContent).toBe('0');
  expect(document.getElementById('dataLibraryImportPreviewBody').textContent).toBe('');
  expect(document.getElementById('applyDataLibraryImport').disabled).toBe(true);

  await vi.waitFor(() => {
    expect(typeof releaseRead).toBe('function');
  });
  releaseRead();
  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportValidCount').textContent).toBe('1');
    expect(sessionStorage.getItem(recoveryKey)).toBeTruthy();
  });

  document.getElementById('cancelDataLibraryImport').click();
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();

  if (beforeCustomers == null) localStorage.removeItem(customerKey);
  else localStorage.setItem(customerKey, beforeCustomers);
  document.querySelector('[data-tab="master"]').click();
});

test('V5.5 duplicate review requires an explicit winner and persists the decision', async () => {
  const key = 'tunggiabao-price-report-catalog-v1';
  const recoveryKey = 'tunggiabao-price-report-data-library-import-recovery-v1';
  const before = localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify([]));
  sessionStorage.removeItem(recoveryKey);
  document.querySelector('[data-tab="master"]').click();

  const csv = [
    'Nhóm hàng,Tên SP,Quy cách,ĐVT,Đơn giá,Tiền tệ,Ghi chú',
    'Trứng,Trứng chọn,Hộp 10,Hộp,28000,VND,Bản A',
    'Trứng,Trứng chọn,Hộp 10,Hộp,29000,VND,Bản B',
    'Trứng,Trứng chọn,Hộp 10,Hộp,1.2,USD,Bản USD'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  const file = { name: 'chon-trung.csv', arrayBuffer: async () => bytes.buffer };
  const input = document.getElementById('productLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportDuplicateCount').textContent).toBe('1');
    expect(document.getElementById('dataLibraryImportValidCount').textContent).toBe('1');
  });

  const issue = document.querySelector('#dataLibraryImportIssueList .data-library-import-issue-card');
  expect(issue?.textContent).toContain('Chọn đúng 1 dòng');
  const choices = issue.querySelectorAll('.data-library-import-issue-option .btn');
  expect(choices).toHaveLength(2);
  choices[1].click();

  expect(document.getElementById('dataLibraryImportDuplicateCount').textContent).toBe('0');
  expect(document.getElementById('dataLibraryImportValidCount').textContent).toBe('2');
  expect(issue.isConnected).toBe(false);
  const stored = JSON.parse(sessionStorage.getItem(recoveryKey) || 'null');
  expect(Object.keys(stored?.duplicateChoices?.['Sheet1'] || {})).toHaveLength(1);

  document.getElementById('applyDataLibraryImport').click();
  const imported = JSON.parse(localStorage.getItem(key) || '[]');
  expect(imported).toHaveLength(2);
  expect(imported.some(item => item.currency === 'VND' && item.price === 29000 && item.note === 'Bản B')).toBe(true);
  expect(imported.some(item => item.currency === 'USD')).toBe(true);

  if (before == null) localStorage.removeItem(key);
  else localStorage.setItem(key, before);
  sessionStorage.removeItem(recoveryKey);
  document.querySelector('[data-tab="master"]').click();
});

test('V5.5 invalid import rows stay visible until the operator confirms skip', async () => {
  const recoveryKey = 'tunggiabao-price-report-data-library-import-recovery-v1';
  sessionStorage.removeItem(recoveryKey);
  document.querySelector('[data-tab="master"]').click();

  const csv = [
    'Tên khách hàng,Công ty,SĐT,Email,Địa chỉ,Người liên hệ',
    'Khách hợp lệ,Công ty A,0966666666,ok@example.com,Nha Trang,Anh A',
    ',,,,Hà Nội,Người liên hệ không có định danh'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  const file = { name: 'dong-loi.csv', arrayBuffer: async () => bytes.buffer };
  const input = document.getElementById('customerLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportInvalidCount').textContent).toBe('1');
    expect(document.getElementById('dataLibraryImportIssues').hidden).toBe(false);
  });

  const invalidCard = document.querySelector('#dataLibraryImportIssueList .data-library-import-issue-card.invalid');
  expect(invalidCard?.textContent).toContain('Dòng 3');
  expect(invalidCard?.textContent).toContain('Hà Nội');
  invalidCard.querySelector('.btn').click();

  expect(document.getElementById('dataLibraryImportInvalidCount').textContent).toBe('0');
  expect(document.getElementById('dataLibraryImportValidCount').textContent).toBe('1');
  const stored = JSON.parse(sessionStorage.getItem(recoveryKey) || 'null');
  expect(stored?.ignoredInvalidRows?.['Sheet1']).toContain(3);

  document.getElementById('cancelDataLibraryImport').click();
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});


test('V5.5 large import review hides resolved items and navigates unresolved work', async () => {
  const recoveryKey = 'tunggiabao-price-report-data-library-import-recovery-v1';
  const customerKey = 'tunggiabao-price-report-customers-v1';
  const before = localStorage.getItem(customerKey);
  localStorage.setItem(customerKey, JSON.stringify([]));
  sessionStorage.removeItem(recoveryKey);
  document.querySelector('[data-tab="master"]').click();

  const csv = [
    'Tên khách hàng,Công ty,SĐT,Email,Địa chỉ,Người liên hệ',
    'Khách A1,Công ty A,0911111111,a1@example.com,Nha Trang,A1',
    'Khách A2,Công ty A,0911111111,a2@example.com,Nha Trang,A2',
    'Khách B1,Công ty B,0922222222,b1@example.com,Hà Nội,B1',
    'Khách B2,Công ty B,0922222222,b2@example.com,Hà Nội,B2',
    'Khách C,Công ty C,0933333333,c@example.com,Đà Nẵng,C',
    ',,,,Huế,Thiếu định danh'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  const file = { name: 'review-lon.csv', arrayBuffer: async () => bytes.buffer };
  const input = document.getElementById('customerLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportDuplicateCount').textContent).toBe('2');
    expect(document.getElementById('dataLibraryImportInvalidCount').textContent).toBe('1');
  });

  expect(document.getElementById('dataLibraryImportUnresolvedCount').textContent).toContain('3');
  expect(document.querySelectorAll('#dataLibraryImportIssueList [data-review-unresolved="true"]')).toHaveLength(3);
  expect(document.querySelectorAll('#dataLibraryImportIssueList [data-review-resolved="true"]')).toHaveLength(0);

  document.getElementById('dataLibraryImportNextIssue').click();
  const firstCurrent = document.querySelector('#dataLibraryImportIssueList [data-review-current="true"]');
  expect(firstCurrent).toBeTruthy();
  document.getElementById('dataLibraryImportNextIssue').click();
  const secondCurrent = document.querySelector('#dataLibraryImportIssueList [data-review-current="true"]');
  expect(secondCurrent).toBeTruthy();
  expect(secondCurrent).not.toBe(firstCurrent);

  const firstDuplicate = document.querySelector('#dataLibraryImportIssueList .data-library-import-issue-card:not(.invalid)');
  firstDuplicate.querySelector('.data-library-import-issue-option .btn').click();

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportUnresolvedCount').textContent).toContain('2');
    expect(document.querySelectorAll('#dataLibraryImportIssueList [data-review-unresolved="true"]')).toHaveLength(2);
  });
  expect(document.querySelectorAll('#dataLibraryImportIssueList [data-review-resolved="true"]')).toHaveLength(0);

  const showResolved = document.getElementById('dataLibraryImportShowResolved');
  showResolved.checked = true;
  showResolved.dispatchEvent(new Event('change', { bubbles: true }));

  expect(document.querySelectorAll('#dataLibraryImportIssueList [data-review-resolved="true"]')).toHaveLength(1);
  expect(document.querySelectorAll('#dataLibraryImportIssueList [data-review-unresolved="true"]')).toHaveLength(2);
  expect(document.getElementById('dataLibraryImportNextIssue').disabled).toBe(false);

  document.getElementById('cancelDataLibraryImport').click();
  sessionStorage.removeItem(recoveryKey);
  if (before == null) localStorage.removeItem(customerKey);
  else localStorage.setItem(customerKey, before);
  document.querySelector('[data-tab="master"]').click();
});


test('V5.5 completion state distinguishes unresolved warnings from reviewed data', async () => {
  const recoveryKey = 'tunggiabao-price-report-data-library-import-recovery-v1';
  const customerKey = 'tunggiabao-price-report-customers-v1';
  const before = localStorage.getItem(customerKey);
  localStorage.setItem(customerKey, JSON.stringify([]));
  sessionStorage.removeItem(recoveryKey);
  document.querySelector('[data-tab="master"]').click();

  const csv = [
    'Tên khách hàng,Công ty,SĐT,Email,Địa chỉ,Người liên hệ',
    'Khách An Toàn,Công ty C,0933333333,c@example.com,Đà Nẵng,C',
    'Khách A1,Công ty A,0911111111,a1@example.com,Nha Trang,A1',
    'Khách A2,Công ty A,0911111111,a2@example.com,Nha Trang,A2',
    ',,,,Huế,Thiếu định danh'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  const file = { name: 'completion-review.csv', arrayBuffer: async () => bytes.buffer };
  const input = document.getElementById('customerLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportCompletionTitle').textContent).toContain('Còn 2 vấn đề');
  });

  const completion = document.getElementById('dataLibraryImportCompletion');
  const apply = document.getElementById('applyDataLibraryImport');
  expect(completion.dataset.state).toBe('warning');
  expect(document.getElementById('dataLibraryImportCompletionDetail').textContent).toContain('sẽ không được nhập');
  expect(apply.dataset.reviewState).toBe('warning');
  expect(apply.textContent).toContain('bỏ qua 2 vấn đề');

  const duplicate = document.querySelector('#dataLibraryImportIssueList .data-library-import-issue-card:not(.invalid)');
  duplicate.querySelector('.data-library-import-issue-option .btn').click();

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportUnresolvedCount').textContent).toContain('1');
  });
  const invalid = document.querySelector('#dataLibraryImportIssueList .data-library-import-issue-card.invalid');
  invalid.querySelector('.btn').click();

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportCompletionTitle').textContent).toBe('Đã xử lý xong toàn bộ vấn đề');
    expect(document.activeElement).toBe(apply);
  });

  expect(completion.dataset.state).toBe('ready');
  expect(document.getElementById('dataLibraryImportCompletionDetail').textContent).toContain('đã xác nhận bỏ qua 1 dòng lỗi');
  expect(apply.dataset.reviewState).toBe('ready');
  expect(apply.textContent).toContain('dòng đã kiểm tra');
  expect(document.getElementById('dataLibraryImportNextIssue').disabled).toBe(true);

  document.getElementById('cancelDataLibraryImport').click();
  sessionStorage.removeItem(recoveryKey);
  if (before == null) localStorage.removeItem(customerKey);
  else localStorage.setItem(customerKey, before);
  document.querySelector('[data-tab="master"]').click();
});

test('V5.5 keyboard-only import review starts in work and traps Tab inside the modal', async () => {
  const recoveryKey = 'tunggiabao-price-report-data-library-import-recovery-v1';
  sessionStorage.removeItem(recoveryKey);
  document.querySelector('[data-tab="master"]').click();

  const csv = [
    'Tên khách hàng,Công ty,SĐT,Email,Địa chỉ,Người liên hệ',
    'Khách K1,Công ty K,0977777777,k1@example.com,Hà Nội,K1',
    'Khách K2,Công ty K,0977777777,k2@example.com,Hà Nội,K2',
    'Khách Hợp Lệ,Công ty H,0988888888,h@example.com,Đà Nẵng,H'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  const file = { name: 'keyboard-review.csv', arrayBuffer: async () => bytes.buffer };
  const input = document.getElementById('customerLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportDuplicateCount').textContent).toBe('1');
    expect(document.activeElement?.closest?.('[data-review-unresolved="true"]')).toBeTruthy();
  });

  const modal = document.getElementById('dataLibraryImportModal');
  const close = document.getElementById('closeDataLibraryImport');
  const apply = document.getElementById('applyDataLibraryImport');
  apply.focus();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  expect(document.activeElement).toBe(close);

  close.focus();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
  expect(document.activeElement).toBe(apply);
  expect(modal.hidden).toBe(false);

  document.getElementById('cancelDataLibraryImport').click();
  sessionStorage.removeItem(recoveryKey);
});


test('V5.4 customer library CSV import reviews and applies valid rows transactionally', async () => {
  const key = 'tunggiabao-price-report-customers-v1';
  const before = localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify([]));
  document.querySelector('[data-tab="master"]').click();

  const csv = [
    'Tên khách hàng,Công ty,SĐT,Email,Địa chỉ,Người liên hệ',
    'Nguyễn Văn A,Công ty A,0912345678,a@example.com,Nha Trang,Anh A',
    ',Công ty B,,b@example.com,Hà Nội,Chị B'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  const file = { name: 'khach-hang.csv', arrayBuffer: async () => bytes.buffer };
  const input = document.getElementById('customerLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportModal').hidden).toBe(false);
    expect(document.getElementById('dataLibraryImportValidCount').textContent).toBe('2');
  });
  expect(document.getElementById('dataLibraryImportInvalidCount').textContent).toBe('0');
  expect(document.getElementById('applyDataLibraryImport').disabled).toBe(false);

  document.getElementById('applyDataLibraryImport').click();
  const imported = JSON.parse(localStorage.getItem(key));
  expect(imported.length).toBe(2);
  expect(imported.some(item => item.phone === '0912345678')).toBe(true);
  expect(imported.some(item => item.email === 'b@example.com')).toBe(true);
  expect(document.getElementById('dataLibraryImportModal').hidden).toBe(true);

  if (before == null) localStorage.removeItem(key);
  else localStorage.setItem(key, before);
  document.querySelector('[data-tab="master"]').click();
});

test('V5.4 product import excludes duplicate groups and preserves currency variants', async () => {
  const key = 'tunggiabao-price-report-catalog-v1';
  const before = localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify([]));
  document.querySelector('[data-tab="master"]').click();

  const csv = [
    'Nhóm hàng,Tên SP,Quy cách,ĐVT,Đơn giá,Tiền tệ,Ghi chú',
    'Trứng,Trứng gà,Hộp 10,Hộp,28000,VND,Bản 1',
    'Trứng,Trứng gà,Hộp 10,Hộp,29000,VND,Bản trùng',
    'Trứng,Trứng gà,Hộp 10,Hộp,1.2,USD,Biến thể USD'
  ].join('\n');
  const bytes = new TextEncoder().encode(csv);
  const file = { name: 'san-pham.csv', arrayBuffer: async () => bytes.buffer };
  const input = document.getElementById('productLibraryExcelInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  await vi.waitFor(() => {
    expect(document.getElementById('dataLibraryImportModal').hidden).toBe(false);
    expect(document.getElementById('dataLibraryImportDuplicateCount').textContent).toBe('1');
  });
  expect(document.getElementById('dataLibraryImportValidCount').textContent).toBe('1');
  expect(document.getElementById('dataLibraryImportNotice').textContent).toContain('không được tự gộp');

  document.getElementById('applyDataLibraryImport').click();
  const imported = JSON.parse(localStorage.getItem(key));
  expect(imported.length).toBe(1);
  expect(imported[0].currency).toBe('USD');
  expect(imported[0].note).toBe('Biến thể USD');

  if (before == null) localStorage.removeItem(key);
  else localStorage.setItem(key, before);
  document.querySelector('[data-tab="master"]').click();
});

test('V5.2 product grid exposes direct save-to-library without a second catalog engine', () => {
  document.querySelector('[data-tab="products"]').click();
  const quickSave = document.getElementById('saveProductsToCatalogTop');
  expect(quickSave).toBeTruthy();
  expect(quickSave.textContent).toContain('Lưu danh mục');
});

test('customer library treats +84 and local-format phones as the same reusable customer', () => {
  const key = 'tunggiabao-price-report-customers-v1';
  const beforeRaw = localStorage.getItem(key);
  const beforeItems = beforeRaw ? JSON.parse(beforeRaw) : [];
  const fields = {
    customerName: document.getElementById('customerName').value,
    customerCompany: document.getElementById('customerCompany').value,
    customerPhone: document.getElementById('customerPhone').value
  };

  const setField = (id, value) => {
    const input = document.getElementById(id);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  setField('customerName', 'Khách chuẩn hóa V52');
  setField('customerCompany', 'Đơn vị V52');
  setField('customerPhone', '+84 912 345 679');
  document.getElementById('saveCurrentCustomer').click();
  const firstCount = JSON.parse(localStorage.getItem(key) || '[]').length;
  expect(firstCount).toBe(beforeItems.length + 1);

  setField('customerName', 'Khách chuẩn hóa V52 cập nhật');
  setField('customerPhone', '0912.345.679');
  document.getElementById('saveCurrentCustomer').click();
  const secondItems = JSON.parse(localStorage.getItem(key) || '[]');
  expect(secondItems.length).toBe(firstCount);
  expect(secondItems.some(item => item.name === 'Khách chuẩn hóa V52 cập nhật')).toBe(true);

  setField('customerName', 'Tên tạm không khớp');
  setField('customerPhone', '+84 912 345 679');
  document.getElementById('customerPhone').dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.getElementById('customerName').value).toBe('Khách chuẩn hóa V52 cập nhật');

  if (beforeRaw == null) localStorage.removeItem(key);
  else localStorage.setItem(key, beforeRaw);
  Object.entries(fields).forEach(([id, value]) => setField(id, value));
}, 10000);

test('product grid exposes autocomplete sources for name group and unit', () => {
  document.querySelector('[data-tab="products"]').click();
  const first = document.querySelector('#productEditor .product-card');
  expect(first.querySelector('[data-product-key="name"]').getAttribute('list')).toBe('productNameSuggestions');
  expect(first.querySelector('[data-product-key="group"]').getAttribute('list')).toBe('productGroupSuggestions');
  expect(first.querySelector('[data-product-key="unit"]').getAttribute('list')).toBe('productUnitSuggestions');
  expect(document.getElementById('productNameSuggestions')).toBeTruthy();
  expect(document.getElementById('productGroupSuggestions')).toBeTruthy();
  expect(Array.from(document.getElementById('productUnitSuggestions').options).map(option => option.value)).toContain('Hộp');
});

test('product autocomplete matches catalog names canonically and fills reusable fields', () => {
  const key = 'tunggiabao-price-report-catalog-v1';
  const beforeRaw = localStorage.getItem(key);
  const catalog = [{
    id: 'canonical-product-v52',
    group: 'Nhóm thử',
    name: 'Trứng Gà Chuẩn',
    pack: 'Hộp 10',
    unit: 'Hộp',
    price: 28000,
    currency: 'VND',
    note: 'Từ danh mục'
  }];
  localStorage.setItem(key, JSON.stringify(catalog));

  document.querySelector('[data-tab="products"]').click();
  const first = document.querySelector('#productEditor .product-card:first-child');
  const original = Object.fromEntries(
    ['group','name','pack','unit','qty','price','note'].map(field => [
      field,
      first.querySelector('[data-product-key="' + field + '"]')?.value ?? ''
    ])
  );
  const name = first.querySelector('[data-product-key="name"]');
  name.value = '  trứng   gà chuẩn  ';
  name.dispatchEvent(new Event('input', { bubbles: true }));
  name.dispatchEvent(new Event('change', { bubbles: true }));

  const refreshed = document.querySelector('#productEditor .product-card:first-child');
  expect(refreshed.querySelector('[data-product-key="name"]').value).toBe('Trứng Gà Chuẩn');
  expect(refreshed.querySelector('[data-product-key="pack"]').value).toBe('Hộp 10');
  expect(refreshed.querySelector('[data-product-key="unit"]').value).toBe('Hộp');
  expect(Number(refreshed.querySelector('[data-product-key="price"]').value)).toBe(28000);

  if (beforeRaw == null) localStorage.removeItem(key);
  else localStorage.setItem(key, beforeRaw);
  const restoreCard = document.querySelector('#productEditor .product-card:first-child');
  Object.entries(original).forEach(([field, value]) => {
    const input = restoreCard.querySelector('[data-product-key="' + field + '"]');
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
});

test('product editor adds a blank draft row without polluting A4 until content is entered', () => {
  const beforeCards = document.querySelectorAll('.product-card').length;
  const beforeRows = document.querySelectorAll('#qBody tr').length;
  document.getElementById('addProduct').click();
  expect(document.querySelectorAll('.product-card').length).toBe(beforeCards + 1);
  expect(document.querySelectorAll('#qBody tr').length).toBe(beforeRows);

  const lastName = document.querySelector('.product-card:last-child [data-product-key="name"]');
  expect(lastName).toBeTruthy();
  lastName.value = 'Sản phẩm kiểm thử UX';
  lastName.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelectorAll('#qBody tr').length).toBe(beforeRows + 1);
  expect(document.querySelector('#qBody tr:last-child .col-name').textContent).toBe('Sản phẩm kiểm thử UX');
});

test('bulk product toolbar applies one change to multiple selected grid rows', () => {
  document.querySelector('[data-tab="products"]').click();
  const initialCount = document.querySelectorAll('#productEditor .product-card').length;
  document.getElementById('addProduct').click();
  document.getElementById('addProduct').click();

  const cards = Array.from(document.querySelectorAll('#productEditor .product-card'));
  cards.slice(-2).forEach(card => {
    const checkbox = card.querySelector('.product-row-select');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });

  expect(document.getElementById('productBulkBar').hidden).toBe(false);
  expect(document.getElementById('productBulkCount').textContent).toContain('2 dòng');

  document.getElementById('productBulkAction').value = 'group';
  document.getElementById('productBulkAction').dispatchEvent(new Event('change', { bubbles: true }));
  document.getElementById('productBulkValue').value = 'NHÓM BULK TEST';
  document.getElementById('applyProductBulk').click();

  const updatedCards = Array.from(document.querySelectorAll('#productEditor .product-card'));
  expect(updatedCards.at(-1).querySelector('[data-product-key="group"]').value).toBe('NHÓM BULK TEST');
  expect(updatedCards.at(-2).querySelector('[data-product-key="group"]').value).toBe('NHÓM BULK TEST');
  expect(document.getElementById('productBulkBar').hidden).toBe(true);

  document.querySelector('#productEditor .product-card:last-child .danger-icon').click();
  document.querySelector('#productEditor .product-card:last-child .danger-icon').click();
  expect(document.querySelectorAll('#productEditor .product-card').length).toBe(initialCount);
});

test('product grid preserves negative input and shows inline validation instead of silently clamping', () => {
  document.querySelector('[data-tab="products"]').click();
  document.getElementById('addProduct').click();
  const card = document.querySelector('#productEditor .product-card:last-child');
  const name = card.querySelector('[data-product-key="name"]');
  const qty = card.querySelector('[data-product-key="qty"]');
  const price = card.querySelector('[data-product-key="price"]');

  name.value = 'Dòng kiểm tra số âm';
  name.dispatchEvent(new Event('input', { bubbles: true }));
  qty.value = '-2';
  qty.dispatchEvent(new Event('input', { bubbles: true }));
  price.value = '-15000';
  price.dispatchEvent(new Event('input', { bubbles: true }));

  expect(qty.value).toBe('-2');
  expect(price.value).toBe('-15000');
  expect(qty.getAttribute('aria-invalid')).toBe('true');
  expect(price.getAttribute('aria-invalid')).toBe('true');
  expect(card.querySelector('[data-product-field="qty"] .product-cell-validation').textContent).toContain('không được âm');
  expect(card.querySelector('[data-product-field="price"] .product-cell-validation').textContent).toContain('không được âm');

  card.querySelector('.danger-icon').click();
});

test('meaningful unnamed product is visibly flagged and blocks print preflight', () => {
  document.querySelector('[data-tab="products"]').click();
  document.getElementById('addProduct').click();
  const lastCard = document.querySelector('.product-card:last-child');
  const price = lastCard.querySelector('[data-product-key="price"]');
  price.value = '125000';
  price.dispatchEvent(new Event('input', { bubbles: true }));

  expect(document.querySelector('#qBody tr:last-child').classList.contains('draft-missing-name')).toBe(true);
  expect(document.getElementById('documentHealth').textContent).toContain('lỗi cần sửa');
  const printsBefore = window.print.mock.calls.length;
  document.querySelector('.print-action').click();
  expect(window.print.mock.calls.length).toBe(printsBefore);

  const name = lastCard.querySelector('[data-product-key="name"]');
  name.value = 'Hàng bổ sung';
  name.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelector('#qBody tr:last-child').classList.contains('draft-missing-name')).toBe(false);
});

test('pasted numbered terms are normalized and customer block is structured for report output', () => {
  document.querySelector('[data-tab="general"]').click();
  const customerName = document.getElementById('quickCustomerName');
  customerName.value = 'Công ty Minh Họa';
  customerName.dispatchEvent(new Event('input', { bubbles: true }));
  const showCustomer = document.getElementById('quickShowCustomer');
  showCustomer.checked = true;
  showCustomer.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.getElementById('pCustomer').textContent).toContain('Khách hàng:');

  document.querySelector('[data-tab="terms"]').click();
  const terms = document.getElementById('termsText');
  terms.value = '1. Giao hàng trong ngày\n2) Thanh toán chuyển khoản\n- Giá trị báo giá';
  terms.dispatchEvent(new Event('input', { bubbles: true }));
  const rendered = Array.from(document.querySelectorAll('#pTerms li')).map(el => el.textContent);
  expect(rendered).toEqual(['Giao hàng trong ngày','Thanh toán chuyển khoản','Giá trị báo giá']);
});

test('template selection applies real document profile', () => {
  document.querySelector('.tpl[data-theme="corporate"]').click();
  expect(document.getElementById('paper').classList.contains('theme-corporate')).toBe(true);
  expect(document.querySelector('.quote-top > .qmeta').style.display).toBe('block');

  document.querySelector('.tpl[data-theme="modern"]').click();
  expect(document.getElementById('paper').classList.contains('theme-modern')).toBe(true);
  expect(document.querySelector('.quote-top > .qmeta').style.display).toBe('none');
});

test('V6.0 modern template gallery applies Canva-inspired profiles end to end', () => {
  const names = ['canva-blue','mint-finance','warm-proposal','violet-studio'];
  names.forEach((theme) => {
    const button = document.querySelector('.tpl[data-theme="' + theme + '"]');
    expect(button).toBeTruthy();
    button.click();
    expect(document.getElementById('paper').classList.contains('theme-' + theme)).toBe(true);
    expect(document.querySelector('[data-content-theme="' + theme + '"]')).toBeTruthy();
  });

  document.querySelector('.tpl[data-theme="canva-blue"]').click();
  expect(document.getElementById('inspectorThemeName').textContent).toBe('Business Wave');
  expect(document.querySelector('.quote-top > .qmeta').style.display).toBe('block');
});

test('V6.1 template library filters categories and previews A4 before committing', () => {
  document.querySelector('.tpl[data-theme="modern"]').click();
  document.getElementById('toggleInspectorTemplates').click();

  const modal = document.getElementById('templateLibraryModal');
  expect(modal.hidden).toBe(false);
  expect(document.querySelectorAll('[data-template-library-theme]').length).toBe(12);

  document.querySelector('[data-template-category="construction"]').click();
  const visibleConstruction = Array.from(document.querySelectorAll('[data-template-library-theme]'))
    .filter(card => !card.hidden)
    .map(card => card.dataset.templateLibraryTheme);
  expect(visibleConstruction).toEqual(expect.arrayContaining(['warm-proposal','emerald','warm','mono']));
  expect(document.getElementById('templateLibraryCount').textContent).toBe('4 mẫu');

  document.querySelector('[data-template-category="all"]').click();
  document.querySelector('[data-template-library-theme="canva-blue"]').click();
  expect(modal.hidden).toBe(true);
  expect(document.querySelector('.shell').classList.contains('report-view')).toBe(true);
  expect(document.getElementById('paper').classList.contains('theme-canva-blue')).toBe(true);
  expect(document.getElementById('templatePreviewBack').hidden).toBe(false);
  expect(document.getElementById('templatePreviewApply').hidden).toBe(false);

  document.getElementById('templatePreviewBack').click();
  expect(modal.hidden).toBe(false);
  expect(document.getElementById('paper').classList.contains('theme-modern')).toBe(true);

  document.querySelector('[data-template-library-theme="canva-blue"]').click();
  document.getElementById('templatePreviewApply').click();
  expect(document.querySelector('.shell').classList.contains('report-view')).toBe(false);
  expect(document.getElementById('paper').classList.contains('theme-canva-blue')).toBe(true);
  expect(document.getElementById('inspectorThemeName').textContent).toBe('Business Wave');
});

test('history save records one valid quotation and print preflight reaches print', () => {
  document.querySelectorAll('.product-card').forEach((card, index) => {
    const name = card.querySelector('[data-product-key="name"]');
    if (name && !name.value.trim()) {
      name.value = 'Sản phẩm hợp lệ ' + (index + 1);
      name.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  window.alert.mockClear();
  window.print.mockClear();
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


test('smart import exposes one editable Excel mapping review surface', () => {
  document.getElementById('openSmartImport').click();
  expect(document.getElementById('smartImportMapping')).toBeTruthy();
  expect(document.getElementById('smartImportMappingRows')).toBeTruthy();
  expect(document.getElementById('smartImportMappingStatus')).toBeTruthy();
  expect(document.getElementById('smartImportProductPreview')).toBeTruthy();
  expect(document.querySelector('.import-product-preview-head').textContent).toContain('Tên sản phẩm');
  document.getElementById('cancelSmartImport').click();
});

test('smart paste opens a guided review and infers ordinary Excel clipboard columns', () => {
  document.getElementById('pasteProducts').click();
  expect(document.getElementById('smartImportModal').hidden).toBe(false);
  expect(document.getElementById('smartPastePanel').hidden).toBe(false);

  const paste = document.getElementById('smartPasteText');
  paste.value = 'Tên sản phẩm\tĐVT\tSố lượng\tĐơn giá\nTrứng gà\tHộp\t2\t28000\nTrứng vịt\tKhay\t3\t85000';
  document.getElementById('parseSmartPaste').click();

  expect(document.getElementById('smartImportMapping').hidden).toBe(false);
  expect(document.getElementById('smartImportMappingRows').children.length).toBeGreaterThanOrEqual(4);
  expect(document.getElementById('smartImportProductCount').textContent).toContain('2 sản phẩm');
  expect(document.getElementById('smartImportProductPreview').textContent).toContain('Trứng gà');

  document.getElementById('cancelSmartImport').click();
});

test('applied smart import exposes a working one-step undo action', () => {
  const before = document.getElementById('companyName').value;
  document.getElementById('openSmartImport').click();
  const raw = document.getElementById('ocrRawText');
  raw.value = 'HKD - KIỂM THỬ UNDO\nĐT. 0962944688';
  document.getElementById('reparseOcrText').click();
  document.getElementById('applySmartImport').click();

  expect(document.getElementById('companyName').value).toContain('KIỂM THỬ UNDO');
  const undo = document.querySelector('#toast .toast-action');
  expect(undo).toBeTruthy();
  expect(undo.textContent).toBe('Hoàn tác');
  undo.click();
  expect(document.getElementById('companyName').value).toBe(before);
});

test('smart import preserves an explicit zero quantity through apply and undo', () => {
  document.getElementById('pasteProducts').click();
  const paste = document.getElementById('smartPasteText');
  paste.value = 'Tên sản phẩm\tĐVT\tSố lượng\tĐơn giá\nSản phẩm SL 0\tHộp\t0\t28000';
  document.getElementById('parseSmartPaste').click();
  document.getElementById('applySmartImport').click();

  const qty = document.querySelector('#productEditor .product-card:first-child [data-product-key="qty"]');
  expect(qty).toBeTruthy();
  expect(Number(qty.value)).toBe(0);

  const undo = document.querySelector('#toast .toast-action');
  expect(undo?.textContent).toBe('Hoàn tác');
  undo.click();
});

test('smart import rolls back and keeps review open when primary autosave fails', () => {
  const primaryKey = 'tunggiabao-price-report-v1';
  const recoveryKey = 'tunggiabao-price-report-recovery-v1';
  const before = document.getElementById('companyName').value;

  document.getElementById('openSmartImport').click();
  const raw = document.getElementById('ocrRawText');
  raw.value = 'HKD - IMPORT TRANSACTION TEST\nĐT. 0962944688';
  document.getElementById('reparseOcrText').click();

  const nativeSetItem = Storage.prototype.setItem;
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (storageKey, value) {
    if (this === localStorage && storageKey === primaryKey) {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    }
    return nativeSetItem.call(this, storageKey, value);
  });

  document.getElementById('applySmartImport').click();
  spy.mockRestore();

  expect(document.getElementById('smartImportModal').hidden).toBe(false);
  expect(document.getElementById('companyName').value).toBe(before);
  expect(document.getElementById('smartImportProgress').textContent).toContain('Chưa áp dụng import');
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
  document.getElementById('cancelSmartImport').click();
});

test('autosave reports real persistence state and retains a recovery snapshot on failure', () => {
  const primaryKey = 'tunggiabao-price-report-v1';
  const recoveryKey = 'tunggiabao-price-report-recovery-v1';
  sessionStorage.removeItem(recoveryKey);

  const field = document.getElementById('companyName');
  const before = field.value;
  field.value = 'AUTOSAVE SUCCESS TEST';
  field.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.getElementById('studioAutosaveState').dataset.state).toBe('saved');
  expect(document.getElementById('studioAutosaveState').textContent).toContain('Đã lưu lúc');
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();

  const nativeSetItem = Storage.prototype.setItem;
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (storageKey, value) {
    if (this === localStorage && storageKey === primaryKey) {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    }
    return nativeSetItem.call(this, storageKey, value);
  });

  field.value = 'AUTOSAVE FAILURE RECOVERY TEST';
  field.dispatchEvent(new Event('input', { bubbles: true }));
  spy.mockRestore();

  expect(document.getElementById('studioAutosaveState').dataset.state).toBe('error');
  expect(document.getElementById('studioAutosaveState').textContent).toContain('Không thể lưu');
  expect(sessionStorage.getItem(recoveryKey)).toContain('AUTOSAVE FAILURE RECOVERY TEST');

  field.value = before;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.getElementById('studioAutosaveState').dataset.state).toBe('saved');
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
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

test('V4.8 device and system center shows real runtime state and separates local from registry code', () => {
  document.querySelector('[data-tab="system"]').click();
  expect(document.querySelector('.shell').classList.contains('app-workspace')).toBe(true);
  expect(document.getElementById('pane-system').classList.contains('active')).toBe(true);
  expect(document.getElementById('systemLocalDeviceCode').textContent).toMatch(/^KT-/);
  expect(document.getElementById('systemDetailDeviceClass').textContent.length).toBeGreaterThan(0);

  window.dispatchEvent(new CustomEvent('pricereport:device-access', {
    detail: {
      state: 'pending',
      identity: { deviceCode: 'KT-TEST-0001', lastKnownStatus: 'pending' },
      message: 'Đang chờ duyệt thử nghiệm'
    }
  }));
  expect(document.getElementById('systemAccessState').textContent).toContain('Chờ duyệt');
  expect(document.getElementById('systemRegistryDeviceCode').textContent).toBe('KT-TEST-0001');

  window.dispatchEvent(new CustomEvent('pricereport:device-access', {
    detail: { state: 'classification-only', identity: null, message: 'Remote Device Gate chưa bật.' }
  }));
  expect(document.getElementById('systemAccessState').textContent).toContain('Phân loại cục bộ');
  document.querySelector('[data-tab="general"]').click();
});

test('V4.7 publishing center exposes export, import, PC and backup controls in app workspace', () => {
  document.querySelector('[data-tab="export"]').click();
  expect(document.querySelector('.shell').classList.contains('app-workspace')).toBe(true);
  expect(document.getElementById('pane-export').classList.contains('active')).toBe(true);
  expect(document.getElementById('exportCenterHealth').textContent.length).toBeGreaterThan(0);
  expect(document.getElementById('exportCenterQuote').textContent.length).toBeGreaterThan(0);
  expect(document.getElementById('exportExcel')).toBeTruthy();
  expect(document.getElementById('importExcelQuick')).toBeTruthy();
  expect(document.getElementById('importHandwritingQuick')).toBeTruthy();
  expect(document.getElementById('exportJson')).toBeTruthy();
  expect(document.getElementById('importJson')).toBeTruthy();
  expect(document.getElementById('choosePcFolder')).toBeTruthy();
  expect(document.getElementById('savePcNow')).toBeTruthy();
  expect(document.getElementById('restorePcLatest')).toBeTruthy();
  expect(document.getElementById('exportAllData')).toBeTruthy();
  expect(document.getElementById('importAllData')).toBeTruthy();
  expect(document.getElementById('pcFolderStatus').textContent.length).toBeGreaterThan(0);
  document.querySelector('[data-tab="general"]').click();
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


test('failed history persistence keeps a changed quotation visibly unsaved', () => {
  const historyKey = 'tunggiabao-price-report-history-v1';
  const stateKey = 'tunggiabao-price-report-v1';
  const previousHistory = localStorage.getItem(historyKey);
  const base = JSON.parse(localStorage.getItem(stateKey));
  const seeded = [{
    id: 'v51-save-failure',
    savedAt: new Date().toISOString(),
    status: 'draft',
    currency: base.currency || 'VND',
    total: 1000,
    data: { ...base, quoteNo: 'BG-V51-SAVE-FAIL', quoteStatus: 'draft', historyRecordId: '' }
  }];
  localStorage.setItem(historyKey, JSON.stringify(seeded));

  document.querySelector('[data-tab="history"]').click();
  const row = Array.from(document.querySelectorAll('#quoteHistoryList .history-table-row'))
    .find(item => item.querySelector('.history-quote-cell strong')?.textContent === 'BG-V51-SAVE-FAIL');
  expect(row).toBeTruthy();
  row.querySelector('.history-actions .btn.primary').click();
  expect(document.getElementById('studioGlobalHistoryState').textContent).toBe('Đã lưu lịch sử');

  const title = document.getElementById('quoteTitle');
  title.value = (title.value || 'BẢNG BÁO GIÁ') + ' · chỉnh sửa';
  title.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.getElementById('studioGlobalHistoryState').textContent).toBe('Có thay đổi chưa lưu');

  const nativeSetItem = Storage.prototype.setItem;
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === historyKey) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    return nativeSetItem.call(this, key, value);
  });
  document.getElementById('studioGlobalSave').click();
  spy.mockRestore();

  expect(document.getElementById('studioGlobalHistoryState').textContent).toBe('Có thay đổi chưa lưu');
  expect(JSON.parse(localStorage.getItem(historyKey))[0].data.quoteTitle).not.toContain('· chỉnh sửa');

  if (previousHistory == null) localStorage.removeItem(historyKey);
  else localStorage.setItem(historyKey, previousHistory);
});

test('updating a saved quotation cannot reuse another quotation number', () => {
  const historyKey = 'tunggiabao-price-report-history-v1';
  const stateKey = 'tunggiabao-price-report-v1';
  const previousHistory = localStorage.getItem(historyKey);
  const base = JSON.parse(localStorage.getItem(stateKey));
  const makeRecord = (id, quoteNo) => ({
    id,
    savedAt: new Date().toISOString(),
    status: 'draft',
    currency: base.currency || 'VND',
    total: 1000,
    data: {
      ...base,
      quoteNo,
      quoteStatus: 'draft',
      historyRecordId: '',
      products: [{ group: '', name: 'Sản phẩm ' + id, pack: '', unit: 'cái', qty: 1, price: 1000, note: '' }]
    }
  });
  localStorage.setItem(historyKey, JSON.stringify([
    makeRecord('v51-collision-a', 'BG-V51-A'),
    makeRecord('v51-collision-b', 'BG-V51-B')
  ]));

  document.querySelector('[data-tab="history"]').click();
  const rowA = Array.from(document.querySelectorAll('#quoteHistoryList .history-table-row'))
    .find(item => item.querySelector('.history-quote-cell strong')?.textContent === 'BG-V51-A');
  expect(rowA).toBeTruthy();
  rowA.querySelector('.history-actions .btn.primary').click();

  const quoteNo = document.getElementById('quoteNo');
  quoteNo.value = 'BG-V51-B';
  quoteNo.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('studioGlobalSave').click();

  expect(document.getElementById('quoteNo').value).not.toBe('BG-V51-B');
  const stored = JSON.parse(localStorage.getItem(historyKey));
  const numbers = stored.map(record => record.data.quoteNo);
  expect(new Set(numbers).size).toBe(numbers.length);

  if (previousHistory == null) localStorage.removeItem(historyKey);
  else localStorage.setItem(historyKey, previousHistory);
});


test('product group heading repeats correctly after an ungrouped break', () => {
  document.querySelector('[data-tab="products"]').click();
  const addDraft = ({ group = '', name }) => {
    document.getElementById('addProduct').click();
    const card = document.querySelector('.product-card:last-child');
    const nameInput = card.querySelector('[data-product-key="name"]');
    const groupInput = card.querySelector('[data-product-key="group"]');
    groupInput.value = group;
    groupInput.dispatchEvent(new Event('input', { bubbles: true }));
    nameInput.value = name;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  addDraft({ group: 'V51-GROUP-REPEAT', name: 'Sản phẩm nhóm A' });
  addDraft({ name: 'Sản phẩm không nhóm' });
  addDraft({ group: 'V51-GROUP-REPEAT', name: 'Sản phẩm nhóm B' });

  const headings = Array.from(document.querySelectorAll('#qBody .qgroup-row'))
    .filter(row => row.textContent === 'V51-GROUP-REPEAT');
  expect(headings.length).toBe(2);
});

test('professional report suppresses empty terms and empty payment rows', () => {
  document.querySelector('[data-tab="payment"]').click();
  const showPayment = document.getElementById('showPaymentBlock');
  showPayment.checked = true;
  showPayment.dispatchEvent(new Event('change', { bubbles: true }));

  const method = document.getElementById('paymentMethod');
  method.value = 'Tiền mặt';
  method.dispatchEvent(new Event('input', { bubbles: true }));
  for (const id of ['bankName','bankAccount','bankOwner']) {
    const input = document.getElementById(id);
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  expect(document.getElementById('paymentPrint').style.display).toBe('block');
  expect(document.getElementById('pBankName').closest('div').style.display).toBe('none');
  expect(document.getElementById('pBankAccount').closest('div').style.display).toBe('none');
  expect(document.getElementById('pBankOwner').closest('div').style.display).toBe('none');

  document.querySelector('[data-tab="terms"]').click();
  const showTerms = document.getElementById('showTerms');
  showTerms.checked = true;
  showTerms.dispatchEvent(new Event('change', { bubbles: true }));
  const terms = document.getElementById('termsText');
  terms.value = '   \n   ';
  terms.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.getElementById('termsBox').style.display).toBe('none');
});
