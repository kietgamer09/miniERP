<<<<<<< Updated upstream
# Luồng nghiệp vụ liên module: Nhân sự ↔ Dự án

> Đây là phân tích hợp đồng giữa các module, không thay thế quy trình HR. Người phụ trách Nhân sự cần xác nhận bước HR, người nhận phê duyệt và cách xử lý hồ sơ trước khi chốt vận hành.

## 1. Tiếp nhận nhân viên → tài khoản → tham gia dự án

### Tiền điều kiện

- Phòng ban đích đã tồn tại.
- Người tạo có quyền quản trị nhân sự.
- Nhân viên chưa có username xung đột.

### Luồng hiện tại

1. API tạo nhân viên sinh username từ tên, tạo user và employee trong cùng transaction.
2. API trả `login_info.default_password` là mật khẩu chung `12345`.
3. Quản lý/Admin tạo dự án, chọn nhân viên đang làm việc làm thành viên; quản lý dự án cũng được thêm vào membership.
4. Người quản lý tạo task và chỉ định một thành viên đang làm việc.

```mermaid
sequenceDiagram
    actor HR as Nhân sự/Admin
=======
# Quy trình liên module Nhân sự ↔ Dự án

> Phần điều kiện HR cần người phụ trách Nhân sự xác nhận. Tài liệu này ghi lại contract với Project/Task, không quyết định thay HR.

## 1. Tiếp nhận nhân viên → tài khoản → vào dự án

### Tiền điều kiện

- Phòng ban tồn tại; dữ liệu nhân viên hợp lệ; username chưa được dùng.
- Người thao tác có quyền tạo nhân viên và tài khoản.

### Luồng và hậu điều kiện

1. `createUser` tạo `users` và `employees` trong cùng transaction.
2. Tài khoản mới nhận mật khẩu tạm riêng, có hạn và bắt buộc đổi trước khi dùng nghiệp vụ.
3. Admin/quản lý tạo project, chọn nhân viên đang làm việc làm member; manager được thêm vào membership.
4. Tạo task chỉ thành công nếu assignee đang làm và là member project.

```mermaid
sequenceDiagram
    actor HR as HR/Admin
>>>>>>> Stashed changes
    participant U as Users + Employees
    actor PM as Quản lý dự án
    participant P as Projects + Members
    participant T as Tasks
<<<<<<< Updated upstream
    HR->>U: Tạo nhân viên và user (transaction)
    U-->>HR: employee_id + username + mật khẩu tạm chung
    PM->>P: Tạo dự án và membership
    PM->>T: Tạo task cho thành viên đang làm việc
    T-->>PM: Từ chối nếu assignee không thuộc dự án
```

### Hậu điều kiện và rủi ro

- User và employee hoặc cùng được tạo, hoặc transaction rollback.
- Project membership được tạo cùng dự án; task được giao cho thành viên hiện hành.
- Mật khẩu chung đoán được là rủi ro bảo mật. Luồng tạo người dùng và activation thuộc HR/backend tích hợp; không dùng sơ đồ này để phê chuẩn quy trình cấp credential.

### Rollback / khôi phục

- Lỗi trong transaction tạo user/employee: không có bản ghi dở dang theo transaction.
- Lỗi sau khi nhân viên đã được tạo nhưng trước khi đưa vào dự án: giữ hồ sơ nhân viên, không xóa tài khoản tự động; HR xác nhận lại thông tin rồi thử thêm membership.
- Tạo nhầm membership nhưng chưa giao task: quản lý dự án/Admin có thể bớt thành viên. Nếu đã có task chưa xong, cần giao lại trước khi bớt.

## 2. Chuyển phòng ban → rà soát dự án và task

### Tiền điều kiện

- Nhân viên và phòng ban đích tồn tại.
- HR xác nhận ngày hiệu lực và người có quyền thực hiện.

### Luồng hiện tại / điểm cần thống nhất

1. API cập nhật `employees.department_id` cho danh sách nhân viên.
2. `project_members` và `tasks.assignee_id` không tự thay đổi theo phòng ban; quyền dự án dựa vào membership/manager, không dựa trực tiếp vào phòng ban.
3. Reviewer của yêu cầu làm thêm lưu `department_id` lúc gửi; thay đổi phòng ban không tự chuyển reviewer đã ghi nhận.
4. HR và quản lý dự án cần quyết định task/membership cũ có được giữ, chuyển giao hay thu hồi.

```mermaid
flowchart TD
    A[HR xác nhận nhân viên và ngày hiệu lực] --> B[Cập nhật department_id]
    B --> C{Rà soát project_members và task đang mở}
    C -->|Giữ nguyên theo quyết định| D[Giữ quyền và assignee]
    C -->|Cần bàn giao| E[Quản lý dự án giao lại task]
    E --> F[Bớt membership khi không còn task chưa xong]
    D --> G[Đối soát reviewer / yêu cầu chờ duyệt]
    F --> G
=======
    HR->>U: Tạo employee và user trong transaction
    U-->>HR: Username + credential tạm riêng, hết hạn
    PM->>P: Tạo project và chọn members
    PM->>T: Tạo task cho member đang làm việc
    T-->>PM: Kiểm tra membership và deadline
```

### Rollback / khôi phục

- Nếu transaction tạo user/employee lỗi, không giữ lại một nửa bản ghi.
- Nếu tạo project thất bại sau khi nhân viên đã được tạo, giữ hồ sơ nhân viên và sửa/thử lại project; không xóa tài khoản tự động.
- Nếu thêm member nhầm, quản lý có thể bớt member khi không còn task chưa xong được giao cho họ.

## 2. Chuyển phòng ban → rà soát quyền và task

### Tiền điều kiện

- Employee và department đích tồn tại; HR xác nhận ngày hiệu lực và quyền cập nhật.
- Chủ sản phẩm/HR thống nhất liệu chuyển phòng có ảnh hưởng membership, reviewer hoặc assignee không.

### Luồng hiện tại

1. API cập nhật `employees.department_id` cho danh sách bằng nhiều thao tác song song, không phải một transaction duy nhất.
2. Membership và assignee không tự đổi theo phòng ban; quyền project căn cứ member/manager.
3. Reviewer của đơn overtime được lưu theo dữ liệu lúc gửi; chưa có đồng bộ reviewer khi chuyển phòng.
4. HR và quản lý dự án rà soát task/membership và chuyển giao nếu cần.

```mermaid
flowchart TD
    A[HR xác nhận department đích và ngày hiệu lực] --> B[Cập nhật department_id]
    B --> C[Rà soát membership, task mở và yêu cầu đang chờ]
    C --> D{Cần bàn giao task?}
    D -->|Có| E[Quản lý project giao lại]
    E --> F[Bớt membership sau khi hết task chưa xong]
    D -->|Không| G[Giữ quyền hiện tại theo quyết định]
    F --> H[Đối soát reviewer và ghi nhận quyết định]
    G --> H
>>>>>>> Stashed changes
```

### Hậu điều kiện và rollback

<<<<<<< Updated upstream
- Hậu điều kiện mong muốn: phòng ban cập nhật; các quyền/task được rà soát theo quyết định có người chịu trách nhiệm; yêu cầu đang chờ giữ nguyên người nhận theo snapshot hoặc được chuyển có audit.
- Hiện nhiều nhân viên được chuyển bằng `Promise.all`, không phải một transaction toàn nhóm; một phần có thể đã đổi nếu một thao tác thất bại.
- Nếu có lỗi: kiểm tra từng `employee_id` và phòng ban thực tế, khôi phục các bản ghi đã đổi về phòng cũ theo danh sách đối soát; không chạy lại mù toàn bộ lệnh.

## 3. Nghỉ việc → thu hồi quyền → bàn giao dự án

### Tiền điều kiện

- HR xác nhận trạng thái và thời điểm nghỉ việc.
- Có người tiếp nhận các task/membership cần duy trì.

### Luồng hiện tại / khoảng trống

1. HR cập nhật `employees.status = da_nghi_viec`.
2. Đăng nhập hiện từ chối nhân viên đã nghỉ việc; tuy nhiên middleware JWT chung hiện kiểm tra chữ ký/expiry và dùng role trong token, không truy vấn trạng thái hiện hành cho mọi request.
3. Membership, task được giao và quản lý dự án không tự đóng/chuyển khi đổi trạng thái nhân viên.
4. Giao lại task đang mở trước khi bớt thành viên; API hiện chặn bớt nếu nhân viên còn task chưa xong.
=======
- Hậu điều kiện: phòng ban đổi; task/quyền/reviewer được rà soát theo quyết định; có danh sách đối soát.
- Do cập nhật theo `Promise.all`, nếu một nhân viên lỗi thì có thể một phần danh sách đã đổi. Trước khi thử lại, kiểm tra từng employee và department.
- Khôi phục bằng cách cập nhật các employee đã đổi về department ban đầu theo danh sách đối soát; không chạy lại hàng loạt một cách mù.

## 3. Nghỉ việc → thu hồi truy cập → bàn giao project

### Tiền điều kiện

- HR xác nhận người và ngày hiệu lực nghỉ việc.
- Có quyết định người tiếp nhận task và membership project.

### Luồng hiện tại

1. HR đổi `employees.status` sang `da_nghi_viec`.
2. Auth middleware đọc role/status hiện tại từ DB; token của employee nghỉ việc bị từ chối.
3. Membership và task không tự xóa/chuyển theo trạng thái nhân viên.
4. Quản lý giao lại task chưa xong; chỉ sau đó mới bớt member. API chặn bớt member còn task mở.
>>>>>>> Stashed changes

```mermaid
sequenceDiagram
    actor HR as Nhân sự
    participant E as Employee + User
<<<<<<< Updated upstream
    actor PM as Quản lý dự án
    participant T as Task / Membership
    HR->>E: Đặt trạng thái nghỉ việc
    HR->>PM: Yêu cầu danh sách bàn giao
    PM->>T: Giao lại task đang mở
    PM->>T: Bớt membership sau khi không còn task chưa xong
    Note over E: Token đang tồn tại cần chính sách thu hồi chung
=======
    actor PM as Quản lý project
    participant P as Membership + Tasks
    HR->>E: Đổi trạng thái thành da_nghi_viec
    Note over E: API từ chối token nhân viên nghỉ việc
    HR->>PM: Yêu cầu bàn giao
    PM->>P: Giao lại task chưa xong
    PM->>P: Bớt membership khi không còn task chưa xong
>>>>>>> Stashed changes
```

### Hậu điều kiện và rollback

<<<<<<< Updated upstream
- Hậu điều kiện mong muốn: quyền đăng nhập/API bị thu hồi theo SLA đã quyết định; task đang mở có chủ sở hữu mới hoặc được đưa vào trạng thái chờ phân công; lịch sử người cũ được giữ.
- Không tự xóa employee/user hoặc task. Nếu nghỉ việc bị nhập nhầm, HR có thể khôi phục trạng thái theo quy trình HR; sau đó quản lý xác nhận lại membership và task.
- Cần ghi lại người thực hiện, thời điểm, lý do và quyết định bàn giao để có thể kiểm toán. Hiện các thay đổi HR này chưa có audit trail đầy đủ.

## Các quyết định liên module còn mở

- Ai khởi tạo và xác nhận việc bàn giao task khi chuyển phòng/nghỉ việc?
- Thay đổi phòng ban có hiệu lực ngay hay theo ngày hiệu lực; yêu cầu đang chờ có giữ người duyệt đã chụp lúc gửi không?
- SLA thu hồi JWT sau khi đổi role/nghỉ việc là bao lâu?
- Có cần lịch sử membership và lịch sử phòng ban để báo cáo theo thời điểm không?

## Nguồn đối chiếu

- `backend/src/controllers/userController.js` — tạo nhân viên, cập nhật phòng ban.
- `backend/src/controllers/projectController.js`, `memberController.js`, `taskController.js` — dự án, thành viên, phân công task.
- `backend/src/controllers/authController.js`, `middlewares/authMiddleware.js` — đăng nhập và xác thực token.
- `backend/src/routes/overtimeRoutes.js`, `backend/src/controllers/leaveController.js` — người nhận và trạng thái yêu cầu HR.
=======
- Hậu điều kiện mong muốn: truy cập bị thu hồi; task mở có người tiếp nhận hoặc quyết định xử lý; lịch sử không bị xóa.
- Không xóa cứng employee/user/task khi đổi trạng thái.
- Nếu trạng thái nghỉ việc bị nhập nhầm, HR khôi phục trạng thái theo quy trình nội bộ; sau đó quản lý xác nhận lại quyền/membership/task. Cần audit người sửa, thời gian và lý do.

## Câu hỏi cần HR/chủ sản phẩm xác nhận

- Ngày chuyển phòng/nghỉ việc có hiệu lực theo thời điểm nào?
- Khi chuyển phòng, project manager hay HR chịu trách nhiệm chính cho bàn giao task?
- Đơn chờ duyệt giữ reviewer đã chụp lúc gửi hay chuyển sang reviewer mới?
- Khi nghỉ việc, task không có người nhận thay thế sẽ được giữ, đóng hay đưa về hàng đợi?

## Nguồn đối chiếu

`backend/src/controllers/userController.js`, `projectController.js`, `memberController.js`, `taskController.js`, `backend/src/middlewares/authMiddleware.js`, `backend/src/routes/overtimeRoutes.js`.
>>>>>>> Stashed changes
