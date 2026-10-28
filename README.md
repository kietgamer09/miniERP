# miniERP

Ứng dụng quản lý nhân sự và công việc gồm frontend React/Vite và backend Express/Prisma/PostgreSQL.

## Chạy dự án

1. Cấu hình PostgreSQL và khởi động backend theo hướng dẫn trong [`backend/README.md`](backend/README.md).
2. Chạy frontend theo hướng dẫn trong [`frontend/README.md`](frontend/README.md). Mặc định frontend gọi backend tại `http://localhost:5000`; có thể đổi bằng `frontend/.env` (`VITE_API_URL`).

Frontend xác thực qua `POST /api/auth/login`, lấy hồ sơ qua `GET /api/users/me` và đổi mật khẩu qua `PUT /api/users/change-password`.

## Chức năng hiện có

- Tệp đính kèm trong chi tiết task, dự án và đơn nghỉ phép: tải lên/tải xuống/xóa theo quyền; tối đa 10 MB/file và 30 file/mục. Hỗ trợ PDF, PNG/JPEG/WebP, DOCX/XLSX/PPTX, TXT/CSV. Đơn nghỉ phép mở hộp đính kèm sau khi gửi, hoặc mở lại từ danh sách tệp bên dưới lịch; người duyệt xem tệp trong hộp xử lý đơn. Dự án hoàn thành và đơn đã duyệt/từ chối chỉ cho tải xuống.
- File và metadata lưu tại `backend/uploads/attachments/` trên máy chạy backend, được bỏ qua bởi Git. Khi chuyển máy hoặc sao lưu phải sao chép thư mục này cùng database tương ứng. Không cần cài thêm package hay migrate; khởi động lại backend để nhận route mới. API luôn kiểm tra đăng nhập và quyền đối với đối tượng chứa tệp, không phục vụ uploads công khai. Chỉ người tải lên hoặc Admin được xóa khi đối tượng còn cho phép thay đổi.

- Danh sách, tạo, sửa, xóa dự án rỗng, hoàn thành/mở lại dự án; quản lý thành viên; tạo, giao, sửa và xem task theo quyền backend.
- Trang chủ và **Việc của tôi / Việc được giao** dùng `GET /api/tasks/mine`; hỗ trợ Kanban kéo thả, task quá hạn lên đầu, xem chi tiết và bình luận task.
- Chi tiết task có danh sách bình luận cũ đến mới; thành viên dự án và Admin được đọc/gửi. Bình luận là văn bản thuần và không sửa/xóa.
- Trang chủ có thẻ số dự án đang quản lý (Admin: tất cả dự án đang thực hiện). Thẻ đơn nghỉ phép chờ duyệt phụ thuộc hợp đồng API Nhân sự đang chờ xác nhận.
- Phòng ban hiển thị từ `GET /api/departments/department-list`, kể cả khung phòng ban trên màn dự án. Backend hiện chỉ có API đọc phòng ban; các nút thêm/sửa/xóa tạm vô hiệu hóa.
- Hòm thông báo nằm bên trái ảnh đại diện: hiển thị công việc chưa xong được giao cho tài khoản, mở dự án khi bấm vào; có đếm chưa đọc, đánh dấu tất cả đã đọc. Cập nhật mỗi phút khi website đang hiển thị, cho tải lại thủ công. Trạng thái đã đọc lưu riêng từng tài khoản trên trình duyệt, chưa đồng bộ giữa thiết bị và chưa có lịch sử thông báo từ server.
- Chấm công tại trang chủ và `/cham-cong/bang-cong`: ghi và đọc lịch sử từ PostgreSQL. Cùng tài khoản đăng nhập ở tab/trình duyệt khác vẫn xem được công; tự đồng bộ mỗi 15 giây và khi quay lại tab, không dùng sessionStorage làm nguồn dữ liệu công.
- Bảng công tháng: vàng nếu chỉ vào muộn hoặc ra sớm; đỏ nếu vừa muộn vừa sớm, không có công/nghỉ phép duyệt sau khi hết ngày làm việc, hoặc thiếu/trùng lượt công cần kiểm tra; xanh lá nếu vào trước/đúng 08:00 và ra sau/đúng 17:00. Cuối tuần, ngày tương lai, trước ngày bắt đầu làm việc không tính vắng. Nghỉ phép đã duyệt có nhãn riêng.
- Bấm ngày công để gửi lý do và đề nghị chấm bù. **Admin duyệt tại Phê duyệt**, không tự duyệt hoặc duyệt hai lần. Sau duyệt giữ nguyên màu/giờ công thật và thêm nhãn **Đã duyệt chấm bù**; không tự cộng công hay sửa nhật ký.
- Nhắc chấm công lúc **08:00 và 17:00, Thứ 2–Thứ 6, giờ Việt Nam**; ẩn lời nhắc dựa trên trạng thái đã đọc từ máy chủ. Không gửi thông báo khi đóng website.
- Nút mặt trăng/mặt trời chuyển nền sáng/tối và ghi nhớ trên trình duyệt.

Máy backend cần chạy `npm run setup:attendance` và `npx prisma generate` một lần sau khi nhận phần giải trình (xem `backend/README.md`). Script chỉ thêm bảng giải trình, không xóa/sửa công hiện có.

Backend chưa có API lương, làm thêm, tài liệu và các loại phê duyệt ngoài các luồng đã ghi trong README. Quy tắc ca hiện cố định 08:00–17:00 các ngày Thứ 2–Thứ 6, chưa có lịch nghỉ lễ/ca đặc thù. Nếu thiếu ngày bắt đầu làm việc, UI nêu rõ các ngày trống là chưa có công/nghỉ phép duyệt.

## Phần Công việc: chạy và dữ liệu demo

### Khởi động

1. Cài PostgreSQL và tạo một database dùng riêng cho máy đang chạy. Cấu hình `DATABASE_URL`, `PORT` và `JWT_SECRET` trong `backend/.env` theo [`backend/README.md`](backend/README.md).
2. Với database **mới, rỗng**, từ thư mục `backend` chạy:

   ```bash
   npm install
   npx prisma db push
   npx prisma generate
   ```

   Repo hiện chưa có bộ Prisma Migrate để dùng `migrate deploy`. Không chạy lệnh reset trên database đang có dữ liệu.
3. Chạy quy trình tạo dữ liệu Nhân sự của nhóm trước. Sau đó, từ `backend` chạy seed Công việc:

   ```bash
   npm run seed:cong-viec
   ```

   Script yêu cầu ít nhất 8 nhân viên `dang_lam_viec`, gồm ít nhất một tài khoản `manager`. Script chỉ thay các dự án có mã `MAU-*` và task, bình luận, thành viên liên quan; không chạy nếu cần giữ chỉnh sửa thủ công trong các dự án đó. Hiện repo chưa có seed Nhân sự đi kèm.
4. Khởi động backend trong `backend` bằng `npm run dev`. Từ terminal khác, vào `frontend`, chạy `npm install` rồi `npm run dev`. Mặc định frontend gọi `http://localhost:5000`; cấu hình `VITE_API_URL` trong `frontend/.env` nếu backend ở địa chỉ khác.

### Tài khoản mẫu

Tài khoản Nhân sự được lưu trong PostgreSQL và không được tạo bởi seed Công việc. Lấy đúng username, vai trò và trạng thái từ database; không có mật khẩu nào được commit trong repo. Lệnh chỉ đọc danh sách tài khoản:

```sql
SELECT e.fullname, u.username, u.role, e.status
FROM employees e
JOIN users u ON u.user_id = e.user_id
ORDER BY u.role, e.fullname;
```

Để demo, chuẩn bị một Admin/HR, một Quản lý và hai Nhân viên đang làm việc (An và Bình). Xác nhận mật khẩu với người phụ trách dữ liệu Nhân sự; nhân viên mới tạo theo cấu hình hiện tại có mật khẩu mặc định do API Nhân sự đặt, không áp dụng mặc định đó cho mọi tài khoản đã tồn tại.

### API phần Công việc

Danh sách hợp đồng, quyền, lỗi và hướng dẫn Postman đầy đủ ở [`docs/quy-uoc-api.md`](docs/quy-uoc-api.md). Các endpoint chính:

- Dự án: `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, hoàn thành/mở lại, thành viên và task của dự án.
- Tổng số dự án: `GET /api/projects/summary` (Quản lý/Admin).
- Task: `GET /api/tasks/mine`, `GET/PUT /api/tasks/:id`, `PATCH /api/tasks/:id/status`.
- Bình luận: `GET/POST /api/tasks/:id/comments`; không có API sửa hoặc xóa.

Kịch bản demo tuần 6, tình huống từ chối và checklist nghiệm thu nằm ở [`docs/kich-ban-demo-cong-viec.md`](docs/kich-ban-demo-cong-viec.md).
