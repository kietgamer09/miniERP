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

Danh sách và chi tiết dự án trả thêm `can_manage` (boolean), do backend tính: `true` khi người gọi là admin hoặc có `employee_id` trùng `manager_id` của dự án; trường hợp khác là `false`. Frontend dùng trường này để hiện các thao tác quản lý.

Chi tiết dự án trả thêm `manager_name`, `members` (mỗi thành viên gồm `employee_id`, `fullname`, `position`, `is_manager`), `tasks_done`, `tasks_total` và `progress_percent`. Chỉ thành viên dự án hoặc admin xem được; kiểm tra quyền trước khi tính tiến độ.

Hai API trạng thái không nhận body. Hoàn thành trả `409` nếu dự án đã hoàn thành, chưa có task hoặc còn task chưa xong. Mở lại trả `409` nếu dự án đã đang thực hiện.

Ví dụ phản hồi thêm (sửa trả cùng cấu trúc với giá trị đã cập nhật):

```json
{"id":1,"code":"DA-TEST-01","name":"Dự án kiểm tra","description":"Thử API","start_date":"2026-10-27","end_date":"2026-11-30","status":"dang_thuc_hien","manager_id":2,"created_at":"2026-10-26T03:00:00.000Z"}
```

Ví dụ phản hồi danh sách:

```json
[{"id":1,"code":"DA-TEST-01","name":"Dự án kiểm tra","description":"Thử API","start_date":"2026-10-27","end_date":"2026-11-30","status":"dang_thuc_hien","manager_id":2,"created_at":"2026-10-26T03:00:00.000Z","manager_name":"Nguyễn Văn A","can_manage":true,"members_count":1,"tasks_done":1,"tasks_total":2,"progress_percent":50}]
```

Danh sách sắp theo thời gian tạo giảm dần; khi bằng nhau, ID giảm dần. Không có dự án trả `[]`. Chưa có task thì các số tiến độ bằng 0. start_date/end_date luôn YYYY-MM-DD; created_at là thời điểm ISO.

Lỗi: 400 dữ liệu/ID sai, ngày kết thúc dự án mới quá khứ hoặc đổi mã; 401 thiếu, sai hoặc hết hạn token; 403 thiếu quyền hoặc hồ sơ nhân viên không hợp lệ; 404 không có dự án; 409 trùng mã, hạn task vượt ngày kết thúc mới hoặc vi phạm điều kiện hoàn thành/mở lại; 500 lỗi máy chủ. Lỗi có dạng `{"error":"Mã dự án đã tồn tại"}`.

Hướng dẫn thực hành: [Kiểm tra API dự án](kiem-tra-api-du-an.md).

## 6. Dữ liệu mẫu phần Công việc: cách chạy

Script riêng: `backend/prisma/seed-cong-viec.js`. Chạy trong thư mục `backend`, dùng cấu hình Prisma/PostgreSQL hiện có:

```bash
npm run seed:cong-viec
```

Điều kiện: database đã có ít nhất 8 nhân viên có `status = dang_lam_viec`, trong đó ít nhất một nhân viên có tài khoản vai trò `manager`. Nếu chưa đủ, script dừng trước khi xóa/ghi dữ liệu và nhắc chạy dữ liệu mẫu nhân sự trước. Script không tạo hoặc sửa nhân viên/tài khoản. Khi `NODE_ENV=production`, script từ chối chạy trước mọi truy vấn database.

Ngày tính theo ngày chạy tại `Asia/Ho_Chi_Minh`. Nhân viên được chọn theo `employee_id` tăng dần; không dùng số ngẫu nhiên. `MAU-01` và `MAU-03` do cùng một tài khoản manager quản lý. `MAU-02` do người khác quản lý, ưu tiên tài khoản manager khác nếu có, nếu không thì chọn nhân viên đang làm việc khác. Người quản lý luôn thuộc danh sách thành viên của dự án.

| Mã | Tên dự án | Thành viên | Trạng thái | Cần làm | Đang làm | Xong | Tổng task |
|---|---|---|---|---|---|---|---|
| MAU-01 | Bảo trì dây chuyền mạ kẽm | 8 | dang_thuc_hien | 5 | 4 | 3 | 12 |
| MAU-02 | Làm website công ty | 6 | hoan_thanh | 0 | 0 | 6 | 6 |
| MAU-03 | Đào tạo an toàn lao động | 6 | dang_thuc_hien | 5 | 4 | 3 | 12 |

Tổng đúng **30 task**: 10 cần làm, 8 đang làm, 12 xong. Hai dự án đang thực hiện có tổng 4 task quá hạn chưa xong, 4 task sắp hạn chưa xong (hạn hôm nay hoặc sau 3 ngày), có đủ ba mức ưu tiên và task còn hạn xa. Mỗi dự án đang thực hiện còn có một task xong với hạn đã qua để kiểm tra giao diện không tô cảnh báo task xong. Không tạo bình luận.

Mọi dự án bắt đầu hôm nay trừ 25 ngày. MAU-01/MAU-03 kết thúc hôm nay cộng 45 ngày; MAU-02 kết thúc hôm nay trừ 2 ngày. Người làm luôn là thành viên đang làm việc, created_by luôn là Quản lý dự án, hạn chót không sau ngày kết thúc. Script kiểm tra toàn bộ các điều kiện này bằng code trước khi ghi.

### Chạy lại và phạm vi thay thế

Tiền tố `MAU-` dành riêng cho dữ liệu mẫu. Mỗi lần chạy sẽ xóa **tất cả** dự án có mã bắt đầu bằng `MAU-` và dữ liệu liên quan theo đúng thứ tự khóa ngoại: bình luận task → task → thành viên → dự án; sau đó tạo lại ba dự án trên. Những chỉnh sửa thủ công bên trong dự án MAU-* cũng bị thay thế. Dự án không mang tiền tố này và dữ liệu nhân sự được giữ nguyên.

Đọc nhân viên, kiểm tra dữ liệu, xóa bản cũ và tạo lại nằm trong một transaction. Nếu lỗi, toàn bộ thay đổi database trong giao dịch được hủy. Sau khi thành công, terminal in bảng số thành viên/task theo trạng thái, tổng task, số quá hạn/sắp hạn và dòng `Đã tạo dữ liệu mẫu, chạy lại an toàn`. Script đóng Prisma rồi thoát tiến trình.

Để kiểm tra việc không nhân đôi, chạy liên tiếp hai lần:

```bash
npm run seed:cong-viec
npm run seed:cong-viec
```

Cả hai lần phải có đúng ba mã dự án, 30 task và bảng tổng kết như trên. Nếu chạy trong cùng ngày với dữ liệu nhân viên không đổi, phân công, trạng thái và hạn chót giống nhau; ID tự tăng và thời điểm tạo có thể đổi. Chạy sang ngày khác sẽ dịch các ngày theo ngày chạy mới.

Có thể đối chiếu bằng truy vấn chỉ đọc:

```sql
SELECT p.code,
       COUNT(DISTINCT pm.employee_id) AS members,
       COUNT(DISTINCT t.id) AS tasks,
       COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'can_lam') AS can_lam,
       COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dang_lam') AS dang_lam,
       COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'xong') AS xong
FROM projects p
LEFT JOIN project_members pm ON pm.project_id = p.id
LEFT JOIN tasks t ON t.project_id = p.id
WHERE p.code LIKE 'MAU-%'
GROUP BY p.id, p.code
ORDER BY p.code;
```

Sau đó đăng nhập các vai trò để xem dự án mẫu. Admin thấy tất cả dự án; người khác thấy dự án mình tham gia. Kiểm tra dòng task quá hạn đỏ, sắp hạn vàng, task xong có hạn cũ không cảnh báo (các màn hình/API của lượt trước cần đã được tích hợp).
## 7. API thành viên dự án (tuần 4, lượt 1)

Các API dưới đây đều cần Bearer token, hồ sơ nhân viên đang làm việc và quyền quản lý dự án: admin hoặc nhân viên có `employee_id` bằng `manager_id`. Không tìm thấy dự án trả 404; thiếu quyền trả 403. Quyền được kiểm tra trước khi xử lý dữ liệu thành viên.

| Thao tác | Phương thức và đường dẫn | Body | Thành công |
|---|---|---|---|
| Nhân viên có thể thêm | `GET /api/projects/:id/available-employees` | — | 200, mảng nhân viên |
| Thêm thành viên | `POST /api/projects/:id/members` | `{ "employee_ids": [3, 4] }` | 201, mảng thành viên vừa thêm |
| Bớt thành viên | `DELETE /api/projects/:id/members/:employee_id` | — | 204, không có nội dung |

`available-employees` chỉ trả nhân viên `dang_lam_viec` chưa tham gia dự án, theo họ tên tăng dần (khi trùng tên thì theo mã nhân viên):

```json
[{"employee_id":3,"fullname":"Trần Minh Anh","position":"Kỹ thuật viên"}]
```

`employee_ids` phải là mảng không rỗng, gồm số nguyên dương hợp lệ trong phạm vi ID PostgreSQL; không nhận chuỗi số, số thập phân, `null` hoặc số âm. ID trùng ngay trong body được gộp thành một ID. Ví dụ `[3, 3, 4]` tương đương `[3, 4]`.

Kiểm tra nhân viên đang làm việc và tư cách thành viên, sau đó thêm toàn bộ trong một transaction. Nếu có một người không tồn tại/đã nghỉ việc, trả 400 `Nhân viên không tồn tại hoặc đã nghỉ việc`. Nếu có một người đã tham gia, trả 409 `Nhân viên đã là thành viên của dự án`. Cả hai trường hợp đều không thêm ai trong nhóm đó. Phản hồi thành công:

```json
[{"employee_id":3,"fullname":"Trần Minh Anh","position":"Kỹ thuật viên","is_manager":false}]
```

Bớt thành viên kiểm tra theo thứ tự: ID hợp lệ → đang là thành viên → không phải Quản lý dự án → không còn task chưa xong được giao trong chính dự án này. Task đã `xong` được giữ lại dù thành viên đã được bớt khỏi dự án.

| Trường hợp bớt thành viên | Lỗi |
|---|---|
| ID nhân viên sai | 400 `ID nhân viên phải là số nguyên dương hợp lệ` |
| Không là thành viên | 404 `Người này không phải thành viên của dự án` |
| Là Quản lý dự án | 409 `Không thể bớt Quản lý dự án` |
| Còn N task chưa xong trong dự án | 409 `Còn N task chưa xong, hãy giao lại trước khi bớt thành viên` |
| Giao dịch bớt bị xung đột do thao tác đồng thời | 409 `Dữ liệu thành viên vừa thay đổi, vui lòng thử lại` |

Không trả mật khẩu hay lỗi chi tiết Prisma. Lỗi máy chủ được ghi vào terminal; client nhận `{ "error": "thông điệp tiếng Việt" }`.

### Kiểm tra bằng Postman

Khởi động backend bằng `npm run dev` trong thư mục `backend`. Tạo môi trường Postman:

- `base_url`: `http://localhost:5000`.
- `project_id`: ID một dự án kiểm tra do tài khoản manager quản lý.
- `manager_token`, `admin_token`, `employee_token`, `other_manager_token`: token lấy qua `POST {{base_url}}/api/auth/login` bằng các tài khoản tương ứng. `employee_token` là thành viên thường của dự án; `other_manager_token` thuộc quản lý khác, không phải Quản lý dự án kiểm tra.
- `employee_a`, `employee_b`: hai ID nhân viên đang làm việc, chưa tham gia dự án.
- `inactive_employee_id`: ID nhân viên đã nghỉ việc có sẵn; không thay trạng thái nhân viên thật chỉ để kiểm tra.
- `unfinished_member_id`: thành viên được giao N task chưa `xong` trong dự án, ghi lại N trước khi thử.
- `finished_member_id`: thành viên chỉ có task `xong` hoặc chưa có task, không phải Quản lý dự án.
- `project_manager_id`: `manager_id` đọc từ chi tiết dự án; `nonmember_id`: ID nhân viên không thuộc dự án.

Ở mỗi request, chọn Authorization → Bearer Token → biến token theo bảng. Với POST, chọn Body → raw → JSON; ID trong body phải là số (dùng `{{employee_a}}` không có dấu ngoặc kép). Chuẩn bị ID trên dự án kiểm tra riêng; các request thành công sẽ thay đổi dữ liệu thật.

| # | Request và cách thử | Kỳ vọng |
|---|---|---|
| 1 | Dùng `manager_token`, `POST {{base_url}}/api/projects/{{project_id}}/members`, body `{ "employee_ids": [{{employee_a}}, {{employee_b}}] }` | 201, mảng hai người; GET chi tiết thấy hai người mới trong `members` |
| 2 | Gửi lại request thêm với `employee_token` | 403, không thêm thành viên |
| 3 | Dùng `manager_token`, thử body chứa `inactive_employee_id`; thử lại với ID chắc chắn không tồn tại. Thử thêm một ID hợp lệ cùng ID sai để kiểm tra toàn bộ giao dịch | 400 `Nhân viên không tồn tại hoặc đã nghỉ việc`, không thêm người nào |
| 4 | Dùng `manager_token`, gửi lại `employee_a` đã thêm ở bước 1 | 409 `Nhân viên đã là thành viên của dự án` |
| 5 | Thử `{ "employee_ids": [] }`, `{ "employee_ids": 3 }`, `{}`, mảng chứa chuỗi, số âm hoặc số thập phân | 400; với `[a, a]` và a chưa tham gia thì 201, chỉ thêm một người |
| 6 | Dùng `manager_token`, `GET {{base_url}}/api/projects/{{project_id}}/available-employees` | 200; không chứa hai người ở bước 1, Quản lý dự án hoặc nhân viên đã nghỉ việc; họ tên tăng dần |
| 7 | Dùng `manager_token`, `DELETE {{base_url}}/api/projects/{{project_id}}/members/{{unfinished_member_id}}` | 409 `Còn N task chưa xong, hãy giao lại trước khi bớt thành viên`, N đúng số task trong dự án này |
| 8 | Dùng `manager_token`, DELETE như trên với `finished_member_id` | 204, body rỗng; GET chi tiết không còn người đó; các task đã xong vẫn còn |
| 9 | Dùng `manager_token`, DELETE với `project_manager_id` | 409 `Không thể bớt Quản lý dự án` |
| 10 | Dùng `manager_token`, DELETE với `nonmember_id` | 404 `Người này không phải thành viên của dự án` |
| 11 | Dùng `other_manager_token`, POST thêm thành viên | 403 dù vai trò là manager |
| 12 | `GET {{base_url}}/api/projects/{{project_id}}` lần lượt bằng token quản lý dự án, admin và thành viên thường; thử cả GET danh sách | 200; `can_manage` lần lượt `true`, `true`, `false` |

Kiểm tra bổ sung: thiếu/sai/hết hạn token → 401; ID dự án sai → 400; dự án không tồn tại → 404 với token hợp lệ; ID nhân viên trên URL là `abc` → 400. Admin thực hiện được ba API thành viên. GET available-employees và DELETE thành viên bằng thành viên thường/quản lý khác đều trả 403.

Nếu chưa có thành viên với task chưa xong/task đã xong, để lại bước 7–8 liên quan task và kiểm tra sau lượt 4 hoặc lượt 6; không tự chỉnh dữ liệu nhân sự để tạo điều kiện thử.

## 8. API task của dự án (tuần 4, lượt 4–5)

Hai API đều cần Bearer token và hồ sơ nhân viên đang làm việc qua `verifyToken`, `attachEmployee`.

| Thao tác | API | Quyền | Thành công |
|---|---|---|---|
| Tạo task | `POST /api/projects/:id/tasks` | Quản lý của chính dự án hoặc admin | 201, task vừa tạo |
| Xem task | `GET /api/projects/:id/tasks` | Thành viên dự án hoặc admin | 200, mảng task |

Body tạo task:

```json
{"title":"Kiểm tra cảm biến nhiệt","description":"Ghi nhận kết quả kiểm tra","assignee_id":3,"due_date":"2026-11-15","priority":"cao"}
```

ID người làm là `employee_id`, không phải `user_id`. Sau khi kiểm tra quyền quản lý, backend kiểm tra đúng thứ tự:

1. Dự án hoàn thành → 409 `Dự án đã hoàn thành, hãy mở lại dự án để tạo task mới`.
2. Thiếu tiêu đề sau trim, người làm, hạn chót hoặc ưu tiên → 400 `Vui lòng nhập đủ tiêu đề, người làm, hạn chót và mức ưu tiên`; tiêu đề quá 200 ký tự → 400.
3. Ưu tiên ngoài `thap`, `trung_binh`, `cao`, ngày không có thật/sai dạng YYYY-MM-DD, hoặc ID người làm sai → 400.
4. Không thuộc dự án → 400 `Người làm task phải là thành viên của dự án`.
5. Đã nghỉ việc → 400 `Nhân viên đã nghỉ việc`.
6. Hạn sau ngày kết thúc → 400 `Hạn chót không được sau ngày kết thúc dự án (YYYY-MM-DD)`, với ngày kết thúc thật. Trùng ngày hợp lệ; hạn chót ở quá khứ được phép trong phạm vi yêu cầu này.

Mô tả có thể là chuỗi hoặc null; bỏ qua/chuỗi rỗng lưu null, kiểu khác trả 400. Backend luôn đặt `status = can_lam`, `created_by = req.employee.employee_id`; không nhận các trường này từ body.

Phản hồi POST và mỗi phần tử GET có cùng cấu trúc:

```json
{"id":12,"project_id":1,"title":"Kiểm tra cảm biến nhiệt","description":"Ghi nhận kết quả kiểm tra","assignee_id":3,"assignee_name":"Trần Minh Anh","created_by":2,"due_date":"2026-11-15","priority":"cao","status":"can_lam","created_at":"2026-10-26T03:00:00.000Z","updated_at":"2026-10-26T03:00:00.000Z"}
```

GET sắp theo `due_date` tăng dần rồi `id`; không có task trả `[]`. Lấy người làm bằng quan hệ trong truy vấn, không gọi thêm truy vấn cho từng task. Dự án không tồn tại → 404; ID sai → 400; người ngoài dự án → 403 `Bạn không thuộc dự án này`. Lỗi máy chủ không trả chi tiết Prisma hay mật khẩu.

Tạo task, kiểm tra hạn khi sửa dự án và kiểm tra điều kiện hoàn thành dự án chạy trong các transaction Serializable. Khi có thay đổi đồng thời gây xung đột, trả 409 `Dữ liệu dự án vừa thay đổi, vui lòng thử lại`; giao diện hiển thị nguyên văn để người dùng tải lại/thử lại.

### Postman: 11 trường hợp API task

Chạy backend bằng `npm run dev`. Tạo biến `base_url = http://localhost:5000`, `project_id` là dự án đang thực hiện, `completed_project_id` là dự án hoàn thành, `assignee_id` là thành viên đang làm việc và `project_end_date` là ngày kết thúc thực tế dạng YYYY-MM-DD. Lấy token qua `/api/auth/login`, chọn Authorization → Bearer Token; POST chọn Body → raw → JSON:

```json
{"title":"Task kiểm tra API","assignee_id":{{assignee_id}},"due_date":"{{project_end_date}}","priority":"cao"}
```

Dùng dự án kiểm tra riêng vì POST thành công ghi dữ liệu thật. Không thay trạng thái nhân sự thật để chuẩn bị dữ liệu thử.

| # | Thử | Kỳ vọng |
|---|---|---|
| 1 | Quản lý dự án POST body hợp lệ | 201, can_lam, created_by đúng nhân viên gọi API |
| 2 | Thành viên thường POST cùng body | 403 |
| 3 | Quản lý/admin POST vào dự án hoàn thành | 409, yêu cầu mở lại dự án |
| 4 | Người làm đang làm việc nhưng không thuộc dự án | 400, lỗi thành viên |
| 5 | Người làm hợp lệ, hạn chót sau ngày kết thúc một ngày | 400, thông điệp có ngày kết thúc |
| 6 | Hạn chót đúng bằng ngày kết thúc | 201 |
| 7 | Tiêu đề chỉ có khoảng trắng; hoặc priority bằng urgent | 400 với lỗi tương ứng |
| 8 | Người làm đã nghỉ việc nhưng còn liên kết thành viên | 400 `Nhân viên đã nghỉ việc` |
| 9 | Thành viên GET `/api/projects/{{project_id}}/tasks` | 200, đúng thứ tự hạn chót rồi ID, có assignee_name |
| 10 | Người ngoài dự án GET danh sách task | 403 `Bạn không thuộc dự án này` |
| 11 | Admin GET task của dự án bất kỳ | 200 |

Kiểm tra thêm token thiếu/sai/hết hạn → 401; ID dự án sai → 400; dự án không tồn tại → 404; ngày 30/02, ID người làm sai hoặc tiêu đề quá 200 ký tự → 400. Dự án hoàn thành và body thiếu trường phải báo 409 trước; người làm ngoài dự án và hạn vượt ngày kết thúc phải báo lỗi thành viên trước. Gửi thêm status xong/created_by của người khác không làm thay đổi các giá trị backend tự đặt.

Giao diện `/du-an/:id` có bảng task và form tạo task; chỉ can_manage có nút tạo. Dự án hoàn thành khóa nút với tooltip `Mở lại dự án để tạo task`. Tạo xong tải lại chi tiết, tiến độ và bảng task. Hàng quá hạn đỏ, sắp hạn 0–3 ngày vàng và có nhãn chữ; task xong không nhận cảnh báo hạn. Bảng chuyển due_date/xong sang định dạng của getDueState tại một nơi, không thay quy tắc hiện có.

## 9. Chấm công, lịch sử và giải trình

Xem cách chuẩn bị bảng bổ sung trong `backend/README.md`. Cần chạy `npm run setup:attendance`, `npx prisma generate` và khởi động lại backend. Không xóa hay sửa công gốc khi chuẩn bị bảng hoặc khi duyệt giải trình.

| Endpoint | Quyền | Kết quả |
|---|---|---|
| GET `/api/attendances/today` | Nhân viên đang làm việc | `{ server_now, day, record }` của chính tài khoản |
| GET `/api/attendances/me?month=YYYY-MM` | Nhân viên đang làm việc | `{ month, server_now, start_date, days }`, đủ ngày trong tháng |
| POST `/api/attendances/check-in` | Nhân viên đang làm việc | 200 `{ message, data }`, giờ server theo Việt Nam |
| POST `/api/attendances/check-out` | Nhân viên đã vào ca | 200 `{ message, data }`; thiếu vào ca hoặc lặp → 400 |
| POST `/api/attendances/explanations` | Chủ ngày công | 201, `{ date, reason, makeup_date? }`; trùng ngày → 409 |
| GET `/api/attendances/explanations?status=...` | Admin | Mảng yêu cầu, tối đa 500, mới nhất trước |
| PUT `/api/attendances/explanations/:id/review` | Admin khác người gửi | `{ decision, review_note? }`; tự duyệt → 403; đã xử lý → 409 |

`day` gồm `date`, `check_in`, `check_out`, `status`, `color`, `label`, `late`, `early`, `can_explain`, `explanation`. `explanation` gồm lý do, ngày đề nghị bù, trạng thái pending/approved/rejected, người duyệt, ghi chú, thời điểm gửi/duyệt và `can_review`. Client không được tự đặt nhân viên, trạng thái duyệt hay giờ công.

- Xanh lá: vào ≤ 08:00:00 và ra ≥ 17:00:00.
- Vàng: chỉ vào muộn hoặc chỉ ra sớm. Vào muộn trong ca hiện vàng ngay.
- Đỏ: vừa muộn vừa sớm; hết ngày/ca mà không có công hoặc phép duyệt; thiếu lượt vào/ra hoặc trùng bản ghi cần kiểm tra.
- Trung tính: ngày chưa kết thúc mà chưa vào ca, ngày tương lai, cuối tuần, trước ngày bắt đầu làm việc. Trong ca đúng giờ hiện xanh dương, chưa được tính là đủ ca. Nghỉ phép đã duyệt có nhãn xanh dương.
- Mọi quy tắc dùng giờ Việt Nam. Không có lịch nghỉ lễ/ca đặc thù; UI nêu rõ khi thiếu ngày bắt đầu làm việc.
- Giải trình chỉ cho ngày bất thường; lý do bắt buộc 1–2000 ký tự, ngày đề nghị bù tùy chọn là ngày làm việc không ở quá khứ. Một yêu cầu/ngày; trạng thái đã xử lý được giữ để tra cứu.
- Chỉ Admin duyệt, không tự duyệt; từ chối cần ghi chú. Duyệt không sửa giờ hoặc màu gốc, không tự cộng giờ bù/lương.
- GET luôn giới hạn theo nhân viên từ token, không tin employee_id trong query/body. Mọi thao tác ghi công có khóa nhân viên/ngày để tránh chấm trùng giữa trình duyệt. Bản ghi trùng cũ không bị xóa/gộp tự động.
