import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('src/main.js', 'utf8');
const css = fs.readFileSync('src/styles.css', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');

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
  'quickCustomerName','designShowStt','designShowPrice','designShowAmount','designShowTotals',
  'wideView','zoomOut','zoomIn','toolbarMenu',
  'productFocusToggle','collapseAllProducts','logoDesignPreview','logoWidthRange',
  'logoWidthDesign','logoPadding','logoOffsetX','logoOffsetY','logoShrink','logoGrow','logoTreatment','resetLogoPosition',
  'logoBlendMode','logoBackdropColor','logoBackdropOpacity','logoBackdropRadius',
  'logoBackdropBorder','toggleEditorPanel','toggleDesignPanel','templateDescription',
  'customizePreview','previewCustomizer','closePreviewCustomizer','previewTitleSize',
  'previewSpacing','previewTableDensity','previewHeaderGap','previewMetaWidth',
  'previewLineHeight','resetPreviewLayout','showQuoteMeta','layoutEditToggle','autoArrangeLayoutToolbar','autoArrangeLayoutPanel','layoutSelection','resetBlockPositions',
  'historyAcceptedCount','documentHealth','preflightCheck','preflightExport','qCols',
  'openSmartImport','smartImportModal','excelSmartImportInput','handwritingSmartImportInput',
  'smartImportReview','smartImportProgress','applySmartImport','cancelSmartImport','ocrRawText','reparseOcrText',
  'showPack','showQty','quoteSubtitle','pQuoteSubtitle'
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

for (const file of ['public/manifest.webmanifest','public/sw.js','src/styles.css','src/main.js']) {
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
if (!js.includes('file.size > 1500000')) fail('Logo storage guard is missing');
if (!sw.includes("pricereport-shell-v16")) fail('Service-worker cache version was not upgraded');
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
if (!js.includes("product-focus")) fail('Comfortable product focus mode is missing');
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
if (!css.includes(".preview-customizer")) fail('Preview customizer styles are missing');
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
if (!css.includes('.smart-import-dialog')) fail('Smart import dialog styling is missing');
if (!css.includes('.qgroup-row td')) fail('Grouped product row styling is missing');
