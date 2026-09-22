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
