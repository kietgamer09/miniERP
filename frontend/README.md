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
- Dự án (`/du-an`, `/du-an/cua-toi`, `/du-an/tien-do`, `/du-an/:id`): danh sách, tạo, sửa, xóa, hoàn thành/mở lại, thành viên, tạo/xem task. Quyền sửa dùng `can_manage` do backend trả về.
- Nhân viên (`/quan-ly-nhan-vien`): dùng `GET /api/users/employee-list`, `POST /api/users/employee-create`, `PUT /api/users/employee-update/:id`. Mọi vai trò được xem; chỉ admin thấy nút thêm/sửa. Tạo thành công hiển thị `login_info` do backend trả về, chỉ giữ trong bộ nhớ đến khi đóng hộp thoại.
- Phòng ban và form nhân viên lấy danh sách thật từ `GET /api/departments/department-list`. Backend chưa có API thêm/sửa/xóa phòng ban, nên các nút tương ứng tạm vô hiệu hóa.
- Đổi mật khẩu trong menu tài khoản dùng `PUT /api/users/change-password`; hồ sơ cá nhân dùng `GET /api/users/me`.
- Trang chủ, `/viec-cua-toi` và `/viec-cua-toi/duoc-giao` lấy task của tài khoản hiện tại từ `GET /api/tasks/mine`; task trong dự án lấy từ API dự án. Kanban hỗ trợ kéo thả theo quyền và thứ tự trạng thái backend cho phép.
- Bình luận task dùng `GET/POST /api/tasks/:id/comments`; nội dung là văn bản thuần, không hỗ trợ sửa/xóa. Danh sách bình luận được tải cùng chi tiết task.
- Hòm thông báo bên trái avatar hiển thị việc chưa xong được giao; tự cập nhật mỗi phút khi website hiển thị, cho tải lại thủ công, đánh dấu đã đọc. Trạng thái đọc lưu riêng theo tài khoản trên trình duyệt.
- Chấm công: `POST /api/attendances/check-in`, `POST /api/attendances/check-out`; đọc lại qua `GET /api/attendances/today` và `GET /api/attendances/me?month=YYYY-MM`. Cùng tài khoản xem được lịch sử giữa trình duyệt/tab; tự đồng bộ mỗi 15 giây, khi focus và sau thao tác. Không gửi giờ hoặc employee_id từ trình duyệt, không dùng cache làm nguồn công. Màu do backend tính theo giờ Việt Nam, giữ nguyên phần TIME khi hiển thị.
- Bảng công vàng: chỉ muộn hoặc sớm; đỏ: muộn và sớm, vắng không phép sau ca, thiếu/trùng công; xanh lá: đúng và đủ ca. Không tô vắng cho ngày tương lai, cuối tuần, trước ngày bắt đầu làm việc; nghỉ phép đã duyệt có nhãn riêng. Bấm ngày để gửi giải trình qua `POST /api/attendances/explanations`.
- `/phe-duyet` dành cho Admin xem và xử lý giải trình. Duyệt giữ màu và giờ gốc, thêm nhãn; không tự cộng công. Manager thấy thông báo không có quyền duyệt giải trình này.
- Nhắc chấm công theo lịch 08:00 và 17:00, Thứ 2–Thứ 6, giờ Việt Nam; ẩn nhắc theo trạng thái thực tế đọc từ server; chưa nhắc khi đóng website.
- Nút mặt trăng/mặt trời chuyển nền sáng/tối cho toàn bộ giao diện và ghi nhớ trên trình duyệt.
- Backend chưa có API làm thêm, tạo/duyệt nghỉ phép, lương, các loại phê duyệt ngoài giải trình công, tài liệu, hay lịch sử thông báo đồng bộ. Task và bình luận có API; xem hợp đồng hiện hành tại [`../docs/quy-uoc-api.md`](../docs/quy-uoc-api.md). Cần chuẩn bị bảng giải trình theo `backend/README.md` trước khi chạy phiên bản này.
- `/api/health`, `/api/auth/admin-dashboard` và `/api/auth/reports` là endpoint kiểm tra; hai endpoint sau hiện chỉ trả thông báo và thông tin token, chưa có dữ liệu nghiệp vụ để dựng dashboard/báo cáo.

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
- `context/`: trạng thái đăng nhập, giao diện và dữ liệu công việc dùng chung
- `layouts/`: khung ứng dụng
- `pages/`: các trang
- `services/`: lời gọi API
- `utils/`: hàm tiện ích
