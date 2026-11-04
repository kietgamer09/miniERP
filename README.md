# miniERP

Ứng dụng quản lý nhân sự và công việc, gồm frontend React/Vite và backend Express/Prisma kết nối PostgreSQL. Hướng dẫn cài mới trên Windows dưới đây được viết theo từng bước để người chưa từng chạy dự án có thể làm theo.

## Chức năng

| Phần | Chức năng chính |
|---|---|
| Nhân sự | Nhân viên, phòng ban, hồ sơ, chấm công, bảng công, nghỉ phép, làm thêm và phê duyệt |
| Công việc | Dự án, thành viên, task, bình luận, tệp đính kèm; xem dạng danh sách, Kanban, lịch và timeline |
| Tiện ích | Tiền lương, tài liệu, thông báo desktop, chat cá nhân/nhóm, giao diện sáng/tối |

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 19, Vite, Ant Design, React Router |
| Backend | Node.js, Express 5 |
| Truy cập dữ liệu | Prisma 7 và PostgreSQL adapter |
| Cơ sở dữ liệu | PostgreSQL |
| Đăng nhập | JWT; mật khẩu được xác thực bằng bcrypt |

## Yêu cầu cài đặt

| Phần mềm | Phiên bản | Kiểm tra |
|---|---|---|
| Git | Bản hiện hành | `git --version` |
| Node.js và npm | Node.js 22 LTS trở lên | `node --version` và `npm --version` |
| PostgreSQL | Cài local, cổng mặc định `5432` | Kiểm tra dịch vụ PostgreSQL đang chạy |
| pgAdmin | Đi kèm PostgreSQL hoặc cài riêng | Dùng để tạo/khôi phục database bằng giao diện |

Làm lần lượt từ trên xuống. Không cần chạy lệnh Git push/pull ngoài bước clone dự án.

## Chạy dự án

### Bước 1. Cài công cụ

Cài các phần mềm sau. Khi cài PostgreSQL, có thể giữ cổng mặc định `5432`; ghi lại mật khẩu tài khoản `postgres` vì cần dùng trong cấu hình kết nối:

1. **Git** để tải mã nguồn.
2. **Node.js 22 LTS trở lên** (kèm npm). Nếu đã cài, kiểm tra trong PowerShell:

   ```powershell
   node --version
   npm --version
   ```

3. **PostgreSQL** và **pgAdmin**. Trong lúc cài PostgreSQL, có thể giữ cổng mặc định `5432`; ghi lại mật khẩu tài khoản `postgres`. PostgreSQL cần đang chạy khi khởi động backend.

Mã nguồn hiện không tạo tài khoản nhân viên/quản lý/admin mẫu. Để đăng nhập và dùng đầy đủ chức năng, cần có bản sao database miniERP đã được người quản trị cung cấp. Chỉ clone Git sẽ không tải database, tài khoản, dữ liệu công việc hay tệp tải lên.

### Bước 2. Lấy mã nguồn

Mở PowerShell tại thư mục muốn đặt dự án:

```powershell
git clone <URL_REPOSITORY>
cd miniERP
```

Thay `<URL_REPOSITORY>` bằng URL Git của nhóm. Nếu đã có thư mục dự án, mở PowerShell tại thư mục đó và bỏ qua bước clone.

### Bước 3. Tạo database và nạp dữ liệu

#### Phương án nên dùng: khôi phục bản sao từ máy đang có dữ liệu

Trên máy nguồn, tạo bản sao bằng pgAdmin: chuột phải database `miniERP` → **Backup...** → chọn định dạng **Custom** → chọn nơi lưu file, ví dụ `miniERP.backup` → **Backup**. Hoặc dùng PowerShell (sẽ hỏi mật khẩu PostgreSQL):

```powershell
pg_dump -h localhost -p 5432 -U postgres -d miniERP -F c -f miniERP.backup
```

Chuyển file backup cho máy mới bằng kênh nội bộ an toàn. Không commit file backup lên Git.

Trên máy mới, mở pgAdmin, kết nối PostgreSQL → chuột phải **Databases → Create → Database...** → đặt tên `miniERP` → **Save**. Chuột phải database vừa tạo → **Restore...** → chọn file backup → định dạng **Custom or tar** → **Restore**. Đích nên là database mới, rỗng.

Hoặc trong PowerShell, từ thư mục chứa file backup:

```powershell
createdb -h localhost -p 5432 -U postgres miniERP
pg_restore -h localhost -p 5432 -U postgres --no-owner --no-acl -d miniERP miniERP.backup
```

Nếu `createdb` báo database đã tồn tại, không xóa database đó. Dùng pgAdmin để tạo database đích khác, rồi thay `miniERP` trong `-d` bằng tên database đích. Tùy chọn `--no-owner --no-acl` giúp khôi phục khi máy mới không có role PostgreSQL của máy nguồn. Trong pgAdmin, chọn tùy chọn không khôi phục owner/privileges nếu có.

#### Nếu chưa có database nào để sao lưu

Tạo database rỗng trong pgAdmin như trên. Ở bước 5, `prisma db push` sẽ tạo cấu trúc bảng. Tuy nhiên database rỗng **vẫn chưa có tài khoản đăng nhập, nhân viên hay phòng ban**. Hãy xin người quản trị dữ liệu khởi tạo/cấp bản backup có dữ liệu trước khi sử dụng. Script `seed:cong-viec` chỉ tạo dự án và task mẫu trên hệ thống nhân sự đã có sẵn; nó không tạo tài khoản, nhân viên hay phòng ban.

### Bước 4. Cấu hình backend

Tạo file `backend/.env` (cùng cấp `backend/package.json`) với nội dung sau. Thay mật khẩu PostgreSQL và tạo một `JWT_SECRET` riêng, dài, ngẫu nhiên:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:MAT_KHAU_POSTGRES@localhost:5432/miniERP?schema=public"
JWT_SECRET="<SECRET_HEX_NGAU_NHIEN_96_KY_TU>"
```

Ví dụ tạo secret trong PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Sao chép chuỗi vừa in vào `JWT_SECRET`. Nếu mật khẩu PostgreSQL có ký tự đặc biệt như `@`, `:`, `/`, `#` hoặc `%`, hãy URL-encode phần mật khẩu trong `DATABASE_URL`. Không gửi nội dung `.env` qua chat công khai hoặc đưa vào Git.

### Bước 5. Cài backend và chuẩn bị database

Từ thư mục gốc repo:

```powershell
cd backend
npm install
```

#### Database mới hoàn toàn, chưa được khôi phục backup

Chỉ chạy `db push` trên database mới/rỗng. Lệnh này tạo bảng từ schema Prisma, không xóa nội dung database, nhưng không tạo dữ liệu người dùng:

```powershell
npx prisma db push
```

#### Database vừa khôi phục từ bản backup

Bỏ qua `npx prisma db push` để giữ nguyên cấu trúc và dữ liệu đã khôi phục. Nếu người quản trị yêu cầu đồng bộ schema, hỏi họ trước khi chạy lệnh thay đổi cấu trúc.

#### Chuẩn bị các bảng tính năng và Prisma Client

Với database mới, chạy toàn bộ các lệnh sau. Với database khôi phục, chạy nếu đây là lần cài mới trên máy này hoặc backup chưa có các bảng tương ứng; các script được thiết kế để chạy lại mà giữ dữ liệu:

```powershell
npm run setup:auth
npm run setup:attendance
npm run setup:notifications
npm run setup:web-push
npm run setup:chat
npm run setup:overtime
npm run setup:payroll
npx prisma generate
```

`setup:auth` thêm cột trạng thái đổi mật khẩu. Tài khoản cũ dùng mật khẩu `12345` được chuyển sang trạng thái bắt buộc đổi trong 30 ngày; tài khoản mới nhận mật khẩu tạm riêng, hết hạn sau 24 giờ và chỉ kích hoạt được một lần. Sau lần đăng nhập đó, phiên chỉ được đổi mật khẩu; nếu bỏ phiên hoặc mật khẩu hết hạn, Admin cần cấp lại. Mật khẩu mới dài ít nhất 8 ký tự và tối đa 72 byte UTF-8.

Web Push và chat có thể tự thêm khóa vào `backend/.env`. Sau khi chuyển máy, cần dùng lại các khóa của máy nguồn: `JWT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CHAT_ENCRYPTION_KEY` (nếu đã có). Giữ nguyên `CHAT_ENCRYPTION_KEY` để đọc được lịch sử chat đã mã hóa. Nếu backup uploads, khôi phục `backend/uploads` cùng database. Không xóa `.env` hoặc uploads của máy đang chạy.

Repo chưa có baseline Prisma Migrate. **Không chạy** `npx prisma migrate deploy`, `migrate reset` hoặc xóa database để sửa lỗi P3005/thiếu bảng. Dùng quy trình database mới ở trên hoặc script `setup:*` đúng tính năng.

#### Dữ liệu công việc mẫu (không bắt buộc)

Chỉ chạy nếu muốn thay các dự án mã `MAU-*` bằng dữ liệu demo:

```powershell
npm run seed:cong-viec
```

Seed yêu cầu ít nhất **8 nhân viên đang làm việc** và ít nhất **1 tài khoản quản lý**. Seed không tạo tài khoản hay nhân sự, và mỗi lần chạy sẽ thay các dự án `MAU-*` cùng task/bình luận liên quan. Không chạy trên dữ liệu thật nếu muốn giữ các dự án mẫu đó.

### Bước 6. Khởi động backend

Vẫn trong thư mục `backend`:

```powershell
npm run dev
```

Giữ cửa sổ terminal này mở. Kiểm tra backend và database tại [http://localhost:5000/api/health](http://localhost:5000/api/health). Kết quả thành công là JSON có thông báo kết nối. Truy cập `http://localhost:5000/` có thể trả `Cannot GET /`; backend chỉ cung cấp API, đây không phải lỗi nếu `/api/health` hoạt động.

### Bước 7. Cài và chạy frontend

Mở **cửa sổ PowerShell thứ hai**, về thư mục gốc repo rồi chạy:

```powershell
cd frontend
npm install
npm run dev
```

Mở URL Vite in trong terminal (thường là [http://localhost:5173](http://localhost:5173)). Mặc định frontend gọi backend tại `http://localhost:5000`. Nếu backend dùng địa chỉ/cổng khác, tạo `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Sau khi đổi `.env`, dừng Vite bằng `Ctrl+C` rồi chạy lại. Đăng nhập bằng tài khoản có sẵn trong database; username/mật khẩu do quản trị viên cấp.

### Tài khoản đăng nhập

Repo hiện **không có seed nhân viên và không có tài khoản mặc định**. Lệnh `seed:cong-viec` chỉ tạo dữ liệu demo công việc khi database đã có nhân viên. Người mới cần được cấp database backup đã có tài khoản hoặc nhờ quản trị viên tạo hồ sơ và cấp thông tin đăng nhập. Không dùng username/mật khẩu trong README mẫu hay dự án khác.

### Bước 8. Mở ứng dụng những lần sau

Mỗi lần làm việc, mở hai cửa sổ terminal:

**Terminal 1 — backend**

```powershell
cd C:\duong-dan\miniERP\backend
npm run dev
```

**Terminal 2 — frontend**

```powershell
cd C:\duong-dan\miniERP\frontend
npm run dev
```

Thay `C:\duong-dan\miniERP` bằng đường dẫn repo trên máy. PostgreSQL cũng phải đang chạy. Không cần chạy lại `npm install`, `db push`, setup hoặc seed mỗi lần mở app.

## Cập nhật code sau khi pull

Trong mỗi thư mục có `package.json` vừa thay đổi dependency, chạy `npm install`. Khi Prisma schema thay đổi, chạy từ `backend`:

```powershell
npx prisma generate
```

Khi bản cập nhật thêm bảng tính năng, chạy script tương ứng, ví dụ `npm run setup:payroll` cho bảng lương hoặc `npm run setup:chat` cho chat. Khởi động lại backend. Không chạy tất cả setup một cách máy móc nếu thông báo cập nhật chỉ yêu cầu một script cụ thể; giữ nguyên dữ liệu hiện có.

`git pull` chỉ cập nhật mã nguồn, **không** đồng bộ database, `.env` hoặc `backend/uploads`.

## Sao lưu và chuyển dữ liệu sang máy khác

Sao lưu đồng bộ các phần sau:

- Database PostgreSQL (`pg_dump`/Backup trong pgAdmin).
- `backend/uploads` (tệp đính kèm và tệp chat).
- Các khóa bí mật trong `backend/.env`; không gửi file này qua Git.

Trên máy đích, khôi phục database và uploads, cấu hình `DATABASE_URL` trỏ đến database vừa khôi phục, rồi cài thư viện và chạy `npx prisma generate`. Đảm bảo khóa chat và VAPID giữ nguyên để dữ liệu mã hóa/đăng ký Push cũ còn dùng được. Nếu chỉ muốn hai máy cùng truy cập một DB, có thể cấu hình backend kết nối máy chủ PostgreSQL dùng chung; cần mở mạng và thiết lập quyền truy cập PostgreSQL phù hợp.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
| --- | --- |
| `ECONNREFUSED` hoặc không kết nối được PostgreSQL | Khởi động dịch vụ PostgreSQL; kiểm tra host, port, username/password và `DATABASE_URL`. |
| `Cannot GET /` tại cổng 5000 | Bình thường; kiểm tra `/api/health`. |
| `P1000` / password authentication failed | Sửa thông tin đăng nhập PostgreSQL trong `backend/.env`. |
| `P1001` / can't reach database server | Kiểm tra PostgreSQL đang chạy và cổng `5432`. |
| `P2021` / relation hoặc table không tồn tại | Chạy `setup:*` tương ứng; database mới cần `npx prisma db push` trước. |
| `P3005` / `No migration found` | Repo chưa dùng migration baseline; không chạy `migrate deploy`. Dùng database mới với `db push`, hoặc khôi phục backup đúng. |
| `prisma.<model> is undefined` | Trong `backend`, chạy `npx prisma generate`, rồi khởi động lại server. |
| `EADDRINUSE` ở cổng 5000/5173 | Đóng tiến trình ứng dụng đang chiếm cổng hoặc đổi cổng tương ứng. |
| Frontend báo máy chủ không xử lý yêu cầu | Mở `/api/health`, xem lỗi trong terminal backend và Network → Response của request. Không chia sẻ token hoặc `.env`. |
| Không đăng nhập được sau khi tạo DB rỗng | DB rỗng không có tài khoản. Khôi phục database có nhân sự hoặc nhờ quản trị viên cấp dữ liệu/tài khoản. |
| Bảng lương công ty trống | Chưa chắc là lỗi: cần có dữ liệu payroll đã được tạo cho tháng đang xem. |

## Kiểm tra mã nguồn

Chạy từ thư mục tương ứng:

```powershell
# frontend
npm run lint
npm run build
```

Backend có một số script kiểm tra trong `backend/scripts/check-*.mjs`; xem đầu file trước khi chạy vì một số script cần PostgreSQL và tạo dữ liệu kiểm thử tạm.

## Cấu trúc thư mục

- `frontend/src/pages`, `components`, `layouts`: các màn hình và giao diện.
- `frontend/src/services`: gọi API; `context`, `hooks`, `utils`: trạng thái và logic dùng chung.
- `backend/src/routes`, `controllers`, `middlewares`: API và phân quyền.
- `backend/src/services`, `utils`: nghiệp vụ dùng chung.
- `backend/prisma/schema.prisma`: cấu trúc dữ liệu Prisma.
- `backend/prisma/sql`, `backend/scripts/setup-*`: bảng bổ sung cho các chức năng.
- `backend/prisma/seed-cong-viec.js`: seed dự án/task demo, không seed người dùng.
- `backend/uploads`: file do người dùng tải lên; không được Git theo dõi.
- `docs`: BRD, ERD, hợp đồng API và tài liệu dự án.

Xem thêm [README backend](backend/README.md) và [README frontend](frontend/README.md).
