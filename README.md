# PriceReport_Tunggiabao

Webapp tạo, chỉnh sửa, lưu và in **bảng báo giá A4** theo hướng một công cụ nghiệp vụ thay vì một file HTML tĩnh.

## V1 webapp

- Giao diện 3 vùng: điều hướng → nhập dữ liệu → preview A4.
- Quản lý thông tin công ty, khách hàng, sản phẩm, thanh toán, điều khoản và chữ ký.
- Preview cập nhật trực tiếp.
- Tự tính tạm tính, giảm giá, VAT, phí khác và tổng cộng.
- Đọc tổng tiền VND bằng chữ.
- 4 template trình bày, nhiều màu chủ đạo, chỉnh font/lề/logo.
- Logo tùy chỉnh.
- Tự lưu dữ liệu bằng localStorage.
- Nhập/xuất JSON.
- In hoặc lưu PDF qua hộp thoại in của trình duyệt.
- PWA cài đặt được và có cache offline.
- Responsive cho desktop và màn hình nhỏ.

## Chạy local

Không cần framework hoặc bước build:

```bash
python -m http.server 8080
```

Mở `http://localhost:8080`.

## Kiểm tra

Yêu cầu Node.js 20+.

```bash
npm run ci
```

CI kiểm tra cú pháp JavaScript, cấu trúc DOM, hợp đồng A4/print và PWA.

## Quy trình phát triển

Nhánh V1 hiện tại: `feat/webapp-v1-foundation`.

Mã trên nhánh tính năng được kiểm tra trước khi merge vào `main`. Trạng thái/gate chi tiết xem `docs/CODEX_STATE.md`.
