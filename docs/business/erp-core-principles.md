<<<<<<< Updated upstream
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
=======
# Nguyên tắc ERP cốt lõi — đối chiếu code hiện tại

> Snapshot theo nhánh `develop` sau PR #99 và các PR đã merge trước đó. Bảng này phân biệt triển khai có thật với quyết định nghiệp vụ còn thiếu; không thay cho xác nhận của HR.

| # | Nguyên tắc | Đã có | Còn thiếu / cần quyết định |
|---|---|---|---|
| 1 | Nguồn dữ liệu chuẩn | `employees.employee_id` là định danh nhân viên; dự án, task, chấm công và lương tham chiếu nhân viên. Quản lý phòng ban dùng `departments.manager_id` có FK. | `employees.manage_by` vẫn là chuỗi; chưa có lịch sử quản lý/phòng ban theo thời điểm. Đơn nghỉ giữ người nhận tại lúc gửi, không truy ra quản lý lịch sử. |
| 2 | Toàn vẹn dữ liệu | FK giữa nhân viên, phòng ban, project, membership, task; unique `users.username`, membership `(project_id, employee_id)`, giải trình `(employee_id, date)`, payroll `(employee_id, month)`. | `attendances` chưa có unique `(employee_id, date)`. DB không thể biểu diễn ràng buộc assignee phải là thành viên cùng project; hiện controller đảm bảo ở luồng ghi chuẩn. |
| 3 | Vòng đời rõ ràng | Task có chuyển trạng thái có kiểm soát; project chỉ hoàn tất nếu có task và tất cả task `xong`; project hoàn tất khóa ghi task; đơn nghỉ có chờ/duyệt/từ chối. | Hủy đơn nghỉ đang xóa cứng; nhân viên có trạng thái nghỉ việc nhưng chưa thấy luồng kích hoạt lại được mô tả. Quyền mở lại project hiện có nhưng cần xác nhận policy/audit. |
| 4 | Phân quyền theo vai trò và tài nguyên | API project/task kiểm tra role kết hợp manager/member; comment kiểm tra membership trong transaction; upload attachment tuân theo trạng thái project. | Một số endpoint HR dùng quy tắc riêng; cần kiểm tra quyền theo từng route. Thay role/status được middleware đọc từ DB hiện tại, nhưng cần test các bề mặt API nhạy cảm. |
| 5 | Giao dịch nguyên tử | Tạo project kèm membership, cập nhật/hoàn tất/xóa project và thao tác membership có transaction; xóa project chỉ được khi không có task/comment; attendance có advisory lock. | Chuyển nhiều nhân viên sang phòng mới vẫn dùng `Promise.all` nhiều cập nhật rời. Hủy đơn nghỉ đọc trạng thái rồi xóa theo ID, có khe race với duyệt. |
| 6 | Audit có thể truy nguyên | Payroll giữ snapshot; giải trình/làm thêm có reviewer và thời điểm; task có người tạo và mốc hoàn thành. | Đơn nghỉ chưa lưu người duyệt, thời điểm duyệt hoặc lý do từ chối; đổi role/phòng ban chưa có nhật ký thay đổi riêng. |
| 7 | Lịch sử nghiệp vụ | Đơn nghỉ giữ recipient lúc gửi; project/task giữ creator, assignee và thời điểm; payroll giữ số liệu từng tháng. | Chuyển phòng/chức vụ ghi đè dữ liệu hiện tại; membership bị xóa khi bớt thành viên. Chưa tái dựng được tổ chức hoặc quyền dự án tại một ngày lịch sử. |
| 8 | Workflow có phản hồi | Nghỉ phép, overtime và giải trình có trạng thái; backend chặn tự duyệt nghỉ phép; việc duyệt dùng điều kiện trạng thái chờ. Project/task có kiểm soát lifecycle. | Đơn nghỉ thiếu audit/reason từ chối và luồng hủy lưu lịch sử. Cần xác nhận thông báo kết quả là yêu cầu bắt buộc cho mọi loại yêu cầu HR. |
| 9 | Tích hợp liên module | Chỉ nhân viên đang làm việc mới được thêm project/giao task; bớt member bị chặn khi còn task chưa xong; nghỉ việc bị từ chối đăng nhập/API qua auth middleware. | Nghỉ việc/chuyển phòng chưa tự bàn giao task hoặc membership. Frontend gọi `GET /api/leave-requests/pending-count` nhưng backend chưa có route này. |
| 10 | Báo cáo từ quy tắc thống nhất | `classifyDay` và `payrollRules` dùng chung quy tắc; ngày làm việc T2–T6 và xử lý giờ Việt Nam. Project summary có thống kê hoàn thành đúng hạn/trễ/quá hạn. | Chưa có lịch nghỉ lễ cấu hình. Chỉ số hiệu suất cần định nghĩa mẫu số và cách tính khi đổi deadline, task chưa đến hạn hoặc bị chuyển người làm. |
| 11 | Cấu hình thay vì hằng số | Quy tắc trạng thái và một số phép tính được gom trong utility. | 12 ngày phép, ca 08:00–17:00, ngưỡng nhắc 3 ngày, mức lương mặc định 10.000.000 vẫn là hằng số; chưa có cấu hình theo công ty/phòng/nhân viên. |
| 12 | Bảo mật theo mặc định | Secret JWT fail-fast khi thiếu/yếu; role/status được đọc hiện hành từ DB; credential tạm hết hạn và buộc đổi; rate limit login; bcrypt, chat AES-GCM; attachment giới hạn root/path. | `cors()` đang mở mặc định; token lưu trong `localStorage`. Cần cấu hình CORS theo môi trường và đánh giá rủi ro XSS/session trước khi triển khai thật. |

## Cách dùng

- “Đã có” có nghĩa là nhìn thấy trong code; mức bao phủ test cần kiểm tra riêng.
- “Còn thiếu” không tự động là yêu cầu sửa: HR/chủ sản phẩm cần duyệt policy trước.
- Tài liệu chuyên sâu HR do người phụ trách Nhân sự sở hữu tại `hr-domain-analysis.md`.

## Nguồn đối chiếu

`backend/prisma/schema.prisma`; `backend/src/controllers/{projectController,taskController,taskDetailsController,taskActionController,memberController,leaveController,userController,attendanceController,PayrollController}.js`; `backend/src/middlewares/authMiddleware.js`; `backend/src/config/env.js`; `backend/src/services/attachmentStorage.js`; `backend/src/utils/{taskRules,attendanceRules,payrollRules}.js`; `backend/src/server.js`; `frontend/src/services/leaveApi.js`.
>>>>>>> Stashed changes
