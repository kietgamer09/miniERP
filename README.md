# miniERP

Ứng dụng quản lý nhân sự và công việc: React/Vite/Ant Design ở frontend, Express/Prisma 7/PostgreSQL ở backend.

## Cấu trúc

- frontend/src/pages, components: trang và thành phần giao diện.
- frontend/src/services, context, hooks, utils: API, phiên đăng nhập, dữ liệu dùng chung và quy tắc giao diện.
- backend/src/routes, controllers, middlewares: API và phân quyền.
- backend/src/services, utils: xử lý nghiệp vụ, thông báo, chat và chấm công.
- backend/prisma/schema.prisma: model Prisma; prisma/sql: SQL bổ sung tính năng.
- backend/scripts: chuẩn bị database và kiểm thử.
- docs: BRD, ERD, hợp đồng API, kịch bản demo. Xem [hợp đồng API](docs/quy-uoc-api.md).
- backend/uploads: tệp người dùng tải lên, không nằm trong Git.

## Chạy trên máy

1. Chuẩn bị PostgreSQL và backend/.env theo [hướng dẫn backend](backend/README.md).
2. Trong backend: npm install, chuẩn bị database, chạy npx prisma generate rồi npm run dev.
3. Trong frontend: npm install rồi npm run dev. VITE_API_URL mặc định http://localhost:5000.
4. Mở địa chỉ Vite in ra. Đăng nhập bằng tài khoản trong database có hồ sơ nhân viên đang làm việc.

Pull Git không chuyển dữ liệu PostgreSQL, .env hay uploads sang máy khác. Khi chuyển máy cần sao lưu/khôi phục database, sao chép uploads và các khóa cấu hình tương ứng.

## Sau khi pull

Chạy npm install trong mỗi thư mục có dependency thay đổi. Khi schema Prisma đổi, chạy npx prisma generate trong backend và khởi động lại backend. Generate chỉ tạo client, không tạo bảng database.

Với database đang có dữ liệu, chạy setup tương ứng phần vừa nhận:

| Tính năng | Lệnh trong backend |
| --- | --- |
| Giải trình công | npm run setup:attendance |
| Bình luận/thông báo | npm run setup:notifications |
| Web Push | npm run setup:web-push |
| Chat | npm run setup:chat |
| Làm thêm | npm run setup:overtime |
| Tiền lương | npm run setup:payroll |

Repo chưa có baseline Prisma Migrate để chạy migrate deploy. Không reset database đang dùng. Database mới hoàn toàn có thể khởi tạo model bằng npx prisma db push, sau đó chạy các setup SQL cho tính năng dùng bảng ngoài Prisma.

## Chức năng

- Nhân viên, phòng ban, hồ sơ cá nhân; thao tác theo quyền backend.
- Dự án, thành viên, task, bình luận, tệp đính kèm; công việc có Danh sách/Kanban/Lịch/Timeline.
- Chấm công và bảng công tháng lấy từ PostgreSQL; ca 08:00–17:00, Thứ 2–Thứ 6, giờ Việt Nam.
- Nghỉ phép, giải trình và làm thêm có luồng phê duyệt. Đơn điều chỉnh giờ được duyệt cập nhật giờ công và lưu dấu vết; đơn làm bù chỉ là kế hoạch, chưa tự cộng công.
- Tiền lương cá nhân/toàn công ty và xuất Excel. Bảng công ty đọc dữ liệu payrolls đã lưu; bảng mới tạo còn trống. API tính lương dành cho admin; xem lương không ghi database, bản đã thanh toán được bảo vệ khi tính lại.
- Thông báo công việc, bình luận, nhắc hạn; Web Push cần đăng ký trình duyệt, backend chạy và HTTPS khi triển khai.
- Chat trực tiếp/nhóm, ảnh/tệp, khóa truy cập theo ngày; cần giữ CHAT_ENCRYPTION_KEY khi chuyển dữ liệu.
- Nền sáng/tối, lịch sử điều hướng và nháp theo tài khoản trên trình duyệt. Nháp không đồng bộ máy khác và không giữ file chưa tải lên.

## Dữ liệu mẫu và giới hạn

Seed công việc: npm run seed:cong-viec trong backend. Cần dữ liệu nhân sự trước; seed có thể thay các dự án MAU-* nên không chạy lại nếu muốn giữ thay đổi ở các dự án mẫu. Không seed mỗi lần mở server.

Chưa có lịch nghỉ lễ/ca tùy chỉnh. Phần lương còn dùng mức mặc định 10.000.000 khi chưa có bản lương lưu; chưa có màn hình cấu hình mức lương từng nhân viên. Không dùng bản xem thử làm chứng từ trả lương.

## Kiểm tra và lỗi thường gặp

Frontend: npm run build và npm run lint. Backend có các script check-* trong scripts; một số dùng database tạm hoặc dữ liệu kiểm thử, đọc script trước khi chạy.

- Cannot GET / ở cổng 5000: backend không có trang chủ; kiểm tra /api/health.
- Thiếu token khi mở URL API trực tiếp: trình duyệt không tự gắn Bearer token như frontend.
- prisma.payrolls undefined: chạy npx prisma generate rồi khởi động lại backend.
- P2021 thiếu public.payrolls: chạy npm run setup:payroll.
- P3005/No migration found: không dùng migrate deploy cho repo chưa có baseline; theo quy trình database mới hoặc setup tính năng bên trên.

Git: không đưa .env, node_modules, dist, uploads vào commit. PR vào nhánh phát triển đã thống nhất; người dùng tự pull/push. Thay đổi file dùng chung cần phối hợp trước.
