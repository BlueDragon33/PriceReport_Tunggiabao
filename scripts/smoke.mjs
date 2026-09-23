import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('src/main.js', 'utf8');
const css = fs.readFileSync('src/styles.css', 'utf8');
const v5Css = fs.readFileSync('src/ui-v5.css', 'utf8');
const appCss = css + '\n' + v5Css;
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
  'paper','paperWrap','qHead','qBody','summary',
  'companyName','customerName','productDataGridBody','addProductGrid','productExcelInput','exportJson','importJson',
  'exportAllData','importAllData','quoteStatus','quoteStatusFilter',
  'designPanel','paymentPrint','pSlogan','pageEstimate',
  'customerLibraryList','productCatalogList','saveCurrentCustomer','saveCurrentProducts',
  'quickCustomerName','designShowStt','designShowPrice','designShowAmount','designShowTotals',
  'wideView','zoomOut','zoomIn','toolbarMenu',
  'studioV6Commandbar','studioUndo','studioRedo','studioV6Save','studioV6Check','studioV6Preview','logoDesignPreview','logoWidthRange',
  'logoWidthDesign','logoPadding','logoOffsetX','logoOffsetY','logoShrink','logoGrow','logoTreatment','resetLogoPosition',
  'logoBlendMode','logoBackdropColor','logoBackdropOpacity','logoBackdropRadius',
  'logoBackdropBorder','toggleEditorPanel','toggleDesignPanel','templateDescription',
  'customizePreview','previewCustomizer','closePreviewCustomizer',
  'previewSpacing','previewTableDensity','previewHeaderGap','previewMetaWidth',
  'previewLineHeight','resetPreviewLayout','showQuoteMeta','layoutEditToggle','autoArrangeLayoutToolbar','autoArrangeLayoutPanel','layoutSelection','resetBlockPositions',
  'historyAcceptedCount','documentHealth','preflightCheck','preflightExport','qCols',
  'openSmartImport','smartImportModal','excelSmartImportInput','handwritingSmartImportInput',
  'smartImportReview','smartImportProgress','applySmartImport','cancelSmartImport','ocrRawText','reparseOcrText',
  'showPack','showQty','quoteSubtitle','pQuoteSubtitle','resetSmartImport',
  'studioInspectorContent','studioInspectorCheck','commandPaletteModal',
  'quickShowCustomer','studioSubtotal','studioGrandTotal'
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

for (const file of ['public/manifest.webmanifest','public/sw.js','src/styles.css','src/ui-v5.css','src/main.js']) {
  if (!fs.existsSync(file)) fail('Missing required file: ' + file);
}

if (!js.includes("serviceWorker.register('./sw.js')")) fail('Service worker registration is missing');
if (!js.includes('window.print()')) fail('Print/PDF action is missing');
if (!js.includes('schemaVersion: 4')) fail('Full backup schema v4 is missing');
if (!js.includes('generateUniqueQuoteNo')) fail('Unique quote number generator is missing');
if (!js.includes('STATUS_LABELS')) fail('Quote lifecycle status mapping is missing');
if (!js.includes('updatePageEstimate')) fail('A4 page estimation logic is missing');
if (!js.includes('getCustomerLibrary')) fail('Customer master-data library is missing');
if (!js.includes('getProductCatalog')) fail('Product catalog is missing');
if (!js.includes('function safeStore')) fail('Safe local-storage wrapper is missing');
if (!js.includes('const MAX_LOGO_FILE_BYTES = 3 * 1024 * 1024')) fail('3 MB logo storage guard is missing');
if (!sw.includes("pricereport-shell-v60-studio-rc1")) fail('Service-worker cache version was not upgraded for V6 Studio release candidate');
if (!sw.includes("event.request.mode === 'navigate'")) fail('Navigation network-first strategy is missing');
if (!sw.includes('precacheLinkedAssets')) fail('First-load linked asset precache is missing');
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
if (!js.includes("data-entry-mode") || !v5Css.includes('.shell.data-entry-mode')) fail('V6 expanded product data-entry mode is missing');
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
if (!js.includes('function renderProductDataGrid()')) fail('Large product-set V6 grid renderer is missing');
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
if (!html.includes('id="studioV6Preview"') || !js.includes("openTab('view')")) fail('V6 Studio preview command is missing');
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

const primaryNavTabs = [...html.matchAll(/<button[^>]*data-tab="([^"]+)"/g)].map(match => match[1]);
for (const tab of ['dashboard','general','history','master','export','settings']) {
  if (!primaryNavTabs.includes(tab)) fail('V6 primary navigation missing module: ' + tab);
}
for (const removedTab of ['customer','products','payment','terms','design','view','presets','system']) {
  if (primaryNavTabs.includes(removedTab)) fail('V6 primary navigation must not expose Studio submodule: ' + removedTab);
}
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

if (!html.includes('id="studioBackHome"') || !html.includes('id="studioQuoteLabel"') || !html.includes('class="studio-stepper"')) fail('V4.5 quotation studio context header is missing');
if (!js.includes('function syncStudioContext(tab')) fail('V4.5 studio context synchronizer is missing');
if (!js.includes("document.querySelectorAll('[data-studio-step]')")) fail('V4.5 studio step navigation is not wired');
if (!v5Css.includes('.studio-context-row') || !v5Css.includes('.studio-stepper button.active')) fail('Quotation studio context styles are missing from V5 UI');

if (!html.includes('id="dashboardSearchResults"') || !html.includes('dashboard-search-wrap')) fail('V4.6 dashboard global-search result surface is missing');
if (!js.includes('function renderDashboardSearchResults(rawQuery)')) fail('V4.6 global-search renderer is missing');
if (!js.includes("type: 'quote'") || !js.includes("type: 'customer'") || !js.includes("type: 'product'")) fail('V4.6 global search must cover quotes, customers and products');
if (!appCss.includes('.dashboard-search-result') || !appCss.includes('.dashboard-search-results')) fail('Global-search styles are missing');

if (!html.includes('id="pane-export"') || !html.includes('export-workspace') || !html.includes('id="exportCenterHealth"')) fail('Publishing center workspace is missing');
if (!html.includes('id="exportBackupHistoryCount"') || !html.includes('id="exportBackupCustomerCount"') || !html.includes('id="exportBackupProductCount"')) fail('V4.7 backup scope counters are missing');
if (!js.includes("['dashboard', 'history', 'master', 'system', 'settings', 'export'].includes(tab)")) fail('V4.7+ export/settings must use full-width application workspace');
if (!js.includes('function renderExportCenter()')) fail('V4.7 export-center renderer is missing');
if (!v5Css.includes('.export-center-grid') || !css.includes('.shell.app-workspace .preview{display:block!important}')) fail('Publishing center or report-layer print safeguard is missing');

if (!html.includes('data-open-tab="system"') || !html.includes('id="pane-system"')) fail('Device & System workspace must remain reachable from settings/system actions');
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

if (!js.includes("import './ui-v5.css';")) fail('V5 application stylesheet is not loaded after legacy CSS');
if (!html.includes('<body class="v5-ui">')) fail('V5 UI scope is missing from body');

for (const primitive of ['app-workspace-pane','app-workspace-header','app-surface-panel','app-status-card','app-data-table']) {
  if (!html.includes(primitive)) fail('V5 shared UI primitive missing from markup: ' + primitive);
}

if (!html.includes('role="combobox"') || !html.includes('role="listbox"')) fail('V5 global-search accessibility semantics are missing');
if (!js.includes("event.key === 'ArrowDown' || event.key === 'ArrowUp'")) fail('V5 global-search keyboard navigation is missing');
if (!html.includes('id="commandPaletteModal"') || !html.includes('id="commandPaletteInput"')) fail('V6 command palette surface is missing');
if (!js.includes("event.key.toLowerCase() === 'k'")) fail('V6 Ctrl/Cmd+K command palette shortcut is missing');

for (const studioPane of ['general','customer','products','payment','terms','design','presets']) {
  if (!html.includes('class="pane studio-pane studio-pane-' + studioPane + '" id="pane-' + studioPane + '"')) {
    fail('V5 Pass 18 studio pane scope missing: ' + studioPane);
  }
}
if (!js.includes('function productHasDraftContent')) fail('V5.1 meaningful-product guard is missing');
if (!js.includes("historyMode === 'dirty'")) fail('V5.1 dirty history status is missing');
if (!js.includes("Dòng sản phẩm ' + (index + 1) + ' đã có dữ liệu nhưng chưa có tên.")) fail('V5.1 unnamed meaningful-product validation is missing');
if (!v5Css.includes('V6 Quotation Studio + Data Entry')) fail('V6 quotation studio styles are missing');

if (!v5Css.includes('Pass 18: unified Studio surfaces')) fail('V5 Pass 18 Studio consolidation styles are missing');

for (const id of ['studioV6Commandbar','studioBlockSearch','productDataGridBody','productExcelInput','studioInspectorContent','studioInspectorCheck','studioUndo','studioRedo']) {
  if (!html.includes('id="' + id + '"')) fail('V6 Studio required surface missing: #' + id);
}
if ((html.match(/data-studio-block=/g) || []).length !== 6) fail('V6 Studio left block library must expose exactly six core content blocks');
if ((html.match(/data-inspector-tab=/g) || []).length !== 3) fail('V6 Inspector must expose Design / Content / Check');
for (const logic of ['function renderProductDataGrid()','function rowsToProducts(rows)','function normalizeGridNumber(value)','function chooseWorkbookSheet(sheetNames)','function undoQuoteChange()','function redoQuoteChange()','function renderStudioCheckPanel()']) {
  if (!js.includes(logic)) fail('V6 Studio logic missing: ' + logic);
}
if (js.includes('window.prompt(')) fail('V6 data entry must not use prompt() for ordinary import flow');
if (!js.includes("clipboardData?.getData('text/plain')")) fail('V6 Smart Paste clipboard path is missing');
if (!v5Css.includes('.product-grid-row') || !v5Css.includes('.studio-inspector-tabs')) fail('V6 grid/inspector styling is missing');
if (html.includes('class="btns" style="margin-top:8px"')) fail('Legacy inline Studio spacing returned');

if (/class="color"[^>]*style=/.test(html)) fail('V5 Pass 18 color swatches must not use inline presentation');
if (/id="pCustomer"[^>]*style=/.test(html)) fail('V5 Pass 18 report customer meta must not use inline presentation');
if (!v5Css.includes('.color.color-teal') || !css.includes('.report-customer-meta')) fail('V5 Pass 18 inline-style ownership migration is incomplete');
