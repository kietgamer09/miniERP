# Nguyên tắc ERP cốt lõi — hiện trạng miniERP

> Đã đối chiếu với code trong checkout nhánh `develop` ngày 09/11/2026. Đây là mô tả triển khai và phân tích rủi ro; không tự biến đề xuất kỹ thuật thành chính sách đã được chủ nghiệp vụ duyệt.

## Quy ước đọc

- **Hiện trạng**: hành vi được xác định từ model, API hoặc utility nêu ở cột nguồn.
- **Khoảng trống/rủi ro**: điều code hiện chưa bảo đảm hoặc chưa lưu đủ dữ liệu.
- **Đề xuất**: phương án cần chủ nghiệp vụ hoặc chủ hệ thống quyết định trước khi triển khai.
- **Giả định**: điều chưa có quyết định được ghi rõ, không trình bày như quy tắc đã thống nhất.

## Mười hai nguyên tắc và đối chiếu

| # | Nguyên tắc | Hiện trạng trong code | Nguồn kiểm chứng | Khoảng trống / đề xuất |
|---|---|---|---|---|
| 1 | Nguồn dữ liệu chuẩn | `employees.employee_id` là khóa được project, task, attendance, payroll và tài khoản liên kết. Quản lý phòng ban nằm ở `departments.manager_id`, FK tới nhân viên. | `schema.prisma`: `employees`, `departments`, `projects`, `tasks`, `attendances`, `payrolls`. | `employees.manage_by` vẫn là cột chuỗi legacy, không có FK và không được API hiện hành dùng. **Đề xuất:** kiểm kê dữ liệu trước khi lập kế hoạch bỏ cột; không xóa chỉ dựa vào tài liệu. |
| 2 | Toàn vẹn dữ liệu | `users.username` là unique; `attendances` unique `(employee_id, date)`; membership unique `(project_id, employee_id)`; payroll unique `(employee_id, month)`. | `schema.prisma`: `users.username`, `attendances`, `project_members`, `payrolls`. | DB chỉ FK `tasks.assignee_id` tới nhân viên, không có constraint xác nhận assignee là member của cùng project; controller kiểm tra ở luồng API. Import/script khác vẫn cần tuân thủ invariant này. |
| 3 | Vòng đời và trạng thái | Employee dùng `dang_lam_viec`/`da_nghi_viec`; task có ba trạng thái; project chỉ hoàn thành khi có ít nhất một task và mọi task `xong`. | `schema.prisma`; `userController.updateUser`; `taskRules.js`; `projectController.completeProject`. | Hủy đơn nghỉ hiện xóa cứng thay vì giữ trạng thái hủy; chưa có lịch sử rehire/organization. Project có API mở lại. **Giả định cần xác nhận:** có cần audit/lý do cho hủy đơn và mở lại project không? |
| 4 | Phân quyền theo vai trò và tài nguyên | `verifyToken` đọc role và trạng thái nhân viên hiện tại từ DB mỗi request; token cũ không giữ quyền cũ sau khi role đổi, nhân viên `da_nghi_viec` bị từ chối. Project/task kiểm tra membership và project manager theo từng API. | `authMiddleware.verifyToken`; `projectController.js`; `taskAccess.js`; `taskDetailsController.js`. | `/api/users/employee-list` chỉ yêu cầu đăng nhập, trả danh sách nhân viên và các trường hồ sơ; chưa giới hạn theo role hoặc loại bỏ PII. **Đề xuất:** chủ HR/chủ dữ liệu chốt từng vai trò được xem trường nào. |
| 5 | Giao dịch nguyên tử | Tạo project và membership, cập nhật employee cùng role/manager, chuyển nhiều employee sang phòng ban, duyệt task/project dùng transaction hoặc cập nhật có điều kiện. | `projectController.createProject/updateProject`; `userController.updateUser/updateEmployeesDepartment`; `taskActionController.changeTaskStatus`. | `cancelLeaveRequest` đọc trạng thái rồi xóa ngoài transaction/conditional delete; có thể đua với thao tác duyệt. Đây là rủi ro hiện hành cần xử lý nếu hủy đơn phải đồng bộ với duyệt. |
| 6 | Audit có thể truy nguyên | Task có `completed_at`; attendance explanation và overtime có trường reviewer/thời điểm; payroll giữ snapshot theo tháng. | `schema.prisma`: `tasks`, `attendance_explanations`, `work_overtime_requests`, `payrolls`. | `Day_off_requests` không lưu reviewer, thời điểm duyệt hay lý do từ chối; đổi role/phòng/chức vụ không có audit log trước-sau. **Đề xuất:** xác định trường bắt buộc theo yêu cầu kiểm toán trước khi thiết kế log. |
| 7 | Lịch sử nghiệp vụ | Đơn nghỉ giữ người gửi/người nhận hiện tại; payroll giữ dữ liệu từng tháng. | `schema.prisma`: `Day_off_requests`, `payrolls`; `leaveController.createLeaveRequest`. | Chuyển phòng ghi đè `employees.department_id`; xóa membership xóa dòng liên kết. Không thể dựng lại đầy đủ tổ chức hoặc membership tại một thời điểm quá khứ. |
| 8 | Workflow và phân tách nhiệm vụ | Đơn nghỉ chọn quản lý phòng ban, nếu không có người phù hợp thì chọn một admin đang làm việc; không cho tự duyệt; duyệt chỉ cập nhật khi trạng thái còn chờ. | `leaveController.createLeaveRequest/reviewLeaveRequest`; `schema.prisma: departments.manager_id`. | Chỉ lưu một recipient; đơn từ chối thiếu lý do/reviewer/time audit; hủy đơn là hard delete. **Giả định cần xác nhận:** một người duyệt là đủ và fallback admin đầu tiên có phù hợp quy trình HR không? |
| 9 | Tích hợp liên module | Nhân viên nghỉ việc bị từ chối xác thực ngay ở request sau; project membership và task không tự bàn giao khi nhân viên nghỉ việc/chuyển phòng. | `authMiddleware.verifyToken`; `userController.updateUser`; `projectController.js`, `memberController.js`. | Frontend `leaveApi.getPendingLeaveCount` gọi `/api/leave-requests/pending-count`, trong khi backend mount routes dưới `/api/leaves` và không có route `pending-count`. Cần thống nhất contract thay vì ghi là API đã có. |
| 10 | Báo cáo có công thức | Payroll đếm ngày chuẩn là mọi ngày Thứ 2–Thứ 6 trong tháng; phân loại từng ngày đúng một lần. Ngày phép duyệt không nằm trong `off_days`; không cộng phép vào ngày công rồi trừ vắng lần nữa. | `payrollRules.workingDates/payrollDays/payrollAmounts`; `attendanceRules.classifyDay`; `PayrollController.preview`. | Không có lịch ngày lễ; ngày chưa tới không tính `off_days`, nhưng `standard_days` vẫn là toàn tháng. Công thức chi tiết và trường hợp đi làm giữa tháng nằm trong `hr-domain-analysis.md`; chủ HR cần duyệt chính sách tiền lương. |
| 11 | Cấu hình thay cho hằng số | Một số danh mục được gom trong utility; giờ chấm công theo 08:00–17:00, giới hạn nghỉ phép 12 ngày, lương cơ sở mặc định 10.000.000 và một số ngưỡng nhắc/giải trình đang là hằng số. | `attendanceRules.js`; `leaveController.MAX_LEAVE_DAYS`; `PayrollController.preview`; `attendanceExplanationController.js`; frontend reminder utilities. | Chưa có cấu hình theo công ty/phòng/nhân viên hoặc lịch ngày lễ. **Đề xuất:** chủ nghiệp vụ xác nhận giá trị và phạm vi áp dụng trước khi đưa vào cấu hình. |
| 12 | Bảo mật và riêng tư | Không còn JWT fallback: `env.js` fail-fast với secret yếu/thiếu; bcrypt băm mật khẩu; mật khẩu tạm riêng có hạn và yêu cầu đổi; login bị rate limit. | `config/env.js`; `authMiddleware.js`; `userController.js`; `authRoutes.js`; `loginRateLimit.js`. | `cors()` đang dùng cấu hình mặc định mở origin; token frontend lưu `localStorage`; employee-list trả hồ sơ nhiều hơn mức tối thiểu. Đây là rủi ro triển khai/riêng tư cần chủ hệ thống phê duyệt cách giảm thiểu. |

## Nguồn tham chiếu chính

- Schema: `backend/prisma/schema.prisma`.
- Auth/user/department: `backend/src/config/env.js`, `middlewares/authMiddleware.js`, `controllers/authController.js`, `controllers/userController.js`, `controllers/departmentController.js`, `routes/userRoutes.js`.
- Project/task: `backend/src/controllers/projectController.js`, `taskController.js`, `taskDetailsController.js`, `taskActionController.js`, `memberController.js`, `utils/taskRules.js`, `utils/taskAccess.js`.
- HR/reporting: `backend/src/controllers/leaveController.js`, `PayrollController.js`, `attendanceController.js`, `utils/attendanceRules.js`, `utils/payrollRules.js`.
- Frontend contracts: `frontend/src/services/leaveApi.js`, `employeeApi.js`, `utils/attendanceSummary.js`, `utils/taskStatus.js`.

## Các quyết định còn cần chủ nghiệp vụ

1. Quyền xem hồ sơ nhân viên và từng trường PII ở `employee-list`.
2. Chính sách lưu vết, hủy/khôi phục đơn nghỉ, lý do từ chối và mở lại dự án.
3. Cách bàn giao task/membership khi chuyển phòng hoặc nghỉ việc.
4. Ngày lễ, phép năm, chuẩn giờ làm và công thức payroll áp dụng chính thức.
