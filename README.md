# PriceReport_Tunggiabao

WebApp local-first để tạo, quản lý, tái sử dụng và in bảng báo giá A4 cho Tùng Gia Bảo.

## Trạng thái hiện tại — V6.4 Guided Content Workspaces

V6.4 giữ nguyên nền **V6.3 Unified Content Workspaces** nhưng biến cột trợ giúp bên phải thành **trợ lý thao tác theo từng khối**, để người chỉ cần nhập dữ liệu có thể hoàn thành báo giá nhanh hơn mà không phải tìm chức năng ở nơi khác.

- **Thông tin chung**: cập nhật ngày hôm nay, tạo mã báo giá mới và bật số/ngày trên A4.
- **Khách hàng**: tìm tối đa 5 khách gần nhất/phù hợp theo tên, công ty, SĐT, email; nạp trực tiếp vào báo giá; lưu khách hiện tại vào danh bạ ngay trong popup.
- **Thanh toán**: preset VAT 0/5/8/10%, giảm giá 0/5/10%, phương thức Tiền mặt / Chuyển khoản / TM-CK và nút bật tổng tiền + thanh toán trên A4.
- **Điều khoản**: chèn bộ chuẩn hoặc từng điều khoản giao hàng, thanh toán, hiệu lực; chống chèn trùng và không ghi đè nội dung đã có.
- **Chữ ký**: tạo dòng ngày tháng hiện tại, chuẩn hóa bố cục ký hai bên nhưng giữ nguyên họ tên đã nhập.
- **Văn bản tùy chỉnh**: dùng nhanh lời mở đầu, lời kết và chân trang chuẩn.
- Nút **Lưu nháp & tiếp tục →** lưu state hiện tại rồi chuyển sang khối kế tiếp mà không đóng workspace.
- Toàn bộ quick tools vẫn thao tác trên **single source of truth** hiện có; không clone input, không tạo state thứ hai.
- Desktop vẫn giữ các mức **1040 / 1200 / 1360 / 1480 px**, mặc định **1200 px**; mobile vẫn full-screen.
- Package: **6.4.0**.
- PWA cache generation: **pricereport-shell-v64-guided-content-workspaces**.
- Nền V6.2/V6.3 vẫn được giữ: 16 mẫu báo giá native, launcher cố định và popup nhập sản phẩm lớn.


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
