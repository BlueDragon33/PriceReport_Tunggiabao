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
  expect(document.getElementById('pCompanyName').textContent).toContain('BIỂN UYÊN BẢO');
  expect(document.getElementById('documentHealth').textContent).toBe('Sẵn sàng in');
});

test('product editor can add a row and keep preview in sync', () => {
  const before = document.querySelectorAll('.product-card').length;
  document.getElementById('addProduct').click();
  expect(document.querySelectorAll('.product-card').length).toBe(before + 1);
  expect(document.querySelectorAll('#qBody tr').length).toBe(before + 1);
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
