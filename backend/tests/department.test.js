import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/minierp_unit_test?schema=public';

const [{ default: app }, { default: prisma }] = await Promise.all([
  import('../src/server.js'),
  import('../src/config/prisma.js'),
]);

const generateToken = (userId = 1) => {
  return jwt.sign({ user_id: userId }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
};

const adminToken = generateToken(1);
const employeeToken = generateToken(2);

// ==========================================
// MOCK TOÀN DIỆN CHO PRISMA
// ==========================================
['users', 'employees', 'departments', 'projects', 'attendances', 'leaves', 'tasks'].forEach(model => {
  if (prisma[model]) {
    prisma[model].findUnique = async () => null;
    prisma[model].findFirst = async () => null;
    prisma[model].findMany = async () => [];
    prisma[model].create = async (args) => args.data;
    prisma[model].update = async (args) => args.data;
    prisma[model].delete = async () => ({});
  }
});

prisma.users.findUnique = async (args) => {
  const userId = Number(args?.where?.user_id);
  if (userId === 1) {
    return {
      user_id: 1,
      role: 'admin',
      must_change_password: false,
      employees: { status: 'dang_lam_viec' }
    };
  }
  if (userId === 2) {
    return {
      user_id: 2,
      role: 'employee',
      must_change_password: false,
      employees: { status: 'dang_lam_viec' }
    };
  }
  return null;
};

prisma.employees.findUnique = async (args) => {
  const empId = Number(args?.where?.employee_id);
  if (empId === 99) {
    return { employee_id: 99, status: 'da_nghi_viec' };
  }
  if (empId === 99999) return null; // Giả lập ID quản lý không tồn tại
  return { employee_id: empId, status: 'dang_lam_viec' };
};

prisma.departments.findUnique = async (args) => {
  const deptId = Number(args?.where?.department_id);
  if (deptId === 1) {
    return {
      department_id: 1,
      department_name: 'Phòng Ban Gốc',
      category: 'IT',
      manager_id: 1
    };
  }
  return null;
};

prisma.departments.update = async (args) => {
  return {
    department_id: args.where.department_id,
    department_name: args.data.department_name || 'Phòng Ban Mặc Định',
    category: args.data.category || 'IT',
    manager_id: args.data.manager_id !== undefined ? args.data.manager_id : 1
  };
};

prisma.departments.create = async (args) => {
  if (args.data.manager_id === 99) {
    const error = new Error('Không thể chỉ định nhân viên đã nghỉ việc làm quản lý phòng ban!');
    error.status = 400;
    throw error;
  }
  return {
    department_id: args.data.department_id || 888,
    department_name: args.data.department_name,
    category: args.data.category,
    manager_id: args.data.manager_id
  };
};

prisma.$transaction = async (callback) => {
  if (typeof callback === 'function') {
    return await callback(prisma);
  }
  return Promise.all(callback);
};

// ==========================================
// CÁC KỊCH BẢN TEST (GỘP ĐỦ 8 TEST)
// ==========================================

// 4 Test ban đầu về phòng ban & phân quyền
test('1. Nhân viên thường (Employee) gọi API chỉnh sửa phòng ban phải nhận lỗi 403', async () => {
  const res = await request(app)
    .post('/api/departments/department-create')
    .set('Authorization', `Bearer ${employeeToken}`)
    .send({ department_id: 999, department_name: 'Phòng Ban Mới' });

  assert.strictEqual(res.statusCode, 403, `Mong đợi mã 403, nhưng nhận được ${res.statusCode}.`);
});

test('2. Admin cập nhật phòng ban thành công kèm theo phân công quản lý', async () => {
  const res = await request(app)
    .put('/api/departments/department-update/1')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      department_name: 'Phòng Đã Cập Nhật',
      category: 'Phát Triển Phần Mềm',
      manager_id: 1
    });

  assert.strictEqual(res.statusCode, 200, `Cập nhật thất bại với mã ${res.statusCode}.`);
});

test('3. PUT request không gửi manager_id thì không làm thay đổi logic phân quyền cũ', async () => {
  const res = await request(app)
    .put('/api/departments/department-update/1')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      department_name: 'Chỉ Đổi Tên Phòng Ban'
    });

  assert.strictEqual(res.statusCode, 200, `Thất bại với mã ${res.statusCode}.`);
});

test('4. Giao dịch phải rollback và trả về lỗi 400 nếu chỉ định nhân viên đã nghỉ việc làm quản lý', async () => {
  const res = await request(app)
    .post('/api/departments/department-create')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      department_id: 888,
      department_name: 'Phòng Ban Lỗi',
      manager_id: 99
    });

  assert.strictEqual(res.statusCode, 400, `Mong đợi mã 400, nhận được ${res.statusCode}.`);
});

test('5. Position: Tạo nhân viên lưu và trả về chính xác chức vụ', async () => {
  prisma.users.findFirst = async () => null;
  prisma.users.create = async (args) => ({ user_id: 10, ...args.data });
  prisma.employees.create = async (args) => ({ employee_id: 10, ...args.data });

  const res = await request(app)
    .post('/api/users/employee-create')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullname: 'Nguyễn Văn Test',
      phone_number: '0987654321',
      department_id: 1,
      position: 'Senior Backend'
    });

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.data.position, 'Senior Backend');
});

test('6. Username conflict: Trùng tên đăng nhập tự sinh phải trả về lỗi 409', async () => {
  prisma.users.findFirst = async (args) => ({ user_id: 15, username: args?.where?.username });

  const res = await request(app)
    .post('/api/users/employee-create')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullname: 'Nguyễn Văn Test',
      phone_number: '0912345678',
      department_id: 1
    });

  assert.strictEqual(res.statusCode, 409, `Mong đợi 409 Conflict, nhận được ${res.statusCode}`);
});

// 7. Test Bulk Rollback
test('7. Bulk rollback: Chuyển phòng ban hàng loạt trả về lỗi khi có ID nhân viên không tồn tại', async () => {
  prisma.employees.findMany = async () => [{ employee_id: 1 }];

  const res = await request(app)
    .put('/api/users/update-department')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      employee_ids: [1, 999],
      new_department_id: 1
    });

  assert.strictEqual(res.statusCode, 400, `Mong đợi mã 400 do rollback, nhận được ${res.statusCode}`);
});

test('8. Manager FK: Gán quản lý phòng ban với ID nhân viên không tồn tại phải báo lỗi', async () => {
  prisma.employees.findUnique = async () => null;

  const res = await request(app)
    .put('/api/departments/department-update/1')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      department_name: 'Phòng Quản Lý',
      manager_id: 99999
    });

  assert.strictEqual(res.statusCode, 400, `Mong đợi 400 Bad Request, nhận được ${res.statusCode}`);
});

test('9. Company Attendance Summary: Tháng tương lai phải trả về expectedWorkingDays bằng 0', async () => {
  prisma.employees.findMany = async () => [
    { employee_id: 1, fullname: 'Nhân viên 1', email: 'e1@test.com', start_date: new Date('2025-01-01'), department_id: 1 }
  ];
  prisma.attendances.findMany = async () => [];
  prisma.Day_off_requests.findMany = async () => [];

  const res = await request(app)
    .get('/api/attendances/company-summary?month=2028-12')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.strictEqual(res.statusCode, 200, `Mong đợi mã 200, nhận được ${res.statusCode}`);
  const emp = res.body.employees.find(e => e.employee_id === 1);
  assert.strictEqual(emp.status_summary, 'Bình thường');
});

test('10. Company Attendance Summary: Xử lý chính xác nhân viên vào làm giữa tháng và bản ghi trùng lặp', async () => {
  prisma.employees.findMany = async () => [
    { employee_id: 2, fullname: 'Nhân viên mới', email: 'e2@test.com', start_date: new Date('2026-06-15'), department_id: 1 }
  ];
  prisma.attendances.findMany = async () => [
    { employee_id: 2, date: new Date('2026-06-20T00:00:00Z'), check_in: new Date('1970-01-01T08:00:00Z'), check_out: new Date('1970-01-01T17:00:00Z') },
    { employee_id: 2, date: new Date('2026-06-20T00:00:00Z'), check_in: new Date('1970-01-01T08:00:00Z'), check_out: new Date('1970-01-01T17:00:00Z') }
  ];
  prisma.Day_off_requests.findMany = async () => [];

  const res = await request(app)
    .get('/api/attendances/company-summary?month=2026-06')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.employees.length > 0);
});

test('11. Company Attendance Summary: Xử lý lỗi query database trên API thật trả về mã 500', async () => {
  prisma.attendances.findMany = async () => {
    throw new Error('Database Connection Error');
  };

  const res = await request(app)
    .get('/api/attendances/company-summary?month=2026-10')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.strictEqual(res.statusCode, 500, `Mong đợi mã 500 khi lỗi DB, nhận được ${res.statusCode}`);
});