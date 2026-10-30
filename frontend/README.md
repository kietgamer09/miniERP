# miniERP Frontend

React, Vite, Ant Design; API thật từ backend Express/PostgreSQL.

## Chạy

Trong frontend:

```bash
npm install
npm run dev
```

Có thể tạo .env với VITE_API_URL=http://localhost:5000. Khởi động lại Vite sau khi đổi biến môi trường. Mở địa chỉ Vite in ra, đăng nhập bằng tài khoản trong DB.

## Cấu trúc và kiểm tra

- pages/components: giao diện; layouts: khung ứng dụng.
- services: lời gọi API qua http.js; AuthProvider đồng bộ token vào request.
- context/hooks: dữ liệu dùng chung; utils: ngày, trạng thái công, nháp, thông báo.
- config/menu.jsx: menu và phân quyền giao diện; backend kiểm tra quyền độc lập.
- public/push-sw.js: nhận Web Push, không cache API.

npm run build tạo bản production; npm run lint kiểm tra mã. npm run preview chỉ xem bản build frontend, vẫn cần backend riêng.

## Luồng hiện có

Dự án, công việc (Danh sách/Kanban/Lịch/Timeline), nhân viên, phòng ban, hồ sơ, chấm công, nghỉ phép, làm thêm, phê duyệt, tiền lương, tài liệu, chat và thông báo. Quyền thao tác dựa trên vai trò và dữ liệu backend trả về.

Nháp lưu theo tài khoản trên trình duyệt, không đồng bộ máy khác. Công và lịch sử trò chuyện lấy từ backend. Để nhận Web Push khi đóng tab, bật thông báo desktop và cấp quyền trình duyệt; triển khai cần HTTPS và backend tiếp tục chạy.

## Khi lỗi kết nối

Kiểm tra backend /api/health. Trong Network, xem request thất bại, status và response; không chia sẻ token. Mở URL API trực tiếp trên thanh địa chỉ không tự gửi Authorization.

Sau pull có thư viện mới, chạy npm install. Thiếu bảng DB hoặc Prisma Client cũ xử lý theo [README backend](../backend/README.md). Danh sách lương công ty trống có thể do tháng chưa có bản lương lưu, không phải luôn là lỗi kết nối.
