# YouTube Premium Manager

Hệ thống quản lý tài khoản YouTube Premium dành cho mô hình trung gian bán/gia hạn tài khoản.

Project giúp quản lý:

- Tài khoản YouTube Premium
- Khách hàng đang sử dụng tài khoản
- Tài chính gom tiền
- Doanh thu, vốn, lợi nhuận
- Ticket hỗ trợ khi khách bị lỗi acc
- Activity logs ghi lại thao tác hệ thống

---

## Công nghệ sử dụng

- React
- Vite
- Tailwind CSS
- Supabase
- Recharts
- Lucide React

---

## Chức năng chính

### 1. Dashboard

Trang tổng quan hiển thị:

- Lợi nhuận dự kiến
- Tổng doanh thu
- Vốn dự kiến
- Lợi nhuận hiện tại
- Vốn đã chi
- Tổng khách hàng
- Tổng tài khoản
- Trạng thái tài khoản
- Biểu đồ doanh thu và lợi nhuận
- Top nguồn acc
- Các mục cần chú ý

---

### 2. Quản lý tài khoản

Trang Account dùng để quản lý toàn bộ tài khoản YouTube Premium.

Thông tin quản lý gồm:

- Gmail
- Password
- Gói nguồn
- Ngày nhập nguồn
- Hạn nguồn
- Nhà cung cấp
- Tên khách hàng
- Hạn đăng ký cũ
- Hạn khách mới
- Tiền khách cần gom
- Tỉ giá USD
- Trạng thái khách
- Ghi chú

Hệ thống phân biệt rõ:

```txt
Hạn nguồn = hạn mình mua từ nhà cung cấp
Hạn khách = hạn mình cam kết với khách
Hạn đăng ký cũ = mốc bắt đầu tính tiền khách cần trả
