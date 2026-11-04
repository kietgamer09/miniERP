# Phân tích Chi tiết Domain Nhân sự (HR Domain Analysis)

## 1. Phân biệt các thực thể cốt lõi & Master Data
- **Employee (Nhân viên):** Thực thể nghiệp vụ đại diện cho con người làm việc tại công ty. Chứa thông tin hồ sơ (Họ tên, vị trí `position`, trạng thái `status`, phòng ban `department_id`).
- **User Account (Tài khoản người dùng):** Thực thể hệ thống dùng để xác thực và phân quyền đăng nhập (`username`, `password`, `role`). 
- **Department (Phòng ban):** Đơn vị tổ chức của doanh nghiệp (`department_id`, `department_name`, `category`).
- **Position (Chức vụ):** Vị trí công việc chuyên môn của nhân sự trong công ty (ví dụ: `Developer`, `Tester`, `HR Executive`).
- **Manager (Quản lý):** Vai trò của nhân viên được phân công phụ trách một phòng ban, được ghi nhận qua cột `manager_id` trong `departments` và vai trò `role = 'manager'` trong `users`.

*=> **Master Data bao gồm:** `Employee`, `Department`, và `User` (dữ liệu gốc nền tảng cấu trúc nên hệ thống).*

---

## 2. Vòng đời nhân sự (Employee Lifecycle)
Vòng đời nhân sự trong miniERP tuân theo sơ đồ chuyển trạng thái chuẩn:

1. **Tuyển dụng & Khởi tạo (Onboarding):**
   - Tạo hồ sơ nhân sự trong bảng `employees` và tài khoản tương ứng trong `users`.
   - Trạng thái mặc định: `status = 'dang_lam_viec'`, `role = 'employee'`.
2. **Biến động công tác:**
   - **Chuyển phòng ban:** Cập nhật `department_id` (hỗ trợ thực hiện hàng loạt an toàn qua transaction).
   - **Đổi chức vụ:** Cập nhật trường `position` trong hồ sơ.
   - **Bổ nhiệm quản lý:** Gán `manager_id` cho phòng ban, đồng thời tự động nâng `users.role` từ `'employee'` lên `'manager'`.
3. **Nghỉ việc (Offboarding):**
   - Chuyển `employees.status` thành `'da_nghi_viec'`.
   - Middleware xác thực (`verifyToken`) tự động từ chối quyền truy cập hệ thống đối với tài khoản của nhân viên đã nghỉ việc.
   - Nếu nhân viên đó đang quản lý phòng ban, hệ thống gán `manager_id = NULL` hoặc chuyển giao cho quản lý mới, đồng thời hạ cấp `role` tài khoản xuống `'employee'`.
4. **Tái tuyển dụng (Rehire):**
   - Kích hoạt lại trạng thái hồ sơ thành `status = 'dang_lam_viec'` và cấp lại quyền truy cập khi cần thiết.

---

## 3. Quy tắc Quản lý Phòng ban & Lịch sử
- **Phòng ban không có quản lý:** Hoàn toàn có thể xảy ra (trường `manager_id` mang giá trị `NULL`).
- **Một người quản lý nhiều phòng ban:** Hệ thống hỗ trợ linh hoạt (nhiều bản ghi `departments` có chung một `manager_id`).
- **Bảo vệ vai trò khi hạ cấp Quản lý:** Khi một Quản lý bị miễn nhiệm khỏi một phòng ban, hệ thống kiểm tra xem người đó có còn phụ trách phòng ban nào khác không. Nếu không, `role` trong bảng `users` được tự động hạ từ `'manager'` xuống `'employee'`.

---

## 4. Phân quyền & Thao tác dữ liệu (RBAC)
- **Admin:** Có toàn quyền Tạo / Sửa / Xóa Nhân viên, Phòng ban, và Phân công quản lý.
- **Manager:** Được xem danh sách nhân sự thuộc phạm vi phòng ban mình phụ trách và duyệt đơn từ.
- **Employee:** Chỉ được xem thông tin cá nhân của chính mình (`/api/users/me`) và thực hiện đổi mật khẩu. Tuyệt đối **không được tự sửa** các trường quan trọng như `position`, `department_id`, `role`, hay `status` của chính mình.

---

## 5. Định nghĩa Chấm công & Công thức Báo cáo
- **Ngày công chuẩn:** Số ngày làm việc thực tế theo quy định trong tháng (thường là 22 hoặc 26 ngày).
- **Đi muộn / Vắng mặt:** Ghi nhận dựa trên thời gian check-in so với khung giờ ca làm việc quy định.
- **Công thức tính tổng công:**
  $$\text{Tổng công} = \text{Số ngày chấm công hợp lệ} + \text{Số ngày nghỉ phép được duyệt} - \text{Số buổi vắng không phép}$$

---

## 6. Xử lý khi Nhân viên Nghỉ việc
- **Hệ thống Auth:** Khóa phiên làm việc lập tức thông qua việc kiểm tra trạng thái `da_nghi_viec` tại middleware xác thực.
- **Phòng ban:** Nếu nhân viên nghỉ việc đang giữ vai trò `manager_id`, hệ thống yêu cầu cấu hình lại người quản lý thay thế.
- **Dự án / Task:** Bàn giao toàn bộ công việc, task đang thực hiện dang dở cho Quản lý trực tiếp hoặc nhân sự thay thế để tránh đứt gãy tiến độ dự án.