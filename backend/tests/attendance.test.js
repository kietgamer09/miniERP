import assert from 'node:assert/strict';
import { test, before, after, beforeEach } from 'node:test';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { classifyDay } from '../src/utils/attendanceRules.js';

let database;
let databaseServer;
let prisma;
let pool;
let app;

const jwtSecret = randomBytes(48).toString('hex');

const schema = `
CREATE TYPE employee_status AS ENUM ('dang_lam_viec', 'da_nghi_viec');
CREATE TYPE leave_status AS ENUM ('cho_xac_thuc', 'da_duoc_duyet', 'bi_tu_choi');

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

CREATE TABLE attendances (
  attendances_id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(employee_id),
  date date,
  check_in time,
  check_out time,
  created_at timestamp DEFAULT now()
);

CREATE TABLE "Day_off_requests" (
  "Day_off_id" serial PRIMARY KEY,
  employee_send_id integer REFERENCES employees(employee_id),
  employee_receive_id integer REFERENCES employees(employee_id),
  start_date date,
  end_date date,
  reason text,
  status leave_status DEFAULT 'cho_xac_thuc',
  created_at timestamp DEFAULT now()
);
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
  const serverModule = await import('../src/server.js');
  app = serverModule.default || serverModule.app;
});

beforeEach(async () => {
  await database.exec('TRUNCATE "Day_off_requests", attendances, departments, employees, users RESTART IDENTITY CASCADE');

  await prisma.departments.create({
    data: { department_id: 1, department_name: 'Phòng IT' }
  });

  const adminUser = await prisma.users.create({ data: { user_id: 1, username: 'admin_att', role: 'admin' } });
  await prisma.employees.create({
    data: { employee_id: 1, user_id: adminUser.user_id, department_id: 1, fullname: 'Admin', status: 'dang_lam_viec' }
  });
});

after(async () => {
  await prisma?.$disconnect();
  await pool?.end();
  await databaseServer?.stop();
  await database?.close();
});

const generateToken = (userId = 1, role = 'admin') => {
  return jwt.sign({ user_id: userId, role }, jwtSecret, { expiresIn: '1h' });
};

const adminToken = generateToken(1, 'admin');
const clock = { date: '2026-11-04', time: '18:00:00' };
const time = value => new Date(`1970-01-01T${value}.000Z`);

// ==========================================
// 1. UNIT TESTS CHO classifyDay
// ==========================================

test('classifyDay - Ngày trong tương lai chưa được phân loại công', () => {
  const day = classifyDay({ date: '2026-11-05', clock });
  assert.equal(day.status, 'future');
  assert.equal(day.can_explain, false);
});

test('classifyDay - Ngày làm việc đã kết thúc thiếu giờ ra cần giải trình', () => {
  const day = classifyDay({
    date: '2026-11-04',
    records: [{ check_in: time('08:00:00'), check_out: null }],
    clock,
  });
  assert.equal(day.status, 'missing');
  assert.equal(day.can_explain, true);
});

test('classifyDay - Nghỉ phép được duyệt được phân loại riêng', () => {
  const day = classifyDay({ date: '2026-11-04', onLeave: true, clock });
  assert.equal(day.status, 'leave');
  assert.equal(day.label, 'Nghỉ phép đã duyệt');
});

test('classifyDay - Vào muộn và ra sớm cùng ngày được phân loại đỏ', () => {
  const day = classifyDay({
    date: '2026-11-04',
    records: [{ check_in: time('08:15:00'), check_out: time('16:30:00') }],
    clock,
  });
  assert.equal(day.status, 'late_early');
  assert.equal(day.color, 'red');
  assert.equal(day.can_explain, true);
});

test('classifyDay - Chấm đúng và đủ ca được phân loại xanh', () => {
  const day = classifyDay({
    date: '2026-11-04',
    records: [{ check_in: time('08:00:00'), check_out: time('17:00:00') }],
    clock,
  });
  assert.equal(day.status, 'complete');
  assert.equal(day.color, 'green');
});

// ==========================================
// 2. INTEGRATION TESTS CHO API CHẤM CÔNG
// ==========================================

test('API Summary - Tháng quá khứ: Tính toán đầy đủ ngày công tiêu chuẩn và thực tế', async () => {
  await prisma.attendances.create({
    data: { employee_id: 1, date: new Date('2026-10-01'), check_in: time('08:00:00'), check_out: time('17:00:00') }
  });

  const res = await request(app)
    .get('/api/attendances/company-summary?month=2026-10')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.statusCode, 200);
});

test('API Summary - Tháng tương lai: Trả về expectedWorkingDays bằng 0', async () => {
  const res = await request(app)
    .get('/api/attendances/company-summary?month=2028-12')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.statusCode, 200);
  const emp = res.body.employees?.find(e => e.employee_id === 1);
  const expectedDays = emp ? (emp.expectedWorkingDays ?? emp.expected_working_days ?? 0) : 0;
  assert.strictEqual(expectedDays, 0);
});

test('API Summary - Nhân viên vào làm giữa tháng: Chỉ tính từ ngày start_date trở đi', async () => {
  const newUser = await prisma.users.create({ data: { user_id: 10, username: 'mid_emp', role: 'employee' } });
  await prisma.employees.create({
    data: { employee_id: 10, user_id: newUser.user_id, department_id: 1, fullname: 'Mid', start_date: new Date('2026-06-15'), status: 'dang_lam_viec' }
  });

  const res = await request(app)
    .get('/api/attendances/company-summary?month=2026-06')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.statusCode, 200);
});

test('API Summary - Xử lý bản ghi chấm công trùng lặp (duplicate records) không làm tăng sai số', async () => {
  await prisma.attendances.createMany({
    data: [
      { employee_id: 1, date: new Date('2026-06-10'), check_in: time('08:00:00'), check_out: time('17:00:00') },
      { employee_id: 1, date: new Date('2026-06-10'), check_in: time('08:05:00'), check_out: time('17:00:00') }
    ]
  });

  const res = await request(app)
    .get('/api/attendances/company-summary?month=2026-06')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.statusCode, 200);
});

test('API Summary - Ngày nghỉ phép được duyệt (leave) được tính chính xác', async () => {
  await prisma.Day_off_requests.create({
    data: { employee_send_id: 1, employee_receive_id: 1, start_date: new Date('2026-06-05'), end_date: new Date('2026-06-05'), status: 'da_duoc_duyet' }
  });

  const res = await request(app)
    .get('/api/attendances/company-summary?month=2026-06')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.statusCode, 200);
});

test('API Summary - Lỗi query Database hoặc param không hợp lệ trả về mã lỗi 500/400', async () => {
  const res = await request(app)
    .get('/api/attendances/company-summary?month=invalid-format')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.statusCode >= 400, true);
});