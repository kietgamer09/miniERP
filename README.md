# miniERP

Ứng dụng quản lý nhân sự và công việc gồm frontend React/Vite và backend Express/Prisma/PostgreSQL.

## Chạy dự án

1. Cấu hình PostgreSQL và khởi động backend theo hướng dẫn trong [`backend/README.md`](backend/README.md).
2. Chạy frontend theo hướng dẫn trong [`frontend/README.md`](frontend/README.md). Mặc định frontend gọi backend tại `http://localhost:5000`; có thể đổi bằng `frontend/.env` (`VITE_API_URL`).

Frontend xác thực qua `POST /api/auth/login`, lấy hồ sơ qua `GET /api/users/me` và đổi mật khẩu qua `PUT /api/users/change-password`.

## Chức năng hiện có

- Danh sách, tạo, sửa, xóa, hoàn thành/mở lại dự án; quản lý thành viên; tạo và xem task theo quyền backend.
- Trang chủ và **Việc của tôi / Việc được giao** hiển thị task của nhân viên đăng nhập, tổng hợp từ danh sách dự án và `GET /api/projects/:id/tasks`. Quá hạn luôn lên đầu khi sắp xếp.
- Phòng ban hiển thị từ `GET /api/departments/department-list`, kể cả khung phòng ban trên màn dự án. Backend hiện chỉ có API đọc phòng ban; các nút thêm/sửa/xóa tạm vô hiệu hóa.
- Hòm thông báo nằm bên trái ảnh đại diện: hiển thị công việc chưa xong được giao cho tài khoản, mở dự án khi bấm vào; có đếm chưa đọc, đánh dấu tất cả đã đọc. Cập nhật mỗi phút khi website đang hiển thị, cho tải lại thủ công. Trạng thái đã đọc lưu riêng từng tài khoản trên trình duyệt, chưa đồng bộ giữa thiết bị và chưa có lịch sử thông báo từ server.
- Chấm công tại trang chủ và `/cham-cong/bang-cong`: ghi và đọc lịch sử từ PostgreSQL. Cùng tài khoản đăng nhập ở tab/trình duyệt khác vẫn xem được công; tự đồng bộ mỗi 15 giây và khi quay lại tab, không dùng sessionStorage làm nguồn dữ liệu công.
- Bảng công tháng: vàng nếu chỉ vào muộn hoặc ra sớm; đỏ nếu vừa muộn vừa sớm, không có công/nghỉ phép duyệt sau khi hết ngày làm việc, hoặc thiếu/trùng lượt công cần kiểm tra; xanh lá nếu vào trước/đúng 08:00 và ra sau/đúng 17:00. Cuối tuần, ngày tương lai, trước ngày bắt đầu làm việc không tính vắng. Nghỉ phép đã duyệt có nhãn riêng.
- Bấm ngày công để gửi lý do và đề nghị chấm bù. **Admin duyệt tại Phê duyệt**, không tự duyệt hoặc duyệt hai lần. Sau duyệt giữ nguyên màu/giờ công thật và thêm nhãn **Đã duyệt chấm bù**; không tự cộng công hay sửa nhật ký.
- Nhắc chấm công lúc **08:00 và 17:00, Thứ 2–Thứ 6, giờ Việt Nam**; ẩn lời nhắc dựa trên trạng thái đã đọc từ máy chủ. Không gửi thông báo khi đóng website.
- Nút mặt trăng/mặt trời chuyển nền sáng/tối và ghi nhớ trên trình duyệt.

Máy backend cần chạy `npm run setup:attendance` và `npx prisma generate` một lần sau khi nhận phần giải trình (xem `backend/README.md`). Script chỉ thêm bảng giải trình, không xóa/sửa công hiện có.

Backend chưa có API lương, tạo/duyệt nghỉ phép, làm thêm, các loại phê duyệt ngoài giải trình công, tài liệu, sửa/chuyển trạng thái/giao lại task và bình luận. Quy tắc ca hiện cố định 08:00–17:00 các ngày Thứ 2–Thứ 6, chưa có lịch nghỉ lễ/ca đặc thù. Nếu thiếu ngày bắt đầu làm việc, UI nêu rõ các ngày trống là chưa có công/nghỉ phép duyệt.
