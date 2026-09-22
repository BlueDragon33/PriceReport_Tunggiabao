/* @vitest-environment jsdom */
import fs from 'node:fs';
import { beforeEach, expect, test, vi } from 'vitest';

const html = fs.readFileSync('index.html', 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
const stateKey = 'tunggiabao-price-report-v1';

async function bootWithState(seed, token) {
  vi.resetModules();
  localStorage.clear();
  document.body.innerHTML = body.replace(/<script[^>]*src="\.\/src\/main\.js"[^>]*><\/script>/i, '');
  window.alert = vi.fn();
  window.confirm = vi.fn(() => true);
  window.print = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  if (seed) localStorage.setItem(stateKey, JSON.stringify(seed));
  await import('../src/main.js?migration=' + token);
}

beforeEach(() => {
  localStorage.clear();
});

test('boot migrates a modified Biển Uyên Bảo sample and persists Tùng Gia Bảo data', async () => {
  await bootWithState({
    companyName: 'CÔNG TY TNHH TMDV BIỂN UYÊN BẢO',
    companyAddress: '12/1 đường 3/4, Đà Lạt',
    phone: '0909 999 999',
    website: 'www.thegioitrung.vn',
    companyEmail: '',
    taxCode: '5801476262',
    intro: 'Nội dung đã chỉnh tay',
    products: [{ name:'Sản phẩm mẫu cũ', unit:'Hộp', qty:2, price:1000 }]
  }, 'legacy');

  expect(document.getElementById('companyName').value).toBe('HKD - Tùng Gia Bảo');
  expect(document.getElementById('phone').value).toBe('0962944688');
  expect(document.getElementById('companyAddressDetail').value).toContain('BT02-25');
  expect(document.getElementById('companyProvince').value).toBe('Khánh Hòa');
  expect(document.querySelectorAll('.product-card').length).toBe(72);

  const persisted = JSON.parse(localStorage.getItem(stateKey));
  expect(persisted.companyName).toBe('HKD - Tùng Gia Bảo');
  expect(persisted.phone).toBe('0962944688');
  expect(persisted.companyAddressDetail).toContain('BT02-25');
  expect(persisted.companyProvince).toBe('Khánh Hòa');
  expect(persisted.products.length).toBe(72);
});

test('boot does not overwrite an unrelated customized business profile', async () => {
  await bootWithState({
    companyName: 'CÔNG TY KHÁC',
    companyAddress: 'Nha Trang',
    phone: '0912345678',
    website: 'example.vn',
    products: [{ name:'Hàng riêng', unit:'kg', qty:1, price:50000 }]
  }, 'custom');

  expect(document.getElementById('companyName').value).toBe('CÔNG TY KHÁC');
  expect(document.getElementById('phone').value).toBe('0912345678');
  expect(document.getElementById('companyAddressDetail').value).toBe('Nha Trang');
  expect(document.getElementById('companyProvince').value).toBe('');
  expect(document.getElementById('companyWard').value).toBe('');
  expect(document.querySelectorAll('.product-card').length).toBe(1);
});
