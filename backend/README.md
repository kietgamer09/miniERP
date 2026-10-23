# 🚀 MiniERP Backend Service

Backend API service cho hệ thống **MiniERP** được xây dựng bằng Node.js, Express và Prisma ORM quản lý cơ sở dữ liệu PostgreSQL.

---

## 🛠️ Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **ORM:** Prisma
* **Database:** PostgreSQL
* **Authentication:** JSON Web Token (JWT)

---

## 📂 Project Structure
```text
backend/
├── prisma/               # Cấu hình database và Prisma schema
├── src/
│   ├── config/           # Các file cấu hình hệ thống (Prisma client,...)
│   ├── controllers/      # Xử lý logic nghiệp vụ cho các API
│   ├── middlewares/      # Middleware kiểm tra xác thực và phân quyền (Auth, Role)
│   ├── routes/           # Định nghĩa các đường dẫn (endpoints) API
│   └── server.js         # File khởi động ứng dụng Express
├── .env                  # Biến môi trường (Local config)
├── package.json          # Quản lý dependencies và scripts
└── prisma7.config.ts     # Cấu hình mở rộng của Prisma
```
---

# Hướng Dẫn Cấu Hình & Tạo Database Từ A - Z

## Bước 1: Cài đặt PostgreSQL
Tải và cài đặt PostgreSQL từ trang chủ: postgresql.org/download (Khuyên dùng bản 15 hoặc 16).

Ghi nhớ mật khẩu của tài khoản postgres trong quá trình cài đặt.

Đảm bảo dịch vụ PostgreSQL đang chạy ở port mặc định 5432.

## Bước 2: Tạo Cơ Sở Dữ Liệu (miniERP)
Mở phần mềm pgAdmin 4 trên máy tính.

Nhập mật khẩu tài khoản postgres để kết nối vào server.

Ở cột bên trái, bấm chuột phải vào Databases -> Chọn Create -> Database...

Nhập tên Database là: miniERP rồi bấm Save.

## Bước 3: Cấu Hình Biến Môi Trường (.env)
Di chuyển vào thư mục backend trong Terminal / VS Code:
cd backend

Tạo file tên .env nằm ngay tại thư mục gốc của backend/.
Nhập nội dung cấu hình sau vào file .env:
PORT=5000
DATABASE_URL="postgresql://postgres:<MAT_KHAU_POSTGRES_CUA_BAN>@localhost:5432/miniERP?schema=public"
JWT_SECRET="mini_erp_super_secret_key_2026"

## Bước 4: Đồng Bộ Schema & Tạo Bảng Dữ Liệu
Chạy lệnh Prisma để tạo các bảng dữ liệu tự động vào PostgreSQL:
npx prisma db push

## Bước 5: Thêm Dữ Liệu Mẫu (Seed Data) Qua pgAdmin 4
Sau khi các bảng đã được tạo thành công ở Bước 4, bạn tiến hành thêm dữ liệu tài khoản mẫu vào bảng users:

Trong pgAdmin 4, nhấp chuột phải vào database miniERP -> Chọn Query Tool.
Dán đoạn mã SQL dưới đây vào cửa sổ soạn thảo query:

INSERT INTO "users" ("username", "password", "role")

VALUES
 
  ('admin', '$2a$12$LJXbz26R6D7ZJpbYbbvcZuGxJ7i8LlDLYRKeplVVUs0u2ClQtosNS', 'admin'),  
  
  ('quan_ly', '$2a$12$LJXbz26R6D7ZJpbYbbvcZuGxJ7i8LlDLYRKeplVVUs0u2ClQtosNS', 'manager'), 
  
  ('nhan_vien', '$2a$12$LJXbz26R6D7ZJpbYbbvcZuGxJ7i8LlDLYRKeplVVUs0u2ClQtosNS', 'member');

Bấm phím F5 (hoặc nhấn nút Execute/Play ▶️ màu xanh trên thanh công cụ) để chạy câu lệnh.
Thông báo INSERT 0 3 hiện lên ở mục Messages nghĩa là bạn đã tạo thành công 3 tài khoản mẫu



# Hướng Dẫn Chạy Server Backend
Cài đặt các gói thư viện phụ thuộc:
npm install

Khởi động server ở chế độ phát triển (Development):
npm run dev

Server sẽ chạy tại địa chỉ mặc định: http://localhost:5000
