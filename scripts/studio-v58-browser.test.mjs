import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const HOST = '127.0.0.1';
const PORT = 4173;
const URL = `http://${HOST}:${PORT}/`;

function fail(message) {
  throw new Error('V5.8 BROWSER PIXEL-LOCK FAIL: ' + message);
}

function near(name, actual, expected, tolerance) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    fail(`${name}: expected ${expected}±${tolerance}px, got ${actual}`);
  }
}

async function waitForServer(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(URL, { cache: 'no-store' });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  fail('Vite preview server did not become ready');
}

const server = spawn(process.execPath, [
  './node_modules/vite/bin/vite.js',
  'preview',
  '--host', HOST,
  '--port', String(PORT),
  '--strictPort'
], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NO_COLOR: '1' }
});

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1664, height: 912 }, deviceScaleFactor: 1 });

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('[data-tab="general"]').click();
  await page.locator('.shell:not(.app-workspace)').waitFor();
  await page.locator('#fit').click();
  await page.waitForTimeout(120);

  if (pageErrors.length) fail('runtime page error(s): ' + pageErrors.join(' | '));

  const box = async selector => {
    const value = await page.locator(selector).boundingBox();
    if (!value) fail('missing visible box for ' + selector);
    return value;
  };

  const rail = await box('.shell:not(.app-workspace) > .nav');
  const header = await box('.shell:not(.app-workspace) > .studio-topbar');
  const left = await box('.shell:not(.app-workspace) > .content-library');
  const preview = await box('.shell:not(.app-workspace) > .preview');
  const inspector = await box('.shell:not(.app-workspace) > .design');
  const previewToolbar = await box('.shell:not(.app-workspace) .preview-tools');
  const paperWrap = await box('#paperWrap');

  near('rail width', rail.width, 118, 2);
  near('header x', header.x, 118, 2);
  near('header height', header.height, 72, 2);
  near('left x', left.x, 118, 3);
  near('left width', left.width, 320, 3);
  near('left y', left.y, 72, 2);
  near('preview x', preview.x, 438, 5);
  near('preview width', preview.width, 842, 6);
  near('inspector x', inspector.x, 1280, 5);
  near('inspector width', inspector.width, 384, 3);
  near('preview toolbar height', previewToolbar.height, 52, 2);
  near('A4 visible width', paperWrap.width, 706, 8);

  if (!(rail.x < left.x && left.x < preview.x && preview.x < inspector.x)) {
    fail('visible column order is not rail → content → preview → inspector');
  }

  const topbars = await page.locator('.studio-topbar:visible').count();
  if (topbars !== 1) fail('expected exactly one visible Studio topbar, got ' + topbars);
  if (await page.locator('.studio-stepper, .studio-commandbar, .studio-global-bar').count()) {
    fail('legacy V5.7 Studio chrome is still present');
  }

  const blocks = await page.locator('#contentBlockList [data-content-block]').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('data-content-block'))
  );
  const expectedBlocks = ['general','customer','products','payment','terms','signature','custom-text'];
  if (JSON.stringify(blocks) !== JSON.stringify(expectedBlocks)) {
    fail('content block order changed: ' + JSON.stringify(blocks));
  }

  const sectionNames = await page.locator('.inspector-design-view > .inspector-section .inspector-section-head h3, .inspector-design-view > details.inspector-section > summary > span')
    .evaluateAll(nodes => nodes.map(node => node.textContent.trim()));
  const requiredOrder = ['Giao diện tổng thể','Màu chủ đạo','Font chữ','Thiết lập hiển thị','Cài đặt nâng cao','Brand Kit'];
  let cursor = -1;
  for (const name of requiredOrder) {
    const next = sectionNames.indexOf(name, cursor + 1);
    if (next < 0) fail('missing inspector section: ' + name);
    if (next <= cursor) fail('inspector section order changed at: ' + name);
    cursor = next;
  }

  const colors = await page.evaluate(() => ({
    header: getComputedStyle(document.querySelector('.studio-topbar')).backgroundColor,
    left: getComputedStyle(document.querySelector('.content-library')).backgroundColor,
    preview: getComputedStyle(document.querySelector('.preview')).backgroundColor,
    inspector: getComputedStyle(document.querySelector('.design')).backgroundColor
  }));
  if (colors.header !== 'rgb(7, 29, 54)') fail('header color drifted: ' + colors.header);
  if (colors.left !== 'rgb(11, 39, 72)') fail('left panel color drifted: ' + colors.left);
  if (colors.preview !== 'rgb(38, 58, 84)') fail('preview canvas color drifted: ' + colors.preview);
  if (colors.inspector !== 'rgb(11, 39, 72)') fail('inspector color drifted: ' + colors.inspector);

  const search = page.locator('#studioCommandSearch');
  await search.focus();
  await search.fill('Sản phẩm');
  const resultCount = await page.locator('#studioCommandResults [role="option"]').count();
  if (resultCount < 1) fail('command search does not expose matching Studio actions');

  await page.locator('#contentLibraryBack').evaluate(node => node.click());
  console.log('V5.8 BROWSER PIXEL-LOCK PASS: canonical 1664x912 geometry and visible hierarchy verified');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
