# TÀI LIỆU ĐẶC TẢ YÊU CẦU NGHIỆP VỤ (BRD)
## PHÂN HỆ QUẢN LÝ CÔNG VIỆC & GIAO DIỆN CHUNG

> **Tài liệu đặc tả yêu cầu nghiệp vụ cho phân hệ Quản lý nhân sự, Đăng nhập và Luồng quy trình Nghỉ phép - Chấm công tự động.**
---
## 1. Quy trình nghiệp vụ

### 1.1 Quy trình giao việc và quản lý dự án
Sơ đồ quy trình tổng thể:
![Quy trình giao việc](quy-trinh-giao-viec.png)

* **Khởi tạo dự án:** Quản lý hoặc Admin tạo dự án mới gồm: Mã dự án (duy nhất), Tên dự án, Mô tả, Ngày bắt đầu, Ngày kết thúc. Người tạo tự động trở thành Quản lý dự án đồng thời là thành viên đầu tiên của dự án. Trạng thái ban đầu là `Đang thực hiện`.

* **Quản lý thành viên:** Quản lý dự án chọn nhân viên đang làm việc để thêm vào dự án.

* **Tạo và giao task:** Quản lý dự án tạo task (Tiêu đề, Người làm task, Hạn chót, Mức ưu tiên: Thấp / Trung bình / Cao, Mô tả).

  * *Ràng buộc:* Người làm task phải là thành viên dự án (Quản lý dự án có thể tự giao việc cho mình). Hạn chót của task không được sau ngày kết thúc dự án (trùng ngày vẫn hợp lệ).

* **Thực hiện và nghiệm thu:** Người làm task thấy công việc ở trang "Việc của tôi" và trong dự án, chuyển task sang `Đang làm`, khi hoàn tất chuyển sang `Xong`. Quản lý dự án xem xét thực tế: nếu chưa đạt thì kéo lùi về `Đang làm`, nếu đạt thì giữ nguyên.

* **Đóng và mở lại dự án:** Khi dự án có ít nhất 1 task và tất cả task đã `Xong`, Quản lý dự án hoặc Admin có thể chuyển dự án sang `Hoàn thành`. Dự án `Hoàn thành` bị khóa (chi tiết ở US_02). Muốn tiếp tục xử lý công việc thì dùng chức năng **Mở lại dự án**.

### 1.2 Vòng đời trạng thái task (Bảng Kanban)
Sơ đồ luân chuyển trạng thái công việc:

![Kanban vòng đời task](kanban-vong-doi-task.png)

* **Vòng đời chuẩn:** `Cần làm` (khi tạo mới) ➔ `Đang làm` ➔ `Xong`.

* **Bước kề nhau:** Chỉ được kéo thả giữa hai cột kề nhau (`Cần làm` ⬄ `Đang làm` ⬄ `Xong`), không được nhảy cóc từ `Cần làm` sang `Xong`.
* **Kéo lùi:** `Đang làm` ➔ `Cần làm` khi công việc tạm hoãn hoặc vướng mắc. `Xong` ➔ `Đang làm` khi nghiệm thu thực tế chưa đạt. Ai được kéo: xem bảng 2.1 và US_10.

* **Cảnh báo quá hạn:** Hệ thống so sánh ngày hiện tại với hạn chót của task mỗi khi hiển thị. Khi ngày hiện tại đã vượt qua hạn chót mà task chưa `Xong`, task được tô đỏ ở Bảng Kanban, trang "Việc của tôi" và danh sách task. Đúng ngày hạn chót chưa bị tô đỏ.

* **Cảnh báo sắp hạn:** Hệ thống so sánh ngày hiện tại với ngày hạn của task. Nếu task chưa `Xong`, chưa quá hạn và còn từ 0 đến 3 ngày lịch đến hạn chót (kể cả đúng ngày hạn chót), task được tô vàng ở Bảng Kanban, trang "Việc của tôi" và danh sách task. Task `Xong` không hiện màu cảnh báo.

### 1.3 Quy trình xin nghỉ - duyệt 

```mermaid
graph TD
  A[Nhân viên gửi đơn xin nghỉ] --> B{Chờ quản lý duyệt}
  B -->|Duyệt| C[Hệ thống trừ ngày phép và hiện ''P'' ở bảng công của ngày xin nghỉ]
  B -->|Từ chối| D[Hệ thống không trừ ngày phép và gửi lý do từ chối duyệt]
  B -->|Hủy| E[Hệ thống không trừ ngày phép và đổi trạng thái của đơn xin nghỉ thành hủy]
```

### 1.4 Quy trình chấm công
```mermaid
graph TD
  A[Nhân viên check-in vào ca] --> B[Hệ thống lưu lại ngày, giờ của người chấm công]
  B --> C[Nhân viên check-out hết ca]
  C --> D[Hệ thống lưu lại thời gian chấm công và tính tổng thời gian làm việc]
```
---

## 2. Phân quyền và Danh sách User Story

### 2.1 Bảng phân quyền
Hệ thống tự kiểm tra quyền theo bảng dưới đây; thao tác ngoài phạm vi cho phép sẽ bị từ chối.

| Chức năng | Admin | Quản lý dự án | Người làm task | Thành viên khác |
| :--- | :---: | :---: | :---: | :---: |
| Tạo dự án mới (*) | Có | Có | Không | Không |
| Sửa thông tin dự án, hoàn thành / mở lại dự án | Có | Có | Không | Không |
| Thêm / bớt thành viên dự án | Có | Có | Không | Không |
| Tạo task, sửa task (giao lại, đổi hạn, ưu tiên) | Có | Có | Không | Không |
| Xem chi tiết dự án, tiến độ và task | Có (mọi dự án) | Có | Có | Có |
| Kéo thả task giữa 2 cột kề nhau | Có | Có | Có (chỉ task của mình) | Không |
| Kéo lùi task từ Xong về Đang làm | Có | Có | Không | Không |
| Viết bình luận trong task | Có | Có | Có | Có |

*Ghi chú:*
* (*) Dòng "Tạo dự án mới" áp dụng cho tài khoản có vai trò Quản lý hoặc Admin, vì lúc tạo chưa có dự án nào.
* Quản lý dự án mặc định là thành viên của dự án. Một người có thể giữ nhiều vai trò cùng lúc (ví dụ Quản lý dự án tự giao việc cho mình) và khi đó có quyền của tất cả vai trò đó.
* Người không thuộc dự án (trừ Admin) không có quyền nào trong bảng trên.

---

### 2.2 Danh sách User Story

#### NHÓM 1: LÀM VIỆC VỚI DỰ ÁN
##### US_01: Tạo dự án mới
- **Phân loại:** Bắt buộc
- **Là** 1 Quản lý hoặc Admin, **tôi muốn** tạo dự án mới với mã dự án, tên, mô tả, ngày bắt đầu, ngày kết thúc **để** tổ chức công việc cho nhóm.
* **Tiêu chí:**
  - **Khi** nhập đủ mã dự án (không trùng), tên dự án, ngày bắt đầu, ngày kết thúc (không trước ngày bắt đầu), hệ thống tạo dự án ở trạng thái `Đang thực hiện`, gán người tạo làm Quản lý dự án và thành viên đầu tiên.
  - **Khi** nhập thiếu thông tin bắt buộc, trùng mã dự án hoặc ngày kết thúc trước ngày bắt đầu, hệ thống từ chối tạo và báo lỗi.

  
##### US_02: Sửa thông tin, hoàn thành và mở lại dự án
- **Phân loại:** Bắt buộc
- **Là** 1 Quản lý dự án hoặc Admin, **tôi muốn** sửa thông tin dự án, chuyển dự án sang Hoàn thành hoặc mở lại dự án **để** quản lý vòng đời dự án chặt chẽ.
* **Tiêu chí:**
  - **Khi** cập nhật thông tin dự án (tên, mô tả, ngày bắt đầu, ngày kết thúc) hợp lệ, hệ thống lưu thông tin mới.
  - **Khi** chuyển sang `Hoàn thành` mà dự án chưa có task nào hoặc còn task chưa `Xong`, hệ thống từ chối và báo lỗi (*"Dự án chưa có task nào để hoàn thành"* hoặc *"Vẫn còn task chưa hoàn thành"*).
  - **Khi** chuyển sang `Hoàn thành` và dự án có ít nhất 1 task, tất cả đã `Xong`, hệ thống cập nhật trạng thái và khóa dự án: không tạo task, không sửa hoặc giao lại task, không kéo thả task. Xem dự án và bình luận vẫn được.
  - **Khi** Quản lý dự án hoặc Admin chọn **Mở lại dự án**, hệ thống đưa dự án về `Đang thực hiện` và mở khóa.

##### US_03: Thêm và bớt thành viên trong dự án
- **Phân loại:** Bắt buộc
- **Là** 1 Quản lý dự án hoặc Admin, **tôi muốn** thêm hoặc bớt thành viên dự án **để** phân bổ nhân sự phù hợp.
* **Tiêu chí:**
  - **Khi** chọn thêm thành viên, hệ thống chỉ hiển thị danh sách nhân viên đang làm việc để lựa chọn.
  - **Khi** bớt một thành viên mà người này còn task chưa `Xong`, hệ thống từ chối và báo lỗi: *"Còn [N] task chưa xong, hãy giao lại trước khi bớt thành viên"*. Nếu không còn task chưa `Xong`, hệ thống xóa thành viên khỏi dự án.

##### US_04: Xem dự án, tiến độ và giới hạn truy cập
- **Phân loại:** Bắt buộc
- **Là** 1 thành viên dự án, **tôi muốn** xem danh sách dự án của tôi và trang chi tiết dự án có tiến độ **để** nắm bắt tình hình triển khai.
* **Tiêu chí:**
  - **Khi** xem danh sách dự án, Nhân viên chỉ thấy các dự án mình tham gia, Admin thấy toàn bộ dự án.
  - **Khi** người không thuộc dự án (trừ Admin) truy cập trực tiếp vào dự án, danh sách task, chi tiết task hoặc bình luận của dự án đó, hệ thống từ chối truy cập và báo lỗi.
  - **Khi** vào trang chi tiết dự án, hệ thống hiển thị thông tin dự án, danh sách thành viên, danh sách task và tiến độ dạng **[Số task đã xong] / [Tổng số task]** (ví dụ `1/1 task đã xong - 100%`).

---

#### NHÓM 2: LÀM VIỆC VỚI TASK TRONG DỰ ÁN

##### US_05: Tạo task trong dự án
- **Phân loại:** Bắt buộc
- **Là** 1 Quản lý dự án hoặc Admin, **tôi muốn** tạo task với tiêu đề, người làm task, hạn chót, mức ưu tiên (Thấp / Trung bình / Cao) và mô tả **để** giao việc cho nhân viên.
* **Tiêu chí:**
  - **Khi** dự án đang ở trạng thái `Hoàn thành`, hệ thống chặn tạo task mới.
  - **Khi** người làm task không phải thành viên dự án, hoặc hạn chót sau ngày kết thúc dự án, hệ thống từ chối và báo lỗi.
  - **Khi** nhập đầy đủ thông tin hợp lệ, hệ thống tạo task mới ở trạng thái `Cần làm`.

##### US_06: Sửa task và giao lại task
- **Phân loại:** Bắt buộc
- **Là** 1 Quản lý dự án hoặc Admin, **tôi muốn** sửa thông tin task, đổi hạn chót hoặc giao lại task cho người khác **để** điều chỉnh kế hoạch phù hợp với thực tế.
* **Tiêu chí:**
  - **Khi** dự án đang ở trạng thái `Hoàn thành`, hệ thống chặn mọi thao tác sửa hoặc giao lại task.
  - **Khi** giao lại task, người làm mới phải là thành viên dự án. Hệ thống cập nhật người phụ trách và task xuất hiện ở trang "Việc của tôi" của người đó.
  - **Khi** đổi hạn chót, hạn mới không được sau ngày kết thúc dự án, nếu sai hệ thống báo lỗi. Sửa tiêu đề, mô tả hoặc mức ưu tiên hợp lệ thì hệ thống lưu thay đổi.

##### US_07: Xem chi tiết task
- **Phân loại:** Bắt buộc
- **Là** 1 thành viên trong dự án, **tôi muốn** xem chi tiết task **để** nắm rõ yêu cầu công việc, người phụ trách, mức ưu tiên và hạn chót.
* **Tiêu chí:**
  - **Khi** thành viên trong dự án hoặc Admin mở task, hệ thống hiển thị đầy đủ: Tiêu đề, Mô tả, Người làm task, Hạn chót, Mức ưu tiên, Trạng thái và Danh sách bình luận.

##### US_08: Bình luận trong task
- **Phân loại:** Bắt buộc
- **Là** 1 thành viên trong dự án, **tôi muốn** bình luận trong task **để** trao đổi công việc với đồng nghiệp.
* **Tiêu chí:**
  - **Khi** thành viên trong dự án hoặc Admin gửi bình luận, hệ thống lưu và hiển thị ngay nội dung kèm tên người gửi và thời gian gửi.
  - **Khi** bình luận đã gửi, hệ thống không có chức năng sửa hoặc xóa bình luận.

##### US_09: Trang Việc của tôi và cảnh báo quá hạn
- **Phân loại:** Bắt buộc
- **Là** 1 nhân viên, **tôi muốn** có trang "Việc của tôi" liệt kê các task được giao cho mình và thấy rõ task quá hạn **để** chủ động ưu tiên xử lý.
* **Tiêu chí:**
  - **Khi** vào trang "Việc của tôi", hệ thống chỉ liệt kê các task mà tôi là Người làm task, trên tất cả các dự án tôi tham gia.
  - **Khi** hiển thị task, hệ thống tô đỏ và ghi nhãn “Quá hạn” cho task quá hạn, tô vàng và ghi “Sắp hạn” cho task sắp hạn, task còn lại chưa Xong hiện màu xanh.
  - **Khi** xem Việc của tôi, hệ thống xếp task quá hạn lên đầu; các task còn lại xếp theo hạn chót gần đến xa (mặc định) hoặc theo mức ưu tiên cao đến thấp nếu tôi chọn.

---

#### NHÓM 3: BẢNG KANBAN

##### US_10: Kéo thả đổi trạng thái task trên Bảng Kanban
- **Phân loại:** Bắt buộc
- **Là** 1 Quản lý dự án, Admin hoặc Người làm task, **tôi muốn** kéo thả task giữa các cột trên Bảng Kanban của dự án **để** cập nhật tiến độ trực quan.
* **Tiêu chí:**
  - **Khi** dự án đang ở trạng thái `Hoàn thành`, hệ thống khóa Bảng Kanban và từ chối mọi thao tác kéo thả.
  - **Khi** Người làm task kéo task **do chính mình phụ trách** giữa hai cột kề nhau (`Cần làm` ➔ `Đang làm`, `Đang làm` ➔ `Xong`, hoặc kéo lùi `Đang làm` ➔ `Cần làm`), hệ thống cập nhật trạng thái mới.
  - **Khi** Người làm task hoặc thành viên khác kéo task **do người khác phụ trách**, kéo nhảy cóc (`Cần làm` ➔ `Xong`), hoặc Người làm task kéo lùi từ `Xong` ➔ `Đang làm`, hệ thống từ chối và trả thẻ về vị trí cũ.
  - **Khi** Quản lý dự án hoặc Admin kéo task bất kỳ giữa hai cột kề nhau (kể cả kéo lùi `Xong` ➔ `Đang làm` khi nghiệm thu chưa đạt), hệ thống cập nhật trạng thái mới.

---

#### NHÓM 4: GIAO DIỆN CHUNG

##### US_11: Menu điều hướng theo vai trò (cộng dồn)
- **Phân loại:** Bắt buộc
- **Là** 1 người dùng, **tôi muốn** thanh menu chỉ hiển thị các mục phù hợp với vai trò của mình **để** điều hướng nhanh và dùng đúng quyền hạn.
* **Tiêu chí:**
  - **Khi** Nhân viên đăng nhập, menu hiển thị: Trang chủ, Dự án của tôi, Việc của tôi, Đơn xin nghỉ phép, Bảng công cá nhân.
  - **Khi** Quản lý đăng nhập, menu có toàn bộ mục của Nhân viên và thêm: Tạo và điều hành dự án, Duyệt đơn nghỉ phép.
  - **Khi** Admin đăng nhập, menu có toàn bộ mục của Quản lý và thêm: Quản lý nhân viên, Quản lý phòng ban, Bảng công toàn công ty.

##### US_12: Trang chủ hiển thị số liệu tổng hợp
- **Phân loại:** Bắt buộc
- **Là** 1 người dùng, **tôi muốn** xem số liệu tóm tắt trên Trang chủ **để** nắm nhanh tình hình công việc và chấm công của bản thân.
* **Tiêu chí:**
  - **Khi** vào Trang chủ, hệ thống hiển thị nút Chấm công, số ngày công trong tháng(tổng ngày công đã trừ chủ nhật, ngày lễ tính bằng ngày đi làm + ngày nghỉ phép, nghỉ ốm) và bảng công.
  - **Khi** vào Trang chủ, hệ thống hiển thị khối “Việc của tôi” gồm 3 cột Cần làm / Đang làm / Xong, mỗi cột kèm số task, kèm tổng số task quá hạn; màu và thứ tự theo US_09.
  - **Khi** kéo thả hoặc bấm vào thẻ task trong khối này, hệ thống áp dụng quy tắc của US_10 và mở chi tiết theo US_07.
  - **Khi** Quản lý hoặc Admin vào Trang chủ, hệ thống hiển thị thêm tổng số dự án đang quản lý và số đơn nghỉ phép đang chờ duyệt.

---

#### NHÓM 5: CHỨC NĂNG LÀM THÊM

##### US_13: Xóa dự án rỗng
- **Phân loại:** Làm thêm
- **Là** 1 Quản lý dự án hoặc Admin, **tôi muốn** xóa dự án rỗng không còn sử dụng **để** dọn dẹp danh sách dự án.
* **Tiêu chí:**

  - **Khi** dự án còn task (ở bất kỳ trạng thái nào), hệ thống từ chối xóa và báo lỗi. Khi dự án không có task nào, hệ thống cho phép xóa.

##### US_14: Biểu đồ thống kê tiến độ trên Trang chủ
- **Phân loại:** Làm thêm

- **Là** 1 Quản lý dự án, **tôi muốn** xem biểu đồ tỷ lệ hoàn thành công việc theo thời gian **để** theo dõi trực quan năng suất của dự án.

---

#### NHÓM 6: ĐĂNG NHẬP

##### US_15: Đăng nhập vào hệ thống
- **Là** 1 người dùng (Nhân viên, Quản lý, HR) **Tôi muốn** đăng nhập vào hệ thống bằng Email và mật khẩu cá nhân **Để** tôi có thể truy cập vào hệ thống và sử dụng các trong quyền hạn của tôi

* **Tiêu chí:**
  - **Khi** người dùng nhập Email không tồn tại thì hệ thống sẽ từ chối truy cập.

  - **Khi** người dùng nhập Email tồn tại nhưng sai mật khẩu thì hệ thống sẽ từ chối truy cập.

  - **Khi** người dùng nhập Email có tồn tại và đúng mật khẩu thì hệ thống sẽ duyệt yêu cầu truy cập.

---

#### NHÓM 7: NHÂN SỰ

##### US_16: Quản lý phòng ban
- **Là** 1 HR **Tôi muốn ** được thêm, sửa, xóa phòng ban **Để** có thể kiểm soát, phân chia, cơ cấu công ty 1 cách dễ dàng và chính xác

* **Tiêu chí**
  - **Khi** HR thêm phòng ban mà nhập đủ thông tin yêu cầu (Mã phòng ban, Tên phòng ban, Lĩnh vực) thì hệ thống sẽ tạo phòng ban mới và lưu lại. 

  - **Khi** HR muốn sửa phòng ban mà đã nhập đầy đủ các thông tin (Tên phòng ban, Lĩnh vực) thì hệ thống sẽ cập nhật thông tin mới của phòng ban và lưu lại hệ thống.

  - **Khi** HR muốn xóa phòng ban mà phòng ban đó vẫn còn nhân sự thì hệ thống sẽ từ chối yêu cầu xóa của HR.

  -**Khi** HR muốn xóa phòng ban mà phòng ban đó không còn nhân sự nào thì hệ thống sẽ xác nhận yêu cầu và xóa phòng ban được chỉ định.

##### US_17: Quản lý nhân sự
  - **Là** 1 HR **Tôi muốn** được thêm,sửa, xem danh sách nhân sự **Để** kiểm soát nhân sự 1 cách chặt chẽ, nắm bắt được thông tin vị trí của nhân sự 1 cách dễ dàng

* **Tiêu chí**
  - **Khi** HR thêm nhân sự và ghi đầy đủ các thông tin yêu cầu thì hệ thống sẽ lưu lại thông tin của nhân sự đó vào tạo ra 1 tài khoản kèm mật khẩu dựa theo thông tin của nhân sự.

  - **Khi** HR sửa thông tin của 1 nhân sự và chỉnh sửa các mục (Phòng ban, chức danh, quản lý trực tiếp ,trạng thái) thì hệ thống sẽ lưu lại và cập nhật thông tin mới cho nhân sự.

  - **Khi** HR xem danh sách nhân sự thì hệ thống sẽ hiện thị ra toàn bộ các nhân sự trực thuộc quyền điều hành của công ty.

##### US_18: Tìm theo tên, lọc theo phòng ban
  - **Là** 1 HR **Tôi muốn** được tìm nhân sự của mình trong danh sách bằng tên và bằng bộ lọc **Để** có thể tìm kiếm nhân sự 1 cách dễ dàng và nhanh chóng
  
* **Tiêu chí**

  - **Khi** HR tìm kiếm 1 nhân sự bằng tên và nhập tên lên thanh tìm kiếm thì hệ thống sẽ tìm tên tương ứng.

  - **Khi** HR chọn phòng ban mà mình muốn xem nhân sự thì hệ thống sẽ hiển thị ra danh sách toàn bộ nhân sự nằm trong phòng ban đó.

---

#### NHÓM 8: CHẤM CÔNG & NGHỈ PHÉP

##### US_19: Châm công (Check-in, Check-out)
- **Là** 1 Nhân viên **Tôi muốn** có thể Check-in, Check-out **Để** có hệ thống có thể xác nhận chính xác số ngày, thời lượng công của tôi.

* **Tiêu chí**
  - **Khi** Nhân viên Check-in, Check-out hệ thống sẽ lưu lại thời gian mà nhân viên đã Check-in và Check-out và tính thời lượng công của nhân viên trong ngày hôm đó.

##### US_20: Xem bảng công bản thân theo tháng (Nhân viên)
  - **Là** 1 Nhân viên **Tôi muốn** có thể xem được ngày công trong 1 tháng của tôi **Để** có thể nắm bắt được số lượng ngày công thực tế, cũng như ngày vắng và ngày nghỉ phép của tôi.

* **Tiêu chí**
  - **Khi** Nhân viên chọn xem bảng công của bản thân thì hệ thống sẽ hiển thị ra toàn bộ bảng công trong 1 tháng của nhân sự, trong đó sẽ hiển thị toàn bộ ngày công trong tháng, ngày nghỉ phép.

##### US_21: Xem bảng công của toàn bộ công ty (HR)
  - **Là** 1 HR **Tôi muốn** xem được toàn bộ bảng công của toàn bộ công ty **Để** có thể theo dõi tiến trình đi làm của toàn bộ công ty cưng như dựa vào ngày công để có thể tính lương.

* **Tiêu chí**
  - **Khi** HR chọn xem bảng công của toàn bộ nhân viên thì hệ thống sẽ hiển thị ra 1 danh sách ngày công của toàn bộ nhân viên công ty.

##### US_22: Gửi đơn xin nghỉ phép
  - **Là** 1 Nhân viên **Tôi muốn** được quyền gửi đơn xin nghỉ phép **Để** có thể giải quyết công việc cá nhân hoặc nhằm đảo bảo sức khỏe.

* **Tiêu chí**
  - **Khi** Nhân viên chọn ngày gửi đơn xin nghỉ phép, hệ thống sẽ xác nhận đơn nghỉ phép rồi chuyển đến người quản lý của nhân sự đó.
  - **Khi** Nhân viên không sử dụng hết số lượng phép nghỉ 1 năm (12ngày/năm) thì sang năm tiếp theo hệ thống sẽ reset số lượng phép nghỉ về ban đầu và không cộng dồn phép nghỉ sang năm tiếp theo
 
##### US_23: Quản lý đơn xin nghỉ phép của nhân viên
  - **Là** 1 Quản lý **Tôi muốn** có thể duyệt/từ chối đơn xin nghỉ phép của nhân viên **Để** có thể sắp xếp lại công việc cũng như để hệ thống cập nhật được ngày công/

* **Tiêu chí**
  - **Khi** Quản lý từ chối duyệt đơn xin nghỉ phép và điền lý do, hệ thống sẽ gửi lại thông báo từ chói kèm lý do cho nhân sự đó, cũng như sẽ không trừ ngảy quỹ nghỉ của nhân sự.

  - **Khi** Quản lý duyệt đơn xin nghỉ phép, hệ thống sẽ thông báo xác nhận cho nhân sự và sẽ trừ đi 1 ngày trong quỹ nghỉ của nhân viên (12 ngày/năm).

  ## 3. Tình huống ngoại lệ và Bảng truy vết

### 3.1 Tình huống ngoại lệ

* **Tình huống 1: Người làm task nghỉ việc**
  - *Cách xử lý:* Hệ thống giữ nguyên task ở trạng thái hiện tại. Quản lý dự án dùng chức năng sửa task (US_06) để giao lại cho thành viên khác trong dự án.
  - *Lý do:* Bảo đảm dữ liệu lịch sử công việc và không làm gián đoạn tiến độ chung.

* **Tình huống 2: Bớt thành viên khi còn task chưa xong**
  - *Cách xử lý:* Hệ thống chặn và báo: *"Còn [N] task chưa xong, hãy giao lại trước khi bớt thành viên"*. Quản lý dự án phải giao lại các task đó trước khi bớt thành viên.
  - *Lý do:* Tránh task bị bỏ trống người phụ trách.

* **Tình huống 3: Muốn đổi trạng thái hoặc sửa task khi dự án đã "Hoàn thành"**
  - *Cách xử lý:* Hệ thống chặn kéo thả, sửa và tạo task. Nếu cần xử lý tiếp, Quản lý dự án hoặc Admin dùng **Mở lại dự án** (US_02).
  - *Lý do:* Tránh dự án mang nhãn "Hoàn thành" nhưng bên trong có task đang làm dở hoặc bị kéo lùi.

  - **Tình huống 4: Quản lý trực tiếp đang nghỉ phép hoặc vắng mặt**
  - *Cách xử lý:* Đơn xin nghỉ phép của nhân viên sẽ tự động cho phép HR hoặc Admin xem và duyệt thay
  - *Lý do:* Tránh tắc nghẽn quy trình phê duyệt công việc và đảm bảo quyền lợi nghỉ phép của nhân viên.

- **Tình huống 5: Nhân viên quên bấm "Ra ca" (Check-out)**
  - *Cách xử lý:* Hệ thống đánh dấu trạng thái ngày công đó là thiếu thông tin ("?"). HR có quyền sửa/bổ sung giờ ra ca thực tế kèm lý do điều chỉnh.
  - *Lý do:* Đảm bảo tính chính xác cho bảng công và số liệu tính lương cuối tháng.

- **Tình huống 6: Xin nghỉ phép bổ sung cho ngày đã qua (ví dụ: Nghỉ ốm đột xuất)**
  - *Cách xử lý:* Hệ thống cho phép nhân viên tạo đơn xin nghỉ lùi (tạo đơn cho ngày trong quá khứ) tối đa trong vòng 3 ngày làm việc kể từ ngày nghỉ. Quá thời hạn này, hệ thống sẽ chặn và tính là nghỉ không lý do.
  - *Lý do:* Linh hoạt xử lý các trường hợp bất khả kháng nhưng vẫn kiểm soát được kỷ luật lao động.

- **Tình huống 7: Trưởng phòng / Quản lý gửi đơn xin nghỉ phép**
  - *Cách xử lý:* Đơn sẽ được chuyển cấp lên cho Quản lý trực tiếp của Trưởng phòng đó (ví dụ: Ban Giám đốc). Trường hợp không có cấp quản lý trực tiếp cao hơn trên hệ thống, đơn sẽ do Admin xét duyệt.
  - *Lý do:* Đảm bảo tính phân cấp thẩm quyền phê duyệt rõ ràng.

- **Tình huống 8: Đổi phòng ban của nhân viên**
  - *Cách xử lý:* Hệ thống cập nhật phòng ban mới và Quản lý trực tiếp mới tương ứng. Đối với các đơn xin nghỉ phép đang ở trạng thái "Chờ duyệt" trước thời điểm chuyển phòng ban, đơn vẫn giữ nguyên luồng để Quản lý cũ phê duyệt.
  - *Lý do:* Tránh bỏ sót hoặc làm gián đoạn các yêu cầu đã gửi trước thời điểm luân chuyển công tác.

- **Tình huống 9: Xử lý quỹ phép dư khi hết năm**
  - *Cách xử lý:* Hệ thống không cộng dồn ngày phép còn dư sang năm tiếp theo. Đúng 00:00 ngày 01/01 hàng năm, hệ thống tự động làm mới (reset) quỹ phép của toàn bộ nhân viên về 12 ngày/năm.
  - *Lý do:* Tuân thủ chính sách quản lý phép năm và quy định chung của công ty.

---

### 3.2 Bảng truy vết

| # | Quy tắc nghiệp vụ cốt lõi | User Story đáp ứng |
|---|---|:---:|
| 1 | Chỉ Quản lý hoặc Admin tạo được dự án, người tạo trở thành Quản lý dự án (đồng thời là thành viên) | US_01 |
| 2 | Thành viên dự án chọn từ danh sách nhân viên đang làm việc | US_03 |
| 3 | Chỉ giao task cho thành viên của dự án (Quản lý dự án có thể tự giao cho mình) | US_05, US_06 |
| 4 | Hạn chót task không được sau ngày kết thúc dự án (trùng ngày vẫn hợp lệ) | US_05, US_06 |
| 5 | Chỉ Quản lý dự án và Admin sửa dự án, thêm/bớt thành viên, tạo/sửa/giao task | US_02, US_03, US_05, US_06 |
| 6 | Đổi trạng thái theo quy tắc kề nhau; Người làm task chỉ đổi task của mình, chỉ Quản lý dự án và Admin kéo lùi từ Xong | US_10 |
| 7 | Task quá hạn (ngày hiện tại > hạn chót và chưa Xong) tô đỏ ở mọi nơi | US_09, US_12 |
| 8 | Bình luận trong task không có chức năng sửa hoặc xóa | US_08 |
| 9 | Người ngoài dự án không thấy và không truy cập được dự án, task, bình luận (trừ Admin) | US_04 |
| 10 | Nhân viên chỉ thấy các dự án mình tham gia | US_04 |
| 11 | Task sắp hạn (còn 0–3 ngày lịch, chưa Xong) hiện màu vàng; task Xong không hiện màu cảnh báo | US_09, US_12 |
| 12 | Đăng nhập bắt buộc đúng thông tin Email và Mật khẩu chính xác mới được cấp quyền truy cập hệ thống | US_15 |
| 13 | Chỉ HR/Admin mới có quyền tạo, sửa, xóa phòng ban và chỉ xóa được phòng ban khi không còn nhân sự | US_16 |
| 14 | Tạo nhân sự mới tự động sinh tài khoản kèm mật khẩu mặc định dựa trên thông tin nhân sự | US_17 |
| 15 | Không cho phép xóa phòng ban nếu còn nhân sự; Không cho phép bớt thông tin bắt buộc khi sửa phòng ban/nhân sự | US_16, US_17 |
| 16 | Hệ thống tự động ghi nhận chính xác thời gian và tính số giờ/ngày công khi nhân viên Check-in/Check-out | US_19 |
| 17 | Nhân viên chỉ xem được bảng công cá nhân; HR có quyền xem bảng công toàn công ty để phục vụ tính lương | US_20, US_21 |
| 18 | Đơn xin nghỉ phép sau khi tạo phải được gửi trực tiếp đến Quản lý trực tiếp (hoặc HR/Admin) để chờ duyệt | US_22, US_23 |
| 19 | Quỹ phép năm mặc định 12 ngày/năm, tự động reset vào đầu năm mới (00:00 ngày 01/01) và không cộng dồn | US_22 |
| 20 | Duyệt đơn nghỉ phép thành công tự động trừ 1 ngày trong quỹ phép; Từ chối đơn phải kèm lý do và giữ nguyên quỹ phép | US_23 |