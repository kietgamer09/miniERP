# Kiểm tra API dự án bằng Postman / Thunder Client

## Kiểm tra từ frontend

1. Chạy `npm run dev` trong backend và trong frontend bằng hai terminal riêng.
2. Frontend dùng `VITE_API_URL`, mặc định `http://localhost:5000`. Nếu backend chạy cổng khác, cấu hình biến này trong `frontend/.env` và khởi động lại frontend.
3. Đăng xuất và đăng nhập lại để phiên lưu `employee_id` từ phản hồi login. Mở menu Dự án (`/du-an`).
4. Danh sách lấy từ `GET /api/projects`, hiển thị tên quản lý, thành viên, ngày và tiến độ. Dữ liệu rỗng hiển thị “Chưa có dự án”; lỗi backend hiển thị nguyên thông điệp và nút Thử lại.
5. Manager/admin bấm Thêm dự án, nhập mã, tên và hai ngày, rồi Lưu. Kiểm tra request POST trong DevTools → Network và dự án mới xuất hiện sau khi tải lại.
6. Admin hoặc người có employee_id trùng manager_id thấy nút Sửa. Mã dự án bị khóa; lưu gửi PUT với name, description, start_date, end_date. Kiểm tra dữ liệu đã lưu sau khi tải lại trang.
7. Thử tên trống, ngày kết thúc trước ngày bắt đầu, mã trùng hoặc ngày kết thúc trước hạn task. Form giữ dữ liệu để sửa và hiển thị lỗi; không đóng khi API thất bại.

Tài khoản hiện có phải gắn với hồ sơ nhân viên đang làm việc. Ngày 26/10/2026 đã sửa bộ tài khoản mẫu trên database hiện tại: admin → user_id 7 / employee_id 1; quan_ly → user_id 8 / employee_id 2; nhan_vien → user_id 9 / employee_id 3 (role employee). Mật khẩu giữ nguyên. Các bản ghi trùng còn lại được đổi tên theo mẫu `<username>_legacy_<user_id>`, không xóa hoặc chuyển liên kết. Cần đăng xuất và đăng nhập lại để token dùng đúng user_id.

Script `backend/scripts/repair-sample-logins.mjs` ghi lại thao tác sửa cho đúng bộ dữ liệu mẫu này. Mặc định chỉ xem kế hoạch rồi rollback; `--apply` mới lưu. Không dùng cho database khác nếu chưa đối chiếu các ID. Nếu xuất hiện username trùng mới, API login trả 409 thay vì chọn ngẫu nhiên một tài khoản.

## 1. Chuẩn bị

Trong terminal ở thư mục dự án:

```powershell
cd C:\GitProject\miniERP\backend
npm run dev
```

Database PostgreSQL phải chạy, DATABASE_URL và JWT_SECRET trong môi trường backend phải được cấu hình, Prisma Client đã được generate theo schema. Dùng database thử nghiệm cho các bước ghi dữ liệu dưới đây.

Chuẩn bị tài khoản thật có role employee, manager, admin; thêm một manager khác để thử quyền sửa. Mỗi tài khoản cần hồ sơ employees gắn đúng user_id, status = dang_lam_viec. Không dùng user_id thay cho employee_id.

Tạo biến `base_url = http://localhost:5000` (đổi cổng nếu PORT khác), `token_nv`, `token_ql`, `token_admin`, `token_ql_khac`, `project_id`. Đăng nhập lần lượt qua `POST {{base_url}}/api/auth/login`, body JSON:

```json
{"username":"TEN_TAI_KHOAN_THAT","password":"MAT_KHAU_THAT"}
```

Copy trường `token` trong phản hồi vào biến tương ứng. Với API dự án, chọn Authorization → Bearer Token → `{{token_ql}}` hoặc token cần thử. Body chọn raw → JSON (Thunder Client: JSON); header Content-Type là application/json. Không chia sẻ token/mật khẩu.

## 2. Thử thêm → danh sách → sửa

1. `POST {{base_url}}/api/projects` bằng token_ql (ngày kết thúc mới phải từ hôm nay theo múi giờ Việt Nam):

```json
{"code":"DA-TEST-01","name":"Dự án kiểm tra","description":"Thử API","start_date":"2026-10-27","end_date":"2026-11-30"}
```

Kỳ vọng 201. Copy id trả về vào project_id; ghi lại manager_id (employee_id người tạo).

2. `GET {{base_url}}/api/projects`, không body. Kỳ vọng 200, mảng có dự án vừa tạo, members_count = 1, tasks_total/tasks_done/progress_percent = 0.

3. `PUT {{base_url}}/api/projects/{{project_id}}` bằng token_ql:

```json
{"name":"Dự án đã sửa","description":"Mô tả mới","start_date":"2026-10-27","end_date":"2026-12-31"}
```

Kỳ vọng 200. Gọi lại GET để xác nhận đã lưu. Sửa cần gửi đủ 3 trường name/start_date/end_date; không gửi code hoặc gửi đúng mã cũ.

## 3. Chuẩn bị task để kiểm tra tiến độ và hạn chót

Chạy SQL trong công cụ quản lý PostgreSQL trên database thử nghiệm. Thay **123** bằng project_id vừa tạo, **456** bằng manager_id trả về (nhân viên thật). Chạy một lần; chạy nhiều lần sẽ thêm task và làm thay đổi số đếm.

```sql
-- Xác nhận người tạo có đúng một dòng thành viên.
SELECT employee_id, COUNT(*) FROM project_members
WHERE project_id = 123 GROUP BY employee_id;

INSERT INTO tasks (project_id, title, assignee_id, created_by, due_date, status)
VALUES
  (123, 'Task thử đã xong', 456, 456, '2026-11-10', 'xong'),
  (123, 'Task thử đang làm', 456, 456, '2026-11-20', 'dang_lam');
```

GET lại bằng manager hoặc admin: nếu dự án chỉ có hai task trên thì tasks_done = 1, tasks_total = 2, progress_percent = 50.

Để thử employee thấy đúng dự án, dùng SQL sau với **789** là employee_id thật của tài khoản token_nv. Thử danh sách trước và sau khi thêm thành viên:

```sql
INSERT INTO project_members (project_id, employee_id)
VALUES (123, 789) ON CONFLICT (project_id, employee_id) DO NOTHING;
```

## 4. Bảng kiểm tra

Các thay đổi body dưới đây dựa trên body hợp lệ ở mục 2. Dùng mã mới mỗi khi muốn tạo thành công.

| # | Cách thử | Kỳ vọng |
|---|---|---|
| 1 | Manager POST body hợp lệ | 201; đúng 1 thành viên là người tạo |
| 2 | Employee POST cùng body | 403 |
| 3 | POST start_date = 2026-10-28, end_date = 2026-10-27 | 400, ngày kết thúc không được trước ngày bắt đầu |
| 4 | POST start_date = 2026-10-25, end_date = 2026-10-25 (hôm qua) | 400, ngày kết thúc dự án mới không được trước hôm nay |
| 5 | POST mã mới, start_date và end_date cùng 2026-11-01 | 201 |
| 6 | POST trùng code đã tạo | 409 |
| 7 | GET không gửi Authorization | 401 |
| 8 | GET với Bearer abc | 401 |
| 9 | Employee GET trước/sau SQL thêm thành viên | Chỉ thấy dự án mình tham gia |
| 10 | Admin GET | Thấy tất cả dự án |
| 11 | PUT bằng token_ql_khac | 403 |
| 12 | PUT bằng chủ dự án hoặc admin, body hợp lệ | 200; GET xác nhận thay đổi |
| 13 | PUT thêm code khác mã cũ | 400 |
| 14 | Sau SQL task, PUT end_date = 2026-11-19, start_date = 2026-10-01 | 409, báo hạn task 2026-11-20 |
| 15 | GET /api/projects/abc | 400 |
| 16 | PUT ID nguyên dương đã xác nhận không có trong DB | 404 |
| 17 | POST start_date = 2026-02-30 | 400 |
| 18 | POST name là số, description là mảng, hoặc bỏ body | 400 |
| 19 | GET bằng tài khoản không có hồ sơ / đã nghỉ việc | 403 |
| 20 | GET sau khi chèn hai task ở mục 3 | Tổng 2, xong 1, tiến độ 50% |
| 21 | GET chi tiết `/api/projects/{{project_id}}` bằng thành viên | 200, có manager_name, members và tiến độ |
| 22 | GET chi tiết bằng employee chưa thuộc dự án | 403, `Bạn không thuộc dự án này` |
| 23 | Hoàn thành dự án chưa có task | 409, `Dự án chưa có task nào để hoàn thành` |
| 24 | Hoàn thành dự án có task `dang_lam` | 409, `Vẫn còn task chưa hoàn thành` |
| 25 | Chuyển hết task dự án sang `xong`, POST `/complete`, rồi POST `/reopen` | Cả hai trả 200; gọi lặp thao tác tương ứng trả 409 |

Để kiểm tra trường hợp 23, tạo một dự án mới chưa có task và gọi `POST /api/projects/{{project_id}}/complete`. Để kiểm tra 24, dùng dự án đã có task `dang_lam` từ SQL phía trên. Trước trường hợp 25, chạy:

```sql
UPDATE tasks SET status = 'xong' WHERE project_id = 123;
```

Sau đó gọi lần lượt `POST /api/projects/123/complete` và `POST /api/projects/123/reopen` bằng token của manager tạo dự án hoặc admin.

Kiểm tra thêm: ngày không bị lệch; ngày kết thúc dự án mới không được chọn hoặc gửi trước hôm nay; phản hồi API dự án không có password; lỗi database chỉ trả thông điệp chung. Sai/hết hạn token phải trả 401.

## 5. Cách đọc code

- validators.js kiểm tra ID trong phạm vi Int PostgreSQL, ngày có thật và định dạng ngày trả về.
- employeeMiddleware.js đổi user_id trong token thành employee_id và kiểm tra tình trạng nhân viên.
- projectRoutes.js áp dụng xác thực cho sáu API, kiểm tra role khi tạo.
- projectController.js kiểm tra đầu vào, phân quyền, ghi giao dịch, tính tiến độ bằng groupBy và xác nhận điều kiện hoàn thành/mở lại.
- server.js đăng ký đường dẫn /api/projects.

Không thay schema hay thêm thư viện. `/api/health` chỉ trả trạng thái kết nối chung, không trả bản ghi users hoặc lỗi database chi tiết.
