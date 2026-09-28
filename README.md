## Trạng thái hiện tại — V6.53 Quote Flow Ownership

V6.53 tiếp tục U4 theo UI/UX Constitution: sửa ownership Quote Flow xuyên cả base, touch baseline và phone refinement.

- Base Quote Flow: 9.5px label và 34px review button không còn dùng `!important`.
- `responsive-v69.css`: touch padding 8px và min-height 40px chuyển về normal cascade.
- `responsive-v610.css`: **22 → 18 `!important`**; phone refinement 5px / 88px / 10px / 36px dùng normal cascade.
- Package: **6.53.0**.
- PWA cache: **pricereport-shell-v653-quote-flow-ownership**.

## Trạng thái hiện tại — V6.52 Phone Workspace Geometry

V6.52 tiếp tục U4 theo UI/UX Constitution: retire 4 `!important` low-risk khỏi geometry của Content/Product workspace trên phone.

- `responsive-v610.css`: **26 → 22 `!important`**.
- Dialog rows, header min-height và header padding dùng normal cascade.
- Selector/value không đổi; phone browser gates xác minh computed geometry.
- Package: **6.52.0**.
- PWA cache: **pricereport-shell-v652-phone-workspace-geometry**.

## Trạng thái hiện tại — V6.51 Tablet Editing Ownership

V6.51 tiếp tục U4 theo UI/UX Constitution bằng cách sửa ownership ở cả lớp baseline V6.9 và refinement V6.10.

- `responsive-v69.css`: **262 owner ceiling** sau khi 4 tablet baseline declarations chuyển về normal cascade.
- `responsive-v610.css`: **30 → 26 `!important`**.
- Portrait/compact-landscape vẫn editing-first; wide-tablet vẫn giữ split editor + preview.
- Tablet browser gates là authority cho computed layout.
- Package: **6.51.0**.
- PWA cache: **pricereport-shell-v651-tablet-editing-ownership**.

## Trạng thái hiện tại — V6.50 Narrow-phone Header Cascade

V6.50 tiếp tục U4 theo UI/UX Constitution: retire 4 `!important` low-risk trong refinement dành cho phone rất hẹp (≤370px).

- `responsive-v610.css`: **34 → 30 `!important`**.
- Header metadata hide, title max-width và kích thước action 36px dùng normal cascade.
- Viewport 360×800 là browser authority cho refinement này.
- Package: **6.50.0**.
- PWA cache: **pricereport-shell-v650-narrow-phone-cascade**.

## Trạng thái hiện tại — V6.49 Phone Utility Cascade

V6.49 tiếp tục U4 theo UI/UX Constitution: retire 7 `!important` low-risk khỏi các utility surface trên phone mà không đổi selector/value.

- `responsive-v610.css`: **41 → 34 `!important`**.
- Product overflow, Quote Review footer và management horizontal scrolling chuyển sang normal cascade.
- Phone browser gates tiếp tục xác minh computed layout và khả năng thao tác.
- Package: **6.49.0**.
- PWA cache: **pricereport-shell-v649-phone-utility-cascade**.

## Trạng thái hiện tại — V6.48 Phone More-sheet Cascade

V6.48 tiếp tục U4 theo UI/UX Constitution: retire 6 `!important` low-risk khỏi geometry của menu More trên phone.

- `responsive-v610.css`: **47 → 41 `!important`**.
- Left/right/bottom/padding và button sizing dùng normal cascade.
- Phone browser gates tiếp tục xác minh hành vi một tay và vị trí sheet.
- Package: **6.48.0**.
- PWA cache: **pricereport-shell-v648-phone-more-sheet-cascade**.

## Trạng thái hiện tại — V6.47 Tablet Layout Cascade

V6.47 tiếp tục U4 theo UI/UX Constitution: retire 5 `!important` low-risk khỏi layout tablet khi không có competing important owner.

- `responsive-v610.css`: **52 → 47 `!important`**.
- Editor border, Content Block grid, Template grid và management grids dùng normal cascade.
- Tablet browser gates tiếp tục xác minh computed layout.
- Package: **6.47.0**.
- PWA cache: **pricereport-shell-v647-tablet-layout-cascade**.

## Trạng thái hiện tại — V6.46 Phone Quote Flow Cascade

V6.46 tiếp tục U4 theo UI/UX Constitution: retire 9 `!important` low-risk khỏi Quote Flow phone mà không đổi selector/value.

- `responsive-v610.css`: **61 → 52 `!important`**.
- Step list/button/marker chủ yếu dùng normal cascade; giữ `font-size:10px!important` cho label vì browser gate chứng minh base 9.5px vẫn là important owner.
- Giữ lại các flag còn cần để thắng owner V6.9 quan trọng.
- Regression guard khóa ownership mới.
- Package: **6.46.0**.
- PWA cache: **pricereport-shell-v646-phone-quote-flow-cascade**.

## Trạng thái hiện tại — V6.45 Phone Workspace Spacing Cascade

V6.45 tiếp tục U4 theo UI/UX Constitution: giảm thêm responsive `!important` ở spacing an toàn mà không đổi selector/value.

- `responsive-v610.css`: **66 → 61 `!important`**.
- Phone workspace body/main/row spacing dùng normal cascade.
- Không đụng các card/heading còn phụ thuộc owner cũ có `!important`.
- Regression guard khóa ownership mới.
- Package: **6.45.0**.
- PWA cache: **pricereport-shell-v645-phone-workspace-spacing-cascade**.

## Trạng thái hiện tại — V6.44 Phone Workspace Header Cascade

V6.44 tiếp tục U4 theo UI/UX Constitution: chuyển thêm phone Content Workspace header/chrome khỏi `!important` sang normal cascade mà không đổi selector/value.

- `responsive-v610.css`: **74 → 66 `!important`**.
- Icon, heading và toolbar trên phone dùng cascade bình thường.
- Regression guard khóa ownership mới.
- Không thay đổi business logic, report, print/PDF hay storage.
- Package: **6.44.0**.
- PWA cache: **pricereport-shell-v644-phone-workspace-header-cascade**.

## Trạng thái hiện tại — V6.43 Touch Chrome Cascade Ownership

V6.43 tiếp tục U4 theo UI/UX Constitution: chuyển thêm touch chrome khỏi `!important` sang normal cascade mà không đổi selector/value.

- `responsive-v610.css`: **80 → 74 `!important`**.
- Content Library, Content Workspace width-control và phone Studio header dùng cascade bình thường.
- Regression guard khóa ownership mới.
- Không thay đổi business logic, report, print/PDF hay storage.
- Package: **6.43.0**.
- PWA cache: **pricereport-shell-v643-touch-chrome-cascade**.

## Trạng thái hiện tại — V6.40 Phone Navigation Cascade Ownership

V6.40 tiếp tục Phase U4 theo UI/UX Constitution: chuyển bottom navigation trên phone khỏi mô hình override `!important` chồng lớp sang ownership bằng cascade bình thường.

- `responsive-v69.css`: **269 → 266 `!important`**.
- `responsive-v610.css`: **101 → 95 `!important`**.
- Giữ nguyên safe-area padding, touch height, radius, label/glyph size và hành vi navigation.
- Regression guard khóa cả baseline V6.9 và refinement V6.10.
- Không thay đổi business logic, report, print/PDF hay storage.
- Package: **6.40.0**.
- PWA cache: **pricereport-shell-v640-phone-nav-cascade-ownership**.

## Trạng thái hiện tại — V6.38 Touch Surface Important Retirement

V6.38 tiếp tục Phase U4 theo UI/UX Constitution, retire thêm các `!important` low-risk ở touch card surfaces/borders/shadows mà không thay đổi selector hay visual value.

- `responsive-v610.css`: **117 → 109 `!important`**.
- Content Completion, Quote Flow, Content Block và workspace shadow reset chuyển về normal cascade.
- Có regression guard ngăn các `!important` vừa retire quay lại.
- Không thay đổi business logic, report themes, print/PDF hay storage.
- Package: **6.38.0**.
- PWA cache: **pricereport-shell-v638-touch-surface-important-retirement**.

# PriceReport_Tunggiabao

WebApp local-first để tạo, quản lý, tái sử dụng và in bảng báo giá A4 cho Tùng Gia Bảo.

## Trạng thái hiện tại — V6.33 Phone Owner Retirement

V6.33 tiếp tục U4 theo UI/UX Constitution bằng audit có nhận biết media context, chỉ retire declaration V6.9 khi cùng selector/property đã có owner V6.10 trong cùng breakpoint phone.

- Retire 20 declaration V6.9.
- `responsive-v69.css`: 279 → 269 `!important`.
- Dòng CSS: 972 → 952.
- Không đổi giá trị V6.10 hiện hành.
- Package: **6.33.0**.
- PWA cache: **pricereport-shell-v633-phone-owner-retirement**.

## Trạng thái trước — V6.32 Phone Responsive Ownership

V6.32 tiếp tục U4 theo UI/UX Constitution: xóa thêm ownership phone V6.9 đã bị V6.10 supersede trong cùng breakpoint `max-width:599px`.

- `responsive-v69.css`: 292 → 279 `!important`.
- Dòng CSS: 1002 → 972.
- Giữ lại mọi property chưa được V6.10 thay thế.
- Browser viewport regression vẫn là authority xác nhận không đổi computed UI.
- Package: **6.32.0**.
- PWA cache: **pricereport-shell-v632-phone-responsive-ownership**.

## Trạng thái trước — V6.31 Responsive Toolbar Ownership

V6.31 tiếp tục Phase U4 theo UI/UX Constitution: chuyển ownership của Product Workspace touch toolbar hoàn toàn sang responsive-v610.css và xóa override cũ đã bị supersede ở V6.9.

- `responsive-v69.css`: 300 → 292 `!important`.
- Dòng CSS: 1012 → 1002.
- Không đổi computed toolbar behavior; V6.10 vẫn là active owner.
- Thêm regression ceiling chống responsive debt quay lại.
- Package: **6.31.0**.
- PWA cache: **pricereport-shell-v631-responsive-toolbar-ownership**.

## Trạng thái trước — V6.27 Surface & Navigation Components

V6.27 tiếp tục U3 theo Hiến pháp UI/UX: chuẩn hóa Panel/Card, Toolbar, Tabs, Overlay và Dialog trên component hiện có.

- Shared panel/card surface contract.
- Shared toolbar contract.
- Shared tab states.
- Shared overlay backdrop + dialog shell contract.
- Studio Inspector, Product Workspace, Content Workspace và Quote Review bắt đầu dùng cùng contract.
- Có `scripts/surface-navigation.test.mjs` chống regression.
- Package: **6.27.0**.
- PWA cache: **pricereport-shell-v627-surface-navigation**.

## Trạng thái trước — V6.26 Status & Feedback Semantics

V6.26 tiếp tục U3 theo Hiến pháp UI/UX: chuẩn hóa Neutral/Info/Success/Warning/Danger cho badge, chip và feedback state.

- Shared feedback semantic tokens.
- Studio status badge + quick-fill chips dùng cùng state contract.
- Content Workspace chip dùng cùng state contract.
- Success/Warning affordances bắt đầu bỏ màu trạng thái hard-code.
- Có `scripts/status-feedback.test.mjs` chống regression.
- Package: **6.26.0**.
- PWA cache: **pricereport-shell-v626-status-feedback**.

## Trạng thái trước — V6.25 Interaction Component States

V6.25 tiếp tục U3 theo Hiến pháp UI/UX: chuẩn hóa IconButton, focus và disabled states trên chính component hiện có.

- Shared IconButton tokens.
- Shared focus border/shadow.
- Shared disabled background/text/opacity.
- Studio + Content Workspace dùng cùng interaction contract.
- Có `scripts/interaction-components.test.mjs` chống regression.
- Package: **6.25.0**.
- PWA cache: **pricereport-shell-v625-interaction-states**.

## Trạng thái trước — V6.24 Component Contract Foundation

V6.24 tiếp tục Phase U3 theo UI/UX Constitution: chuẩn hóa component contract trên chính primitive hiện có, không tạo design system song song.

- Shared control tokens cho input/select/textarea.
- Shared button tokens cho Secondary/Primary/Danger.
- Studio và Content Workspace bắt đầu dùng cùng component contract.
- Có `scripts/component-contract.test.mjs` chống regression.
- Package: **6.24.0**.
- PWA cache: **pricereport-shell-v624-component-contract**.

## Trạng thái trước — V6.23 Semantic Token Foundation

V6.23 bắt đầu Phase U2 theo UI/UX Constitution: chuẩn hóa semantic design tokens và migrate App Shell/Studio/Content Workspace theo kiểu incremental, không thay đổi report themes hay business logic.

- Canonical tokens cho surface, text, border, accent, state, spacing và radius.
- Studio dark scope override cùng token names, không tạo design system song song.
- Có `scripts/design-tokens.test.mjs` chặn regression và tăng hard-coded color debt.
- Package: **6.23.0**.
- PWA cache: **pricereport-shell-v623-semantic-token-foundation**.

## Trạng thái trước — V6.22 UI/UX Constitution Governance

V6.22 không thay đổi giao diện runtime. Đây là lớp quản trị thiết kế cố định của repository.

- Design Source of Truth: `docs/UI_UX_CONSTITUTION.md`.
- Lịch sử policy: `docs/UI_UX_CHANGELOG.md`.
- Audit và roadmap migration: `docs/UI_UX_COMPLIANCE_AUDIT.md`.
- Mọi agent/developer phải đọc Constitution trước khi sửa UI thông qua `AGENTS.md`.
- CI có gate riêng `scripts/ui-ux-constitution.test.mjs` để ngăn mất governance.
- UI migration phải incremental, không big-bang rewrite, không tạo design system song song.
- Business data, local-first, report, print/PDF và Production Release Authority giữ nguyên.

## Trạng thái hiện tại — V6.19 Business Core Foundation

V6.19 bắt đầu chuẩn hóa bộ não nghiệp vụ theo kiến trúc local-first mà không big-bang rewrite.

- Một calculation engine duy nhất cho subtotal/discount/VAT/fee/total, dùng chung bởi preview + Excel.
- Validation báo giá được tách khỏi DOM thành domain module thuần.
- Có canonical entity helpers cho Customer/Product/QuotationItem và status-transition contract.
- Có Storage Repository với write verification, JSON safety, snapshot/rollback verification.
- History, Customer Library, Product Catalog và UI preferences bắt đầu đọc qua repository boundary.
- Giữ nguyên storage keys/schema hiện hữu; V6.19 không phá dữ liệu V6.18.
- Có unit gates riêng cho domain model, storage repository, migration engine, backup service, command layer và report view model.
- Bulk product operations đi qua itemId command layer thay vì trực tiếp dựa vào array index.
- Backup/restore có service contract; backup mới ghi appVersion + dataVersion nhưng vẫn đọc backup schema v4 cũ.
- Storage có schema marker + ordered migration engine để sẵn sàng vN → vN+1.
- Report totals/Excel cùng đi qua canonical report view model.
- Service Worker precache rõ các core ES modules để Standalone khởi động offline ổn định hơn.
- PWA cache: **pricereport-shell-v619-architecture-final**.
- Package: **6.19.0**.

## Trạng thái trước — V6.18 PDF Print Isolation

V6.18 sửa lỗi **Xuất PDF/In bị lẫn giao diện ứng dụng** như topbar, nút Lưu nháp/Xem trước/Xuất PDF và vùng preview.

- Print cascade giờ hard-isolate duy nhất cây **A4 report**: `.preview > .paper-wrap > .paper`.
- Toàn bộ chrome ứng dụng ở cùng cấp với preview bị loại khỏi print formatting tree.
- Topbar, navigation, editor, inspector, preview toolbar, customizer, modal và toast không thể lọt vào PDF.
- Khổ giấy được khóa **A4 210 × 297 mm**, margin trang in bằng 0.
- Xóa transform/scale/zoom của chế độ xem màn hình khi in để PDF không phụ thuộc viewport.
- Tất cả nút Xuất PDF dùng chung một controller và có beforeprint/afterprint state guard.
- Có static print gate và Chromium print-media browser gate để chống regression.
- PWA cache generation: **pricereport-shell-v618-pdf-print-isolation**.
- Package: **6.18.0**.

V6.17 vẫn là nền System UX; V6.18 chỉ thay đổi luồng in/PDF và không đổi dữ liệu nghiệp vụ.

## Kiểm thử

CI chạy kiểm thử và security gate trước khi merge:

```bash
npm audit --omit=dev --audit-level=high
npm test
npm run build
```

`npm test` gồm:
- syntax check cho `src/main.js`;
- business-logic tests cho tổng tiền, currency, duplicate quote number, phone normalization, ngày địa phương, ngày ISO, numeric bounds và color normalization;
- importer-logic tests cho mapping Excel, nhóm hàng, field metadata, OCR text, merge dữ liệu Excel + chữ viết tay, loại dòng giá không hợp lệ và chống lặp nguồn;
- DOM integration tests cho boot app, product editing, cả 8 template, bảng giá 72 dòng/3 nhóm, history, reset, print preflight, dữ liệu local sai kiểu, accessibility, rollback khi giả lập hết dung lượng, kéo trường trên preview, resize/reset logo, sắp xếp, Smart Import, persistence failure và kỳ báo giá mới;
- static smoke tests cho các contract UI/logic quan trọng.

## Chạy local

```bash
npm install
npm run dev
```

## Triển khai

Mọi thay đổi phát triển trên feature branch, mở Pull Request và chỉ merge khi CI PASS. Merge vào `main` kích hoạt GitHub Pages.

## Audit V2.8

V2.7 đã sửa các lỗi QA/UX quan trọng: false-success khi LocalStorage ghi lỗi; subtitle nằm ngang; nhịp “Thoáng” không lưu đúng; draft import cũ bị giữ lại; OCR fail không mở được nhập thủ công; Excel chỉ đọc sheet đầu; dòng STT có giá không hợp lệ bị nhận nhầm; header nhóm có nguy cơ đứng cuối trang; báo giá/preset mới mang theo kỳ cũ. Direct dependencies được pin theo phiên bản CI đã kiểm thử và Pages/CI chặn runtime dependency mức high/critical.

Full install hiện vẫn báo 2 cảnh báo mức moderate trong dependency tree phục vụ phát triển, trong khi runtime audit `--omit=dev` trả về 0 vulnerabilities. Không dùng `npm audit fix --force` vì có thể ép major/breaking upgrade ngoài phạm vi an toàn của bản phát hành này.

## Giới hạn chủ động

Bản hiện tại là local-first, chưa có backend đăng nhập/đồng bộ nhiều thiết bị. Lưu PDF dựa trên print dialog của trình duyệt. Hệ thống không tự quy đổi tỷ giá giữa các loại tiền tệ; khi lấy sản phẩm từ catalog khác tiền tệ, đơn giá được đặt về 0 để người dùng nhập lại an toàn.

OCR chữ viết tay dùng Tesseract.js nên độ chính xác phụ thuộc ảnh, nét chữ và ánh sáng; kết quả **không được áp dụng tự động** mà luôn đi qua màn hình review. Lần OCR đầu có thể cần mạng để tải tài nguyên ngôn ngữ; các request thành công được cache cho lần dùng sau.


### Bổ sung V2.8

V2.8 là vòng audit độc lập sau V2.7. Các lỗi còn sót được sửa:
- field OCR bị xóa trong review nhưng draft cũ vẫn giữ;
- “Phân tích lại” OCR có thể giữ nhận diện cũ sai;
- OCR reparse có nguy cơ ghi đè metadata đáng tin cậy từ Excel;
- cột Ghi chú vẫn xuất hiện dù workbook Tùng Gia Bảo có 72/72 dòng ghi chú trống;
- Auto-arrange chưa tự tối ưu các cột tùy chọn hoàn toàn rỗng.

CI V2.8 xác nhận runtime audit 0 vulnerabilities, core/importer logic PASS, 24/24 DOM tests PASS, smoke PASS và production build PASS.


## V3.0 — Mobile, Excel và lưu PC

V3.0 hoàn thiện lại luồng sử dụng theo 6 yêu cầu vận hành thực tế:

- Bỏ hoàn toàn khỏi giao diện ba trường không còn dùng: **Chi nhánh Khánh Hòa**, **Chi nhánh Đồng Nai**, **Trại / cơ sở**.
- Cỡ chữ nội dung giờ scale thật trên toàn bộ báo cáo (thông tin công ty, kính gửi, lời mở đầu, bảng, điều khoản, chữ ký, footer...), thay vì chỉ đổi font ở phần tử cha rồi bị CSS template ghi đè.
- Tab được đổi thành **Xuất / Nhập / In** và gom chung:
  - In / Lưu PDF;
  - Xuất Excel;
  - Nhập Excel;
  - Nhập ảnh chữ viết tay;
  - JSON / backup toàn bộ.
- Có tab **Xem báo cáo** riêng cho điện thoại/iPad. Chế độ này ẩn vùng chỉnh sửa, tự fit A4 theo bề ngang màn hình và dùng đúng chiều cao đã scale, vì vậy cuộn dừng ở cuối nội dung thay vì kéo dư.
- Hỗ trợ **Lưu trên máy PC** bằng File System Access API trên Chrome/Edge desktop:
  - người dùng chọn một thư mục;
  - directory handle được lưu trong IndexedDB;
  - các lần bấm lưu báo giá tiếp theo sẽ ghi thêm file hiện tại + backup vào thư mục đó nếu quyền vẫn còn;
  - có nút lưu ngay và đọc bản gần nhất.
- Trình duyệt không cho web biết toàn bộ đường dẫn Windows vì giới hạn bảo mật. Ứng dụng chỉ có thể nhớ folder handle và tên thư mục đã cấp quyền.

### Gate V3.0

CI #234 trên code head:
- runtime audit: **0 vulnerabilities**;
- Core logic: **PASS**;
- Importer logic: **PASS**;
- PC Storage logic: **PASS**;
- DOM integration + migration: **32/32 PASS**;
- Smoke: **PASS** (258 IDs, 79 bindings, 22 preview targets);
- Production build: **PASS**.


## V3.1 — Logo giữ nguyên bản gốc theo mặc định

V3.1 sửa nguyên nhân logo JPG/PNG bị “tự tách/hòa nền” dù người dùng chưa yêu cầu.

- Logo mới upload luôn vào chế độ **Giữ nguyên ảnh gốc**.
- Project cũ chưa có `logoDisplayMode` được migrate sang Original-first, vì vậy các giá trị legacy `blend + multiply` không còn tự tác động lên ảnh.
- Original mode ép:
  - `mix-blend-mode: normal`;
  - không filter;
  - không mask;
  - không clip-path;
  - không pseudo wash;
  - không plate nền cưỡng bức;
  - opacity 100%.
- Resize và kéo-thả chỉ thay kích thước/vị trí hiển thị, không sửa pixel nguồn.
- Có chế độ **Tách nền sáng** tùy chọn. Việc tách nền chỉ chạy trên bản render trong bộ nhớ; file logo gốc trong storage không bị thay.
- Có chế độ **Hiệu ứng / hòa nền nâng cao** để người dùng chủ động bật lại blend/backdrop khi cần.
- Nút **Khôi phục logo gốc** trả ngay về Original mode.

Gate code V3.1:
- runtime audit: **0 vulnerabilities**;
- Core logic: **PASS**;
- Importer logic: **PASS**;
- PC Storage logic: **PASS**;
- Logo Processing logic: **PASS**;
- DOM: **35/35 PASS**;
- Smoke: **PASS** — 265 IDs, 81 bindings, 22 preview targets;
- Production build: **PASS**.


## V3.2 — Xóa nền thật + địa chỉ trụ sở 2 dòng

### Logo

Chế độ **Xóa nền** giờ thực sự tạo vùng trong suốt:
- lấy mẫu màu nền từ các mép/góc ảnh;
- flood-fill chỉ các vùng nền nối với mép ảnh;
- đặt alpha nền về 0;
- giữ các pixel bên trong logo nếu không nối với nền, kể cả khi có cùng màu;
- không chỉnh màu chủ thể;
- ảnh gốc vẫn nằm nguyên trong storage và có thể khôi phục.

Thanh điều chỉnh giờ là **Dung sai màu nền** (8–140), không còn là ngưỡng “nền sáng”.

### Địa chỉ trụ sở

Thông tin trụ sở được tách thành:
- **Địa chỉ chi tiết**
- **Tỉnh**
- **Phường**

Preview/in báo cáo hiển thị:
- dòng 1: địa chỉ chi tiết;
- dòng 2: **Phường trước, Tỉnh sau**.

Dữ liệu một dòng cũ tự migrate vào Địa chỉ chi tiết. Hồ sơ Tùng Gia Bảo cũ tại Nam Nha Trang tự bổ sung Tỉnh Khánh Hòa. Excel import/export và OCR cũng dùng cấu trúc mới.

### Gate V3.2

CI #243:
- runtime audit: **0 vulnerabilities**
- Core logic: **PASS**
- Importer logic: **PASS**
- PC Storage logic: **PASS**
- Logo Processing logic: **PASS**
- DOM integration/migration: **37/37 PASS**
- Smoke: **PASS** — 269 IDs, 83 bindings, 23 preview targets
- Production build: **PASS**


## V3.3 — Chữ ngoài bảng cố định, chữ trong bảng điều chỉnh riêng

V3.3 tách hoàn toàn hai nhóm typography của báo giá:

- **Ngoài bảng hàng hóa:** dùng bộ cỡ chữ cố định để bố cục đầu trang và các khối văn bản không thay đổi khi người dùng chỉnh bảng.
- **Trong bảng hàng hóa:** có `tableFontSize` riêng, điều chỉnh từ 7.5–14 px.

Bộ chữ cố định ngoài bảng được tăng khoảng **+2 px** so với baseline V3.2:
- thông tin công ty: 11.6 px;
- tên công ty: 15.2 px;
- phụ đề: 13.2 px;
- meta: 11.6 px;
- kính gửi: 15.5 px;
- lời mở đầu: 12.5 px;
- tiêu đề nhóm: 13.5 px;
- tiêu đề báo giá: 27 px;
- các khối tổng cộng/thanh toán/điều khoản/chữ ký/footer cũng được khóa theo bộ cỡ cố định mới.

Đã bỏ:
- slider cỡ chữ toàn tài liệu;
- slider cỡ tiêu đề.

Hai vị trí trong giao diện Thiết kế giờ cùng điều khiển **Cỡ chữ trong bảng**.

Dữ liệu cũ có `docFontSize` được migrate sang `tableFontSize` theo đúng tỷ lệ hiển thị cũ để bảng không nhảy cỡ bất ngờ.

### Gate V3.3

CI #246:
- runtime audit: **0 vulnerabilities**
- Core logic: **PASS**
- Importer logic: **PASS**
- PC Storage logic: **PASS**
- Logo Processing logic: **PASS**
- DOM integration/migration: **39/39 PASS**
- Smoke: **PASS** — 267 IDs, 82 bindings, 23 preview targets
- Production build: **PASS**
