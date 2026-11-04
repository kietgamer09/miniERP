# Phân tích Domain Dự án & Tác động Liên Module (Project Domain Analysis)

## 1. Mối liên kết giữa Module Nhân sự và Module Dự án
- Module Nhân sự (`employees`) đóng vai trò cung cấp nguồn lực đầu vào cho Module Dự án (`projects` và `tasks`).
- Nhân viên thuộc các phòng ban khác nhau có thể được phân công vào các dự án inter-department (dự án liên phòng ban).

## 2. Ràng buộc nghiệp vụ khi nhân sự có biến động
- **Khi nhân viên chuyển phòng ban:** Thành viên vẫn giữ nguyên các nhiệm vụ (`tasks`) đã được phân công trong dự án hiện tại trừ khi Manager của dự án có quyết định phân công lại.
- **Khi nhân viên nghỉ việc:**
  - Tất cả các task ở trạng thái `Đang làm` (In Progress) của nhân viên đó phải được tự động chuyển sang trạng thái `Unassigned` hoặc gán lại cho Project Manager.
  - Xóa quyền truy cập của nhân viên đó khỏi các không gian làm việc (Workspace) dự án bảo mật.

## 3. Phân quyền trong Dự án
- **Project Manager (PM):** Có quyền tạo task, giao task cho nhân viên trong dự án, và cập nhật tiến độ.
- **Assignee (Người thực hiện):** Chỉ có quyền cập nhật trạng thái công việc được giao và báo cáo tiến độ.