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
- Chấm công tại trang chủ và `/cham-cong/bang-cong` qua `POST /api/attendances/check-in` và `POST /api/attendances/check-out`. Giờ vào/ra lấy từ phản hồi máy chủ; chặn bấm lặp khi đang gửi và có xác nhận trước khi ra ca. Kết quả gần nhất được lưu riêng từng tài khoản trong `sessionStorage` để hiển thị sau F5 trong tab hiện tại.
- Nhắc chấm công lúc **08:00 và 17:00, Thứ 2–Thứ 6, giờ Việt Nam**; bật/tắt trong hòm thông báo. Lời nhắc tương ứng được ẩn sau khi vào/ra ca thành công trên tab này. Chưa đọc được trạng thái từ thiết bị khác; không gửi thông báo khi đóng website.
- Nút mặt trăng/mặt trời chuyển nền sáng/tối và ghi nhớ trên trình duyệt.

Backend chưa có API **đọc chấm công hôm nay/bảng công tháng**, lương, nghỉ phép, làm thêm, phê duyệt, tài liệu, sửa/chuyển trạng thái/giao lại task và bình luận. Khung Bảng công hiện chỉ hiển thị kết quả hôm nay đã nhận trong tab, chưa tính công tháng từ dữ liệu thiếu. Thông báo đẩy, lịch nhắc theo ca làm và lịch sử đã đọc đồng bộ cũng cần API riêng.
