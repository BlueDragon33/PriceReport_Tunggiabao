import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const HOST = '127.0.0.1';
const PORT = 4173;
const URL = `http://${HOST}:${PORT}/`;

function fail(message) {
  throw new Error('V5.9 BROWSER UNIFIED-SHELL FAIL: ' + message);
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

  // The application workspace and quotation Studio must share one primary shell.
  const dashboardRail = await page.locator('.shell.app-workspace > .nav').boundingBox();
  const dashboardHeader = await page.locator('.shell.app-workspace > .studio-topbar').boundingBox();
  if (!dashboardRail || !dashboardHeader) fail('dashboard is not using the unified rail/topbar shell');
  near('dashboard rail width', dashboardRail.width, 118, 2);
  near('dashboard header height', dashboardHeader.height, 72, 2);
  near('dashboard header x', dashboardHeader.x, 118, 2);
  if (await page.locator('.shell.app-workspace [data-shell-workspace-only]:visible').count() < 1) {
    fail('workspace context is not visible in the shared topbar');
  }

  const primaryTabsBefore = await page.locator('.shell.app-workspace > .nav button[data-tab]:visible').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('data-tab'))
  );
  await page.locator('[data-tab="general"]').click();
  await page.locator('.shell:not(.app-workspace)').waitFor();
  const primaryTabsStudio = await page.locator('.shell:not(.app-workspace) > .nav button[data-tab]:visible').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('data-tab'))
  );
  if (JSON.stringify(primaryTabsStudio) !== JSON.stringify(primaryTabsBefore)) {
    fail('primary navigation changes between workspace and Studio: ' + JSON.stringify(primaryTabsBefore) + ' → ' + JSON.stringify(primaryTabsStudio));
  }
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

  // V6.3: every non-product content card opens one shared, wide modal while keeping Studio geometry unchanged.
  const workspaceCases = [
    ['general','companyName'],
    ['customer','customerName'],
    ['payment','discountPct'],
    ['terms','termsTitle'],
    ['signature','dateLine'],
    ['custom-text','intro']
  ];
  const studioGeometryBefore = {
    left: await box('.shell:not(.app-workspace) > .content-library'),
    preview: await box('.shell:not(.app-workspace) > .preview'),
    inspector: await box('.shell:not(.app-workspace) > .design')
  };

  for (const [block, field] of workspaceCases) {
    await page.locator('#contentBlockList [data-content-block="' + block + '"]').click();
    await page.locator('#contentWorkspaceModal:not([hidden])').waitFor();
    const dialog = await box('#contentWorkspaceModal:not([hidden]) .content-workspace-dialog');
    if (dialog.width < 1035) fail(block + ' content workspace is narrower than the required ChatGPT-like minimum: ' + dialog.width);
    if (await page.locator('#contentWorkspaceDialog').getAttribute('data-block') !== block) {
      fail('shared workspace opened the wrong block for ' + block);
    }
    if (await page.locator('#' + field).count() !== 1) fail(block + ' duplicated its bound field #' + field);
    if (!(await page.locator('#' + field).evaluate(node => Boolean(node.closest('#contentWorkspaceModal'))))) {
      fail(block + ' did not mount the original bound field inside the shared workspace');
    }
    const guideTitle = (await page.locator('#contentWorkspaceGuideTitle').textContent() || '').trim();
    if (!guideTitle) fail(block + ' workspace has no contextual assistant title');
    if (await page.locator('#contentWorkspaceQuickTools').count() !== 1) {
      fail(block + ' workspace contextual assistant surface is missing');
    }
    if (block === 'customer' && await page.locator('#contentWorkspaceCustomerSearch').count() !== 1) {
      fail('customer workspace does not expose saved-customer search');
    }

    if (block === 'general') {
      near('default content workspace width', dialog.width, 1200, 8);
      const mainSurface = await box('#contentWorkspaceMount');
      if (mainSurface.width < 820) fail('main editing surface is narrower than the requested ChatGPT-like content width: ' + mainSurface.width);
      await page.locator('#contentWorkspaceWidthUp').click();
      if (await page.locator('#contentWorkspaceWidthLabel').textContent() !== '1360 px') {
        fail('expanded content workspace width control did not commit 1360px');
      }
      await page.waitForTimeout(220);
      const widerDialog = await box('#contentWorkspaceDialog');
      near('expanded content workspace width', widerDialog.width, 1360, 8);
      await page.locator('#contentWorkspaceWidthDown').click();
      await page.waitForTimeout(220);
    }

    await page.locator('#doneContentWorkspace').click();
    if (!(await page.locator('#contentWorkspaceModal').evaluate(node => node.hidden))) fail(block + ' content workspace did not close cleanly');
    const expectedSourcePane = block === 'signature' ? 'terms' : block === 'custom-text' ? 'general' : block;
    if (!(await page.locator('#' + field).evaluate((node, pane) => Boolean(node.closest('#pane-' + pane)), expectedSourcePane))) {
      fail(block + ' field was not restored to its original source pane #' + expectedSourcePane);
    }
  }

  const studioGeometryAfter = {
    left: await box('.shell:not(.app-workspace) > .content-library'),
    preview: await box('.shell:not(.app-workspace) > .preview'),
    inspector: await box('.shell:not(.app-workspace) > .design')
  };
  near('left width after modal cycle', studioGeometryAfter.left.width, studioGeometryBefore.left.width, 1);
  near('preview width after modal cycle', studioGeometryAfter.preview.width, studioGeometryBefore.preview.width, 1);
  near('inspector width after modal cycle', studioGeometryAfter.inspector.width, studioGeometryBefore.inspector.width, 1);

  // Product entry must use a large, fixed dialog instead of stretching the left panel.
  await page.locator('#contentBlockList [data-content-block="products"]').click();
  await page.locator('#productWorkspaceModal:not([hidden])').waitFor();
  const productDialog = await box('#productWorkspaceModal:not([hidden]) .product-workspace-dialog');
  near('product dialog width', productDialog.width, 1400, 8);
  near('product dialog height', productDialog.height, 820, 8);
  if (await page.locator('#productWorkspaceModal #productEditor').count() !== 1) fail('product editor is not single-source inside the product dialog');
  if (await page.locator('#pane-products #productEditor').count()) fail('product editor leaked back into the narrow Studio pane');
  if (!(await page.locator('#productWorkspaceCatalogSearch').isVisible())) fail('V6.5 product catalog search is not visible in the product dialog');
  if (!(await page.locator('#productWorkspaceFilledCount').isVisible())) fail('V6.5 product health metrics are not visible');
  if (await page.locator('#productQuickUnitChips .product-quickfill-chip').count() < 1) fail('V6.5 unit quick-fill suggestions are missing');

  const productCountBeforeDuplicate = await page.locator('#productEditor .product-card').count();
  await page.locator('#productEditor .product-card').first().locator('button[title="Nhân bản"]').click();
  if (await page.locator('#productEditor .product-card').count() !== productCountBeforeDuplicate + 1) {
    fail('V6.5 duplicate-row detector setup could not duplicate the first product');
  }
  const duplicateCount = Number((await page.locator('#productWorkspaceDuplicateCount').textContent() || '0').trim());
  if (duplicateCount < 1) fail('V6.5 product duplicate detector did not flag an exact duplicate');
  if (await page.locator('#mergeDuplicateProducts').isDisabled()) fail('V6.5 safe duplicate merge action stayed disabled');
  await page.locator('#mergeDuplicateProducts').click();
  if (await page.locator('#productEditor .product-card').count() !== productCountBeforeDuplicate) {
    fail('V6.5 safe duplicate merge did not restore the original product-row count');
  }

  // V6.6: pasted/Excel data must open a wide, spreadsheet-style review before apply.
  await page.locator('#pasteProducts').click();
  await page.locator('#smartImportModal:not([hidden])').waitFor();
  const importDialog = await box('#smartImportModal:not([hidden]) .smart-import-dialog');
  near('V6.6 smart import dialog width', importDialog.width, 1320, 10);
  await page.locator('#smartPasteText').fill(
    'Tên sản phẩm\tĐVT\tSố lượng\tĐơn giá\nV66 Browser A\tHộp\t2\t28000\nV66 Browser B\tKhay\t3\t85000'
  );
  await page.locator('#parseSmartPaste').click();
  if (!(await page.locator('#smartImportEditableProducts').isVisible())) fail('V6.6 editable import grid is not visible after paste review');
  if (await page.locator('#smartImportEditableProductRows .import-editable-grid-row').count() !== 2) {
    fail('V6.6 editable import grid did not render the two reviewed rows');
  }
  if (!(await page.locator('#smartImportDashboard').isVisible())) fail('V6.6 before-after import dashboard is missing');
  if ((await page.locator('#smartImportValidCount').textContent() || '').trim() !== '2') fail('V6.6 valid import count is incorrect');

  const editName = page.locator('#smartImportEditableProductRows .import-editable-grid-row').first().locator('[data-import-product-field="name"]');
  await editName.fill('V66 Browser Edited');
  await editName.press('Tab');
  if (!(await page.locator('#smartImportProductPreview').textContent() || '').includes('V66 Browser Edited')) {
    fail('V6.6 editable import grid did not write the reviewed name back into preview data');
  }
  await page.locator('#cancelSmartImport').click();
  if (!(await page.locator('#smartImportModal').evaluate(node => node.hidden))) fail('V6.6 smart import modal did not close after cancel');

  await page.locator('#closeProductWorkspace').click();
  if (!(await page.locator('#productWorkspaceModal').evaluate(node => node.hidden))) fail('product modal did not close cleanly');

  // V6.7: guided flow must cross the content modal -> product modal -> content modal boundary
  // and finish in a dedicated final review workspace.
  await page.locator('#contentBlockList [data-content-block="general"]').click();
  await page.locator('#contentWorkspaceModal:not([hidden])').waitFor();
  if ((await page.locator('#quoteFlowStepLabel').textContent() || '').trim() !== 'Bước 1/8') {
    fail('V6.7 guided flow did not expose step 1/8 in General');
  }
  await page.locator('#contentWorkspaceNext').click();
  if (await page.locator('#contentWorkspaceDialog').getAttribute('data-block') !== 'customer') {
    fail('V6.7 guided flow did not advance General -> Customer');
  }
  await page.locator('#contentWorkspaceNext').click();
  await page.locator('#productWorkspaceModal:not([hidden])').waitFor();
  if (!(await page.locator('#productWorkspaceFlowStatus').textContent() || '').includes('Bước 3/8')) {
    fail('V6.7 product workspace does not identify itself as step 3/8');
  }
  await page.locator('#productWorkspaceNext').click();
  await page.locator('#contentWorkspaceModal:not([hidden])').waitFor();
  if (await page.locator('#contentWorkspaceDialog').getAttribute('data-block') !== 'payment') {
    fail('V6.7 guided flow did not advance Products -> Payment');
  }
  if ((await page.locator('#quoteFlowStepLabel').textContent() || '').trim() !== 'Bước 4/8') {
    fail('V6.7 payment workspace does not identify itself as step 4/8');
  }
  await page.locator('#doneContentWorkspace').click();

  await page.locator('#contentBlockList [data-content-block="custom-text"]').click();
  await page.locator('#contentWorkspaceNext').click();
  await page.locator('#quoteReviewModal:not([hidden])').waitFor();
  const reviewDialog = await box('#quoteReviewModal:not([hidden]) .quote-review-dialog');
  near('V6.7 final review width', reviewDialog.width, 1180, 10);
  if (await page.locator('#quoteReviewStepList .quote-review-step').count() !== 7) {
    fail('V6.7 final review does not list all seven content blocks');
  }
  if (!(await page.locator('#quoteReviewCompletion').isVisible())) fail('V6.7 final review completion metric is missing');
  if (!(await page.locator('#quoteReviewErrorCount').isVisible())) fail('V6.7 final review error metric is missing');
  await page.locator('#closeQuoteReview').click();

  // V6.8: every large editing modal exposes the same live seven-step navigator.
  await page.locator('#contentBlockList [data-content-block="general"]').click();
  await page.locator('#contentWorkspaceModal:not([hidden])').waitFor();
  if (await page.locator('#contentWorkspaceStepList .quote-flow-step-button').count() !== 7) {
    fail('V6.8 content workspace navigator does not expose seven content blocks');
  }
  if (await page.locator('#contentWorkspaceStepList [data-flow-block="general"]').getAttribute('aria-current') !== 'step') {
    fail('V6.8 content workspace navigator did not mark General as current');
  }
  await page.locator('#contentWorkspaceStepList [data-flow-block="products"]').click();
  await page.locator('#productWorkspaceModal:not([hidden])').waitFor();
  if (await page.locator('#productWorkspaceStepList .quote-flow-step-button').count() !== 7) {
    fail('V6.8 product workspace navigator does not expose seven content blocks');
  }
  if (await page.locator('#productWorkspaceStepList [data-flow-block="products"]').getAttribute('aria-current') !== 'step') {
    fail('V6.8 product workspace navigator did not mark Products as current');
  }
  await page.locator('#productWorkspaceStepList [data-flow-block="terms"]').click();
  await page.locator('#contentWorkspaceModal:not([hidden])').waitFor();
  if (await page.locator('#contentWorkspaceDialog').getAttribute('data-block') !== 'terms') {
    fail('V6.8 product navigator did not cross into Terms workspace');
  }
  await page.locator('#contentWorkspaceReview').click();
  await page.locator('#quoteReviewModal:not([hidden])').waitFor();
  await page.locator('#closeQuoteReview').click();

  // Content Library remains in launcher mode; return directly to management.
  if (await page.locator('.content-library').getAttribute('data-content-mode') !== 'home') {
    fail('content library left launcher mode after modal editing');
  }
  await page.locator('#studioBackHome').click();
  const returnHeader = await box('.shell.app-workspace > .studio-topbar');
  near('return dashboard header height', returnHeader.height, 72, 2);
  near('return dashboard header x', returnHeader.x, 118, 2);
  await page.locator('[data-tab="general"]').click();

  // V6.1 template library must be a large gallery, and its one-click preview must start directly below the shared header.
  await page.locator('#toggleInspectorTemplates').click();
  await page.locator('#templateLibraryModal:not([hidden])').waitFor();
  const templateDialog = await box('#templateLibraryModal:not([hidden]) .template-library-dialog');
  near('template library dialog width', templateDialog.width, 1480, 10);
  near('template library dialog height', templateDialog.height, 850, 10);
  if (await page.locator('[data-template-category]').count() !== 8) fail('template library category set is incomplete');
  if (await page.locator('[data-template-library-theme]').count() !== 16) fail('template library does not expose all 16 themes');

  await page.locator('[data-template-category="construction"]').click();
  if (await page.locator('[data-template-library-theme]:visible').count() !== 4) {
    fail('construction category filter did not resolve to the expected four templates');
  }
  await page.locator('[data-template-category="all"]').click();
  await page.locator('[data-template-library-theme="canva-blue"]').click();
  await page.locator('.shell.report-view').waitFor();

  const reportHeader = await box('.shell.report-view > .studio-topbar');
  const reportPreview = await box('.shell.report-view > .preview');
  const reportToolbar = await box('.shell.report-view .preview-tools');
  const reportPaper = await box('.shell.report-view #paperWrap');
  near('report header y', reportHeader.y, 0, 2);
  near('report header height', reportHeader.height, 72, 2);
  near('report preview y', reportPreview.y, 72, 3);
  near('report toolbar y', reportToolbar.y, 72, 3);
  if (reportPaper.y > 145) fail('A4 preview is pushed down by an empty band: y=' + reportPaper.y);
  if (!(await page.locator('#templatePreviewBack').isVisible())) fail('template preview back action is missing');
  if (!(await page.locator('#templatePreviewApply').isVisible())) fail('template preview apply action is missing');

  await page.locator('#templatePreviewBack').click();
  await page.locator('#templateLibraryModal:not([hidden])').waitFor();

  // V6.2: the attached-reference layout is a real A4 composition, not a thumbnail-only skin.
  await page.locator('[data-template-library-theme="reference-blue-corporate"]').click();
  await page.locator('.shell.report-view #paper.theme-reference-blue-corporate').waitFor();
  const referenceDisplay = await page.locator('#paper').evaluate(node => getComputedStyle(node).display);
  if (referenceDisplay !== 'grid') fail('reference layout must own the A4 composition with CSS grid, got ' + referenceDisplay);
  const referenceTitle = await box('.shell.report-view #paper .qtitle-wrap');
  const referenceMeta = await box('.shell.report-view #paper .quote-top > .qmeta');
  const referenceRecipient = await box('.shell.report-view #paper .recipient');
  const referenceIntro = await box('.shell.report-view #paper .intro');
  if (!(referenceTitle.x < referenceMeta.x)) fail('reference layout must keep title left and quote metadata right');
  if (!(referenceRecipient.x < referenceIntro.x)) fail('reference layout must keep customer information left and intro quote card right');
  if (Math.abs(referenceRecipient.y - referenceIntro.y) > 70) {
    fail('reference customer/intro blocks no longer form the intended two-column band');
  }
  const referencePaper = await box('.shell.report-view #paper');
  const referenceTable = await box('.shell.report-view #paper .qtable');
  if (referenceTable.width < referencePaper.width * 0.68) fail('reference table is no longer a dominant full-width document block');

  await page.locator('#templatePreviewBack').click();
  await page.locator('#templateLibraryModal:not([hidden])').waitFor();
  await page.locator('#closeTemplateLibrary').click();

  const search = page.locator('#studioCommandSearch');
  await search.focus();
  await search.fill('Sản phẩm');
  const resultCount = await page.locator('#studioCommandResults [role="option"]').count();
  if (resultCount < 1) fail('command search does not expose matching Studio actions');

  // V6.12: direct preview editing must open the modern popup that owns the clicked field.
  await page.locator('.shell > .nav > button[data-tab="general"]').click();
  await page.locator('.shell:not(.app-workspace):not(.report-view)').waitFor();

  await page.locator('#pCompanyName').dblclick();
  await page.locator('#contentWorkspaceModal:not([hidden])').waitFor();
  if (await page.locator('#contentWorkspaceDialog').getAttribute('data-block') !== 'general') {
    fail('V6.12 double-clicking company name must open the General workspace');
  }
  await page.waitForTimeout(120);
  if (await page.evaluate(() => document.activeElement?.id) !== 'companyName') {
    fail('V6.12 company-name direct edit must focus #companyName');
  }
  await page.locator('#doneContentWorkspace').click();

  await page.locator('#pCustomer').dispatchEvent('dblclick');
  await page.locator('#contentWorkspaceModal:not([hidden])').waitFor();
  if (await page.locator('#contentWorkspaceDialog').getAttribute('data-block') !== 'customer') {
    fail('V6.12 double-clicking customer preview must open the Customer workspace');
  }
  await page.waitForTimeout(120);
  if (await page.evaluate(() => document.activeElement?.id) !== 'customerName') {
    fail('V6.12 customer direct edit must focus #customerName');
  }
  await page.locator('#doneContentWorkspace').click();

  await page.locator('.qtable').dblclick();
  await page.locator('#productWorkspaceModal:not([hidden])').waitFor();
  if (!(await page.locator('#productWorkspaceModal .product-workspace-dialog').isVisible())) {
    fail('V6.12 double-clicking the product table must open Product workspace');
  }
  await page.locator('#doneProductWorkspace').click();

  // V6.10: iPad portrait focuses on editing instead of squeezing an unreadable A4 preview.
  const tabletContext = await browser.newContext({
    viewport: { width: 834, height: 1112 },
    deviceScaleFactor: 2,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const tabletPage = await tabletContext.newPage();
  const tabletErrors = [];
  tabletPage.on('pageerror', error => tabletErrors.push(String(error?.message || error)));
  await tabletPage.goto(URL, { waitUntil: 'networkidle' });
  await tabletPage.waitForFunction(() => document.body.dataset.deviceClass === 'tablet');

  const tabletBox = async selector => {
    const value = await tabletPage.locator(selector).boundingBox();
    if (!value) fail('V6.10 tablet missing visible box for ' + selector);
    return value;
  };
  const tabletHeader = await tabletBox('.shell.app-workspace > .studio-topbar');
  const tabletNav = await tabletBox('.shell.app-workspace > .nav');
  near('V6.10 tablet header height', tabletHeader.height, 64, 3);
  near('V6.10 tablet bottom nav height', tabletNav.height, 70, 4);
  if (await tabletPage.locator('.shell.app-workspace > .nav > button:visible').count() !== 5) {
    fail('V6.10 tablet bottom navigation must expose exactly five primary actions');
  }

  await tabletPage.locator('.shell > .nav > button[data-tab="general"]').click();
  await tabletPage.locator('.shell:not(.app-workspace)').waitFor();
  if (!(await tabletPage.locator('.content-library-home').isVisible())) fail('V6.10 tablet Content Library launcher is missing');
  const tabletEditor = await tabletBox('.shell:not(.app-workspace) > .content-library');
  if (tabletEditor.width < 800) fail('V6.10 iPad portrait must give the editor nearly the full viewport width');
  if (await tabletPage.locator('.shell:not(.app-workspace) > .preview').isVisible()) {
    fail('V6.10 iPad portrait must not squeeze live A4 beside the editor');
  }
  if (await tabletPage.locator('.content-block-list .content-block-row:visible').count() !== 7) {
    fail('V6.10 iPad portrait lost quotation content blocks');
  }

  await tabletPage.locator('#contentBlockList [data-content-block="general"]').click();
  await tabletPage.locator('#contentWorkspaceModal:not([hidden])').waitFor();
  const tabletContentDialog = await tabletBox('#contentWorkspaceModal .content-workspace-dialog');
  if (tabletContentDialog.width < 800 || tabletContentDialog.height < 1000) {
    fail('V6.10 tablet content workspace is not using the near-fullscreen touch canvas');
  }
  if (await tabletPage.locator('#contentWorkspaceStepList .quote-flow-step-button').count() !== 7) {
    fail('V6.10 tablet content workspace lost the seven-step flow navigator');
  }
  await tabletPage.locator('#contentWorkspaceStepList [data-flow-block="products"]').click();
  await tabletPage.locator('#productWorkspaceModal:not([hidden])').waitFor();
  const tabletToolbarOverflow = await tabletPage.locator('#productWorkspaceModal .product-workspace-toolbar').evaluate(node => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
    display: getComputedStyle(node).display
  }));
  if (tabletToolbarOverflow.display !== 'flex') fail('V6.10 tablet product actions must use the horizontal touch rail');
  await tabletPage.locator('#doneProductWorkspace').click();

  await tabletPage.locator('.shell > .nav > .mobile-more-toggle').click();
  await tabletPage.locator('#mobileMoreMenu:not([hidden])').waitFor();
  const tabletMore = await tabletBox('#mobileMoreMenu');
  const tabletNavAfterMore = await tabletBox('.shell > .nav');
  if (!(tabletMore.y + tabletMore.height <= tabletNavAfterMore.y + 2)) fail('V6.10 tablet More menu must stay above bottom navigation');
  await tabletPage.locator('#mobileMoreClose').click();
  if (tabletErrors.length) fail('V6.10 tablet portrait runtime page error(s): ' + tabletErrors.join(' | '));
  await tabletContext.close();

  // V6.11 regression: portrait iPad Pro must stay editing-first even when CSS width reaches 1024px.
  const tabletProPortraitContext = await browser.newContext({
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const tabletProPortraitPage = await tabletProPortraitContext.newPage();
  await tabletProPortraitPage.goto(URL, { waitUntil: 'networkidle' });
  await tabletProPortraitPage.waitForFunction(() => document.body.dataset.deviceClass === 'tablet');
  await tabletProPortraitPage.locator('.shell > .nav > button[data-tab="general"]').click();
  await tabletProPortraitPage.locator('.shell:not(.app-workspace)').waitFor();
  const tabletProPortraitEditor = await tabletProPortraitPage.locator('.shell:not(.app-workspace) > .content-library').boundingBox();
  if (!tabletProPortraitEditor || tabletProPortraitEditor.width < 990) {
    fail('V6.11 iPad Pro portrait must keep the editor near full width');
  }
  if (await tabletProPortraitPage.locator('.shell:not(.app-workspace) > .preview').isVisible()) {
    fail('V6.11 iPad Pro portrait must hide live A4 while editing');
  }
  await tabletProPortraitContext.close();

  // V6.11 regression: compact landscape tablets must not force an unreadable split preview.
  const compactTabletLandscapeContext = await browser.newContext({
    viewport: { width: 900, height: 700 },
    deviceScaleFactor: 2,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const compactTabletLandscapePage = await compactTabletLandscapeContext.newPage();
  await compactTabletLandscapePage.goto(URL, { waitUntil: 'networkidle' });
  await compactTabletLandscapePage.waitForFunction(() => document.body.dataset.deviceClass === 'tablet');
  await compactTabletLandscapePage.locator('.shell > .nav > button[data-tab="general"]').click();
  await compactTabletLandscapePage.locator('.shell:not(.app-workspace)').waitFor();
  const compactTabletEditor = await compactTabletLandscapePage.locator('.shell:not(.app-workspace) > .content-library').boundingBox();
  if (!compactTabletEditor || compactTabletEditor.width < 875) {
    fail('V6.11 compact landscape tablet must keep the editor nearly full width');
  }
  if (await compactTabletLandscapePage.locator('.shell:not(.app-workspace) > .preview').isVisible()) {
    fail('V6.11 compact landscape tablet must hide the too-narrow live A4 preview');
  }
  await compactTabletLandscapeContext.close();

  // V6.11 regression: classic 1024px landscape is the first safe split-view boundary.
  const classicTabletLandscapeContext = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const classicTabletLandscapePage = await classicTabletLandscapeContext.newPage();
  await classicTabletLandscapePage.goto(URL, { waitUntil: 'networkidle' });
  await classicTabletLandscapePage.waitForFunction(() => document.body.dataset.deviceClass === 'tablet');
  await classicTabletLandscapePage.locator('.shell > .nav > button[data-tab="general"]').click();
  await classicTabletLandscapePage.locator('.shell:not(.app-workspace)').waitFor();
  const classicLandscapeEditor = await classicTabletLandscapePage.locator('.shell:not(.app-workspace) > .content-library').boundingBox();
  const classicLandscapePreview = await classicTabletLandscapePage.locator('.shell:not(.app-workspace) > .preview').boundingBox();
  if (!classicLandscapeEditor || !classicLandscapePreview || classicLandscapeEditor.width < 310 || classicLandscapePreview.width < 690) {
    fail('V6.11 classic 1024px iPad landscape must preserve a readable 320px editor + >=690px preview split');
  }
  await classicTabletLandscapeContext.close();

  // V6.10: landscape iPad has enough width for editor + live A4 split.
  const tabletLandscapeContext = await browser.newContext({
    viewport: { width: 1112, height: 834 },
    deviceScaleFactor: 2,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const tabletLandscapePage = await tabletLandscapeContext.newPage();
  const tabletLandscapeErrors = [];
  tabletLandscapePage.on('pageerror', error => tabletLandscapeErrors.push(String(error?.message || error)));
  await tabletLandscapePage.goto(URL, { waitUntil: 'networkidle' });
  await tabletLandscapePage.waitForFunction(() => document.body.dataset.deviceClass === 'tablet');
  await tabletLandscapePage.locator('.shell > .nav > button[data-tab="general"]').click();
  await tabletLandscapePage.locator('.shell:not(.app-workspace)').waitFor();
  const landscapeEditor = await tabletLandscapePage.locator('.shell:not(.app-workspace) > .content-library').boundingBox();
  const landscapePreview = await tabletLandscapePage.locator('.shell:not(.app-workspace) > .preview').boundingBox();
  if (!landscapeEditor || !landscapePreview || landscapeEditor.width < 310 || landscapePreview.width < 700) {
    fail('V6.10 iPad landscape is not using the useful 320px editor + live A4 split');
  }
  if (!(landscapeEditor.x < landscapePreview.x)) fail('V6.10 iPad landscape column order is incorrect');
  if (tabletLandscapeErrors.length) fail('V6.10 tablet landscape runtime page error(s): ' + tabletLandscapeErrors.join(' | '));
  await tabletLandscapeContext.close();

  // V6.10: phone UI keeps the single-column app shell and improves one-hand density/readability.
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const phonePage = await phoneContext.newPage();
  const phoneErrors = [];
  phonePage.on('pageerror', error => phoneErrors.push(String(error?.message || error)));
  await phonePage.goto(URL, { waitUntil: 'networkidle' });
  await phonePage.waitForFunction(() => document.body.dataset.deviceClass === 'phone');

  const phoneBox = async selector => {
    const value = await phonePage.locator(selector).boundingBox();
    if (!value) fail('V6.10 phone missing visible box for ' + selector);
    return value;
  };
  const phoneHeader = await phoneBox('.shell.app-workspace > .studio-topbar');
  const phoneNav = await phoneBox('.shell.app-workspace > .nav');
  near('V6.10 phone header height', phoneHeader.height, 58, 3);
  near('V6.10 phone bottom nav height', phoneNav.height, 66, 4);
  if (await phonePage.locator('.shell.app-workspace > .nav > button:visible').count() !== 5) {
    fail('V6.10 phone bottom navigation must expose exactly five primary actions');
  }
  const phoneNavLabelFont = await phonePage.locator('.shell.app-workspace > .nav > button:visible span:not(.nav-glyph)').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  if (phoneNavLabelFont < 10) fail('V6.11 phone bottom navigation labels must be at least 10px');

  await phonePage.locator('.shell > .nav > button[data-tab="general"]').click();
  await phonePage.locator('.shell:not(.app-workspace)').waitFor();
  if (!(await phonePage.locator('.content-library-home').isVisible())) fail('V6.10 phone did not restore the modern Content Library launcher');
  if (await phonePage.locator('.shell:not(.app-workspace) > .preview').isVisible()) {
    fail('V6.10 phone edit mode must prioritize the single-column content launcher instead of squeezing A4 beside it');
  }
  const phoneOverflow = await phonePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (phoneOverflow > 2) fail('V6.10 phone shell has horizontal page overflow: ' + phoneOverflow + 'px');
  const phoneBlockDescriptionFont = await phonePage.locator('.content-block-row small').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  if (phoneBlockDescriptionFont < 11) fail('V6.11 phone content descriptions must remain readable at 11px+');
  const phoneStatusFont = await phonePage.locator('#studioQuoteStatus').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  if (phoneStatusFont < 10) fail('V6.11 phone quote status badge must remain readable at 10px+');
  const phoneMetaFont = await phonePage.locator('.studio-topbar-title>small').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  if (phoneMetaFont < 10) fail('V6.11 phone quote metadata must remain readable at 10px+');

  await phonePage.locator('#contentBlockList [data-content-block="general"]').click();
  await phonePage.locator('#contentWorkspaceModal:not([hidden])').waitFor();
  const phoneContentDialog = await phoneBox('#contentWorkspaceModal .content-workspace-dialog');
  near('V6.10 phone content workspace width', phoneContentDialog.width, 390, 3);
  near('V6.10 phone content workspace height', phoneContentDialog.height, 844, 4);
  if (await phonePage.locator('#contentWorkspaceStepList .quote-flow-step-button').count() !== 7) {
    fail('V6.10 phone content workspace lost the seven-step flow navigator');
  }
  const companyFontSize = await phonePage.locator('#companyName').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  if (companyFontSize < 16) fail('V6.10 phone form inputs must stay at 16px+ to prevent iOS focus zoom');
  const phoneFlowLabelFont = await phonePage.locator('#contentWorkspaceStepList .quote-flow-step-button strong').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  if (phoneFlowLabelFont < 10) fail('V6.11 phone flow-step labels must be at least 10px');
  const phoneFooterButtonFont = await phonePage.locator('#contentWorkspaceModal .content-workspace-footer .btn').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  if (phoneFooterButtonFont < 11) fail('V6.11 phone workspace footer actions must be at least 11px');

  await phonePage.locator('#contentWorkspaceStepList [data-flow-block="products"]').click();
  await phonePage.locator('#productWorkspaceModal:not([hidden])').waitFor();
  const phoneProductDialog = await phoneBox('#productWorkspaceModal .product-workspace-dialog');
  near('V6.10 phone product workspace width', phoneProductDialog.width, 390, 3);
  const gridHeadDisplay = await phonePage.locator('#productWorkspaceModal .product-data-grid-head').evaluate(node => getComputedStyle(node).display);
  if (gridHeadDisplay !== 'none') fail('V6.10 phone product editor still exposes the desktop spreadsheet header');
  await phonePage.locator('#doneProductWorkspace').click();

  await phonePage.locator('.shell > .nav > .mobile-more-toggle').click();
  await phonePage.locator('#mobileMoreMenu:not([hidden])').waitFor();
  if (await phonePage.locator('#mobileMoreMenu .mobile-more-grid button:visible').count() < 8) {
    fail('V6.10 phone More sheet actions are hidden or incomplete');
  }
  await phonePage.locator('#mobileMoreMenu [data-open-tab="customer"]').click();
  await phonePage.locator('#contentWorkspaceModal:not([hidden])').waitFor();
  if (await phonePage.locator('#contentWorkspaceDialog').getAttribute('data-block') !== 'customer') {
    fail('V6.10 phone More sheet did not route Customer through the modern popup workflow');
  }
  await phonePage.locator('#doneContentWorkspace').click();

  await phonePage.locator('#studioGlobalPreview').click();
  await phonePage.locator('.shell.report-view').waitFor();
  await phonePage.waitForTimeout(120);
  if (!(await phonePage.locator('.shell.report-view > .preview').isVisible())) fail('V6.10 phone report view is not visible');
  if (await phonePage.locator('.shell.report-view > .editor').isVisible()) fail('V6.10 phone report view must hide the editor');
  const phoneReportPreview = await phoneBox('.shell.report-view > .preview');
  const phoneReportPaper = await phoneBox('.shell.report-view #paperWrap');
  if (phoneReportPaper.width > phoneReportPreview.width + 2) fail('V6.10 phone A4 report does not fit inside the viewport');

  if (phoneErrors.length) fail('V6.10 phone runtime page error(s): ' + phoneErrors.join(' | '));
  await phoneContext.close();

  console.log('V6.10 BROWSER PASS: desktop regression plus iPad portrait focus, iPad landscape split and polished phone touch UI verified');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
