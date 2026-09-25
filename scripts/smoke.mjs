import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('src/main.js', 'utf8');
const css = fs.readFileSync('src/styles.css', 'utf8');
const v5Css = fs.readFileSync('src/ui-v5.css', 'utf8');
const studioCss = fs.readFileSync('src/studio-v59.css', 'utf8');
const appCss = css + '\n' + v5Css + '\n' + studioCss;
const sw = fs.readFileSync('public/sw.js', 'utf8');
const deviceProfileJs = fs.readFileSync('src/device-profile.js', 'utf8');

function fail(message) {
  console.error('SMOKE FAIL:', message);
  process.exitCode = 1;
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupIds.length) fail('Duplicate ids: ' + [...new Set(dupIds)].join(', '));

const requiredIds = [
  'paper','paperWrap','productEditor','qHead','qBody','summary',
  'companyName','customerName','addProduct','exportJson','importJson',
  'exportAllData','importAllData','quoteStatus','quoteStatusFilter',
  'designPanel','paymentPrint','pSlogan','pageEstimate',
  'customerLibraryList','productCatalogList','saveCurrentCustomer','saveCurrentProducts',
  'customerLibraryFilter','customerLibraryBulkBar','customerLibraryBulkCount','clearCustomerLibrarySelection','deleteSelectedCustomers',
  'productCatalogGroupFilter','productCatalogCurrencyFilter','productCatalogDuplicateOnly','productCatalogBulkBar','productCatalogBulkCount',
  'addSelectedCatalogProducts','clearProductCatalogSelection','deleteSelectedCatalogProducts','productCatalogDuplicateSummary','productCatalogDuplicateCount',
  'importCustomerLibraryExcel','exportCustomerLibraryExcel','exportCustomerLibraryCsv','customerLibraryExcelInput',
  'importProductLibraryExcel','exportProductLibraryExcel','exportProductLibraryCsv','productLibraryExcelInput',
  'dataLibraryImportModal','dataLibraryImportTitle','dataLibraryImportSubtitle','dataLibraryImportSheetRow','dataLibraryImportSheetSelect',
  'dataLibraryImportValidCount','dataLibraryImportUpdateCount','dataLibraryImportInvalidCount','dataLibraryImportDuplicateCount',
  'dataLibraryImportNotice','dataLibraryImportPreviewHead','dataLibraryImportPreviewBody','cancelDataLibraryImport','applyDataLibraryImport','closeDataLibraryImport',
  'quickCustomerName','designShowStt','designShowPrice','designShowAmount','designShowTotals',
  'wideView','zoomOut','zoomIn','toolbarMenu',
  'productWorkspaceModal','openProductWorkspace','closeProductWorkspace','doneProductWorkspace','collapseAllProducts','logoDesignPreview','logoWidthRange',
  'logoWidthDesign','logoPadding','logoOffsetX','logoOffsetY','logoShrink','logoGrow','logoTreatment','resetLogoPosition',
  'logoBlendMode','logoBackdropColor','logoBackdropOpacity','logoBackdropRadius',
  'logoBackdropBorder','toggleEditorPanel','toggleDesignPanel','templateDescription',
  'customizePreview','previewCustomizer','closePreviewCustomizer',
  'previewSpacing','previewTableDensity','previewHeaderGap','previewMetaWidth',
  'previewLineHeight','resetPreviewLayout','showQuoteMeta','layoutEditToggle','autoArrangeLayoutToolbar','autoArrangeLayoutPanel','layoutSelection','resetBlockPositions',
  'historyAcceptedCount','documentHealth','preflightCheck','preflightExport','qCols',
  'openSmartImport','smartImportModal','excelSmartImportInput','handwritingSmartImportInput',
  'smartImportReview','smartImportProgress','applySmartImport','cancelSmartImport','ocrRawText','reparseOcrText',
  'smartPastePanel','smartPasteText','parseSmartPaste','smartImportSheetPicker','smartImportSheetSelect',
  'smartImportIssues','smartImportIssueList','saveProductsToCatalogTop',
  'showPack','showQty','quoteSubtitle','pQuoteSubtitle','resetSmartImport',
  'studioDocumentHealth','quickShowCustomer','studioSubtotal','studioGrandTotal',
  'inspectorHealthStatus','inspectorRunCheck','inspectorPreviewQuote',
  'inspectorErrorCount','inspectorWarningCount','inspectorIssueList',
  'studioGlobalTitle','studioGlobalQuoteNo','studioGlobalHistoryState','studioGlobalHealth',
  'studioGlobalSave','studioGlobalPreview','studioGlobalPdf',
  'contentLibraryHome','contentLibrarySearch','contentLibraryBack','contentLibraryDetailHead',
  'contentBlockList','contentTemplateGrid','runLayoutSuggestion',
  'studioCommandSearch','studioCommandResults','studioTopMenu','previewOverflowMenu'
];
for (const id of requiredIds) {
  if (!ids.includes(id)) fail('Missing required id #' + id);
}

const binds = [...html.matchAll(/data-bind="([^"]+)"/g)].map(m => m[1]);
for (const key of new Set(binds)) {
  if (!js.includes(key + ':')) fail('data-bind key is missing from defaults/state schema: ' + key);
}

const targets = [...html.matchAll(/data-target="([^"]+)"/g)].map(m => m[1]);
for (const target of new Set(targets)) {
  if (!ids.includes(target)) fail('Preview data-target points to missing editor field: #' + target);
}

for (const file of ['public/manifest.webmanifest','public/sw.js','src/styles.css','src/ui-v5.css','src/studio-v59.css','src/main.js']) {
  if (!fs.existsSync(file)) fail('Missing required file: ' + file);
}

if (!js.includes("serviceWorker.register('./sw.js'")) fail('Service worker registration is missing');
if (!js.includes('window.print()')) fail('Print/PDF action is missing');
if (!js.includes('schemaVersion: 4')) fail('Full backup schema v4 is missing');
if (!js.includes('generateUniqueQuoteNo')) fail('Unique quote number generator is missing');
if (!js.includes('STATUS_LABELS')) fail('Quote lifecycle status mapping is missing');
if (!js.includes('updatePageEstimate')) fail('A4 page estimation logic is missing');
if (!js.includes('getCustomerLibrary')) fail('Customer master-data library is missing');
if (!js.includes('getProductCatalog')) fail('Product catalog is missing');
if (!js.includes("if (/chưa có sản phẩm hợp lệ/i.test(text))")) fail('No-product validation must route to the Products Studio step');
if (!js.includes('function safeStore')) fail('Safe local-storage wrapper is missing');
if (!js.includes('const MAX_LOGO_FILE_BYTES = 3 * 1024 * 1024')) fail('3 MB logo storage guard is missing');
if (!sw.includes("pricereport-shell-v59-unified-shell")) fail('Service-worker cache version was not aligned with the V5.9 unified shell release');
if (!sw.includes("event.request.mode === 'navigate'")) fail('Navigation network-first strategy is missing');
if (!sw.includes('precacheLinkedAssets')) fail('First-load linked asset precache is missing');
if (!html.includes("const recoveryKey = 'tgb-style-recovery-v5'")) fail('Bounded V5.9 stylesheet recovery key is missing');
if (!html.includes('reloadLinkedStylesheets')) fail('Runtime stylesheet reload helper is missing');
if (!html.includes('nextAttempt > 3')) fail('Runtime stylesheet recovery must be bounded');
if (!html.includes("url.searchParams.set('asset-recovery-ts'")) fail('Runtime stylesheet recovery must cache-bust page retries');
if (!js.includes('normalizeHistoryRecords')) fail('History import/local-data normalization is missing');
if (!js.includes('normalizeCustomerLibrary')) fail('Customer import/local-data normalization is missing');
if (!js.includes('normalizeProductCatalog')) fail('Catalog import/local-data normalization is missing');
if (!js.includes('normalizePresetStore')) fail('Preset import normalization is missing');
if (!js.includes('captureStorageSnapshot') || !js.includes('restoreStorageSnapshot')) fail('Import/restore transaction rollback is missing');
if (!js.includes('localDateISO()') || !js.includes('localDateISO(d)')) fail('Local calendar date helper is not used for all quotation-date flows');
if (!js.includes('normalizeBoundedNumber')) fail('Imported layout numeric clamping is missing');
if (!js.includes('normalizeHexColor')) fail('Imported color normalization is missing');
if (!js.includes("['Times New Roman','Georgia','Arial']")) fail('Imported document-font whitelist is missing');
if (!js.includes('Legacy logo migration deferred')) fail('Legacy logo migration must not discard loaded state on storage failure');
if (!js.includes('isValidISODate')) fail('Quote-date preflight validation is missing');
if (!js.includes("wide-preview")) fail('Wide preview mode is missing');
if (/(?<!\$)\$\([^)]*\)\.forEach/.test(js)) fail('querySelector result used with forEach; use the $ helper instead');
if (!js.includes("zoomOut")) fail('Preview zoom controls are missing');
if (!html.includes("THÔNG TIN KHÁCH HÀNG")) fail('General-tab quick customer section is missing');
if ((html.match(/data-theme=/g) || []).length < 8) fail('Template library must provide at least 8 usable themes');
if (!js.includes("THEME_ACCENTS")) fail('Template accent presets are missing');
if (!js.includes('function openProductWorkspace') || !js.includes('function closeProductWorkspace')) fail('V5.9 fixed product modal controller is missing');
if (!html.includes('id="productWorkspaceModal"') || !html.includes('id="productLaunchList"')) fail('V5.9 product modal/launcher surface is missing');
if (!studioCss.includes('.product-workspace-dialog') || !studioCss.includes('.product-launch-card')) fail('V5.9 product modal/launcher styling is missing');
if (html.includes('id="productFocusToggle"') || js.includes("classList.toggle('product-focus')")) fail('Legacy product-focus shell mode must be removed');
if (!js.includes("logoTreatment")) fail('Logo treatment controls are missing');
if (js.includes("const logoColumn =")) fail('Logo size must not push the company block sideways');
if (!css.includes("grid-template-columns:minmax(0,41.5%) minmax(0,58.5%)")) fail('Balanced logo/company header grid is missing');
if (!html.includes('class="company-col"') || !html.includes('class="company-block"') || !html.includes('class="company-lines"')) fail('Centered company header structure is missing');
if (!css.includes(".paper .company-lines")) fail('Company detail alignment block is missing');
if (!css.includes(".theme-modern .company-lines")) fail('Reference company detail typography is missing');
if (!css.includes("width:min(96mm,100%)")) fail('Company block controlled width is missing');
if (!css.includes(".theme-modern .qtitle:after{display:none")) fail('Reference template should match the supplied PDF title treatment');
if (html.includes("<table class=\"product-table\"")) fail('Legacy cramped product table is still present');
if (!js.includes("enhanceCollapsibleCards")) fail('Card collapse behavior is missing');
if (!js.includes("setMajorPanelState")) fail('Major panel collapse behavior is missing');
if (!js.includes("logoBackdropOpacity")) fail('Editable logo backdrop is missing');
if (!js.includes("logoBlendMode")) fail('Logo blend-mode control is missing');
if (!js.includes("clearCurrentLogo")) fail('Destructive logo clear helper is missing');
if (!js.includes("logoReadToken")) fail('Logo replacement race guard is missing');
if (!js.includes("state.showLogo = false")) fail('Logo removal must hide the logo completely');
if (js.includes("preview.innerHTML = '<div class=\"logo-text\">THẾ GIỚI TRỨNG®</div>'")) fail('Removed logos must not fall back to the old brand mark');
if (!html.includes("NỀN PHÍA SAU LOGO")) fail('Logo backdrop editor UI is missing');
if (!html.includes("Chuẩn công ty") || !html.includes("Doanh nghiệp") || !html.includes("Cao cấp sáng")) fail('Reference-standard template labels are missing');
if (!js.includes("previewTitleAlign")) fail('Preview title alignment state is missing');
if (!js.includes("setPreviewCustomizer")) fail('Preview customizer behavior is missing');
if (!js.includes("THEME_FONTS")) fail('Template typography mapping is missing');
if (!css.includes(".paper[data-title-align=\"center\"] .qtitle")) fail('Centered title override is missing');
if (!css.includes("--rhythm-md")) fail('Consistent document spacing system is missing');
if (!css.includes("overflow:visible!important")) fail('Print document must allow multi-page overflow');
if (!js.includes("aria-current")) fail('Active navigation accessibility state is missing');
if (!appCss.includes(".preview-customizer")) fail('Preview customizer styles are missing');
if (!html.includes("Tùy chỉnh xem trước") && !html.includes("TÙY CHỈNH XEM TRƯỚC")) fail('Preview customizer UI is missing');

if (!process.exitCode) {
  console.log('SMOKE PASS:', ids.length, 'ids,', new Set(binds).size, 'bindings,', new Set(targets).size, 'preview targets');
}

if (!js.includes('normalizeLayoutOffsets')) fail('Layout offset normalization is missing');
if (!js.includes('setupLayoutEditor')) fail('Direct preview layout editor is missing');
if (!js.includes("data-layout-block")) {
  // marker lives in HTML, asserted below
}
if (!html.includes('data-layout-block="logo"') || !html.includes('data-layout-block="table"')) fail('Preview draggable block markers are missing');
if (!css.includes('.paper.layout-edit-mode .layout-block')) fail('Layout edit mode styling is missing');
if (!js.includes("logoOffsetX")) fail('Independent horizontal logo offset is missing');

if (!css.includes('#previewLogo img{') || !css.includes('position:absolute') || !css.includes('--logo-scale')) fail('Logo resize must remain visual-only inside a fixed header slot');

if (!js.includes('function autoArrangePreview')) fail('Automatic preview arrangement is missing');
if (!js.includes('syncLayoutEditModeUI')) fail('Persistent layout-mode UI sync is missing');
if (!js.includes("paper.classList.toggle('layout-edit-mode', layoutEditEnabled)")) fail('Render must preserve layout-edit mode');
if (!js.includes('setPointerCapture')) fail('Pointer capture for repeat dragging is missing');

if (!js.includes("import('xlsx')")) fail('Excel parser must be lazy-loaded in the browser');
if (!js.includes("import('tesseract.js')")) fail('Handwriting OCR engine must be lazy-loaded');
if (!js.includes('parseSpreadsheetRows')) fail('Spreadsheet semantic mapper is missing');
if (!js.includes('parseHandwritingText')) fail('Handwriting semantic mapper is missing');
if (!js.includes('TUNGGIABAO_PRODUCTS')) fail('Tùng Gia Bảo baseline dataset is missing');
if (!html.includes('data-import-field="companyName"')) fail('Smart import review field mapping UI is missing');
if (!html.includes('class="qgroup-row"') && !js.includes("groupRow.className = 'qgroup-row'")) fail('Grouped price-list rendering is missing');
if (!appCss.includes('.smart-import-dialog')) fail('Smart import dialog styling is missing');
if (!css.includes('.qgroup-row td')) fail('Grouped product row styling is missing');

if (!css.includes('flex-direction:column!important') || !css.includes('.paper .qsubtitle')) fail('Title/subtitle vertical hierarchy is missing');
if (!css.includes('.qgroup-row+tr')) fail('Grouped rows must avoid orphaning from the first product row');
if (!js.includes('setSmartImportBusy')) fail('Smart import concurrency guard is missing');
if (!js.includes('resetSmartImportDraft')) fail('Smart import fresh-session reset is missing');
if (!js.includes('sheetNames.map')) fail('Excel importer must evaluate multiple workbook sheets');

if (!js.includes("merged.previewSpacing === 'relaxed'") || !js.includes("['compact','standard','airy']")) fail('Preview spacing persistence migration is missing');
if (!js.includes('resetCollapsedProductsForState')) fail('Large product-set editor auto-collapse is missing');
if (!css.includes('.paper[data-spacing="airy"]')) fail('Airy spacing CSS profile is missing');

if (!js.includes('smartImportManualFields')) fail('Smart Import review must track explicit manual field edits');
if (!js.includes('mergeSmartImportSource')) fail('Smart Import must preserve manual review overrides across source merges');
if (!js.includes('replaceSourceFields: true')) fail('Corrected OCR text must replace stale handwriting-origin fields');
if (!js.includes("namedProducts.every(product => !String(product.note || '').trim())")) fail('Auto-arrange must optimize an entirely empty Note column');
if (!js.includes("showNote: false")) fail('Tùng Gia Bảo baseline should not waste width on an empty Note column');

if (!js.includes('looksLikeLegacyBienUyenBaoProfile')) fail('Robust legacy Biển Uyên Bảo profile detection is missing');
if (!js.includes('applyTungGiaBaoBaseline')) fail('Tùng Gia Bảo baseline replacement helper is missing');
if (!html.includes('id="applyTungGiaBaoProfile"')) fail('Manual Tùng Gia Bảo apply action is missing');
if (!js.includes('localStorage.setItem(STORAGE, JSON.stringify(persistedMigration))')) fail('Legacy profile migration must persist immediately');

if (html.includes('id="branchKhanhHoa"') || html.includes('id="branchDongNai"') || html.includes('id="farmAddress"')) fail('Removed legacy company fields are still visible');
if (!html.includes('data-tab="view"')) fail('Dedicated report-view tab is missing');
if (!html.includes('Xuất bản & dữ liệu')) fail('Publishing/Data navigation label is missing');
if (!html.includes('id="exportExcel"') || !html.includes('id="importExcelQuick"')) fail('Excel import/export controls are missing from export pane');
if (!html.includes('id="choosePcFolder"') || !html.includes('id="restorePcLatest"')) fail('PC workspace controls are missing');
if (!js.includes('function fitReportView')) fail('Finite responsive report-view sizing is missing');
if (!js.includes("wrap.style.height = Math.ceil(paperHeight * scale) + 'px'")) fail('Report view does not clamp wrapper height to scaled document content');
if (!js.includes('--fs-table') || !css.includes('var(--fs-table,9px)')) fail('Document font-size scaling is not applied to report typography');
if (!js.includes('exportCurrentQuoteExcel')) fail('Excel export implementation is missing');
if (!js.includes('saveCurrentToPc({ notify: false })')) fail('Explicit quote save does not trigger PC autosave');
if (!js.includes('getRememberedPcDirectory')) fail('Remembered PC folder retrieval is missing');
if (!appCss.includes('.shell.report-view .preview')) fail('Responsive report-view CSS is missing');

if (!html.includes('id="logoDisplayMode"')) fail('Logo display mode selector is missing');
if (!html.includes('Giữ nguyên ảnh gốc (mặc định)')) fail('Original logo mode is not the explicit default in UI');
if (!html.includes('id="restoreLogoOriginal"')) fail('Restore original logo action is missing');
if (!js.includes("logoDisplayMode: 'original'")) fail('Logo state does not default to original mode');
if (!js.includes("state.logoDisplayMode = 'original'")) fail('Logo upload/reset does not force original mode');
if (!js.includes('removeBackgroundDataUrl')) fail('True background deletion implementation is missing');
if (!css.includes('.logo-image-mode-original img')) fail('Original mode pixel-preserving CSS is missing');
if (!css.includes('mix-blend-mode:normal!important')) fail('Original mode must disable blend effects');

if (!js.includes('const MAX_LOGO_FILE_BYTES = 3 * 1024 * 1024')) fail('Logo upload limit must be exactly 3 MB');
if (!js.includes('file.size > MAX_LOGO_FILE_BYTES')) fail('Logo upload validation must use the 3 MB constant');
if (!html.includes('Kích thước tối đa 3 MB')) fail('Logo UI must state the 3 MB limit');

if (!html.includes('id="companyAddressDetail"') || !html.includes('id="companyProvince"') || !html.includes('id="companyWard"')) fail('Structured headquarters fields are missing');
if (html.includes('id="companyAddress"')) fail('Legacy one-line headquarters input must not remain visible');
if (!html.includes('id="pCompanyAddressDetail"') || !html.includes('id="pCompanyRegion"')) fail('Two-line headquarters preview is missing');
if (!js.includes("adminLabel('Phường'") || !js.includes("adminLabel('Tỉnh'")) fail('Headquarters region must render Ward before Province');
if (!html.includes('Xóa nền (tạo PNG trong suốt)')) fail('Remove-background UI does not describe actual deletion');
if (!js.includes('normalizeRemoveBgTolerance')) fail('Background deletion tolerance normalization is missing');
if (!js.includes('removeBackgroundDataUrl')) fail('Connected background deletion is not wired into logo rendering');
if (!html.includes('min="8" max="140"')) fail('Background deletion tolerance control is missing');

if (!html.includes('id="tableFontSize"') || !html.includes('id="designTableFontSize"')) fail('Adjustable table-font controls are missing');
if (html.includes('id="docFontSize"') || html.includes('id="designFontSize"') || html.includes('id="previewTitleSize"')) fail('Outside-table font-size controls must be removed');
if (!js.includes("tableFontSize: 9")) fail('Table font-size state default is missing');
if (!js.includes("paper.style.setProperty('--fs-table'")) fail('Table font size is not wired to product table');
if (!js.includes("['--fs-company-name', '15.2px']")) fail('Fixed company-name typography is missing');
if (!js.includes("paper.style.setProperty('--preview-title-size', '27px')")) fail('Fixed title typography is missing');
if (!css.includes('.paper .qtitle{font-size:27px!important}')) fail('Fixed outside-table title CSS is missing');
if (!html.includes('Chỉ thay đổi chữ trong bảng hàng hóa')) fail('Table-only font sizing help is missing');

if (!html.includes('id="deviceProfileChip"')) fail('Device profile chip is missing');
if (!js.includes("startDeviceProfileRuntime")) fail('Device classification runtime is not started');
if (!fs.existsSync('src/device-profile.js')) fail('Device profile module is missing');
if (!fs.existsSync('public/management-contract.json')) fail('Application Management contract is missing');
const managementContract = JSON.parse(fs.readFileSync('public/management-contract.json','utf8'));
if (managementContract.application?.category !== 'Kế toán') fail('PriceReport must be classified as Kế toán');
if (managementContract.device?.namespace !== 'KT-') fail('Accounting device namespace must be KT-');
if (managementContract.policy?.remoteAdminReady !== false) fail('Checked-in source contract must remain rollout-off before production materialization');
if (!deviceProfileJs.includes('resolveRemoteAdminReady')) fail('Runtime management readiness resolver is missing');
if (!deviceProfileJs.includes("MANAGEMENT_CONTRACT_URL = './management-contract.json'")) fail('Runtime must read the deployed management contract');
if (!deviceProfileJs.includes("cache: 'no-store'")) fail('Runtime management readiness must bypass stale HTTP caches');
if (!deviceProfileJs.includes('refreshManagementReadiness')) fail('Runtime management readiness refresh API is missing');
if (!deviceProfileJs.includes("'pricereport:management-readiness'")) fail('Runtime management readiness event is missing');
if (deviceProfileJs.includes('remoteAdminReady: false,\n    getDeviceProfile')) fail('Legacy hard-coded remoteAdminReady runtime block remains');
if (!deviceProfileJs.includes('deviceGateOwnsDeviceChip')) fail('Device Gate chip ownership guard is missing');
if (!deviceProfileJs.includes('priceReportDeviceAccess')) fail('Profile runtime must respect Device Gate access state before updating the device chip');

if (!js.includes('startPriceReportDeviceAccess')) fail('KT Device Gate runtime is not started');
if (!fs.existsSync('src/device-access-gate.js')) fail('KT Device Gate module is missing');
if (!fs.existsSync('public/device-control.json')) fail('KT device-control rollout config is missing');
const ktControlConfig = JSON.parse(fs.readFileSync('public/device-control.json','utf8'));
if (ktControlConfig.enabled !== false) fail('KT Device Gate must remain rollout-off until live control read-back passes');
if (!fs.existsSync('control-service/src/index.ts') || !fs.existsSync('control-service/src/device-store.ts')) fail('KT Control Service source is missing');
if (!fs.existsSync('control-service/migrations/0001_device_control.sql')) fail('KT Control D1 migration is missing');


if (!fs.existsSync('scripts/production-config.mjs')) fail('Production rollout materializer is missing');
const pagesWorkflow = fs.readFileSync('.github/workflows/pages.yml','utf8');
if (!pagesWorkflow.includes('node scripts/production-config.mjs')) fail('Pages deploy must materialize verified production control config');
if (!pagesWorkflow.includes('PRICE_REPORT_CONTROL_ORIGIN')) fail('Pages deploy is missing KT control origin binding');


const deployControlWorkflow = fs.readFileSync('.github/workflows/deploy-control-service.yml','utf8');
if (!pagesWorkflow.includes('control_origin:')) fail('Pages workflow must accept explicit KT control-origin handoff');
if (!pagesWorkflow.includes("inputs.control_origin || vars.PRICE_REPORT_CONTROL_ORIGIN")) fail('Pages workflow must prefer the forwarded KT control origin');
if (!deployControlWorkflow.includes('-f control_origin="$PRICE_REPORT_CONTROL_ORIGIN"')) fail('KT deploy workflow must forward its verified environment-scoped origin to Pages');

if (!html.includes('id="pane-dashboard"')) fail('V4 dashboard workspace is missing');
if (!html.includes('data-tab="dashboard"')) fail('V4 application home navigation is missing');
if (!html.includes('id="dashboardSearch"')) fail('V4 dashboard search is missing');
if (!html.includes('id="dashRecentQuotes"')) fail('V4 recent quotation workspace is missing');
if (!js.includes("['dashboard', 'history', 'master', 'system', 'settings', 'export'].includes(tab)")) fail('Application workspace routing is missing');
if (!js.includes('function renderDashboard()')) fail('Dashboard data renderer is missing');
if (!js.includes("const initialAppPage = getAppPreferences().startPage")) fail('Application startup routing preference is missing');
if (!css.includes('.shell.app-workspace')) fail('Application workspace shell styles are missing');
if (!appCss.includes('.dashboard-main-grid')) fail('Dashboard responsive grid is missing');

if (!html.includes('id="mobileMoreToggle"') || !html.includes('id="mobileMoreMenu"')) fail('V4.1 compact mobile navigation is missing');
if (!js.includes('function setMobileMoreMenu(open, { restoreFocus = false } = {})')) fail('V5 mobile navigation focus controller is missing');
if (!js.includes("row.addEventListener('click', () => loadQuoteRecord(record))")) fail('Recent dashboard quotation must open the selected record directly');
if (!appCss.includes('.mobile-more-grid')) fail('Mobile action sheet styles are missing');

if (!html.includes('data-create-quote')) fail('V4.2 dashboard must expose a true create-new-quotation action');
if (!js.includes("document.querySelectorAll('[data-create-quote]')")) fail('V4.2 create-new-quotation actions are not wired');
if (!js.includes('function openMasterSection(section)')) fail('V4.2 focused master-data navigation is missing');
if (!html.includes('id="customerLibraryCard"') || !html.includes('id="productCatalogCard"')) fail('V4.2 master-data section targets are missing');
if (!v5Css.includes('.master-section-card.master-section-highlight')) fail('Master-data focus feedback is missing from V5 UI');

if (!html.includes('id="historyPendingCount"') || !html.includes('id="historyResultCount"')) fail('V4.3 quotation management counters are missing');
if (!html.includes('class="history-table-head"')) fail('V4.3 quotation management table header is missing');
if (!js.includes("row.className = 'history-item history-table-row'")) fail('V4.3 quotation management row renderer is missing');
if (!appCss.includes('.history-workspace-header') || !appCss.includes('.history-table-row')) fail('Quotation management workspace styles are missing');

if (!html.includes('id="customerLibraryCount"') || !html.includes('id="productCatalogCount"')) fail('V4.4 master-data totals are missing');
if (!html.includes('id="customerLibraryResultCount"') || !html.includes('id="productCatalogResultCount"')) fail('V4.4 master-data filter counters are missing');
if (!html.includes('class="master-table-head customer-table-grid"') || !html.includes('class="master-table-head product-table-grid"')) fail('V4.4 master-data table headers are missing');
if (!js.includes("row.className = 'master-item master-table-row customer-table-grid'")) fail('V4.4 customer table renderer is missing');
if (!js.includes("row.className = 'master-item master-table-row product-table-grid'")) fail('V4.4 product table renderer is missing');
if (!appCss.includes('.master-workspace-header') || !appCss.includes('.master-table-row')) fail('Master-data workspace styles are missing');

if (!html.includes('id="studioBackHome"') || !html.includes('id="contentLibraryHome"') || !html.includes('class="editor content-library"')) fail('V5.9 quotation Studio content library is missing');
if (!js.includes("function syncStudioContext(tab = '')")) fail('Studio context synchronizer is missing');
if (!js.includes('function openContentBlock(block)') || !js.includes('function showContentLibraryHome')) fail('V5.9 content-library controller is missing');
if (!js.includes('function openStudioCommandPalette') || !js.includes('function applyTheme')) fail('V5.9 shared Studio command/theme controllers are missing');
if (!studioCss.includes('.content-library-home') || !studioCss.includes('.studio-topbar') || !studioCss.includes('.inspector-section')) fail('V5.9 Studio pixel-lock styling is missing');

if (!html.includes('id="dashboardSearchResults"') || !html.includes('dashboard-search-wrap')) fail('V4.6 dashboard global-search result surface is missing');
if (!js.includes('function renderDashboardSearchResults(rawQuery)')) fail('V4.6 global-search renderer is missing');
if (!js.includes("type: 'quote'") || !js.includes("type: 'customer'") || !js.includes("type: 'product'")) fail('V4.6 global search must cover quotes, customers and products');
if (!appCss.includes('.dashboard-search-result') || !appCss.includes('.dashboard-search-results')) fail('Global-search styles are missing');

if (!html.includes('id="pane-export"') || !html.includes('export-workspace') || !html.includes('id="exportCenterHealth"')) fail('Publishing center workspace is missing');
if (!html.includes('id="exportBackupHistoryCount"') || !html.includes('id="exportBackupCustomerCount"') || !html.includes('id="exportBackupProductCount"')) fail('V4.7 backup scope counters are missing');
if (!js.includes("['dashboard', 'history', 'master', 'system', 'settings', 'export'].includes(tab)")) fail('V4.7+ export/settings must use full-width application workspace');
if (!js.includes('function renderExportCenter()')) fail('V4.7 export-center renderer is missing');
if (!v5Css.includes('.export-center-grid') || !css.includes('.shell.app-workspace .preview{display:block!important}')) fail('Publishing center or report-layer print safeguard is missing');

if (!html.includes('data-tab="system"') || !html.includes('id="pane-system"')) fail('V4.8 Device & System workspace is missing');
if (!html.includes('id="systemLocalDeviceCode"') || !html.includes('id="systemRegistryDeviceCode"')) fail('V4.8 must distinguish local and registry device codes');
if (!html.includes('id="systemBoundaryQuote"') || !html.includes('id="systemBoundaryCustomer"') || !html.includes('id="systemBoundaryPrivateKey"')) fail('V4.8 data-boundary indicators are missing');
if (!js.includes('function renderSystemWorkspace()') || !js.includes('function refreshSystemWorkspace()')) fail('V4.8 system runtime renderer/refresh is missing');
if (!js.includes("window.addEventListener('pricereport:device-access'")) fail('V4.8 must react to live Device Gate events');
if (!appCss.includes('.system-workspace-header') || !appCss.includes('.system-status-grid')) fail('System workspace styles are missing');

if (!html.includes('data-tab="settings"') || !html.includes('id="pane-settings"')) fail('V4.9 application settings workspace is missing');
if (!html.includes('id="settingsStartPage"') || !html.includes('id="settingsAutoPcSave"') || !html.includes('id="settingsResetUi"')) fail('V4.9 core settings controls are missing');
if (!js.includes('function getAppPreferences()') || !js.includes('function renderSettingsWorkspace()')) fail('V4.9 settings preference runtime is missing');
if (!js.includes("['dashboard', 'history', 'master', 'system', 'settings', 'export'].includes(tab)")) fail('V4.9 settings must use full-width application workspace');
if (!appCss.includes('.settings-workspace-header') || !appCss.includes('.management-compact .history-table-row')) fail('Settings workspace or compact-management styles are missing');

if (!js.includes("const initialAppPage = getAppPreferences().startPage")) fail('V4.9 start-page preference is not applied during boot');
if (!js.includes("if (getAppPreferences().autoPcSave)")) fail('V4.9 PC autosave preference is not enforced');
if (!v5Css.includes('.nav button[data-tab="settings"]')) fail('Mobile settings navigation rule is missing from V5 UI');

const legacyStyleLink = '<link rel="stylesheet" href="./src/styles.css">';
const v5StyleLink = '<link rel="stylesheet" href="./src/ui-v5.css">';
if (!html.includes(legacyStyleLink) || !html.includes(v5StyleLink)) fail('Source HTML must load both application stylesheets directly');
if (html.indexOf(legacyStyleLink) > html.indexOf(v5StyleLink)) fail('V5 stylesheet must load after legacy stylesheet');
if (js.includes("import './styles.css';") || js.includes("import './ui-v5.css';")) fail('Stylesheet ownership must stay in HTML so raw/static source hosting cannot render unstyled');
if (!/<body class="[^"]*\bv5-ui\b[^"]*">/.test(html)) fail('V5 UI scope is missing from body');

for (const primitive of ['app-workspace-pane','app-workspace-header','app-surface-panel','app-status-card','app-data-table']) {
  if (!html.includes(primitive)) fail('V5 shared UI primitive missing from markup: ' + primitive);
}

if (!html.includes('role="combobox"') || !html.includes('role="listbox"')) fail('V5 global-search accessibility semantics are missing');
if (!js.includes("event.key === 'ArrowDown' || event.key === 'ArrowUp'")) fail('V5 global-search keyboard navigation is missing');
if (!html.includes('id="mobileMoreMenu" role="dialog"')) fail('V5 mobile More dialog semantics are missing');
if (!js.includes('mobileMoreFocusable()')) fail('V5 mobile More focus trap is missing');

for (const studioPane of ['general','customer','products','payment','terms','design','presets']) {
  if (!html.includes('class="pane studio-pane studio-pane-' + studioPane + '" id="pane-' + studioPane + '"')) {
    fail('V5 Pass 18 studio pane scope missing: ' + studioPane);
  }
}
if ((html.match(/data-content-block=/g) || []).length < 14) fail('V5.9 content navigation must expose seven blocks in both library and inspector');
for (const block of ['general','customer','products','payment','terms','signature','custom-text']) {
  if (!html.includes('data-content-block="' + block + '"')) fail('V5.9 content library is missing block: ' + block);
}
if (!js.includes('function productHasDraftContent')) fail('V5.1 meaningful-product guard is missing');
if (!js.includes("historyMode === 'dirty'")) fail('V5.1 dirty history status is missing');
if (!js.includes("Dòng sản phẩm ' + (index + 1) + ' đã có dữ liệu nhưng chưa có tên.")) fail('V5.1 unnamed meaningful-product validation is missing');
if (!v5Css.includes('Shared Studio form / health utilities')) fail('Shared Studio form/health utilities are missing');

if (!v5Css.includes('Pass 18: unified Studio surfaces')) fail('V5 shared Studio primitives are missing');
if (!html.includes('reference-ui-v59')) fail('V5.9 unified shell UI scope is missing');
if (!html.includes('href="./src/studio-v59.css"')) fail('V5.9 unified shell stylesheet is not loaded');
if (!html.includes('data-shell-workspace-only') || !html.includes('data-shell-quote-only')) fail('V5.9 unified topbar shell mode markers are missing');
if (!studioCss.includes('.shell.app-workspace>.studio-topbar') || !js.includes('WORKSPACE_SHELL_META')) fail('V5.9 management views do not share the main topbar shell');
if (!studioCss.includes('--studio-header-h:72px') || !studioCss.includes('--studio-rail-w:118px') || !studioCss.includes('--studio-left-w:320px') || !studioCss.includes('--studio-right-w:384px')) fail('V5.9 canonical Studio geometry is missing');
if (!html.includes('data-inspector-tab="content"') || !html.includes('data-inspector-tab="check"')) fail('V5.9 inspector tabs are missing');
if (!js.includes('setDesignInspectorTab') || !js.includes('renderInspectorCheckSummary')) fail('V5.9 inspector controllers are missing');
if (!html.includes('class="studio-topbar"') || !js.includes('studioGlobalSave')) fail('V5.9 single Studio topbar is not wired');
if (html.includes('class="studio-stepper"') || html.includes('class="studio-commandbar"')) fail('V5.7 visible Studio workflow chrome returned');
if (!js.includes('const targetPaperWidth = Math.min(706, available)')) fail('V5.9 canonical A4 fit target is missing');
if (html.includes('class="btns" style="margin-top:8px"')) fail('Legacy inline Studio spacing returned');

if (/class="color"[^>]*style=/.test(html)) fail('V5 Pass 18 color swatches must not use inline presentation');
if (/id="pCustomer"[^>]*style=/.test(html)) fail('V5 Pass 18 report customer meta must not use inline presentation');
if (!v5Css.includes('.color.color-teal') || !css.includes('.report-customer-meta')) fail('V5 Pass 18 inline-style ownership migration is incomplete');

if (!js.includes('parseCustomerSpreadsheetRows')) fail('Data Library customer import parser is not wired');
if (!js.includes('function resetDataLibraryImportReviewForLoading')) fail('V5.5 Data Library stale-review reset is missing');
if (!js.includes('dataLibraryImportReadToken')) fail('V5.5 Data Library stale-read cancellation token is missing');
if (!js.includes('function offerDataLibraryImportRecovery')) fail('V5.5 Data Library import recovery prompt is missing');
if (!js.includes('function writeDataLibraryImportRecovery') || !js.includes('function readDataLibraryImportRecovery')) fail('V5.5 Data Library import recovery persistence is missing');
if (!js.includes('DATA_LIBRARY_IMPORT_RECOVERY_MAX_CHARS')) fail('V5.5 Data Library import recovery size guard is missing');
if (!html.includes("const recoveryKey = 'tgb-style-recovery-v5'") || !html.includes('asset-recovery')) fail('Production style self-recovery bootstrap is missing');
if (!js.includes("updateViaCache: 'none'")) fail('Service worker update must bypass stale HTTP cache');
if (!html.includes('id="dataLibraryImportIssues"') || !html.includes('id="dataLibraryImportIssueList"')) fail('V5.5 Data Library decision review panel is missing');
if (!js.includes('function dataLibraryImportReviewState') || !js.includes('function chooseDataLibraryImportDuplicate')) fail('V5.5 explicit duplicate review decision flow is missing');
if (!js.includes('function ignoreDataLibraryImportInvalidRow')) fail('V5.5 invalid-row acknowledgement flow is missing');
if (!html.includes('id="dataLibraryImportNextIssue"') || !html.includes('id="dataLibraryImportShowResolved"')) fail('V5.5 large-review navigation controls are missing');
if (!js.includes('function focusNextDataLibraryImportIssue')) fail('V5.5 next unresolved import issue navigation is missing');
if (!html.includes('id="dataLibraryImportCompletion"') || !html.includes('id="dataLibraryImportCompletionTitle"')) fail('V5.5 review completion status is missing');
if (!js.includes('function focusInitialDataLibraryImportReview') || !js.includes('function trapDataLibraryImportTab')) fail('V5.5 keyboard-only review safeguards are missing');
if (!js.includes("apply.dataset.reviewState = 'warning'") || !js.includes("apply.dataset.reviewState = 'ready'")) fail('V5.5 Apply review-state messaging is missing');
if (!js.includes('dataset.reviewUnresolved') || !js.includes('dataset.reviewResolved')) fail('V5.5 resolved/unresolved review state rendering is missing');
if (!js.includes('function offerDataLibraryUndo')) fail('V5.5 Data Library undo helper is missing');
if (!js.includes("label: 'Hoàn tác'") || !js.includes('duration: 8000')) fail('V5.5 Data Library undo action contract is missing');
if (!js.includes('DATA_LIBRARY_IMPORT_RECOVERY_TTL_MS') || !js.includes('now - savedAt > DATA_LIBRARY_IMPORT_RECOVERY_TTL_MS')) fail('V5.5 recovery expiration cleanup is missing');
if (!html.includes('id="dataLibraryActivity"') || !html.includes('id="dataLibraryActivityList"')) fail('V5.5 session operation history surface is missing');
if (!js.includes('function recordDataLibraryOperation') || !js.includes("'undo-available'") || !js.includes("'undone'")) fail('V5.5 operator-visible mutation state tracking is missing');
if (!js.includes('Có thể hoàn tác trong 8 giây')) fail('V5.5 undo window must be explicit to the operator');
