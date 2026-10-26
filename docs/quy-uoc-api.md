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

## 6. Thành viên dự án và quyền quản lý

Danh sách và chi tiết dự án trả `can_manage`: true nếu người gọi là admin hoặc có `employee_id` trùng `manager_id`; các trường hợp khác là false. Giao diện dùng trường này để hiện thao tác quản lý, backend vẫn kiểm tra độc lập.

Ba API dưới đây cần token và hồ sơ nhân viên đang làm việc, chỉ Quản lý của chính dự án hoặc admin được gọi:

| API | Body | Thành công |
|---|---|---|
| `GET /api/projects/:id/available-employees` | Không có | 200, mảng `{ employee_id, fullname, position }` |
| `POST /api/projects/:id/members` | `{ "employee_ids": [3, 4] }` | 201, mảng thành viên vừa thêm |
| `DELETE /api/projects/:id/members/:employee_id` | Không có | 204, không có nội dung |

Danh sách có thể thêm chỉ gồm nhân viên đang làm việc, chưa tham gia dự án; sắp theo họ tên rồi ID. Body thêm phải là mảng không rỗng các số nguyên dương hợp lệ; ID trùng trong mảng được gộp. Không nhận chuỗi số. Kiểm tra cả nhóm và ghi trong một giao dịch: nếu có người không tồn tại/đã nghỉ việc thì 400; đã là thành viên thì 409; không thêm dở dang.

Bớt thành viên chỉ xóa liên kết dự án, giữ task đã xong. Không bớt Quản lý dự án. Còn N task chưa xong được giao trong chính dự án thì trả 409 `Còn N task chưa xong, hãy giao lại trước khi bớt thành viên`. Không là thành viên trả 404 `Người này không phải thành viên của dự án`. ID sai trả 400, dự án không có trả 404, thiếu quyền trả 403. Khi giao dịch bị xung đột, trả 409 và yêu cầu thử lại. Không trả lỗi nội bộ Prisma hay mật khẩu.

### Kiểm tra Postman cho thành viên

Khởi động backend bằng `npm run dev` trong `backend`. URL gốc `http://localhost:5000`; chọn Authorization → Bearer Token, lấy token qua `/api/auth/login`. POST dùng Body → raw → JSON. Dùng một dự án kiểm tra riêng do tài khoản manager quản lý và các ID thực tế trong database; các request thành công sẽ thay đổi dữ liệu.

| # | Thử | Kỳ vọng |
|---|---|---|
| 1 | Quản lý dự án POST thêm hai nhân viên đang làm việc, chưa tham gia | 201, hai thành viên mới trong GET chi tiết |
| 2 | Thành viên thường POST thêm người | 403 |
| 3 | Quản lý POST một ID đã nghỉ việc/không tồn tại cùng một ID hợp lệ | 400 `Nhân viên không tồn tại hoặc đã nghỉ việc`, không thêm ai |
| 4 | POST người đã là thành viên | 409 `Nhân viên đã là thành viên của dự án` |
| 5 | POST mảng rỗng, không phải mảng, chứa chuỗi, số âm hoặc số thập phân | 400; riêng ID hợp lệ lặp trong mảng được gộp |
| 6 | GET available-employees | Không có thành viên hiện tại hoặc người đã nghỉ việc; tên tăng dần |
| 7 | DELETE thành viên có N task chưa xong trong dự án | 409, thông điệp có đúng số N |
| 8 | DELETE thành viên chỉ có task xong hoặc chưa có task | 204; liên kết bị xóa, task xong được giữ |
| 9 | DELETE manager_id | 409 `Không thể bớt Quản lý dự án` |
| 10 | DELETE một ID nhân viên không thuộc dự án | 404 `Người này không phải thành viên của dự án` |
| 11 | Quản lý khác POST thêm thành viên | 403 dù vai trò manager |
| 12 | GET danh sách/chi tiết bằng quản lý dự án, admin và thành viên thường | can_manage tương ứng true, true, false |

Thử thêm: thiếu/sai/hết hạn token → 401; ID dự án hoặc ID nhân viên trên URL sai → 400; dự án không tồn tại → 404. Admin được gọi cả ba API, người ngoài dự án xem chi tiết nhận 403 `Bạn không thuộc dự án này`. Nếu chưa có task để thử bước 7–8, thực hiện sau lượt tạo task/dữ liệu mẫu; không chỉnh dữ liệu nhân sự thật để tạo điều kiện thử.

Trang chi tiết `/du-an/:id` nằm trong RequireAuth, không dùng RequireRole của menu. Sau khi sửa, thêm/bớt thành viên, hoàn thành hoặc mở lại, frontend tải lại chi tiết từ API và giữ nguyên thông điệp lỗi 400/403/409. Các nút sửa, thêm/bớt thành viên và hoàn thành/mở lại chỉ hiện khi `can_manage` là true.
