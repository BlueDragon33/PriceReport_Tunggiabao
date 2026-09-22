# PriceReport_Tunggiabao

WebApp local-first để tạo, quản lý, tái sử dụng và in bảng báo giá A4 cho Tùng Gia Bảo.

## Trạng thái hiện tại — V2.2 audited local-first

- Bố cục A4 chuẩn lấy mẫu PDF doanh nghiệp làm baseline: logo trái, khối công ty cân giữa ở cột phải, tiêu đề độc lập ở tâm trang.
- 8 template đều kế thừa cùng geometry; template chỉ thay đổi typography, viền, accent và treatment bảng.
- Preview A4 thời gian thực, ước tính số trang, chế độ rộng, zoom, tùy chỉnh nhịp khoảng cách và mật độ bảng.
- Product editor dạng card, focus mode, thu gọn/mở rộng, nhân bản, sắp xếp và ghi chú co giãn.
- Tự tính tạm tính, giảm giá, VAT, phí khác, tổng cộng và đọc số tiền VND bằng chữ.
- Preflight trước in/PDF: phát hiện thiếu dữ liệu, mâu thuẫn VAT/điều khoản, thông tin thanh toán chưa đủ, logo thiếu và cấu hình tổng tiền không nhất quán.
- Lịch sử báo giá có trạng thái, mã quote chống trùng, duplicate chống đè lịch sử và thống kê theo từng loại tiền tệ.
- Danh bạ khách hàng có chuẩn hóa SĐT để giảm trùng.
- Danh mục sản phẩm có lưu loại tiền tệ; không tự dùng sai đơn giá khi chuyển VND/USD/RUB.
- Preset chỉ lưu cấu hình tái sử dụng, không mang theo khách hàng, mã báo giá hoặc sản phẩm giao dịch.
- Logo được lưu riêng khỏi state autosave để tránh ghi base64 lớn ở mỗi lần gõ; history/preset không nhân bản logo trùng.
- Full backup/restore schema v4; vẫn đọc backup cũ có cấu trúc hợp lệ.
- PWA/offline với Service Worker; dữ liệu nằm trên trình duyệt hiện tại.
- Responsive desktop/mobile.

## Kiểm thử

CI chạy ba lớp kiểm thử trước khi merge:

```bash
npm test
npm run build
```

`npm test` gồm:
- syntax check cho `src/main.js`;
- business-logic tests cho tổng tiền, currency, duplicate quote number và phone normalization;
- DOM integration tests cho boot app, product editing, template switching, history, reset và print preflight;
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
