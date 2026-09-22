# PriceReport_Tunggiabao

WebApp tạo, quản lý, tái sử dụng và in bảng báo giá A4 cho Tùng Gia Bảo.

## Trạng thái hiện tại — V1.4 local-first
- Form doanh nghiệp, khách hàng, sản phẩm, thanh toán, điều khoản và chữ ký.
- Preview A4 thời gian thực, ước tính số trang và in nhiều trang an toàn hơn.
- Thêm/xóa sản phẩm, tự tính tạm tính, giảm giá, VAT, phí khác và tổng cộng.
- Đọc số tiền VND bằng chữ.
- 4 template; tùy chỉnh màu, font, lề, logo và cột hiển thị.
- Quản lý vòng đời báo giá: bản nháp, đã gửi, chấp nhận, từ chối, hết hiệu lực.
- Lịch sử báo giá: lưu/cập nhật, tìm kiếm, lọc, mở lại, nhân bản và xóa.
- Danh bạ khách hàng dùng lại cho nhiều báo giá.
- Danh mục sản phẩm dùng lại giá, quy cách và đơn vị.
- Lưu/nạp nhiều mẫu báo giá.
- Tự lưu dữ liệu bằng LocalStorage.
- Sao lưu/khôi phục toàn bộ dữ liệu WebApp; hỗ trợ backup schema v3.
- In hoặc lưu PDF bằng trình duyệt.
- PWA/offline cơ bản bằng Service Worker.
- Responsive desktop/mobile.
- CI: syntax check + smoke test + production build.
- GitHub Pages tự động deploy từ `main`.

## Chạy local
```bash
npm install
npm run dev
```

## Kiểm thử
```bash
npm test
npm run build
```

## Triển khai
Mọi thay đổi phát triển trên feature branch, mở Pull Request, chỉ merge khi CI PASS. Merge vào `main` sẽ kích hoạt workflow GitHub Pages.
