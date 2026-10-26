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
- Dự án (`/du-an`, `/du-an/cua-toi`, `/du-an/tien-do`): dùng `GET/POST /api/projects` và `PUT /api/projects/:id`. Danh sách hiển thị tiến độ backend trả về; manager/admin được thêm, admin hoặc quản lý dự án được sửa. Đăng nhập lại sau cập nhật để lưu `employee_id` cho quyền sửa.
- Nhân viên (`/quan-ly-nhan-vien`): dùng `GET /api/users/employee-list`, `POST /api/users/employee-create`, `PUT /api/users/employee-update/:id`. Mọi vai trò được xem; chỉ admin thấy nút thêm/sửa. Tạo thành công hiển thị `login_info` do backend trả về, chỉ giữ trong bộ nhớ đến khi đóng hộp thoại.
- Form nhân viên lấy gợi ý phòng ban từ dữ liệu nhân viên hiện có. Chưa có API phòng ban trong backend này; có thể nhập mã phòng ban đã tồn tại nhưng chưa có nhân viên. Thay số điện thoại không thay username theo hợp đồng API hiện tại.
- `/api/health`, `/api/users/change-password`, `/api/auth/admin-dashboard` và `/api/auth/reports` có trong backend nhưng chưa được frontend sử dụng tại các màn hình hiện tại.
- Backend hiện chưa có endpoint danh sách task, bảng công hoặc chấm công. Các khu vực này hiển thị thông báo chưa tích hợp; frontend không tự tạo dữ liệu thay thế.

Để hiển thị dữ liệu thật cho các khu vực đó, backend cần cung cấp endpoint cùng định dạng response và quyền truy cập tương ứng; sau đó mới có thể nối frontend theo hợp đồng API.

## Kiểm tra kết nối

1. Khởi động backend và frontend, đăng nhập bằng tài khoản hiện có.
2. Mở Dự án: kiểm tra tải danh sách, thêm rồi sửa dự án, tải lại trang để xác nhận. Với employee, nút Thêm không xuất hiện. Lỗi thiếu hồ sơ nhân viên là dữ liệu tài khoản phía backend, không phải lỗi kết nối.
3. Mở Danh sách nhân viên: kiểm tra tên, phòng ban và vai trò. Admin thử thêm bằng số điện thoại chưa dùng và mã phòng ban thật, lưu thông tin đăng nhập API trả về, rồi sửa họ tên/email. Manager/employee chỉ được xem.
4. DevTools → Network: các request gửi `Authorization: Bearer ...`; thêm/sửa thành công sẽ gọi lại danh sách. Thử trùng mã dự án hoặc trùng số điện thoại: form giữ nguyên dữ liệu và hiện lỗi backend.
5. `npm run build` kiểm tra biên dịch, `npm run lint` kiểm tra mã. Kiểm tra hợp đồng dịch vụ không ghi database bằng `node --experimental-vm-modules scripts/check-api-contract.mjs`.

## Cấu trúc `src/`

- `components/`: thành phần giao diện
- `config/`: cấu hình menu
- `context/`: trạng thái đăng nhập
- `layouts/`: khung ứng dụng
- `pages/`: các trang
- `services/`: lời gọi API
- `utils/`: hàm tiện ích
