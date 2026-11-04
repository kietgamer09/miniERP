# Nguyên tắc ERP cốt lõi — đối chiếu miniERP

> Phạm vi: phân tích theo code đang có trên nhánh `nghiep-vu-erp` tại thời điểm viết. Đây là tài liệu nghiệp vụ, không phải xác nhận mọi nghiệp vụ HR đã được chủ nghiệp vụ duyệt. Nội dung chuyên sâu về HR thuộc người phụ trách Nhân sự.

## Mười hai nguyên tắc và hiện trạng

| # | Nguyên tắc | Đã có trong code | Khoảng trống / rủi ro cần xử lý |
|---|---|---|---|
| 1 | Nguồn dữ liệu chuẩn | `employees.employee_id` là định danh nhân viên; dự án, task, chấm công và lương tham chiếu nhân viên. | `employees.manage_by` là chuỗi, không có FK tới quản lý. Đơn nghỉ lưu người gửi/người nhận dưới dạng ID nhưng chưa có lịch sử tổ chức để xác định quản lý theo thời điểm. |
| 2 | Toàn vẹn dữ liệu | FK cho project manager, thành viên dự án, task và nhân viên; unique thành viên `(project_id, employee_id)` và lương `(employee_id, month)`. | `users.username` chưa unique; `attendances` chưa có unique `(employee_id, date)`; `tasks.assignee_id` có FK nhân viên nhưng DB không bảo đảm người đó là thành viên của `project_id`; `departments.managment` là chuỗi. |
| 3 | Vòng đời rõ ràng | Trạng thái task có quy tắc chuyển; dự án hoàn tất chỉ khi có task và mọi task đã `xong`; task không được sửa/tạo khi dự án hoàn thành. | Hủy đơn nghỉ đang xóa cứng; nhân viên có trạng thái nghỉ việc nhưng chưa có luồng kích hoạt lại được mô tả. Quy tắc mở lại dự án cho phép chuyển về đang thực hiện, cần được chủ nghiệp vụ xác nhận. |
| 4 | Phân quyền theo vai trò và tài nguyên | Thao tác quản lý dự án giới hạn Admin hoặc quản lý đúng dự án; task kiểm tra thành viên/quản lý; chỉ người được giao hoặc người quản lý mới có các chuyển trạng thái tương ứng. | JWT chứa role và middleware xác thực token chưa tải role/status mới từ DB; một số API HR có quy tắc riêng cần rà soát. Rủi ro cụ thể và đề xuất nằm trong Issue #91. |
| 5 | Giao dịch nguyên tử | Tạo dự án kèm thành viên, cập nhật dự án, hoàn tất dự án và một số thao tác thành viên dùng transaction. Chấm công dùng advisory lock; duyệt giải trình/làm thêm khóa bản ghi. | Chuyển nhiều nhân viên sang phòng mới chạy nhiều cập nhật bằng `Promise.all`, không nguyên tử toàn nhóm. Hủy nghỉ đọc trạng thái rồi xóa riêng, có khe race với duyệt. |
| 6 | Audit có thể truy nguyên | Payroll lưu snapshot số liệu; giải trình chấm công/làm thêm lưu người duyệt và thời điểm; task lưu `completed_at`. | Đơn nghỉ không lưu reviewer, thời điểm duyệt hoặc lý do từ chối; đổi role/phòng ban không có nhật ký thay đổi chuyên biệt. |
| 7 | Lịch sử nghiệp vụ | Đơn nghỉ giữ người nhận tại lúc tạo; payroll snapshot theo tháng; task giữ người tạo và thời điểm hoàn thành. | Chuyển phòng/chức vụ/quản lý ghi đè trạng thái hiện tại; bớt thành viên dự án xóa membership. Không thể tái dựng đầy đủ tổ chức hay thành viên tại một ngày lịch sử. |
| 8 | Workflow có phản hồi | Nghỉ phép, tăng ca và giải trình có bước gửi/duyệt; backend chặn tự duyệt đơn nghỉ; duyệt dùng cập nhật có điều kiện theo trạng thái chờ. | Đơn nghỉ thiếu trường lý do từ chối và sự kiện audit/thông báo kết quả có thể truy nguyên. Hủy đơn là xóa cứng thay vì trạng thái hủy. |
| 9 | Tích hợp liên module | Chỉ nhân viên đang làm việc mới được thêm dự án/giao task; người không còn là thành viên không còn quyền task theo kiểm tra quyền. | Nghỉ việc/chuyển phòng hiện không tự xử lý task đang giao hoặc membership dự án. Frontend gọi `GET /api/leave-requests/pending-count`, nhưng backend hiện chưa có route tương ứng. |
| 10 | Báo cáo từ quy tắc thống nhất | `classifyDay` và `payrollRules` dùng chung để phân loại ngày; ngày làm việc là Thứ 2–Thứ 6; có chuyển đổi giờ Việt Nam. | Chưa có lịch ngày lễ cấu hình; báo cáo năng suất cần định nghĩa mẫu số và cách xử lý task chưa đến hạn/đổi deadline trước khi dùng để đánh giá cá nhân. |
| 11 | Cấu hình thay vì hằng số | Một số lựa chọn trạng thái và múi giờ được tập trung trong utility. | 12 ngày phép, giờ ca 08:00–17:00, ngưỡng nhắc 3 ngày, mức lương mặc định 10.000.000 đang nằm trong logic; chưa có cấu hình theo công ty/phòng/nhân viên. |
| 12 | Bảo mật theo mặc định | Mật khẩu được băm bằng bcrypt; chat mã hóa AES-GCM; attachment kiểm tra quyền và đường dẫn. | Có fallback JWT secret cố định; CORS đang mở bằng `cors()` mặc định; token được lưu trong `localStorage`. Xem Issue #91 và đánh giá triển khai trước khi phát hành. |

## Cách đọc bảng

- “Đã có” nghĩa là có bằng chứng triển khai trong code, không đồng nghĩa đã được kiểm thử toàn diện hoặc được HR/pháp chế phê duyệt.
- “Khoảng trống” là rủi ro hoặc câu hỏi cần quyết định; không tự suy diễn thành yêu cầu thay đổi nghiệp vụ.
- Vấn đề module Nhân sự cần được người phụ trách HR xác nhận trong `hr-domain-analysis.md`.

## Nguồn code chính

- `backend/prisma/schema.prisma`
- `backend/src/controllers/projectController.js`, `taskController.js`, `taskDetailsController.js`, `taskActionController.js`, `memberController.js`
- `backend/src/controllers/leaveController.js`, `userController.js`, `attendanceController.js`, `PayrollController.js`
- `backend/src/utils/taskRules.js`, `attendanceRules.js`, `payrollRules.js`
- `backend/src/middlewares/authMiddleware.js`, `backend/src/server.js`
- `frontend/src/services/leaveApi.js`
