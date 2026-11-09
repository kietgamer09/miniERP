import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

let database;
let databaseServer;
let prisma;
let pool;
let app;

const jwtSecret = randomBytes(48).toString('hex');

const schema = `
CREATE TYPE employee_status AS ENUM ('dang_lam_viec', 'da_nghi_viec');

CREATE TABLE users (
  user_id serial PRIMARY KEY,
  username varchar NOT NULL UNIQUE,
  password varchar,
  role varchar,
  must_change_password boolean NOT NULL DEFAULT false,
  temp_password_expires_at timestamptz,
  temp_password_used_at timestamptz,
  created_at timestamp DEFAULT now()
);

CREATE TABLE departments (
  department_id integer PRIMARY KEY,
  department_name varchar,
  category varchar,
  manager_id integer,
  created_at timestamp DEFAULT now()
);

CREATE TABLE employees (
  employee_id serial PRIMARY KEY,
  user_id integer UNIQUE NOT NULL REFERENCES users(user_id),
  department_id integer NOT NULL REFERENCES departments(department_id),
  fullname varchar,
  email varchar,
  phone_number varchar,
  birthday varchar,
  manage_by varchar,
  position varchar,
  start_date date,
  status employee_status DEFAULT 'dang_lam_viec',
  created_at timestamp DEFAULT now()
);

ALTER TABLE departments ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES employees(employee_id);
`;

before(async () => {
  database = await PGlite.create();
  await database.exec(schema);
  databaseServer = new PGLiteSocketServer({ db: database, port: 0, host: '127.0.0.1', maxConnections: 10 });
  await databaseServer.start();

  process.env.DATABASE_URL = `postgresql://postgres:postgres@${databaseServer.getServerConn()}/postgres?sslmode=disable`;
  process.env.JWT_SECRET = jwtSecret;
  process.env.NODE_ENV = 'test';

  ({ default: prisma, pool } = await import('../src/config/prisma.js'));

  const express = (await import('express')).default;
  const departmentRoutes = (await import('../src/routes/departmentRoutes.js')).default;
  const userRoutes = (await import('../src/routes/userRoutes.js')).default;

  app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, jwtSecret);
      } catch (e) {}
    }
    next();
  });

  app.use('/api/departments', departmentRoutes);
  app.use('/api/users', userRoutes);
});

beforeEach(async () => {
  await database.exec('TRUNCATE departments, employees, users RESTART IDENTITY CASCADE');

  await prisma.departments.create({
    data: {
      department_id: 1,
      department_name: 'Phòng Ban Gốc',
      category: 'IT'
    }
  });

  const adminUser = await prisma.users.create({
    data: { username: 'admin_test', role: 'admin' }
  });
  await prisma.employees.create({
    data: {
      user_id: adminUser.user_id,
      department_id: 1,
      fullname: 'Admin Test',
      status: 'dang_lam_viec'
    }
  });

  const empUser = await prisma.users.create({
    data: { username: 'emp_test', role: 'employee' }
  });
  await prisma.employees.create({
    data: {
      user_id: empUser.user_id,
      department_id: 1,
      fullname: 'Employee Test',
      status: 'dang_lam_viec'
    }
  });

  await prisma.departments.update({
    where: { department_id: 1 },
    data: { manager_id: 1 }
  });
});

after(async () => {
  await prisma?.$disconnect();
  await pool?.end();
  await databaseServer?.stop();
  await database?.close();
});

const generateToken = (userId, role = 'admin') => {
  return jwt.sign({ user_id: userId, role }, jwtSecret, { expiresIn: '1h' });
};

const adminToken = generateToken(1, 'admin');
const employeeToken = generateToken(2, 'employee');

// ==========================================
// 8 INTEGRATION TESTS CHO QUẢN LÝ PHÒNG BAN VÀ NHÂN VIÊN
// ==========================================

test('1. Nhân viên thường (Employee) gọi API chỉnh sửa phòng ban phải nhận lỗi 403', async () => {
  const res = await request(app)
    .post('/api/departments/department-create')
    .set('Authorization', `Bearer ${employeeToken}`)
    .send({ department_id: 999, department_name: 'Phòng Ban Mới' });

  assert.strictEqual(res.statusCode, 403, `Mong đợi mã 403, nhưng nhận được ${res.statusCode}.`);
});

test('2. Admin cập nhật phòng ban thành công kèm theo phân công quản lý trên DB thật', async () => {
  const res = await request(app)
    .put('/api/departments/department-update/1')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      department_name: 'Phòng Đã Cập Nhật',
      category: 'Phát Triển Phần Mềm',
      manager_id: 1
    });

  assert.strictEqual(res.statusCode, 200, `Cập nhật thất bại với mã ${res.statusCode}.`);
  const updated = await prisma.departments.findUnique({ where: { department_id: 1 } });
  assert.strictEqual(updated.department_name, 'Phòng Đã Cập Nhật');
  assert.strictEqual(updated.manager_id, 1);
});

test('3. PUT request không gửi manager_id thì giữ nguyên dữ liệu quản lý cũ', async () => {
  const res = await request(app)
    .put('/api/departments/department-update/1')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      department_name: 'Chỉ Đổi Tên Phòng Ban'
    });

  assert.strictEqual(res.statusCode, 200, `Thất bại với mã ${res.statusCode}.`);
  const updated = await prisma.departments.findUnique({ where: { department_id: 1 } });
  assert.strictEqual(updated.department_name, 'Chỉ Đổi Tên Phòng Ban');
  assert.strictEqual(updated.manager_id, 1);
});

test('4. Giao dịch phải rollback và trả về lỗi khi chỉ định nhân viên đã nghỉ việc làm quản lý', async () => {
  const resignedUser = await prisma.users.create({
    data: { username: 'resigned_user', role: 'employee' }
  });
  await prisma.employees.create({
    data: {
      user_id: resignedUser.user_id,
      department_id: 1,
      fullname: 'Nhân viên nghỉ việc',
      status: 'da_nghi_viec'
    }
  });

  const initialCount = await prisma.departments.count();

  const res = await request(app)
    .post('/api/departments/department-create')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      department_id: 888,
      department_name: 'Phòng Ban Lỗi',
      manager_id: resignedUser.user_id
    });

  assert.strictEqual(res.statusCode >= 400, true, `Mong đợi mã lỗi >= 400, nhận được ${res.statusCode}.`);
  const finalCount = await prisma.departments.count();
  assert.strictEqual(finalCount, initialCount, 'Database phải được rollback hoàn toàn.');
});

test('5. Position: Tạo nhân viên lưu và trả về chính xác chức vụ trên DB thật', async () => {
  const uniqueSuffix = Date.now();
  const res = await request(app)
    .post('/api/users/employee-create')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullname: `ZendeskUser ${uniqueSuffix}`,
      email: `zendesk_${uniqueSuffix}@example.com`,
      phone_number: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      department_id: 1,
      position: 'Senior Backend'
    });

  assert.strictEqual(res.statusCode, 201, `Mong đợi mã 201, nhận được ${res.statusCode} - ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.data.position, 'Senior Backend');
});

test('6. Username conflict: Trùng tên đăng nhập tự sinh phải trả về lỗi 409', async () => {
  // Tạo trước một user có username 'emp_nguyen' mà hệ thống sẽ tự sinh ra cho tên 'Tra Nguyen'
  const existingUser = await prisma.users.create({
    data: { username: 'emp_nguyen', role: 'employee' }
  });
  await prisma.employees.create({
    data: {
      user_id: existingUser.user_id,
      department_id: 1,
      fullname: 'Existing Employee',
      status: 'dang_lam_viec'
    }
  });

  const res = await request(app)
    .post('/api/users/employee-create')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullname: 'Tra Nguyen',
      email: `tranguyen_${Date.now()}@example.com`,
      phone_number: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      department_id: 1
    });

  assert.strictEqual(res.statusCode, 409, `Mong đợi 409 Conflict, nhận được ${res.statusCode} - ${JSON.stringify(res.body)}`);
});

test('7. Bulk rollback: Chuyển phòng ban hàng loạt trả về lỗi khi có ID nhân viên không tồn tại', async () => {
  const res = await request(app)
    .put('/api/users/update-department')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      employee_ids: [1, 99999],
      new_department_id: 1
    });

  assert.strictEqual(res.statusCode, 400, `Mong đợi mã 400 do rollback, nhận được ${res.statusCode}`);
});

test('8. Manager FK: Gán quản lý phòng ban với ID nhân viên không tồn tại phải báo lỗi', async () => {
  const res = await request(app)
    .put('/api/departments/department-update/1')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      department_name: 'Phòng Quản Lý',
      manager_id: 99999
    });

  assert.strictEqual(res.statusCode >= 400, true, `Mong đợi mã lỗi >= 400, nhận được ${res.statusCode}`);
});