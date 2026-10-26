# Quy ước gọi API frontend

## 1. Cách gọi và xác thực

- URL gốc lấy từ `VITE_API_URL` (mặc định `http://localhost:5000`).
- Các yêu cầu gửi `Content-Type: application/json` và `Authorization: Bearer <token>` khi có token trong `localStorage` với khóa `miniErpAuth`.
- Không gửi body cho yêu cầu không có dữ liệu. Với phản hồi `204`, frontend không đọc JSON.
- Lỗi mạng có `status = 0` và thông điệp `Không kết nối được máy chủ`.
- Khi gặp `401`, tầng gọi API phát sự kiện `auth:unauthorized`; `AuthContext` lắng nghe sự kiện và đăng xuất phiên hiện tại.

## 2. API phòng ban

| Thao tác | Phương thức và đường dẫn | Body | Phản hồi thành công |
|---|---|---|---|
| Danh sách | `GET /api/departments` | — | `200`, mảng bản ghi |
| Thêm | `POST /api/departments` | `{ "department_name": "..." }` | `201`, bản ghi vừa tạo |
| Sửa | `PUT /api/departments/:id` | `{ "department_name": "..." }` | `200`, bản ghi đã sửa |
| Xóa | `DELETE /api/departments/:id` | — | `204`, không có nội dung |

Các trường phòng ban dùng trong giao diện: `department_id` và `department_name`.

## 3. Mã lỗi và cách frontend xử lý

| Mã lỗi | Ý nghĩa | Cách xử lý |
|---|---|---|
| `400` | Dữ liệu không hợp lệ | Hiện thông điệp backend trả về |
| `401` | Chưa đăng nhập hoặc token hết hạn | Phát `auth:unauthorized` và đăng xuất |
| `403` | Không đủ quyền | Hiện thông điệp backend trả về |
| `404` | Không tìm thấy bản ghi hoặc đường dẫn | Hiện thông điệp backend trả về |
| `409` | Vi phạm quy tắc nghiệp vụ | Hiện thông điệp backend trả về |
| `status = 0` | Không kết nối được máy chủ | Hiện `Không kết nối được máy chủ` |
| Khác | Lỗi khác | Hiện thông điệp `error` từ backend; nếu không đọc được thì hiện `Có lỗi xảy ra` |

Phản hồi lỗi có dạng `{ "error": "thông điệp tiếng Việt" }`.

## 4. Quy ước tên trường và phản hồi

- Tên trường JSON dùng `snake_case`, khớp tên cột database; frontend dùng nguyên tên trường, không đổi sang camelCase.
- Tên biến cục bộ trong JavaScript vẫn dùng `camelCase`.
- Phản hồi thành công trả thẳng dữ liệu: danh sách là mảng, thêm/sửa là một đối tượng.
- Phản hồi lỗi dùng `{ "error": "..." }`.

## 5. API dự án

Tất cả yêu cầu cần Bearer token và hồ sơ nhân viên `dang_lam_viec`, kể cả admin.

| Thao tác | Đường dẫn | Quyền | Thành công |
|---|---|---|---|
| Thêm | `POST /api/projects` | manager, admin | 201, dự án |
| Danh sách | `GET /api/projects` | admin xem tất cả; người khác xem dự án mình là thành viên | 200, mảng |
| Chi tiết | `GET /api/projects/:id` | thành viên dự án, admin | 200, dự án kèm thành viên và tiến độ |
| Sửa | `PUT /api/projects/:id` | người có employee_id bằng manager_id của dự án, hoặc admin | 200, dự án |
| Hoàn thành | `POST /api/projects/:id/complete` | quản lý dự án, admin | 200, dự án đã hoàn thành |
| Mở lại | `POST /api/projects/:id/reopen` | quản lý dự án, admin | 200, dự án đang thực hiện |

Body thêm:

```json
{"code":"DA-TEST-01","name":"Dự án kiểm tra","description":"Thử API","start_date":"2026-10-27","end_date":"2026-11-30"}
```

Body sửa (gửi đủ name, start_date, end_date):

```json
{"name":"Dự án đã sửa","description":"Mô tả mới","start_date":"2026-10-27","end_date":"2026-12-31"}
```

Không đổi được code. Không gửi description khi sửa thì giữ mô tả cũ; gửi null hoặc chuỗi rỗng để xóa. Các trường ngoài hợp đồng không được ghi vào database. Ngày kết thúc bằng ngày bắt đầu hợp lệ. Khi tạo dự án, ngày kết thúc không được trước ngày hiện tại theo múi giờ `Asia/Ho_Chi_Minh`; ngày bắt đầu có thể ở quá khứ. Khi sửa, ngày kết thúc không được trước ngày bắt đầu hoặc hạn chót lớn nhất của task.

Chi tiết dự án trả thêm `manager_name`, `members` (mỗi thành viên gồm `employee_id`, `fullname`, `position`, `is_manager`), `tasks_done`, `tasks_total` và `progress_percent`. Chỉ thành viên dự án hoặc admin xem được; kiểm tra quyền trước khi tính tiến độ.

Hai API trạng thái không nhận body. Hoàn thành trả `409` nếu dự án đã hoàn thành, chưa có task hoặc còn task chưa xong. Mở lại trả `409` nếu dự án đã đang thực hiện.

Ví dụ phản hồi thêm (sửa trả cùng cấu trúc với giá trị đã cập nhật):

```json
{"id":1,"code":"DA-TEST-01","name":"Dự án kiểm tra","description":"Thử API","start_date":"2026-10-27","end_date":"2026-11-30","status":"dang_thuc_hien","manager_id":2,"created_at":"2026-10-26T03:00:00.000Z"}
```

Ví dụ phản hồi danh sách:

```json
[{"id":1,"code":"DA-TEST-01","name":"Dự án kiểm tra","description":"Thử API","start_date":"2026-10-27","end_date":"2026-11-30","status":"dang_thuc_hien","manager_id":2,"created_at":"2026-10-26T03:00:00.000Z","manager_name":"Nguyễn Văn A","members_count":1,"tasks_done":1,"tasks_total":2,"progress_percent":50}]
```

Danh sách sắp theo thời gian tạo giảm dần; khi bằng nhau, ID giảm dần. Không có dự án trả `[]`. Chưa có task thì các số tiến độ bằng 0. start_date/end_date luôn YYYY-MM-DD; created_at là thời điểm ISO.

Lỗi: 400 dữ liệu/ID sai, ngày kết thúc dự án mới quá khứ hoặc đổi mã; 401 thiếu, sai hoặc hết hạn token; 403 thiếu quyền hoặc hồ sơ nhân viên không hợp lệ; 404 không có dự án; 409 trùng mã, hạn task vượt ngày kết thúc mới hoặc vi phạm điều kiện hoàn thành/mở lại; 500 lỗi máy chủ. Lỗi có dạng `{"error":"Mã dự án đã tồn tại"}`.

Hướng dẫn thực hành: [Kiểm tra API dự án](kiem-tra-api-du-an.md).

## 6. API task của dự án (tuần 4, lượt 4)

Hai API dùng chung `verifyToken` và `attachEmployee`: cần Bearer token hợp lệ và hồ sơ nhân viên đang làm việc, kể cả admin.

| Thao tác | API | Quyền | Thành công |
|---|---|---|---|
| Tạo task | `POST /api/projects/:id/tasks` | Admin hoặc người có employee_id bằng manager_id của dự án | 201, task vừa tạo |
| Xem task | `GET /api/projects/:id/tasks` | Thành viên dự án hoặc admin | 200, mảng task |

Body tạo task (ID người làm là ID nhân viên, không phải ID tài khoản):

```json
{"title":"Kiểm tra cảm biến nhiệt","description":"Kiểm tra và ghi nhận kết quả","assignee_id":3,"due_date":"2026-11-15","priority":"cao"}
```

Sau khi kiểm tra quyền, backend kiểm tra theo thứ tự:

1. Dự án hoàn thành → 409 `Dự án đã hoàn thành, hãy mở lại dự án để tạo task mới`.
2. Thiếu tiêu đề sau cắt khoảng trắng, người làm, hạn chót hoặc ưu tiên → 400 `Vui lòng nhập đủ tiêu đề, người làm, hạn chót và mức ưu tiên`; tiêu đề quá 200 ký tự → 400.
3. Ưu tiên ngoài `thap`, `trung_binh`, `cao` → 400; hạn chót không phải ngày có thật dạng YYYY-MM-DD → 400; ID người làm sai → 400.
4. Người làm không thuộc dự án → 400 `Người làm task phải là thành viên của dự án`.
5. Người làm không còn đang làm việc → 400 `Nhân viên đã nghỉ việc`.
6. Hạn chót sau ngày kết thúc → 400 `Hạn chót không được sau ngày kết thúc dự án (YYYY-MM-DD)`, với ngày kết thúc thật. Trùng ngày được chấp nhận; hạn chót trong quá khứ cũng được chấp nhận theo phạm vi yêu cầu này.

`description` có thể bỏ qua, là chuỗi hoặc null; kiểu khác trả 400. Trường không nằm trong hợp đồng không được ghi. Backend luôn đặt `status = can_lam` và `created_by` từ hồ sơ người đang đăng nhập, không lấy hai trường này trong body. Tạo task chạy trong giao dịch cùng việc đọc điều kiện dự án/thành viên; nếu có xung đột giao dịch, trả 409 `Dữ liệu dự án vừa thay đổi, vui lòng thử lại`.

Phản hồi POST và mỗi phần tử GET có cùng cấu trúc:

```json
{"id":12,"project_id":1,"title":"Kiểm tra cảm biến nhiệt","description":"Kiểm tra và ghi nhận kết quả","assignee_id":3,"assignee_name":"Trần Minh Anh","created_by":2,"due_date":"2026-11-15","priority":"cao","status":"can_lam","created_at":"2026-10-26T03:00:00.000Z","updated_at":"2026-10-26T03:00:00.000Z"}
```

GET sắp theo `due_date` tăng dần rồi `id` tăng dần; chưa có task trả `[]`. Lấy họ tên người làm bằng quan hệ trong cùng truy vấn danh sách, không gọi thêm một truy vấn cho từng task. Dự án không tồn tại → 404; ID dự án sai → 400; người ngoài dự án → 403 `Bạn không thuộc dự án này`. Không trả mật khẩu hay lỗi chi tiết Prisma; lỗi máy chủ được ghi vào terminal và client nhận `{ "error": "thông điệp tiếng Việt" }`.

### Kiểm tra bằng Postman — 11 trường hợp API task

Chạy `npm run dev` trong `backend`. Tạo các biến môi trường Postman: `base_url = http://localhost:5000`, `project_id` (dự án đang thực hiện), `completed_project_id` (dự án hoàn thành), `assignee_id` (thành viên đang làm việc), `nonmember_id` (người đang làm việc nhưng ngoài dự án), `inactive_member_id` (thành viên đã nghỉ việc), `project_end_date` (ngày kết thúc dự án dạng YYYY-MM-DD). Lấy ID từ dữ liệu thực tế, không tự thay trạng thái nhân viên thật để thử API.

Lấy các token bằng `POST {{base_url}}/api/auth/login`: quản lý của chính dự án, thành viên thường, người ngoài và admin. Chọn Authorization → Bearer Token cho mỗi request. POST chọn Body → raw → JSON. Ví dụ request hợp lệ:

```json
{"title":"Kiểm tra cảm biến nhiệt","description":"Task kiểm tra API","assignee_id":{{assignee_id}},"due_date":"{{project_end_date}}","priority":"cao"}
```

Ngày biến môi trường đã có dấu ngoặc kép; ID nhân viên phải là số, không đặt trong dấu ngoặc kép. Chỉ thực hiện POST trên dự án kiểm tra riêng vì request thành công tạo dữ liệu thật.

| # | Thử | Kỳ vọng |
|---|---|---|
| 1 | Token quản lý dự án, POST body hợp lệ đến `/api/projects/{{project_id}}/tasks` | 201, tiêu đề đã trim, status can_lam, created_by đúng employee_id người tạo |
| 2 | Token thành viên thường không phải Quản lý dự án, POST cùng body | 403 |
| 3 | Token quản lý hoặc admin, POST đến dự án hoàn thành | 409 `Dự án đã hoàn thành, hãy mở lại dự án để tạo task mới` |
| 4 | Token quản lý, thay assignee_id bằng nonmember_id | 400 `Người làm task phải là thành viên của dự án` |
| 5 | Người làm hợp lệ, chọn due_date sau project_end_date một ngày | 400, thông điệp có ngày kết thúc dự án |
| 6 | Người làm hợp lệ, due_date đúng bằng project_end_date | 201 |
| 7 | Thử title chỉ có khoảng trắng; thử priority bằng urgent | 400, lỗi bắt buộc/ưu tiên tương ứng |
| 8 | Chọn inactive_member_id là thành viên đã nghỉ việc trong dự án | 400 `Nhân viên đã nghỉ việc` |
| 9 | Token thành viên, GET `/api/projects/{{project_id}}/tasks` | 200, due_date tăng dần rồi id tăng dần; mỗi task có assignee_name |
| 10 | Token người ngoài, GET danh sách task | 403 `Bạn không thuộc dự án này` |
| 11 | Token admin, GET danh sách của dự án bất kỳ kể cả không tham gia | 200 |

Nếu chưa có dự án/thành viên phù hợp để thử bước 3 hoặc 8, thực hiện khi đã có dữ liệu mẫu tương ứng. Không đổi trạng thái nhân sự thật để chuẩn bị kiểm tra.

Kiểm tra thêm: không có/sai/hết hạn token → 401; ID dự án sai → 400; ID không tồn tại → 404; không có task → 200 `[]`; thiếu mỗi trường bắt buộc, tiêu đề dài 201 ký tự, ngày không tồn tại hoặc sai định dạng → 400. Gửi thêm `status = xong` và `created_by` của người khác trong body hợp lệ: phản hồi vẫn có status can_lam và created_by đúng người gọi. Dự án hoàn thành cùng body thiếu trường phải nhận 409 trước lỗi dữ liệu; không phải thành viên đồng thời hạn vượt ngày kết thúc phải nhận lỗi thành viên trước lỗi ngày.
