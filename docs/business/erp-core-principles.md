# Báo cáo 12 Nguyên tắc Cốt lõi của ERP trong miniERP

## 1. Một nguồn dữ liệu chuẩn (Single Source of Truth)
- **Định nghĩa ngắn gọn:** Mỗi thực thể nghiệp vụ chỉ do một module duy nhất sở hữu và quản lý chính thức, tuyệt đối không nhân bản phân tán dữ liệu.
- **miniERP đang làm đúng / gần đúng:** Bảng `employees` là nguồn dữ liệu chuẩn duy nhất (master data) định danh nhân sự; các module Dự án hoặc Chấm công khi cần tham chiếu đều trỏ trực tiếp tới `employees.employee_id`.
- **miniERP đang thiếu hoặc làm sai:** Trước đây hệ thống từng lưu thông tin quản lý phòng ban dưới dạng chuỗi `manage_by` thô độc lập, gây lệch dữ liệu khi định danh nhân viên thay đổi.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Quy định rõ Module HR là chủ sở hữu duy nhất của dữ liệu nhân sự, các module khác chỉ được phép đọc qua liên kết chuẩn.
  - *Hướng kỹ thuật:* Chuẩn hóa toàn bộ khóa ngoại (`FOREIGN KEY`) qua trường `departments.manager_id` (kiểu `Int`) và loại bỏ hoàn toàn các cột chuỗi thô cũ.

## 2. Tính toàn vẹn dữ liệu (Data Integrity)
- **Định nghĩa ngắn gọn:** Dữ liệu phải luôn thỏa mãn các ràng buộc khóa (`Primary/Foreign Key`), ràng buộc duy nhất (`Unique`) và invariant nghiệp vụ ở cả tầng DB lẫn ứng dụng.
- **miniERP đang làm đúng / gần đúng:** Cột `users.username` có ràng buộc `UNIQUE`; `department_id` và `manager_id` được liên kết khóa ngoại chặt chẽ.
- **miniERP đang thiếu hoặc làm sai:** Bảng `attendances` (chấm công) đôi khi chưa có ràng buộc unique kết hợp `(employee_id, date)` ở tầng database, dẫn đến nguy cơ ghi nhận trùng lặp bản ghi chấm công trong cùng một ngày.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Định nghĩa rõ ràng các ràng buộc định danh không được phép trùng lặp theo quy định vận hành của công ty.
  - *Hướng kỹ thuật:* Bổ sung ràng buộc `@@unique([employee_id, date])` trực tiếp trong file `schema.prisma` của Prisma.

## 3. Vòng đời và trạng thái (Lifecycle & State Machine)
- **Định nghĩa ngắn gọn:** Thực thể nghiệp vụ phải tuân thủ tập trạng thái hợp lệ, quy định rõ điều kiện chuyển trạng thái và các hành động bị cấm ở từng trạng thái.
- **miniERP đang làm đúng / gần đúng:** Vòng đời nhân sự phân định rõ giữa `dang_lam_viec` và `da_nghi_viec`. Middleware chặn không cho nhân viên đã nghỉ việc gọi API.
- **miniERP đang thiếu hoặc làm sai:** Thao tác hủy đơn từ đôi khi đang thực hiện xóa cứng (`delete`) thay vì chuyển sang trạng thái `da_huy`, làm mất vết dữ liệu; trạng thái kích hoạt lại nhân viên nghỉ việc chưa có luồng mô tả chi tiết.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Xây dựng ma trận chuyển đổi trạng thái rõ ràng cho từng loại thực thể (Nhân viên, Đơn từ, Dự án).
  - *Hướng kỹ thuật:* Sử dụng Soft Delete thay vì xóa cứng, chuẩn hóa các trạng thái thành Enum trong schema.

## 4. Phân quyền theo nghiệp vụ (RBAC & Separation of Duties)
- **Định nghĩa ngắn gọn:** Phân quyền dựa trên vai trò (`role`), quyền hạn (`permission`) và phạm vi dữ liệu, tuân thủ nguyên tắc tối thiểu quyền (Least Privilege).
- **miniERP đang làm đúng / gần đúng:** Sử dụng middleware `authorizeRoles('admin', 'manager')` để phân định quyền truy cập các endpoint quản trị.
- **miniERP đang thiếu hoặc làm sai:** Token JWT hiện tại lưu `role` tĩnh tại thời điểm đăng nhập, middleware xác thực đôi khi chưa query realtime trạng thái mới nhất từ DB khi tài khoản bị thay đổi quyền.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Phân tách rõ ràng quyền tự phục vụ (Self-service) của nhân viên và quyền quản trị của cấp quản lý.
  - *Hướng kỹ thuật:* Bổ sung cơ chế kiểm tra trạng thái và quyền trực tiếp từ database hoặc rút ngắn thời gian sống (TTL) của token JWT kết hợp Redis cache.

## 5. Giao dịch và tính nhất quán (Atomicity & Transactions)
- **Định nghĩa ngắn gọn:** Thao tác nhiều bước liên quan đến nhiều bảng phải thành công hoàn toàn hoặc hoàn tác (`rollback`) toàn bộ (All-or-Nothing).
- **miniERP đang làm đúng / gần đúng:** Tính năng chuyển phòng ban và phân công quản lý phòng ban đã được bọc hoàn toàn bên trong `prisma.$transaction`.
- **miniERP đang thiếu hoặc làm sai:** Một số luồng xử lý cập nhật hàng loạt (ví dụ: chuyển nhiều nhân sự sang phòng ban mới) trước đây sử dụng `Promise.all` riêng lẻ, dẫn đến rủi ro lỗi nửa chừng gây lệch dữ liệu nhóm.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Quy định bắt buộc mọi nghiệp vụ liên quan đến phân bổ nguồn lực số lượng lớn phải đảm bảo tính nguyên tử.
  - *Hướng kỹ thuật:* Gom nhóm toàn bộ câu lệnh thay đổi dữ liệu vào trong một khối `prisma.$transaction` duy nhất.

## 6. Audit và truy vết (Audit Trail)
- **Định nghĩa ngắn gọn:** Hệ thống phải ghi nhận tự động ai làm gì, vào lúc nào, giá trị trước và sau khi thay đổi; không được xóa cứng dữ liệu quan trọng.
- **miniERP đang làm đúng / gần đúng:** Sử dụng Soft Delete (`status = 'da_nghi_viec'`) cho nhân viên và ghi nhận thời gian `created_at` cơ bản trên các bảng.
- **miniERP đang thiếu hoặc làm sai:** Thiếu bảng `audit_logs` tập trung để ghi lại vết thay đổi nhạy cảm như lịch sử thay đổi lương, chức vụ hoặc quyền hạn tài khoản.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Xác định rõ các trường dữ liệu bắt buộc phải lưu vết phục vụ công tác kiểm toán nội bộ.
  - *Hướng kỹ thuật:* Xây dựng bảng `audit_logs` kết hợp Prisma Middleware để tự động ghi log mọi thao tác `UPDATE/DELETE` trên các bảng nhạy cảm.

## 7. Lịch sử theo thời gian (Temporal History)
- **Định nghĩa ngắn gọn:** Lưu giữ toàn bộ lịch sử thay đổi phòng ban, chức vụ, tổ chức theo thời gian thay vì chỉ ghi đè giá trị cuối cùng.
- **miniERP đang làm đúng / gần đúng:** Lưu vết vị trí công việc hiện tại (`position`) trong bảng hồ sơ nhân viên `employees`.
- **miniERP đang thiếu hoặc làm sai:** Khi nhân viên chuyển sang phòng ban mới, thông tin phòng ban cũ trên hồ sơ bị ghi đè trực tiếp, không truy xuất được nhân viên từng công tác ở phòng nào vào mốc thời gian quá khứ.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Thiết lập quy tắc lưu trữ lịch sử thuyên chuyển công tác của nhân sự phục vụ việc tính lương thâm niên và báo cáo nhân sự.
  - *Hướng kỹ thuật:* Tạo bảng phụ trung gian `employee_department_history` lưu các mốc thời gian `start_date` và `end_date` cho mỗi lần chuyển phòng ban.

## 8. Workflow và phê duyệt (Approval Workflows)
- **Definion ngắn gọn:** Các nghiệp vụ quan trọng phải qua quy trình đề xuất, phê duyệt, từ chối hoặc hủy, quy định rõ thẩm quyền của từng bước.
- **miniERP đang làm đúng / gần đúng:** Hệ thống đã hỗ trợ quy trình gửi đơn xin nghỉ phép với các trạng thái chờ duyệt, đồng ý hoặc từ chối.
- **miniERP đang thiếu hoặc làm sai:** Luồng phê duyệt hiện tại phụ thuộc cứng vào Admin, chưa hỗ trợ quy trình phê duyệt phân tầng đa cấp (ví dụ: Quản lý trực tiếp duyệt trước, sau đó mới đến lượt HR duyệt tổng).
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Xây dựng ma trận phê duyệt (Approval Matrix) theo cây tổ chức phòng ban.
  - *Hướng kỹ thuật:* Mở rộng bảng đơn từ kết hợp bảng cấu hình cấp duyệt (`approval_steps`) để điều hướng trạng thái động.

## 9. Tích hợp giữa các module (Cross-Module Integration)
- **Định nghĩa ngắn gọn:** Dữ liệu dùng chung giữa các module thông qua liên kết chuẩn hoặc API, tránh sao chép thủ công gây sai lệch.
- **miniERP đang làm đúng / gần đúng:** Module Nhân sự liên kết chặt chẽ với Module Phân quyền qua khóa ngoại `user_id`.
- **miniERP đang thiếu hoặc làm sai:** Khi nhân viên chuyển sang trạng thái nghỉ việc, phiên làm việc (token) ở các module dự án ngoại vi đôi khi không bị vô hiệu hóa ngay lập tức.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Thống nhất quy chế đồng bộ sự kiện nghỉ việc hoặc thay đổi nhân sự sang toàn bộ các module liên quan.
  - *Hướng kỹ thuật:* Kiểm tra trạng thái nhân viên trực tiếp tại middleware xác thực (`verifyToken`) ở mọi request API của hệ thống.

## 10. Báo cáo có định nghĩa rõ ràng (Clear Reports)
- **Định nghĩa ngắn gọn:** Mọi chỉ số báo cáo, chấm công, lương bổng phải có công thức minh bạch, nguồn dữ liệu xác định và xử lý rõ trường hợp biên.
- **miniERP đang làm đúng / gần đúng:** Thống kê cơ bản danh sách nhân sự theo phòng ban và tổng hợp bảng lương theo tháng.
- **miniERP đang thiếu hoặc làm sai:** Chưa văn bản hóa rõ công thức tính toán ngày công thực tế cho các trường hợp nhân viên vào làm giữa tháng hoặc nghỉ phép không lương.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Thống nhất với bộ phận HR về bộ công thức chuẩn tính toán ngày công và hệ số lương.
  - *Hướng kỹ thuật:* Viết hàm service chuẩn hóa logic tính toán lương/công thay vì tính toán phân tán ở các file controller khác nhau.

## 11. Cấu hình thay cho Hard-code (Configuration)
- **Định nghĩa ngắn gọn:** Các quy tắc kinh doanh, tham số hệ thống phải được đưa vào file cấu hình hoặc database thay vì viết cứng trong mã nguồn.
- **miniERP đang làm đúng / gần đúng:** Sử dụng biến môi trường qua `dotenv` và file `env.js` để quản lý các thông số kết nối và bảo mật.
- **miniERP đang thiếu hoặc làm sai:** Các danh mục cố định như danh sách `role` hoặc trạng thái `status` đôi khi vẫn bị đặt rải rác dưới dạng chuỗi cứng (`magic string`) trong các controller.
- **Đề xuất sửa:** 
  - *Mức nghiệp vụ:* Quy định chuẩn hóa các danh mục cấu hình hệ thống dùng chung cho toàn dự án.
  - *Hướng kỹ thuật:* Gom nhóm toàn bộ các hằng số (`constants`), enum vào một file cấu hình tập trung (`src/config/constants.js`).

## 12. Bảo mật và riêng tư (Security & Privacy)
- **Định nghĩa ngắn gọn:** Bảo vệ dữ liệu nhạy cảm, giới hạn quyền truy cập, mã hóa mật khẩu/token và tuyệt đối không ghi thông tin mật vào log.
- **miniERP đang làm đúng / gần đúng:** Mật khẩu người dùng được băm an toàn, kiểm tra nghiêm ngặt định dạng của `JWT_SECRET`.
- **miniERP đang thiếu hoặc làm sai:** Các câu lệnh `console.error` khi bắt lỗi đôi khi in ra toàn bộ đối tượng `req.body` chứa thông tin nhạy cảm của người dùng ra console/log server.
- **Definion sửa:** 
  - *Mức nghiệp vụ:* Thiết lập chính sách bảo mật thông tin cá nhân và dữ liệu nội bộ doanh nghiệp.
  - *Hướng kỹ thuật:* Viết hàm middleware/utility dùng chung để lọc bỏ các trường nhạy cảm (`password`, `token`) trước khi ghi log lỗi hệ thống.