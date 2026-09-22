# PriceReport_Tunggiabao

WebApp tạo, chỉnh sửa, lưu mẫu và in bảng báo giá A4 cho Tùng Gia Bảo.

## Chức năng V1
- Form doanh nghiệp, khách hàng, sản phẩm, thanh toán, điều khoản và chữ ký.
- Preview A4 thời gian thực.
- Thêm/xóa sản phẩm, tự tính tạm tính, giảm giá, VAT, phí khác và tổng cộng.
- Đọc số tiền VND bằng chữ.
- 4 template: hiện đại, cổ điển, tối giản, màu.
- Tùy chỉnh màu chủ đạo, font, lề, kích thước logo và cột hiển thị.
- Upload logo, lưu dữ liệu tự động bằng LocalStorage.
- Lưu/nạp nhiều mẫu báo giá.
- Xuất/nhập JSON.
- In hoặc lưu PDF bằng trình duyệt.
- PWA/offline cơ bản bằng Service Worker.
- Responsive desktop/mobile.
- GitHub Actions kiểm tra build và sẵn sàng deploy GitHub Pages.

## Chạy local
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Nhánh phát triển
V1 nền tảng đang ở nhánh `webapp/v1-foundation`. Chỉ merge vào `main` sau khi CI và kiểm thử giao diện/luồng sử dụng đạt yêu cầu.
