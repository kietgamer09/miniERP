import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const sourceUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET || 'mini_erp_super_secret_key_2026';
const databaseName = `minierp_task_test_${randomUUID().replaceAll('-', '')}`;
const source = sourceUrl ? new URL(sourceUrl) : null;
const adminPool = source ? new pg.Pool({ connectionString: sourceUrl }) : null;
let databaseCreated = false;
let fixturePool;
let prisma;
let prismaPool;
let server;
let baseUrl;
let tokens;

async function createFixtureSchema() {
  await fixturePool.query(`
    CREATE TYPE employee_status AS ENUM ('dang_lam_viec', 'da_nghi_viec');
    CREATE TYPE project_status AS ENUM ('dang_thuc_hien', 'hoan_thanh');
    CREATE TYPE task_priority AS ENUM ('thap', 'trung_binh', 'cao');
    CREATE TYPE task_status AS ENUM ('can_lam', 'dang_lam', 'xong');

    CREATE TABLE users (
      user_id INT PRIMARY KEY,
      username TEXT,
      password TEXT,
      role TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE departments (
      department_id INT PRIMARY KEY,
      department_name TEXT,
      managment TEXT,
      category TEXT,
      created_at TIMESTAMP
    );
    CREATE TABLE employees (
      employee_id INT PRIMARY KEY,
      user_id INT UNIQUE NOT NULL REFERENCES users(user_id),
      department_id INT NOT NULL REFERENCES departments(department_id),
      fullname TEXT,
      email TEXT,
      phone_number TEXT,
      birthday TEXT,
      manage_by TEXT,
      position TEXT,
      start_date DATE,
      status employee_status DEFAULT 'dang_lam_viec',
      created_at TIMESTAMP
    );
    CREATE TABLE projects (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status project_status NOT NULL DEFAULT 'dang_thuc_hien',
      manager_id INT NOT NULL REFERENCES employees(employee_id),
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE TABLE project_members (
      id SERIAL PRIMARY KEY,
      employee_id INT NOT NULL REFERENCES employees(employee_id),
      project_id INT NOT NULL REFERENCES projects(id),
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      UNIQUE (project_id, employee_id)
    );
    CREATE TABLE tasks (
      id SERIAL PRIMARY KEY,
      project_id INT NOT NULL REFERENCES projects(id),
      title VARCHAR(200) NOT NULL,
      description TEXT,
      assignee_id INT NOT NULL REFERENCES employees(employee_id),
      created_by INT NOT NULL REFERENCES employees(employee_id),
      due_date DATE NOT NULL,
      priority task_priority NOT NULL DEFAULT 'trung_binh',
      status task_status NOT NULL DEFAULT 'can_lam',
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    );

    INSERT INTO users(user_id, username, role) VALUES
      (1, 'emp_nhanvien', 'employee'),
      (2, 'emp_quanly_a', 'manager'),
      (3, 'emp_quanly_b', 'manager'),
      (4, 'emp_admin', 'admin');
    INSERT INTO departments(department_id, department_name) VALUES (1, 'Phòng A');
    INSERT INTO employees(employee_id, user_id, department_id, fullname, status) VALUES
      (1, 1, 1, 'Nhân viên thử nghiệm', 'dang_lam_viec'),
      (2, 2, 1, 'Quản lý A', 'dang_lam_viec'),
      (3, 3, 1, 'Quản lý B', 'dang_lam_viec'),
      (4, 4, 1, 'Admin', 'dang_lam_viec');
    INSERT INTO projects(id, code, name, start_date, end_date, manager_id) VALUES
      (1, 'TEST-A', 'Dự án A', '2026-10-01', '2026-12-31', 2),
      (2, 'TEST-B', 'Dự án B', '2026-10-01', '2026-12-31', 3);
    INSERT INTO projects(id, code, name, start_date, end_date, manager_id, status) VALUES
      (3, 'TEST-DONE', 'Dự án đã xong', '2026-10-01', '2026-12-31', 2, 'hoan_thanh');
    INSERT INTO project_members(project_id, employee_id) VALUES (1, 1), (1, 2), (2, 3), (3, 1), (3, 2);
    INSERT INTO tasks(id, project_id, title, assignee_id, created_by, due_date, priority, status, completed_at) VALUES
      (1, 1, 'Task đang làm', 1, 2, '2026-11-20', 'trung_binh', 'can_lam', NULL),
      (2, 3, 'Task đã xong', 1, 2, '2026-11-20', 'cao', 'xong', now());
    SELECT setval(pg_get_serial_sequence('projects', 'id'), 3);
    SELECT setval(pg_get_serial_sequence('project_members', 'id'), 5);
    SELECT setval(pg_get_serial_sequence('tasks', 'id'), 2);
  `);
}

async function callApi(actor, path, method = 'GET', body) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokens[actor]}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function responseBody(response) {
  if (response.status === 204) return null;
  return response.json();
}

const taskBody = (dueDate, overrides = {}) => ({
  title: 'Task kiểm thử',
  assignee_id: 1,
  due_date: dueDate,
  priority: 'trung_binh',
  ...overrides,
});

describe('task/project integration invariants', () => {
  before(async () => {
    assert.ok(sourceUrl, 'Cần cấu hình DATABASE_URL trong backend/.env');
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    databaseCreated = true;
    const isolatedUrl = new URL(sourceUrl);
    isolatedUrl.pathname = `/${databaseName}`;
    process.env.DATABASE_URL = isolatedUrl.toString();
    fixturePool = new pg.Pool({ connectionString: isolatedUrl.toString() });
    await createFixtureSchema();

    const prismaModule = await import('../src/config/prisma.js');
    prisma = prismaModule.default;
    prismaPool = prismaModule.pool;
    const projectRoutes = (await import('../src/routes/projectRoutes.js')).default;
    const taskRoutes = (await import('../src/routes/taskRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api/projects', projectRoutes);
    app.use('/api/tasks', taskRoutes);
    server = await new Promise((resolve, reject) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
      instance.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    tokens = Object.fromEntries(['employee', 'manager', 'manager', 'admin'].map((role, index) => [
      index + 1,
      jwt.sign({ user_id: index + 1, role }, jwtSecret, { expiresIn: '10m' }),
    ]));
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    if (prismaPool) await prismaPool.end();
    if (fixturePool) await fixturePool.end();
    if (databaseCreated) {
      await adminPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1', [databaseName]);
      await adminPool.query(`DROP DATABASE "${databaseName}"`);
    }
    if (adminPool) await adminPool.end();
  });

  it('blocks tasks before project start and after project end without writing rows', async () => {
    const before = await fixturePool.query('SELECT count(*)::int AS count FROM tasks WHERE project_id = 1');
    const tooEarly = await callApi(2, '/api/projects/1/tasks', 'POST', taskBody('2026-09-30'));
    assert.equal(tooEarly.status, 400);
    assert.match((await responseBody(tooEarly)).error, /trước ngày bắt đầu dự án/);

    const tooLate = await callApi(2, '/api/projects/1/tasks', 'POST', taskBody('2027-01-01'));
    assert.equal(tooLate.status, 400);
    assert.match((await responseBody(tooLate)).error, /sau ngày kết thúc dự án/);

    const after = await fixturePool.query('SELECT count(*)::int AS count FROM tasks WHERE project_id = 1');
    assert.equal(after.rows[0].count, before.rows[0].count);
  });

  it('allows the project manager to create a task with a due date inside the project range', async () => {
    const response = await callApi(2, '/api/projects/1/tasks', 'POST', taskBody('2026-11-25'));
    assert.equal(response.status, 201);
    const created = await responseBody(response);
    assert.equal(created.due_date, '2026-11-25');

    const updated = await callApi(2, `/api/tasks/${created.id}`, 'PUT', taskBody('2026-11-30'));
    assert.equal(updated.status, 200);
    assert.equal((await responseBody(updated)).due_date, '2026-11-30');
  });

  it('rejects assigning a task to an employee outside the project without inserting it', async () => {
    const before = await fixturePool.query('SELECT count(*)::int AS count FROM tasks WHERE project_id = 1');
    const response = await callApi(2, '/api/projects/1/tasks', 'POST', taskBody('2026-11-25', { assignee_id: 3 }));
    assert.equal(response.status, 400);
    assert.match((await responseBody(response)).error, /phải là thành viên của dự án/);
    const after = await fixturePool.query('SELECT count(*)::int AS count FROM tasks WHERE project_id = 1');
    assert.equal(after.rows[0].count, before.rows[0].count);
  });

  it('blocks task detail updates outside either project date boundary without changing the task', async () => {
    const original = await fixturePool.query('SELECT due_date::text AS due_date FROM tasks WHERE id = 1');
    for (const [date, message] of [
      ['2026-09-30', /trước ngày bắt đầu dự án/],
      ['2027-01-01', /sau ngày kết thúc dự án/],
    ]) {
      const response = await callApi(2, '/api/tasks/1', 'PUT', taskBody(date));
      assert.equal(response.status, 400);
      assert.match((await responseBody(response)).error, message);
    }
    const unchanged = await fixturePool.query('SELECT due_date::text AS due_date FROM tasks WHERE id = 1');
    assert.equal(unchanged.rows[0].due_date, original.rows[0].due_date);
  });

  it('rejects moving project start past an existing task deadline without updating the project', async () => {
    const original = await fixturePool.query('SELECT start_date::text AS start_date FROM projects WHERE id = 1');
    const response = await callApi(2, '/api/projects/1', 'PUT', {
      name: 'Dự án A', start_date: '2026-11-21', end_date: '2026-12-31',
    });
    assert.equal(response.status, 409);
    assert.match((await responseBody(response)).error, /trước ngày bắt đầu mới/);
    const unchanged = await fixturePool.query('SELECT start_date::text AS start_date FROM projects WHERE id = 1');
    assert.equal(unchanged.rows[0].start_date, original.rows[0].start_date);
  });

  it('enforces project creation and ownership permissions', async () => {
    const projectBody = {
      code: 'TEST-NEW',
      name: 'Dự án mới',
      start_date: '2030-01-01',
      end_date: '2030-12-31',
    };
    assert.equal((await callApi(1, '/api/projects', 'POST', projectBody)).status, 403);

    const update = await callApi(2, '/api/projects/2', 'PUT', {
      name: 'Sửa trái quyền', start_date: '2026-10-01', end_date: '2026-12-31',
    });
    assert.equal(update.status, 403);
    const deletion = await callApi(2, '/api/projects/2', 'DELETE');
    assert.equal(deletion.status, 403);
    assert.equal((await fixturePool.query('SELECT count(*)::int AS count FROM projects WHERE id = 2')).rows[0].count, 1);
  });

  it('prevents completing a project while any task remains unfinished', async () => {
    const response = await callApi(2, '/api/projects/1/complete', 'POST', {});
    assert.equal(response.status, 409);
    assert.match((await responseBody(response)).error, /task chưa hoàn thành/);
    assert.equal((await fixturePool.query('SELECT status::text AS status FROM projects WHERE id = 1')).rows[0].status, 'dang_thuc_hien');
  });

  it('blocks task creation and edits after a project is completed', async () => {
    const create = await callApi(2, '/api/projects/3/tasks', 'POST', taskBody('2026-11-25'));
    assert.equal(create.status, 409);
    const update = await callApi(2, '/api/tasks/2', 'PUT', taskBody('2026-11-25'));
    assert.equal(update.status, 409);
    assert.equal((await fixturePool.query('SELECT count(*)::int AS count FROM tasks WHERE project_id = 3')).rows[0].count, 1);
    assert.equal((await fixturePool.query('SELECT due_date::text AS due_date FROM tasks WHERE id = 2')).rows[0].due_date, '2026-11-20');
  });

  it('allows only one of two concurrent identical task status changes', async () => {
    const requests = await Promise.all([
      callApi(1, '/api/tasks/1/status', 'PATCH', { status: 'dang_lam' }),
      callApi(1, '/api/tasks/1/status', 'PATCH', { status: 'dang_lam' }),
    ]);
    assert.deepEqual(requests.map(({ status }) => status).sort(), [200, 409]);
    assert.equal((await fixturePool.query('SELECT status::text AS status FROM tasks WHERE id = 1')).rows[0].status, 'dang_lam');
  });
});
