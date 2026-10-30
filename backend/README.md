# 🚀 MiniERP Backend Service

Backend API service cho hệ thống **MiniERP** được xây dựng bằng Node.js, Express và Prisma ORM quản lý cơ sở dữ liệu PostgreSQL.

## Đơn làm thêm / tăng ca

Sau khi nhận bản có chức năng làm thêm, chạy một lần trong `backend` rồi khởi động lại backend:

```bash
npm run setup:overtime
npm run dev
```

Lệnh tạo bảng `work_overtime_requests` và `work_overtime_notifications`, chạy lại được và giữ dữ liệu cũ. Không cần cài thư viện mới hoặc generate Prisma cho phần này.

- Mục **Làm thêm** có đơn kế hoạch (từ hôm nay đến cùng ngày tháng sau, chặn ở ngày cuối tháng nếu tháng sau ngắn hơn) và đơn bổ sung (ngày trước hôm nay). Tính ngày theo `Asia/Ho_Chi_Minh`, cho phép cuối tuần và giờ qua ngày; khoảng giờ phải lớn hơn 0 và tối đa 24 giờ. Không nhận ngày trước ngày vào làm nếu hồ sơ đã có ngày vào làm.
- Nhân viên chỉ thấy đơn của mình; quản lý được xem/duyệt đơn thuộc phòng ban ghi nhận lúc gửi; Admin được xem/duyệt tất cả. Quản lý cùng phòng và tất cả Admin đang làm việc đều nhận thông báo, trừ người gửi. Một quyết định là đủ; không ai được tự duyệt đơn của mình hoặc xử lý lại đơn đã duyệt/hủy.
- Gửi đơn khóa giao dịch theo nhân viên để ngăn hai đơn trùng giờ, kể cả ca qua ngày. Duyệt/hủy khóa theo đơn để hai người không xử lý thành hai kết quả. Từ chối bắt buộc lý do; người gửi chỉ hủy khi đơn còn chờ. Người gửi nhận thông báo kết quả. Có thể đính kèm file vào đơn đang chờ; chỉ người có quyền xem đơn mới tải được file.
- Đơn ngày cũ chỉ vào hòm thông báo, không đẩy desktop. Đơn kế hoạch được xếp theo ngày làm gần nhất, kể cả đơn còn xa. Worker Web Push bắt đầu đẩy khi còn 0–3 ngày, nếu đơn vẫn chờ và người nhận chưa đọc: hôm nay/ngày mai `high`, sau 2 ngày `normal`, sau 3 ngày `low`. Đơn xa hơn tự đủ điều kiện khi đến gần ngày làm. Mỗi trình duyệt nhận tối đa một lần thành công cho mỗi thông báo; dừng đẩy nếu đã đọc, đã duyệt hoặc hủy. Cần backend đang chạy, cấu hình Web Push và trình duyệt đã đăng ký nhận thông báo.
- Hòm thư sắp chưa đọc trước, mức ưu tiên giảm dần, rồi thời gian mới nhất trước. Đơn làm thêm và bình luận lưu trạng thái đọc trong DB, đồng bộ giữa các tab/trình duyệt. Thông báo làm thêm hiển thị tối đa 200 mục, danh sách đơn tối đa 500 đơn gần nhất.

API: `GET/POST /api/overtime`, `GET /api/overtime/:id`, `POST /api/overtime/:id/review`, `POST /api/overtime/:id/cancel`, `GET /api/overtime/notifications`, `PATCH /api/overtime/notifications/read`. Tạo đơn: `{ mode: "past" | "planned", date: "YYYY-MM-DD", start_time: "HH:mm", end_time: "HH:mm", end_next_day: boolean, reason }`. Duyệt: `{ decision: "approved" | "rejected", note? }`.

Kiểm tra bằng `node --test scripts/check-overtime-contract.mjs`. Script cần quyền tạo database PostgreSQL tạm, dùng tài khoản riêng trong database đó, dùng bộ gửi push giả và tự dọn database kiểm thử; không gửi thông báo đến nhân viên thật. Kiểm tra thứ tự hòm thư từ `frontend`: `node --test src/utils/notificationOrder.test.js`.

---

## 🛠️ Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **ORM:** Prisma
* **Database:** PostgreSQL
* **Authentication:** JSON Web Token (JWT)

---

## 📂 Project Structure
```text
backend/
├── prisma/               # Cấu hình database và Prisma schema
├── src/
│   ├── config/           # Các file cấu hình hệ thống (Prisma client,...)
│   ├── controllers/      # Xử lý logic nghiệp vụ cho các API
│   ├── middlewares/      # Middleware kiểm tra xác thực và phân quyền (Auth, Role)
│   ├── routes/           # Định nghĩa các đường dẫn (endpoints) API
│   └── server.js         # File khởi động ứng dụng Express
├── .env                  # Biến môi trường (Local config)
├── package.json          # Quản lý dependencies và scripts
└── prisma7.config.ts     # Cấu hình mở rộng của Prisma
```
---

# Hướng Dẫn Cấu Hình & Tạo Database Từ A - Z

## Bước 1: Cài đặt PostgreSQL
Tải và cài đặt PostgreSQL từ trang chủ: postgresql.org/download (Khuyên dùng bản 15 hoặc 16).

Ghi nhớ mật khẩu của tài khoản postgres trong quá trình cài đặt.

Đảm bảo dịch vụ PostgreSQL đang chạy ở port mặc định 5432.

## Bước 2: Tạo Cơ Sở Dữ Liệu (miniERP)
Mở phần mềm pgAdmin 4 trên máy tính.

Nhập mật khẩu tài khoản postgres để kết nối vào server.

Ở cột bên trái, bấm chuột phải vào Databases -> Chọn Create -> Database...

Nhập tên Database là: miniERP rồi bấm Save.

## Bước 3: Cấu Hình Biến Môi Trường (.env)
Di chuyển vào thư mục backend trong Terminal / VS Code:
cd backend

Tạo file tên .env nằm ngay tại thư mục gốc của backend/.
Nhập nội dung cấu hình sau vào file .env:
PORT=5000
DATABASE_URL="postgresql://postgres:<MAT_KHAU_POSTGRES_CUA_BAN>@localhost:5432/miniERP?schema=public"
JWT_SECRET="mini_erp_super_secret_key_2026"

## Bước 4: Đồng Bộ Schema & Tạo Bảng Dữ Liệu
Chạy lệnh Prisma để tạo các bảng dữ liệu tự động vào PostgreSQL:
npx prisma db push

## Bước 5: Thêm Dữ Liệu Mẫu (Seed Data) Qua pgAdmin 4
Sau khi các bảng đã được tạo thành công ở Bước 4, bạn tiến hành thêm dữ liệu tài khoản mẫu vào bảng users:

Trong pgAdmin 4, nhấp chuột phải vào database miniERP -> Chọn Query Tool.
Dán đoạn mã SQL dưới đây vào cửa sổ soạn thảo query:

INSERT INTO "users" ("username", "password", "role")

VALUES
 
  ('admin', '$2a$12$LJXbz26R6D7ZJpbYbbvcZuGxJ7i8LlDLYRKeplVVUs0u2ClQtosNS', 'admin'),  
  
  ('quan_ly', '$2a$12$LJXbz26R6D7ZJpbYbbvcZuGxJ7i8LlDLYRKeplVVUs0u2ClQtosNS', 'manager'), 
  
  ('nhan_vien', '$2a$12$LJXbz26R6D7ZJpbYbbvcZuGxJ7i8LlDLYRKeplVVUs0u2ClQtosNS', 'member');

Bấm phím F5 (hoặc nhấn nút Execute/Play ▶️ màu xanh trên thanh công cụ) để chạy câu lệnh.
Thông báo INSERT 0 3 hiện lên ở mục Messages nghĩa là bạn đã tạo thành công 3 tài khoản mẫu



# Hướng Dẫn Chạy Server Backend
Cài đặt các gói thư viện phụ thuộc:
npm install

Khởi động server ở chế độ phát triển (Development):
npm run dev

Server sẽ chạy tại địa chỉ mặc định: http://localhost:5000

## Nhắn tin nội bộ

Sau khi pull phiên bản có chat, chạy một lần trong `backend`:

```bash
npm run setup:chat
npm run dev
```

Lệnh tạo các bảng chat bằng SQL, chạy lại được và giữ dữ liệu hiện có. Không cần thư viện mới hoặc generate Prisma để dùng chat. Lịch sử và trạng thái đọc lưu trong PostgreSQL; tệp mã hóa lưu ở `backend/uploads/chat`, cần sao lưu thư mục này cùng database khi chuyển máy.

### Mở khóa chat theo ngày và mã hóa dữ liệu

Chạy lại `npm run setup:chat` rồi khởi động lại backend để cập nhật bản có khóa chat. Script tạo `CHAT_ENCRYPTION_KEY` ngẫu nhiên trong `backend/.env` nếu chưa có, chuyển tin nhắn/tên tệp cũ sang mã hóa và tạo bản tệp `.enc`. Bản `.bin` cũ chỉ được xóa sau khi bản mã hóa và dữ liệu trong DB đã lưu thành công. Script kiểm tra khóa trên dữ liệu đã mã hóa, không tự thay khóa nếu có dữ liệu mã hóa mà thiếu khóa.

Giữ một bản sao an toàn của **CHAT_ENCRYPTION_KEY** cùng bản sao lưu database và thư mục uploads khi chuyển máy. Dùng đúng khóa cũ trên máy nhận, không tạo khóa mới cho database đã mã hóa; mất khóa sẽ không giải mã được lịch sử. `.env` và uploads đã được Git bỏ qua.

- Mỗi tài khoản mở khóa bằng mật khẩu đăng nhập hoặc mã cá nhân 6–12 chữ số. Tạo/đổi/quên mã đều cần xác nhận mật khẩu tài khoản; mã được băm bằng bcrypt.
- Phiên mở khóa gắn với tài khoản và phiên đăng nhập, lưu trong sessionStorage của tab; F5 vẫn giữ phiên trong ngày, đăng xuất xóa phiên mở khóa. Tab mới cần mở khóa riêng. Hết hạn lúc 00:00 theo `Asia/Ho_Chi_Minh` hoặc sớm hơn nếu phiên đăng nhập hết hạn. Các API chat đều bắt buộc phiên mở khóa hợp lệ. Đổi mã thu hồi các phiên mở khóa cũ.
- Nhập sai 5 lần tạm khóa xác thực chat 15 phút. Bộ đếm dùng chung cho PIN và mật khẩu của nhân viên, lưu trên DB nên đổi tab không bỏ qua giới hạn.
- Nội dung tin nhắn, tên tệp, nháp và dữ liệu tệp lưu bằng AES-256-GCM với IV ngẫu nhiên và thẻ xác thực 16 byte. Nháp mới lưu trên server; các nháp chat cũ trên trình duyệt được chuyển lên server sau khi mở khóa thành công. Tên nhóm, thành viên, thời gian và kích thước tệp là metadata chưa mã hóa.
- Đây là mã hóa dữ liệu khi lưu trên server; server giữ khóa và giải mã sau khi kiểm tra quyền. Chưa có mã hóa đầu cuối. Khi triển khai ngoài localhost cần HTTPS để bảo vệ mật khẩu và nội dung trên đường truyền.

API mở khóa: `GET /api/chat/security`, `POST /api/chat/security/unlock` với `{ method: "pin" | "password", credential }`, `PUT /api/chat/security/pin` với `{ method: "password", credential, pin }`. Token nhận được gửi qua `X-Chat-Unlock` ở các API chat. Hết phiên trả HTTP 423 / `CHAT_LOCKED`, không đăng xuất tài khoản miniERP.

Tham chiếu: [Node.js Crypto](https://nodejs.org/api/crypto.html), [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

API `/api/chat` yêu cầu đăng nhập và hồ sơ nhân viên đang làm việc. Chat riêng giữa hai người được dùng lại; nhóm có tối đa 50 thành viên, người tạo nhóm được thêm người. Chỉ thành viên được đọc/gửi tin và tải tệp, Admin cũng phải là thành viên. Thành viên mới xem được toàn bộ lịch sử nhóm. Tin nhắn tối đa 4.000 ký tự; ảnh, PDF, DOCX, XLSX, PPTX, TXT, CSV và ZIP tối đa 10 MB/tệp.

Giao diện có nút Nhắn tin cạnh hòm thông báo, lấy tin mới mỗi 4 giây khi đang mở cuộc trò chuyện và cập nhật số chưa đọc mỗi 10 giây khi website hiển thị. Chat hiện chưa gửi Web Push khi website đã đóng.

Kiểm tra API và quyền truy cập bằng `node --test scripts/check-chat-contract.mjs`. Kiểm tra dùng PostgreSQL đã cấu hình, tạo ba tài khoản tạm riêng rồi dọn chúng, tin nhắn và tệp kiểm thử; không gửi tin cho tài khoản thật.

## Lịch sử công và giải trình chấm bù

## Bảng lương

Sau khi pull phiên bản có bảng lương, chạy một lần trong thư mục `backend`:

```bash
npm run setup:payroll
npx prisma generate
```

Script tạo `public.payrolls` nếu chưa có; chạy lại được và giữ nguyên dữ liệu bảng hiện có. Khởi động lại backend sau khi chạy.

Sau khi nhận phiên bản này, tại thư mục `backend` chạy:

```bash
npm run setup:attendance
npx prisma generate
npm run dev
```

Chạy lại hai lệnh đầu khi nhận phần chọn giờ giải trình để bổ sung `requested_check_in` và `requested_check_out`. Giờ đề nghị dùng định dạng `HH:mm`, mặc định `07:59` và `17:01`; có thể chỉ gửi một giờ bằng cách đặt giờ còn lại là `null`. Khi gửi đơn, giờ đề nghị được lưu riêng và chưa thay đổi giờ chấm công.

Phần tách loại đơn cũng cần chạy lại `npm run setup:attendance` và `npx prisma generate` để thêm `request_type` và `original_attendance`:

- `correction`: bổ sung/điều chỉnh giờ công, không có `makeup_date`. Sau khi duyệt, cập nhật giờ được đề nghị; giữ nguyên giờ không đề nghị sửa và lưu giờ cũ trong `original_attendance` cùng người/thời điểm duyệt.
- `makeup`: đăng ký làm bù, bắt buộc ngày làm bù từ hôm nay trở đi (kể cả cuối tuần) và đủ giờ bắt đầu/kết thúc. Duyệt chỉ ghi nhận kế hoạch, không tự ghi đủ công.
- Cả hai loại không trừ phép năm. Màu bảng công dựa trên giờ công đã ghi nhận; trạng thái đơn hiển thị riêng. Đơn cũ giữ loại `legacy`, không sửa dữ liệu đã duyệt; đơn cũ đang chờ cần hủy và gửi lại để chọn đúng loại.

`setup:attendance` chạy SQL bổ sung ở `prisma/sql/attendance-explanations.sql` trong một transaction. Lệnh tạo bảng giải trình nếu chưa có, chạy lại được và không xóa/sửa bản ghi công. Dự án chưa có baseline Prisma Migrate nên phần bổ sung này không dùng `migrate reset` hoặc tự chạy `db push` trên dữ liệu hiện có.

- `GET /api/attendances/today`: công hôm nay của tài khoản đăng nhập, màu/trạng thái và yêu cầu đã gửi.
- `GET /api/attendances/me?month=YYYY-MM`: bảng công tháng của chính người gọi.
- `POST /api/attendances/explanations`: `{ date, reason, makeup_date? }`, chỉ gửi cho ngày cần giải trình, một yêu cầu/ngày; lý do 1–2000 ký tự. `makeup_date` không bắt buộc, phải là ngày làm việc từ hôm nay trở đi.
- `GET /api/attendances/explanations?status=pending|approved|rejected`: chỉ Admin, tối đa 500 yêu cầu gần nhất.
- `PUT /api/attendances/explanations/:id/review`: chỉ Admin, `{ decision: "approved" | "rejected", review_note? }`; từ chối bắt buộc lý do, không tự duyệt, không duyệt lại. Giờ chấm công gốc không thay đổi.

Mọi API yêu cầu Bearer token. Ca tính theo Asia/Ho_Chi_Minh, mốc vào 08:00:00, ra 17:00:00; SQL TIME không được cộng thêm 7 giờ khi hiển thị. Khóa transaction theo nhân viên/ngày ngăn hai trình duyệt tạo bản ghi vào ca trùng nhau. Dữ liệu công trùng đã có từ trước được đánh dấu cần kiểm tra, không tự xóa/gộp.

Màu: vàng nếu chỉ muộn hoặc sớm; đỏ nếu vừa muộn vừa sớm, vắng không phép sau khi hết ca hoặc thiếu/trùng công; xanh lá nếu đúng đủ ca. Ngày tương lai/cuối tuần/trước ngày bắt đầu làm việc không tính vắng; nghỉ phép đã duyệt đọc từ `Day_off_requests`. Duyệt giải trình giữ nguyên màu, gắn nhãn “Đã duyệt chấm bù”, chưa tự cộng giờ bù hay tính lương. Chưa có lịch nghỉ lễ/ca đặc thù; hồ sơ thiếu ngày bắt đầu được chú thích ở giao diện.
