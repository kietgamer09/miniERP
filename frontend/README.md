# miniERP Frontend

Giao diện miniERP dùng React, Vite và Ant Design.

## Yêu cầu

- Node.js phiên bản LTS
- Backend miniERP và PostgreSQL đang chạy để đăng nhập

## Chạy frontend

Từ thư mục `frontend`:

```bash
npm install
```

Tạo file `.env` (có thể sao chép từ `.env.example`) và đặt URL backend:

```env
VITE_API_URL=http://localhost:5000
```

Khởi động backend trước, sau đó chạy frontend:

```bash
npm run dev
```

Mở URL mà Vite in ra trong terminal. Thông tin đăng nhập phải là tài khoản đã được tạo trong PostgreSQL; frontend không chứa tài khoản mẫu.

## Kết nối backend hiện có

- `POST /api/auth/login`: đăng nhập bằng `{ "username": "...", "password": "..." }`; frontend lưu JWT và thông tin người dùng nhận được.
- `/api/health`, `/api/users/change-password`, `/api/auth/admin-dashboard` và `/api/auth/reports` có trong backend nhưng chưa được frontend sử dụng tại các màn hình hiện tại.
- Backend hiện chưa có endpoint danh sách task, bảng công hoặc chấm công. Các khu vực này hiển thị thông báo chưa tích hợp; frontend không tự tạo dữ liệu thay thế.

Để hiển thị dữ liệu thật cho các khu vực đó, backend cần cung cấp endpoint cùng định dạng response và quyền truy cập tương ứng; sau đó mới có thể nối frontend theo hợp đồng API.

## Cấu trúc `src/`

- `components/`: thành phần giao diện
- `config/`: cấu hình menu
- `context/`: trạng thái đăng nhập
- `layouts/`: khung ứng dụng
- `pages/`: các trang
- `services/`: lời gọi API
- `utils/`: hàm tiện ích
