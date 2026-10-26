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
| Sửa | `PUT /api/projects/:id` | người có employee_id bằng manager_id của dự án, hoặc admin | 200, dự án |

Body thêm:

```json
{"code":"DA-TEST-01","name":"Dự án kiểm tra","description":"Thử API","start_date":"2026-10-01","end_date":"2026-11-30"}
```

Body sửa (gửi đủ name, start_date, end_date):

```json
{"name":"Dự án đã sửa","description":"Mô tả mới","start_date":"2026-10-01","end_date":"2026-12-31"}
```

Không đổi được code. Không gửi description khi sửa thì giữ mô tả cũ; gửi null hoặc chuỗi rỗng để xóa. Các trường ngoài hợp đồng không được ghi vào database. Ngày kết thúc bằng ngày bắt đầu hợp lệ. Ngày kết thúc mới không được trước hạn chót lớn nhất của task.

Ví dụ phản hồi thêm (sửa trả cùng cấu trúc với giá trị đã cập nhật):

```json
{"id":1,"code":"DA-TEST-01","name":"Dự án kiểm tra","description":"Thử API","start_date":"2026-10-01","end_date":"2026-11-30","status":"dang_thuc_hien","manager_id":2,"created_at":"2026-10-26T03:00:00.000Z"}
```

Ví dụ phản hồi danh sách:

```json
[{"id":1,"code":"DA-TEST-01","name":"Dự án kiểm tra","description":"Thử API","start_date":"2026-10-01","end_date":"2026-11-30","status":"dang_thuc_hien","manager_id":2,"created_at":"2026-10-26T03:00:00.000Z","manager_name":"Nguyễn Văn A","members_count":1,"tasks_done":1,"tasks_total":2,"progress_percent":50}]
```

Danh sách sắp theo thời gian tạo giảm dần; khi bằng nhau, ID giảm dần. Không có dự án trả `[]`. Chưa có task thì các số tiến độ bằng 0. start_date/end_date luôn YYYY-MM-DD; created_at là thời điểm ISO.

Lỗi: 400 dữ liệu/ID sai hoặc đổi mã; 401 thiếu token; 403 thiếu quyền, hồ sơ nhân viên không hợp lệ hoặc token sai/hết hạn (hành vi middleware hiện tại); 404 không có dự án khi sửa; 409 trùng mã hoặc hạn task vượt ngày kết thúc mới; 500 lỗi máy chủ. Lỗi có dạng `{"error":"Mã dự án đã tồn tại"}`. Nên sửa middleware xác thực ở công việc riêng để token sai/hết hạn trả 401 theo quy ước chung.

Hướng dẫn thực hành: [Kiểm tra API dự án](kiem-tra-api-du-an.md).
