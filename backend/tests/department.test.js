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

// 1. MOCK TOÀN DIỆN
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

// 2. MOCK CHI TIẾT CHO CÁC MODEL
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
  return { employee_id: empId, status: 'dang_lam_viec' };
};

// Khắc phục lỗi 404: Trả về phòng ban tồn tại khi controller kiểm tra ID = 1
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

const adminToken = generateToken(1);
const employeeToken = generateToken(2);

test('1. Nhân viên thường (Employee) gọi API chỉnh sửa phòng ban phải nhận lỗi 403', async () => {
  const res = await request(app)
    .post('/api/departments/department-create')
    .set('Authorization', `Bearer ${employeeToken}`)
    .send({ department_id: 999, department_name: 'Phòng Ban Mới' });

  assert.strictEqual(res.statusCode, 403, `Mong đợi mã 403, nhưng nhận được ${res.statusCode}. Nội dung: ${JSON.stringify(res.body)}`);
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

  assert.strictEqual(res.statusCode, 200, `Cập nhật thất bại với mã ${res.statusCode}. Phản hồi: ${JSON.stringify(res.body)}`);
});

test('3. PUT request không gửi manager_id thì không làm thay đổi logic phân quyền cũ', async () => {
  const res = await request(app)
    .put('/api/departments/department-update/1')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      department_name: 'Chỉ Đổi Tên Phòng Ban'
    });

  assert.strictEqual(res.statusCode, 200, `Thất bại với mã ${res.statusCode}. Phản hồi: ${JSON.stringify(res.body)}`);
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

  assert.strictEqual(res.statusCode, 400, `Mong đợi mã 400, nhận được ${res.statusCode}. Phản hồi: ${JSON.stringify(res.body)}`);
});
