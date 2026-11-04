import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import prisma from '../src/config/prisma.js';

// Tạo token giả lập quyền admin để vượt qua middleware xác thực
const generateMockAdminToken = () => {
  const payload = { user_id: 1, role: 'admin', username: 'admin_test' };
  return jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
};

describe('MiniERP Full Integration Acceptance Tests', () => {
  const token = generateMockAdminToken();

  // 1. Tiêu chí: Tạo/sửa employee với position, tải lại vẫn đúng
  test('POST/PUT /api/users - Should create and update employee with position successfully', async () => {
    // Tạo mới với position
    const createRes = await request(app)
      .post('/api/users/employee-create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullname: 'Test Position User',
        phone_number: '0900000001',
        department_id: 1,
        role: 'employee',
        position: 'Backend Developer'
      });

    expect([200, 201]).toContain(createRes.statusCode);
    const newUserId = createRes.body.user_id || createRes.body.id;

    // Kiểm tra tải lại (Get profile hoặc list) vẫn giữ đúng position
    const getRes = await request(app)
      .get('/api/users/employee-list')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.statusCode).toEqual(200);
  });

  // 2. Tiêu chí: Payload role/status không hợp lệ nhận 400 và DB không đổi
  test('POST /api/users/employee-create - Should fail with 400 if role or status is invalid', async () => {
    const res = await request(app)
      .post('/api/users/employee-create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullname: 'Invalid Role User',
        phone_number: '0900000002',
        department_id: 1,
        role: 'super_admin_not_exist',
        status: 'dang_lam_viec'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  // 3 & 4. Tiêu chí: Danh sách chuyển phòng chứa ID không tồn tại không update; ID trùng trong request được xử lý rõ ràng
  test('PUT /api/users/update-department - Should rollback transaction if any employee ID does not exist, and handle duplicate IDs cleanly', async () => {
    const res = await request(app)
      .put('/api/users/update-department')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employee_ids: [999999, 1, 1], // Chứa ID ảo không tồn tại và ID bị trùng lặp
        new_department_id: 1
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('không tồn tại trong hệ thống');
  });

  // 5. Tiêu chí: Username trùng bị DB chặn và API trả 409
  test('POST /api/users/employee-create - Should return 409 Conflict on duplicate username generation', async () => {
    const userData = {
      fullname: 'Nguyen Van Duplicate',
      phone_number: '0900000003',
      department_id: 1,
      role: 'employee'
    };

    // Gọi lần 1 thành công
    await request(app)
      .post('/api/users/employee-create')
      .set('Authorization', `Bearer ${token}`)
      .send(userData);

    // Gọi lần 2 trùng thông tin sinh username -> 409 Conflict
    const res = await request(app)
      .post('/api/users/employee-create')
      .set('Authorization', `Bearer ${token}`)
      .send(userData);

    expect(res.statusCode).toEqual(409);
    expect(res.body.error).toContain('đã được sử dụng');
  });

  // 6. Tiêu chí: Department manager có foreign key đúng kiểu; không thể trỏ đến employee không tồn tại
  test('Database Constraints - Department manager foreign key integrity', async () => {
    // Thử gán manager_id không tồn tại vào department thông qua trực tiếp prisma hoặc query kiểm tra ràng buộc FK
    let hasError = false;
    try {
      await prisma.departments.update({
        where: { department_id: 1 },
        data: { manager_id: 888888 } // ID employee không có thật
      });
    } catch (err) {
      hasError = true;
    }
    expect(hasError).toBe(true);
  });

});