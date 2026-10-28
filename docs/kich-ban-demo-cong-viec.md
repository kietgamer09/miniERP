# Kịch bản demo phần Công việc - tuần 6

Kịch bản này bám theo ví dụ một tuần ở mục 3.4 và tiêu chí hoàn thành ở mục 8 của tài liệu giao việc. Luồng chính là **tạo dự án → giao task → kéo task sang Xong**.

## Tài khoản demo

| Người demo | Vai trò | Tài khoản đăng nhập |
|---|---|---|
| Chị Lan | Admin/HR | Lấy username và mật khẩu từ database demo hoặc người phụ trách Nhân sự |
| Anh Minh | Quản lý | Lấy username và mật khẩu từ database demo hoặc người phụ trách Nhân sự |
| An | Nhân viên | Tài khoản nhân viên đã được tạo trong database demo |
| Bình | Nhân viên | Tài khoản nhân viên đã được tạo trong database demo |

Repo hiện không có seed Nhân sự chứa các tài khoản trên. Không dùng tài khoản hoặc mật khẩu giả định; xác nhận thông tin với bạn phụ trách backend/Nhân sự trước buổi demo. Có thể xem username và vai trò mà không xem mật khẩu bằng truy vấn:

```sql
SELECT e.fullname, u.username, u.role, e.status
FROM employees e
JOIN users u ON u.user_id = e.user_id
WHERE e.fullname ILIKE ANY (ARRAY['%Lan%', '%Minh%', '%An%', '%Bình%'])
ORDER BY e.fullname, u.username;
```

## Chuẩn bị dữ liệu

Chỉ chuẩn bị trên database demo riêng. Không chạy lệnh reset hoặc thay database dùng chung của nhóm.

1. Tạo database PostgreSQL rỗng, ví dụ `miniERP_demo`, rồi đặt `DATABASE_URL` trong `backend/.env` trỏ đến database đó. Cấu hình `JWT_SECRET` theo hướng dẫn trong `backend/README.md`.
2. Trong `backend`, cài dependency và đồng bộ schema vào database demo mới:

   ```bash
   npm install
   npx prisma db push
   npx prisma generate
   ```

3. Chạy quy trình tạo dữ liệu Nhân sự đã thống nhất với bạn phụ trách backend **trước** seed Công việc. Cần ít nhất 8 nhân viên đang làm việc, trong đó có tài khoản Quản lý.
4. Chạy seed Công việc:

   ```bash
   npm run seed:cong-viec
   ```

   Seed tạo 3 dự án `MAU-*`, 30 task và 12 bình luận. Chạy lại sẽ thay thế các dự án `MAU-*` cùng dữ liệu phụ thuộc; seed không xóa dự án có mã khác.
5. Khởi động backend bằng `npm run dev` trong `backend`. Ở terminal khác, vào `frontend`, chạy `npm install` rồi `npm run dev`. Nếu cần, đặt `VITE_API_URL` trong `frontend/.env`.
6. Đăng nhập thử bằng một tài khoản Nhân viên, Quản lý và Admin. Tạo mã dự án demo riêng, không bắt đầu bằng `MAU-`.

Repo hiện không có script seed Nhân sự. Nếu nhóm chưa có quy trình đó, dừng chuẩn bị ở bước 3 và nhờ bạn phụ trách cung cấp; không tự tạo SQL/mật khẩu tài khoản demo trong tài liệu này.

## Luồng demo chính

| Bước | Người/tài khoản | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| 1 | Chị Lan - Admin/HR | Xác nhận An và Bình đã có tài khoản đang hoạt động, thuộc phòng ban phù hợp. | Hai tài khoản đăng nhập được; vai trò của mỗi người đúng trong DB. |
| 2 | Anh Minh - Quản lý | Mở **Dự án → Dự án của tôi**, tạo dự án với mã duy nhất `DEMO-<ngày>`, tên “Bảo trì dây chuyền mạ kẽm”, ngày kết thúc trong tương lai; thêm An và Bình. | Dự án ở trạng thái Đang thực hiện; Minh tự là quản lý và thành viên; An, Bình xuất hiện trong danh sách thành viên. |
| 3 | Anh Minh - Quản lý | Trong dự án vừa tạo, tạo task “Kiểm tra cảm biến nhiệt”, giao cho An, hạn chót trước hoặc đúng ngày kết thúc dự án, ưu tiên Cao. | Task xuất hiện ở cột Cần làm; tiến độ và số lượng task được cập nhật. |
| 4 | An - Nhân viên | Mở **Công việc → Việc được giao** hoặc **Việc của tôi** trên Trang chủ. Mở chi tiết task. | Chỉ thấy task được giao cho An; chi tiết có tiêu đề, mô tả, người làm, hạn, ưu tiên, trạng thái và bình luận. |
| 5 | An - Nhân viên | Kéo task từ Cần làm sang Đang làm; thêm bình luận `Cảm biến số 3 báo sai, em đang thay thử.` | Task đổi cột; bình luận hiện tên An, thời gian, giữ nguyên nội dung; không có nút sửa/xóa. |
| 6 | Anh Minh - Quản lý | Mở cùng task từ dự án, kiểm tra bình luận và tiến độ. | Minh thấy bình luận và tiến độ dự án cập nhật. |
| 7 | An - Nhân viên | Kéo task từ Đang làm sang Xong. | Task chuyển sang Xong; số lượng cột và số quá hạn trên Trang chủ cập nhật ngay; task hoàn thành xuất hiện trong cột hoàn thành tuần này nếu vừa xong trong tuần. |
| 8 | Anh Minh - Quản lý | Mở lại trang dự án và kiểm tra tiến độ. | Dự án hiện 1/1 task đã xong, 100%. Minh có thể hoàn thành dự án nếu muốn trình diễn trạng thái khóa. |

## Tình huống từ chối nên trình bày

| Thao tác thử | Kết quả cần thấy |
|---|---|
| Minh giao task cho nhân viên chưa tham gia dự án | API từ chối; task không được tạo/giao. |
| Minh chọn hạn task sau ngày kết thúc dự án | Form/API từ chối; không ghi task sai hạn. |
| Bình cố chuyển task được giao cho An | Giao diện không cho kéo; nếu gọi API trực tiếp nhận 403. |
| An kéo task từ Cần làm thẳng sang Xong | Giao diện từ chối; API trả 409 vì không được nhảy cột. |
| Minh thử bớt An khi An còn task chưa xong | API trả 409 `Còn N task chưa xong, hãy giao lại trước khi bớt thành viên`. |
| Nhân viên ngoài dự án mở URL task hoặc gọi API bình luận | Bị từ chối 403; không xem được nội dung task/bình luận. |
| Gọi PUT/PATCH/DELETE trên đường dẫn bình luận | Trả 404; bình luận không bị thay đổi. |
| Thử tạo/sửa/kéo task trong dự án đã hoàn thành | Thao tác bị khóa; API trả 409. Xem task và bình luận vẫn được. |

## Kiểm tra trước giờ demo

- [ ] Database là database demo riêng; PostgreSQL đang chạy và `GET /api/health` thành công.
- [ ] Seed Nhân sự chạy trước seed Công việc; có tài khoản Admin, Quản lý, An, Bình và ít nhất 8 nhân viên đang làm việc.
- [ ] `npm run seed:cong-viec` chạy thành công; có 3 dự án MAU, 30 task, 12 bình luận.
- [ ] Backend/frontend khởi động theo README; `VITE_API_URL` trỏ đúng backend.
- [ ] Đăng nhập được bằng cả ba vai trò; kiểm tra menu và quyền nhìn thấy dự án.
- [ ] Tạo trước một project code `DEMO-*` trống để thực hiện luồng chính; không dùng dự án MAU để tránh seed xóa nhầm sau đó.
- [ ] Mở sẵn Trang chủ, dự án demo, task drawer và DevTools Network để trình bày cập nhật số liệu/API nếu cần.
- [ ] Xác nhận với bạn Nhân sự hợp đồng API đếm đơn nghỉ phép. Nếu chưa có, thẻ Trang chủ có thể hiện `—`; không dùng phần này làm điều kiện cho luồng Công việc.

## Checklist “Thế nào là hoàn thành” theo mục 8 tài liệu giao việc

| Hoàn thành khi | Thao tác kiểm chứng | Kết quả |
|---|---|---|
| Mentor clone repo và chạy theo README | Làm theo README trên một checkout sạch, với database demo riêng | Frontend/backend chạy; ghi lại lỗi nếu thiếu bước hoặc biến môi trường. |
| Chức năng bắt buộc mục 2 hoạt động | Thử tạo/sửa dự án, thành viên, task, bình luận, quyền và Kanban theo BRD | Không có lỗi chặn luồng; các thao tác trái quyền bị từ chối. |
| Nhân viên không xem dữ liệu ngoài quyền | Đăng nhập An, thử URL/API dự án, task, bình luận của dự án Bình không tham gia | Bị từ chối; danh sách chỉ có dự án An tham gia. |
| Có BRD và sơ đồ database trong docs | Kiểm tra `docs/BRD_congviec_giaodienchung.md`, `docs/ERD_Final.png` và `docs/erd-cong-viec.dbml` | Tài liệu và sơ đồ được commit, mở được. |
| Demo được luồng nghỉ phép và luồng Công việc | HR: xin nghỉ → Quản lý duyệt → kiểm tra số ngày phép; Công việc: tạo dự án → giao task → kéo sang Xong | Luồng Công việc thực hiện theo bảng ở trên. Luồng nghỉ phép chỉ xác nhận cùng bạn Nhân sự; đây không phải phần sửa của lượt này. |
| Mỗi bạn giải thích được phần mình và hiểu sơ bộ phần kia | Mỗi người giải thích API, quyền và luồng dữ liệu của mình; sau đó mô tả một luồng phần còn lại | Có thể lần theo request từ UI tới route/controller và DB. |

Phần làm thêm không bắt buộc: chỉ trình bày nếu đã hoàn tất và không ảnh hưởng các chức năng bắt buộc.

## Kiểm tra chéo với phần Nhân sự

| Người kiểm tra | Thao tác | Kỳ vọng |
|---|---|---|
| Bạn Công việc kiểm tra Nhân sự | Đăng nhập tài khoản nhân viên đã nghỉ việc | Bị chặn đăng nhập; nhờ bạn Nhân sự xác nhận trạng thái tài khoản. |
| Bạn Nhân sự kiểm tra Công việc | Giao task cho nhân viên đang làm, chuyển nhân viên đó sang nghỉ việc, mở task bằng Quản lý | Task và lịch sử còn nguyên; Quản lý giao lại cho thành viên đang làm việc được. |
| Bạn Nhân sự kiểm tra quyền Công việc | Dùng Nhân viên mở dự án/task/bình luận ngoài quyền | API từ chối; không lộ dữ liệu. |
| Cả hai | Kiểm tra thẻ đơn nghỉ phép trên Trang chủ bằng Quản lý/Admin | Xác nhận đường dẫn, trường `count`, quyền và phạm vi với API thật; nếu API tắt hoặc trả 404, thẻ hiện `—` và Trang chủ vẫn dùng được. |
| Cả hai | Gửi đơn nghỉ phép và duyệt theo luồng HR | Ngày phép còn lại thay đổi đúng theo hệ thống Nhân sự; phần Công việc không tự sửa số ngày phép. |

## Gợi ý Pull Request cuối tuần 6

- **Nhánh nguồn/đích:** `develop` → `main`, theo quy tắc review và bảo vệ nhánh của nhóm.
- **Tóm tắt:** thêm bình luận task bất biến; thêm số dự án Trang chủ; hoàn thiện seed bình luận và tài liệu demo; sửa các lỗi được ghi trong PR.
- **Ảnh:** danh sách/chi tiết task có bình luận, Trang chủ Admin/Quản lý với thẻ số liệu, Kanban sau kéo task sang Xong.
- **Cách kiểm tra:** lệnh chạy README, Postman trong `docs/quy-uoc-api.md`, checklist mục 8 và kịch bản demo này.
- **Còn tồn đọng:** hợp đồng API đếm nghỉ phép cần xác nhận; ghi rõ các lỗi hoặc mục chưa kiểm thử bằng database/role thật.
- Tag mentor để review; không gộp trước khi có approval theo quy tắc nhóm.

## Giả định và điểm cần thống nhất

- Luồng nghỉ phép thuộc phần Nhân sự. Kịch bản chỉ yêu cầu HR tạo đơn, Quản lý duyệt và xác nhận số ngày phép còn lại; không giả định endpoint, quyền hay định dạng response chưa được xác nhận.
- Trang chủ hiện gọi `GET /api/leave-requests/pending-count` và mong response `{ "count": number }`. Route backend hiện có chưa cung cấp endpoint này; khi HR xác nhận endpoint thật, cập nhật hợp đồng tại `docs/quy-uoc-api.md` và frontend cùng lúc. Trong lúc chờ, `—` là trạng thái dự kiến.
- Không ghi mật khẩu demo vào tài liệu hoặc seed Công việc. Tài khoản và mật khẩu được chuẩn bị qua quy trình Nhân sự trên database demo riêng.
- Seed Công việc xóa/tạo lại dữ liệu `MAU-*`; không dùng nó trên database dùng chung nếu cần giữ dữ liệu các dự án mẫu đó.

## Sáu câu tự kiểm tra sau lượt 6

1. Vì sao API lấy `author_id` từ token đăng nhập thay vì nhận từ body bình luận?
2. Vì sao bình luận được render như văn bản thuần thay vì HTML?
3. Vì sao API không có cập nhật/xóa bình luận để bảo đảm tính bất biến?
4. Vì sao thẻ tổng quan tải độc lập và lỗi thì hiển thị trạng thái dự phòng để không chặn Trang chủ?
5. Vì sao route `/api/projects/summary` phải được khai báo trước route động `/api/projects/:id`?
6. Vì sao ẩn nút trên giao diện không đủ để bảo vệ quyền, và backend cần kiểm tra gì khi nhận request trực tiếp?
