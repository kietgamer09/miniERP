# miniERP

Ứng dụng quản lý nhân sự và công việc gồm frontend React/Vite và backend Express/Prisma/PostgreSQL.

## Chạy dự án

1. Cấu hình PostgreSQL và khởi động backend theo hướng dẫn trong [`backend/README.md`](backend/README.md).
2. Chạy frontend theo hướng dẫn trong [`frontend/README.md`](frontend/README.md). Mặc định frontend gọi backend tại `http://localhost:5000`; có thể đổi bằng `frontend/.env` (`VITE_API_URL`).

Frontend hiện xác thực qua `POST /api/auth/login`. Backend chưa cung cấp API cho task, bảng công và chấm công, nên các khu vực đó chưa hiển thị dữ liệu.
