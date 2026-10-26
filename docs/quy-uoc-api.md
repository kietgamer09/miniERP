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
