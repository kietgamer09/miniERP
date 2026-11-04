# Prisma migrations: chuyển đổi an toàn

## Hiện trạng

Repo hiện chưa có `prisma/migrations`. Môi trường đang đồng bộ model bằng `prisma db push`; một số tính năng còn dùng SQL trong `prisma/sql/*.sql` và script `setup:*`. Chưa tạo baseline hoặc đánh dấu database nào là đã migrate trong thay đổi này. Không chạy lệnh migration trên database dùng thật trong giai đoạn chuẩn bị.

## Kế hoạch chuyển đổi

1. **Kiểm kê schema.** Đối chiếu `schema.prisma`, SQL trong `prisma/sql/`, các script `setup:*` và schema của từng môi trường. Tách rõ table/index/constraint/comment/trigger đã được Prisma biểu diễn và phần SQL bổ sung. Không suy đoán migration lịch sử chỉ từ một database.
2. **Tạo baseline đã review.** Tạo thư mục `prisma/migrations/0_init` rồi sinh SQL từ schema:

   ```powershell
   New-Item -ItemType Directory -Force prisma/migrations/0_init
   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/0_init/migration.sql
   ```

   Review SQL, bổ sung các constraint/index/SQL riêng chưa được Prisma schema đại diện. Xác nhận baseline dựng được database rỗng trên PostgreSQL mới.
3. **Chuẩn hóa SQL tính năng.** Đưa nội dung `prisma/sql/*.sql` vào các migration đánh số sau baseline theo thứ tự phụ thuộc. Migration phải có thể áp dụng trên database mới; giữ script `setup:*` làm wrapper chuyển tiếp hoặc ngừng dùng sau khi mọi môi trường đã áp dụng migration.
4. **Thử trên bản sao.** Tạo backup, khôi phục vào database staging cô lập, so sánh schema với baseline, rồi chạy `prisma migrate resolve --applied 0_init` trên staging để ghi nhận baseline đã tồn tại. Kiểm tra `_prisma_migrations` và chạy migrations mới trên staging.
5. **Rollout từng môi trường.** Backup từng database, xác nhận schema parity, áp dụng lệnh `migrate resolve --applied 0_init` cho database có sẵn; database mới dùng `prisma migrate deploy`. Chỉ chuyển tài liệu setup sang Migrate sau khi các môi trường được đánh dấu và xác minh.

Tài liệu chính thức: [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining) và [Prisma Config v7](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).

## Rollback và phục hồi

- Trước mỗi lần rollout, tạo `pg_dump --format=custom` và xác nhận có thể khôi phục bản dump vào database staging.
- Migration thường không tự hoàn tác. Với lỗi có thể đảo ngược, chuẩn bị SQL sửa ngược riêng, review và thử trên staging; nếu không thể đảo an toàn, dừng rollout và phục hồi snapshot theo quy trình vận hành đã duyệt.
- Không dùng `prisma migrate reset`, không xóa database, và không chạy SQL baseline trên database đã có dữ liệu.
- Nếu migration lỗi một phần, giữ nguyên database để điều tra; không đánh dấu migration thành công hoặc tiếp tục deploy mù.

## Quy trình test database

`npm test` chỉ chạy unit/contract tests không cần PostgreSQL. `npm run test:integration` bắt buộc có `TEST_ADMIN_DATABASE_URL` trỏ tới PostgreSQL loopback và database quản trị `postgres` hoặc `template1`; script tạo database tên `minierp_<suite>_test_<uuid>`, xác minh `current_database()` trước khi push schema/ghi/xóa và chỉ drop đúng database khớp tên vừa tạo. Không dùng `DATABASE_URL` của ứng dụng làm quyền tạo/xóa test DB.

Local PowerShell example (thay thông tin kết nối test PostgreSQL):

```powershell
$env:TEST_ADMIN_DATABASE_URL = "postgresql://postgres:<MAT_KHAU>@localhost:5432/postgres?schema=public"
$env:JWT_SECRET = (node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
npm test
npm run test:integration
```

Integration tests cần quyền `CREATE DATABASE`/`DROP DATABASE` trên máy PostgreSQL test ở `localhost`. Script từ chối host khác và từ chối URL trỏ trực tiếp tới database ứng dụng. Không đặt URL của production hoặc database chứa dữ liệu người dùng vào `TEST_ADMIN_DATABASE_URL`.
