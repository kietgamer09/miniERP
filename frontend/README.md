# miniERP Frontend

Giao diện quản lý nhân sự và công việc, xây dựng bằng React, Vite và Ant Design.

## Yêu cầu

- Node.js phiên bản LTS hiện hành

## Cài đặt và chạy

```bash
npm install
npm run dev
```

## Cấu trúc `src/`

- `components/`: các thành phần giao diện dùng lại
- `config/`: cấu hình menu
- `context/`: trạng thái dùng chung
- `data/`: dữ liệu mẫu
- `layouts/`: khung ứng dụng
- `pages/`: các trang
- `utils/`: hàm tiện ích

## Tài khoản mẫu

Các tài khoản sau dự kiến dùng để thử giao diện đăng nhập ở phần B:

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `nhanvien@minierp.local` | `An@123456` | Nhân viên |
| `quanly@minierp.local` | `Minh@123456` | Quản lý |
| `admin@minierp.local` | `Lan@123456` | Admin/HR |

Đây chỉ là thông tin giả cho phát triển giao diện. Xác thực mật khẩu thật phải do backend đảm nhiệm.
