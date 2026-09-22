import { test, expect } from '@playwright/test';

async function fresh(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page.locator('#paper')).toBeVisible();
}

async function openTab(page, name) {
  await page.locator('button[data-tab="' + name + '"]').click();
  await expect(page.locator('#pane-' + name)).toHaveClass(/active/);
}

const logoOne = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="120"><rect width="360" height="120" fill="white"/><circle cx="55" cy="60" r="38" fill="#0b8f83"/><text x="110" y="72" font-size="42" font-family="Arial" fill="#14304f">QA ONE</text></svg>');
const logoTwo = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="120"><rect width="360" height="120" fill="white"/><rect x="15" y="20" width="80" height="80" rx="14" fill="#d97919"/><text x="120" y="72" font-size="42" font-family="Arial" fill="#222">QA TWO</text></svg>');

test('boots cleanly and primary navigation is functional', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await fresh(page);
  for (const tab of ['general','customer','products','payment','terms','design','export','presets','history','master']) {
    await openTab(page, tab);
  }

  expect(errors).toEqual([]);
  await expect(page.locator('#pQuoteTitle')).toContainText('BẢNG BÁO GIÁ');
});

test('customer editing syncs Kính gửi until the user overrides it', async ({ page }) => {
  await fresh(page);

  await page.locator('#quickCustomerName').fill('Nguyễn Văn A');
  await page.locator('#quickCustomerCompany').fill('CÔNG TY ABC');
  await expect(page.locator('#recipientLine')).toHaveValue('Kính gửi: CÔNG TY ABC');
  await expect(page.locator('#pRecipient')).toHaveText('Kính gửi: CÔNG TY ABC');

  await page.locator('#recipientLine').fill('Kính gửi: PHÒNG MUA HÀNG');
  await expect(page.locator('#autoRecipient')).not.toBeChecked();
  await page.locator('#quickCustomerCompany').fill('CÔNG TY XYZ');
  await expect(page.locator('#recipientLine')).toHaveValue('Kính gửi: PHÒNG MUA HÀNG');

  await page.locator('#autoRecipient').check();
  await expect(page.locator('#recipientLine')).toHaveValue('Kính gửi: CÔNG TY XYZ');

  await page.reload();
  await expect(page.locator('#recipientLine')).toHaveValue('Kính gửi: CÔNG TY XYZ');
});

test('product editing is comfortable, blank draft rows do not print, and totals are correct', async ({ page }) => {
  await fresh(page);
  await openTab(page, 'products');

  await expect(page.locator('#qBody tr')).toHaveCount(5);
  await page.locator('#addProduct').click();
  await expect(page.locator('.product-card')).toHaveCount(6);
  await expect(page.locator('#qBody tr')).toHaveCount(5);

  const last = page.locator('.product-card').last();
  await last.locator('.product-field').filter({ hasText: 'Tên sản phẩm' }).locator('input').fill('Sản phẩm QA');
  await last.locator('.product-field').filter({ hasText: 'Số lượng' }).locator('input').fill('2');
  await last.locator('.product-field').filter({ hasText: 'Đơn giá' }).locator('input').fill('10000');
  await expect(page.locator('#qBody tr')).toHaveCount(6);

  await openTab(page, 'payment');
  await page.locator('#discountPct').fill('5');
  await page.locator('#vatPct').fill('8');
  await expect(page.locator('#grand')).toHaveText('8.023.320 VND');

  await openTab(page, 'products');
  await page.locator('#showAmount').uncheck();
  await expect(page.locator('#summary')).toBeVisible();
});

test('all report templates preserve professional header and title alignment', async ({ page }) => {
  await fresh(page);
  await page.locator('#logoInput').setInputFiles({ name: 'logo-one.svg', mimeType: 'image/svg+xml', buffer: logoOne });
  await expect(page.locator('#previewLogo img')).toHaveCount(1);

  const themes = ['modern','corporate','minimal','classic','emerald','warm','premium','mono'];
  for (const theme of themes) {
    await page.locator('.tpl[data-theme="' + theme + '"]').click();
    const geometry = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      const center = r => r.left + r.width / 2;
      const paper = rect('#paper');
      const title = rect('#pQuoteTitle');
      const block = rect('.company-block');
      const name = rect('.company-name');
      const lines = rect('.company-lines');
      const logo = rect('.logo-zone');
      return {
        titleDelta: Math.abs(center(title) - center(paper)),
        companyNameDelta: Math.abs(center(name) - center(block)),
        companyLinesDelta: Math.abs(center(lines) - center(block)),
        overlap: Math.max(0, logo.right - block.left)
      };
    });

    expect(geometry.titleDelta).toBeLessThan(3);
    expect(geometry.companyNameDelta).toBeLessThan(2);
    expect(geometry.companyLinesDelta).toBeLessThan(2);
    expect(geometry.overlap).toBeLessThan(1);
  }
});

test('logo replacement is destructive and never stacks old and new assets', async ({ page }) => {
  await fresh(page);

  await page.locator('#logoInput').setInputFiles({ name: 'one.svg', mimeType: 'image/svg+xml', buffer: logoOne });
  await expect(page.locator('#previewLogo img')).toHaveCount(1);
  const firstSrc = await page.locator('#previewLogo img').getAttribute('src');

  await page.locator('#logoInput').setInputFiles({ name: 'two.svg', mimeType: 'image/svg+xml', buffer: logoTwo });
  await expect(page.locator('#previewLogo img')).toHaveCount(1);
  const secondSrc = await page.locator('#previewLogo img').getAttribute('src');
  expect(secondSrc).not.toBe(firstSrc);

  await page.locator('#clearLogo').click();
  await expect(page.locator('#previewLogo img')).toHaveCount(0);
  await expect(page.locator('#showLogo')).not.toBeChecked();

  const centered = await page.evaluate(() => document.querySelector('.doc-head').classList.contains('no-logo'));
  expect(centered).toBeTruthy();
});

test('history keeps currencies separate and duplicate quote numbers unique', async ({ page }) => {
  await fresh(page);
  await openTab(page, 'history');
  await page.locator('#saveQuoteToHistory').click();

  await openTab(page, 'general');
  await page.locator('#quoteNo').fill('BG-USD-QA');
  await openTab(page, 'payment');
  await page.locator('#currency').selectOption('USD');
  await openTab(page, 'history');
  await page.locator('#saveQuoteToHistory').click();

  await expect(page.locator('#historyRevenue')).toContainText('VND');
  await expect(page.locator('#historyRevenue')).toContainText('USD');

  const original = page.locator('.history-item').filter({ hasText: 'BG-2026-001' }).first();
  await original.getByRole('button', { name: 'Nhân bản' }).click();
  await expect(page.locator('#quoteNo')).toHaveValue(/-COPY-01$/);

  await openTab(page, 'history');
  await page.locator('#saveQuoteToHistory').click();
  const originalAgain = page.locator('.history-item').filter({ hasText: 'BG-2026-001' }).first();
  await originalAgain.getByRole('button', { name: 'Nhân bản' }).click();
  await expect(page.locator('#quoteNo')).toHaveValue(/-COPY-02$/);
});

test('preview customizer and panel collapse controls work and persist', async ({ page }) => {
  await fresh(page);

  await page.locator('#customizePreview').click();
  await expect(page.locator('#previewCustomizer')).toHaveClass(/open/);
  await page.locator('[data-title-align="left"]').click();
  await expect(page.locator('#paper')).toHaveAttribute('data-title-align', 'left');
  await page.locator('#resetPreviewLayout').click();
  await expect(page.locator('#paper')).toHaveAttribute('data-title-align', 'center');

  await page.locator('#toggleEditorPanel').click();
  await expect(page.locator('.shell')).toHaveClass(/editor-collapsed/);
  await page.reload();
  await expect(page.locator('.shell')).toHaveClass(/editor-collapsed/);
});

test('quotation JSON export/import round-trips without losing current data', async ({ page }) => {
  await fresh(page);
  await page.locator('#companyName').fill('CÔNG TY QA ROUNDTRIP');
  await openTab(page, 'export');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportJson').click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();

  await page.locator('#companyName').fill('DỮ LIỆU TẠM');
  await page.locator('#importJson').setInputFiles(path);
  await expect(page.locator('#companyName')).toHaveValue('CÔNG TY QA ROUNDTRIP');
  await expect(page.locator('#pCompanyName')).toHaveText('CÔNG TY QA ROUNDTRIP');
});

test('print action is wired and PWA can reload offline after cache warm-up', async ({ page, context }) => {
  await fresh(page);

  await page.evaluate(() => {
    window.__printCalled = false;
    window.print = () => { window.__printCalled = true; };
  });
  await page.locator('.print-action').first().click();
  expect(await page.evaluate(() => window.__printCalled)).toBeTruthy();

  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#paper')).toBeVisible();
    await expect(page.locator('#pQuoteTitle')).toContainText('BẢNG BÁO GIÁ');
  } finally {
    await context.setOffline(false);
  }
});
