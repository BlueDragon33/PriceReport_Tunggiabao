# PriceReport_Tunggiabao

WebApp local-first để tạo, quản lý, tái sử dụng và in bảng báo giá A4 cho Tùng Gia Bảo.

## Trạng thái hiện tại — V2.6 smart import Excel + chữ viết tay

- Bố cục A4 chuẩn lấy mẫu PDF doanh nghiệp làm baseline: logo trái, khối công ty cân giữa ở cột phải, tiêu đề độc lập ở tâm trang.
- 8 template đều kế thừa cùng geometry; template chỉ thay đổi typography, viền, accent và treatment bảng.
- Preview A4 thời gian thực, ước tính số trang, chế độ rộng, zoom, tùy chỉnh nhịp khoảng cách và mật độ bảng.
- Chế độ **Sắp xếp trực tiếp** trên preview: kéo bằng chuột/chạm các khối và nhiều trường con, lưu offset theo mm, tinh chỉnh bằng phím mũi tên và khôi phục vị trí nhanh. Chế độ giữ nguyên qua nhiều lần kéo/render và chỉ kết thúc khi bấm **Xong sắp xếp**.
- Có **Tự động sắp xếp**: xóa offset thủ công không an toàn, cân lại tiêu đề/logo và tự chọn khoảng cách/mật độ bảng theo lượng nội dung; sau đó vẫn giữ chế độ kéo để tinh chỉnh tay.
- Logo có resize 18–90 mm theo cơ chế scale thị giác trong slot header cố định; phóng/thu không làm thay đổi chiều cao header hay đẩy nội dung. Có dịch X/Y độc lập và vẫn kéo trực tiếp trên preview.
- Baseline báo giá đã chuyển sang **HKD Tùng Gia Bảo**, gồm 72 mặt hàng từ workbook mẫu và giữ nguyên 3 nhóm hàng.
- Product editor dạng card, focus mode, thu gọn/mở rộng, nhân bản, sắp xếp, nhóm hàng và ghi chú co giãn.
- Hỗ trợ dạng **bảng giá**: bật/tắt độc lập Quy cách, Số lượng, Đơn giá, Thành tiền, Ghi chú; nhóm hàng được in thành dòng phân cách trong bảng.
- **Nhập dữ liệu thông minh** từ Excel: tự nhận diện tên đơn vị, địa chỉ, tiêu đề/phụ đề, Kính gửi, lời mở đầu, nhóm hàng, sản phẩm, ngày tháng và người ký; luôn có màn hình kiểm tra trước khi áp dụng.
- **OCR chữ viết tay**: tải ảnh JPG/PNG, tiền xử lý ảnh, nhận dạng tiếng Việt + tiếng Anh, map nội dung sang các field liên quan và cho phép chỉnh văn bản OCR thô rồi phân tích lại.
- Tự tính tạm tính, giảm giá, VAT, phí khác, tổng cộng và đọc số tiền VND bằng chữ.
- Preflight trước in/PDF: phát hiện thiếu dữ liệu, mâu thuẫn VAT/điều khoản, thông tin thanh toán chưa đủ, logo thiếu và cấu hình tổng tiền không nhất quán.
- Lịch sử báo giá có trạng thái, mã quote chống trùng, duplicate chống đè lịch sử và thống kê theo từng loại tiền tệ.
- Danh bạ khách hàng có chuẩn hóa SĐT để giảm trùng.
- Danh mục sản phẩm có lưu loại tiền tệ; không tự dùng sai đơn giá khi chuyển VND/USD/RUB.
- Preset chỉ lưu cấu hình tái sử dụng, không mang theo khách hàng, mã báo giá hoặc sản phẩm giao dịch.
- Logo được lưu riêng khỏi state autosave để tránh ghi base64 lớn ở mỗi lần gõ; history/preset không nhân bản logo trùng.
- Full backup/restore schema v4; dữ liệu import được normalize/clamp, từ chối schema tương lai và rollback về snapshot cũ nếu LocalStorage ghi lỗi giữa chừng.
- Ngày báo giá dùng lịch địa phương của trình duyệt, tránh lệch ngày do UTC; preflight chặn ngày không hợp lệ ở trạng thái phát hành.
- Print nhiều trang cho phép nội dung A4 tràn sang trang kế tiếp, lặp header bảng và hạn chế cắt các block tổng tiền/điều khoản/chữ ký.
- PWA/offline với Service Worker cache v16; chunk động và tài nguyên OCR sau lần tải đầu cũng được runtime-cache để tăng khả năng dùng lại khi mất mạng.
- Dữ liệu nằm trên trình duyệt hiện tại.
- Responsive desktop/mobile.

## Kiểm thử

CI chạy ba lớp kiểm thử trước khi merge:

```bash
npm test
npm run build
```

`npm test` gồm:
- syntax check cho `src/main.js`;
- business-logic tests cho tổng tiền, currency, duplicate quote number, phone normalization, ngày địa phương, ngày ISO, numeric bounds và color normalization;
- importer-logic tests cho mapping Excel, nhóm hàng, field metadata, OCR text và merge dữ liệu Excel + chữ viết tay;
- DOM integration tests cho boot app, product editing, template switching, history, reset, print preflight, dữ liệu local sai kiểu, accessibility trạng thái tab, rollback restore khi giả lập hết dung lượng, kéo trường trên preview, resize/reset logo, kéo liên tiếp trong cùng phiên sắp xếp, tự động sắp xếp và review OCR thủ công;
- static smoke tests cho các contract UI/logic quan trọng.

## Chạy local

```bash
npm install
npm run dev
```

## Triển khai

Mọi thay đổi phát triển trên feature branch, mở Pull Request và chỉ merge khi CI PASS. Merge vào `main` kích hoạt GitHub Pages.

## Giới hạn chủ động

Bản hiện tại là local-first, chưa có backend đăng nhập/đồng bộ nhiều thiết bị. Lưu PDF dựa trên print dialog của trình duyệt. Hệ thống không tự quy đổi tỷ giá giữa các loại tiền tệ; khi lấy sản phẩm từ catalog khác tiền tệ, đơn giá được đặt về 0 để người dùng nhập lại an toàn.

OCR chữ viết tay dùng Tesseract.js nên độ chính xác phụ thuộc ảnh, nét chữ và ánh sáng; kết quả **không được áp dụng tự động** mà luôn đi qua màn hình review. Lần OCR đầu có thể cần mạng để tải tài nguyên ngôn ngữ; các request thành công được cache cho lần dùng sau.
