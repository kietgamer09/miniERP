import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const schema = `
CREATE TYPE employee_status AS ENUM ('dang_lam_viec', 'da_nghi_viec');
CREATE TABLE users (
  user_id serial PRIMARY KEY,
  username varchar,
  password varchar,
  role varchar,
  created_at timestamp DEFAULT now(),
  must_change_password boolean NOT NULL DEFAULT false,
  temp_password_expires_at timestamptz,
  temp_password_used_at timestamptz
);
CREATE TABLE departments (
  department_id integer PRIMARY KEY,
  department_name varchar,
  managment varchar,
  category varchar,
  created_at timestamp,
  manager_id integer
);
CREATE TABLE employees (
  employee_id serial PRIMARY KEY,
  user_id integer UNIQUE NOT NULL,
  department_id integer NOT NULL,
  fullname varchar,
  email varchar,
  phone_number varchar,
  birthday varchar,
  manage_by varchar,
  position varchar,
  start_date date,
  status employee_status DEFAULT 'dang_lam_viec',
  created_at timestamp
);
`;

let database;
let databaseServer;
let prisma;
let pool;
let httpServer;
let baseUrl;
let jwtSecret;
const backendDir = path.resolve(import.meta.dirname, '..');

async function seedAdmin() {
  const password = await bcrypt.hash('Admin-Only-Password-2026', 4);
  const admin = await prisma.users.create({
    data: { username: `admin-${randomUUID()}`, password, role: 'admin' },
  });
  const employee = await prisma.employees.create({
    data: { user_id: admin.user_id, department_id: 1, fullname: 'Admin Kiểm thử' },
  });
  return { user: admin, employee };
}

async function api(route, { method = 'GET', token, body, username, password } = {}) {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body || username !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body || username !== undefined ? { body: JSON.stringify(body ?? { username, password }) } : {}),
  });
}

async function login(username, password) {
  return api('/api/auth/login', { method: 'POST', username, password });
}

async function adminToken() {
  const admin = await seedAdmin();
  const response = await login(admin.user.username, 'Admin-Only-Password-2026');
  assert.equal(response.status, 200);
  return { ...admin, token: (await response.json()).token };
}

async function createEmployeeAccount(token, fullname) {
  const response = await api('/api/users/employee-create', {
    method: 'POST', token,
    body: { fullname, department_id: 1, phone_number: '0900000000', role: 'employee' },
  });
  assert.equal(response.status, 201);
  return response.json();
}

before(async () => {
  jwtSecret = randomBytes(48).toString('hex');
  process.env.JWT_SECRET = jwtSecret;
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:1/postgres?sslmode=disable';
  database = await PGlite.create();
  await database.exec(schema);
  databaseServer = new PGLiteSocketServer({ db: database, port: 0, host: '127.0.0.1', maxConnections: 10 });
  await databaseServer.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@${databaseServer.getServerConn()}/postgres?sslmode=disable`;

  ({ default: prisma, pool } = await import('../src/config/prisma.js'));
  const authRoutes = (await import('../src/routes/authRoutes.js')).default;
  const userRoutes = (await import('../src/routes/userRoutes.js')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  httpServer = createServer(app);
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

beforeEach(async () => {
  await prisma.employees.deleteMany();
  await prisma.users.deleteMany();
  await prisma.departments.upsert({
    where: { department_id: 1 },
    create: { department_id: 1, department_name: 'Kiểm thử' },
    update: { department_name: 'Kiểm thử' },
  });
});

after(async () => {
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  await prisma?.$disconnect();
  await pool?.end();
  await databaseServer?.stop();
  await database?.close();
});

test('backend rejects missing and weak JWT secrets during configuration load', () => {
  for (const secret of ['', 'too-short', '<SECRET_NGAU_NHIEN_IT_NHAT_32_KY_TU>', 'mini_erp_super_secret_key_2026']) {
    const missingEnvFile = path.join(tmpdir(), `missing-env-${randomUUID()}`);
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "import('./src/config/env.js')"], {
      cwd: backendDir,
      encoding: 'utf8',
      env: { ...process.env, JWT_SECRET: secret, DOTENV_CONFIG_PATH: missingEnvFile },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /JWT_SECRET thiếu hoặc yếu/);
  }
});

test('legacy default-secret token is rejected and live role changes override stale JWT claims', async () => {
  const { user, token } = await adminToken();
  const forgedToken = jwt.sign({ user_id: user.user_id, role: 'admin' }, 'mini_erp_super_secret_key_2026');
  const forgedResponse = await api('/api/auth/admin-dashboard', { token: forgedToken });
  assert.equal(forgedResponse.status, 401);

  await prisma.users.update({ where: { user_id: user.user_id }, data: { role: 'employee' } });
  const staleRoleResponse = await api('/api/auth/admin-dashboard', { token });
  assert.equal(staleRoleResponse.status, 403);
});

test('terminated employee loses access immediately even with an unexpired JWT', async () => {
  const admin = await adminToken();
  const password = await bcrypt.hash('Employee-Only-Password-2026', 4);
  const created = await prisma.users.create({
    data: { username: 'terminated-test', password, role: 'employee' },
  });
  const employee = await prisma.employees.create({
    data: { user_id: created.user_id, department_id: 1, fullname: 'Nhân viên đã nghỉ' },
  });
  const response = await login(created.username, 'Employee-Only-Password-2026');
  const token = (await response.json()).token;
  assert.equal(response.status, 200);

  await prisma.employees.update({ where: { employee_id: employee.employee_id }, data: { status: 'da_nghi_viec' } });
  const protectedResponse = await api('/api/auth/reports', { token });
  assert.equal(protectedResponse.status, 401);
  assert.ok(admin.token);
});

test('new accounts receive unique temporary passwords and must change them before using APIs', async () => {
  const admin = await adminToken();
  const first = await createEmployeeAccount(admin.token, 'Nguyễn An Bình');
  const second = await createEmployeeAccount(admin.token, 'Trần Gia Minh');
  assert.notEqual(first.login_info.default_password, second.login_info.default_password);
  assert.ok(Date.parse(first.login_info.expires_at) > Date.now());

  const account = await prisma.users.findFirst({ where: { username: first.login_info.username } });
  assert.equal(account.must_change_password, true);
  const loggedIn = await login(first.login_info.username, first.login_info.default_password);
  assert.equal(loggedIn.status, 200);
  assert.equal((await login(first.login_info.username, first.login_info.default_password)).status, 401);
  const session = await loggedIn.json();
  assert.equal(session.user.must_change_password, true);

  const blocked = await api('/api/auth/reports', { token: session.token });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).code, 'PASSWORD_CHANGE_REQUIRED');
  const profile = await api('/api/users/me', { token: session.token });
  assert.equal(profile.status, 200);
});

test('temporary password is one-time, and an expired password can be reset by Admin', async () => {
  const admin = await adminToken();
  const created = await createEmployeeAccount(admin.token, 'Lê Thanh Tùng');
  const user = await prisma.users.findFirst({ where: { username: created.login_info.username } });
  const employee = await prisma.employees.findUnique({ where: { user_id: user.user_id } });

  await prisma.users.update({
    where: { user_id: user.user_id },
    data: { temp_password_expires_at: new Date(Date.now() - 1000) },
  });
  const expiredLogin = await login(user.username, created.login_info.default_password);
  assert.equal(expiredLogin.status, 403);
  assert.equal((await expiredLogin.json()).code, 'TEMP_PASSWORD_EXPIRED');

  const resetResponse = await api(`/api/users/${employee.employee_id}/reset-password`, { method: 'POST', token: admin.token });
  assert.equal(resetResponse.status, 200);
  const reset = await resetResponse.json();
  assert.notEqual(reset.temporary_password, created.login_info.default_password);
  assert.ok(Date.parse(reset.expires_at) > Date.now());
  assert.equal(reset.must_change_password, true);

  const resetLogin = await login(reset.username, reset.temporary_password);
  assert.equal(resetLogin.status, 200);
  assert.equal((await login(reset.username, reset.temporary_password)).status, 401);
  const resetSession = await resetLogin.json();
  const change = await api('/api/users/change-password', {
    method: 'PUT', token: resetSession.token,
    body: { oldPassword: reset.temporary_password, newPassword: 'BrandNew-Password-2026' },
  });
  assert.equal(change.status, 200);
  assert.equal((await change.json()).must_change_password, false);

  const oldPasswordLogin = await login(reset.username, reset.temporary_password);
  assert.equal(oldPasswordLogin.status, 401);
  const newPasswordLogin = await login(reset.username, 'BrandNew-Password-2026');
  assert.equal(newPasswordLogin.status, 200);
  assert.equal((await newPasswordLogin.json()).user.must_change_password, false);
});

test('login failures are rate-limited per IP and username', async () => {
  let response;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    response = await login('nonexistent-rate-limit-test', 'wrong-password');
  }
  assert.equal(response.status, 429);
  assert.equal((await response.json()).code, 'LOGIN_RATE_LIMITED');
});
