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

## Đăng nhập

Frontend gọi backend tại `VITE_API_URL` (mặc định `http://localhost:5000`). Tạo `frontend/.env` từ `.env.example` nếu cần đổi địa chỉ API. Backend hiện nhận tài khoản dưới trường `username`.

Các tài khoản sau chỉ dùng khi bật `USE_MOCK = true` trong `src/services/authApi.js`:

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `nhanvien@minierp.local` | `An@123456` | Nhân viên |
| `quanly@minierp.local` | `Minh@123456` | Quản lý |
| `admin@minierp.local` | `Lan@123456` | Admin/HR |

Đây chỉ là thông tin giả cho phát triển giao diện. Xác thực mật khẩu thật phải do backend đảm nhiệm.
