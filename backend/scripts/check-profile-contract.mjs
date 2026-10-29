import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { validateProfileUpdate } from '../src/utils/profileRules.js';

test('personal fields normalize contact data and validate birthdays against Vietnam date', () => {
  const data = validateProfileUpdate({ fullname: '  Trịnh   Minh Đức  ', email: ' duc@example.com ', phone_number: '+84 (912) 345-678', birthday: '2000-02-29' }).data;
  assert.deepEqual(data, { fullname: 'Trịnh Minh Đức', email: 'duc@example.com', phone_number: '+84912345678', birthday: '29/02/2000' });
  assert.ok(validateProfileUpdate({ birthday: '2001-02-29' }).error);
  assert.ok(validateProfileUpdate({ birthday: '2026-10-30' }, new Date('2026-10-29T16:59:00Z')).error);
  assert.equal(validateProfileUpdate({ birthday: '2026-10-30' }, new Date('2026-10-29T17:01:00Z')).data.birthday, '30/10/2026');
  assert.ok(validateProfileUpdate({ email: 'a@b' }).error);
  assert.ok(validateProfileUpdate({ phone_number: 'abc12345678' }).error);
  assert.ok(validateProfileUpdate({ fullname: ' ' }).error);
  assert.ok(validateProfileUpdate({ fullname: 'a'.repeat(101) }).error);
});

test('personal profile API enforces ownership and rejects privilege changes in an isolated database', async t => {
  const originalUrl = process.env.DATABASE_URL;
  assert.ok(originalUrl, 'Cần DATABASE_URL để kiểm tra.');
  const admin = new pg.Pool({ connectionString: originalUrl });
  const database = `minierp_profile_test_${randomUUID().replaceAll('-', '')}`;
  assert.match(database, /^minierp_profile_test_[a-f0-9]{32}$/);
  let created = false, prisma, server;
  try {
    await admin.query(`CREATE DATABASE "${database}"`); created = true;
    const url = new URL(originalUrl); url.pathname = `/${database}`;
    process.env.DATABASE_URL = url.toString();
    const fixture = new pg.Pool({ connectionString: url.toString() });
    try {
      await fixture.query(`
        CREATE TABLE users(user_id INT PRIMARY KEY, role TEXT, username TEXT, password TEXT, created_at TIMESTAMP);
        CREATE TABLE departments(department_id INT PRIMARY KEY, department_name TEXT);
        CREATE TABLE employees(employee_id INT PRIMARY KEY, user_id INT UNIQUE REFERENCES users(user_id), department_id INT REFERENCES departments(department_id),
          fullname TEXT, email TEXT, phone_number TEXT, birthday TEXT, manage_by TEXT, position TEXT, start_date DATE, status TEXT, created_at TIMESTAMP);
        INSERT INTO departments VALUES (1,'Phòng A'),(2,'Phòng B');
        INSERT INTO users(user_id,role,username,password) VALUES (11,'employee','emp_duc','test-secret'),(22,'manager','emp_quanly','test-secret'),
          (33,'admin','emp_admin','test-secret'),(44,'employee','emp_inactive','test-secret'),(55,'employee','emp_no_profile','test-secret');
        INSERT INTO employees(employee_id,user_id,department_id,fullname,email,phone_number,birthday,position,start_date,status) VALUES
          (101,11,1,'Trịnh Minh Đức','old@example.com','0912345678','03/02/1998','Nhân viên','2020-01-01','dang_lam_viec'),
          (202,22,1,'Quản lý','manager@example.com','0912345679','04/03/1990','Trưởng phòng','2020-01-01','dang_lam_viec'),
          (303,33,2,'Admin','admin@example.com','0912345670','05/04/1990','Quản trị','2020-01-01','dang_lam_viec'),
          (404,44,1,'Đã nghỉ',NULL,NULL,NULL,'Nhân viên','2020-01-01','da_nghi_viec');
      `);
    } finally { await fixture.end(); }
    prisma = (await import('../src/config/prisma.js')).default;
    assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, database);
    const routes = (await import('../src/routes/userRoutes.js')).default;
    const app = express(); app.use(express.json()); app.use('/api/users', routes);
    server = await new Promise((resolve, reject) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); instance.once('error', reject); });
    const base = `http://127.0.0.1:${server.address().port}/api/users`;
    const roles = { 11: 'employee', 22: 'manager', 33: 'admin', 44: 'employee', 55: 'employee' };
    const token = id => jwt.sign({ user_id: id, role: roles[id] }, process.env.JWT_SECRET || 'mini_erp_super_secret_key_2026', { expiresIn: '10m' });
    async function api(id, body, path = '/me', method = body === undefined ? 'GET' : 'PATCH') {
      return fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token(id)}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    }
    await t.test('all active roles can edit only their own personal fields and persist on reload', async () => {
      assert.equal((await fetch(`${base}/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
      for (const id of [11, 22, 33]) {
        const response = await api(id, { fullname: `Hồ sơ ${id}` });
        assert.equal(response.status, 200); assert.equal((await response.json()).user_id, id);
      }
      const response = await api(11, { fullname: '  Trịnh   Minh Đức  ', email: ' duc@example.com ', phone_number: '+84 (912) 345-678', birthday: '1998-02-03' });
      assert.equal(response.status, 200);
      const profile = await response.json();
      assert.equal(profile.employee_id, 101); assert.equal(profile.fullname, 'Trịnh Minh Đức');
      assert.equal(profile.email, 'duc@example.com'); assert.equal(profile.phone_number, '+84912345678'); assert.equal(profile.birthday, '03/02/1998');
      assert.deepEqual(profile.users, { username: 'emp_duc', role: 'employee' });
      assert.equal(profile.departments.department_name, 'Phòng A'); assert.equal(profile.position, 'Nhân viên');
      assert.equal(JSON.stringify(profile).includes('test-secret'), false);
      const reloaded = await (await api(11)).json();
      assert.equal(reloaded.fullname, profile.fullname); assert.equal(reloaded.email, profile.email);
    });
    await t.test('rejects foreign identities and protected attributes without partial updates', async () => {
      const protectedFields = { employee_id: 202, user_id: 22, id: 202, role: 'admin', department_id: 2,
        position: 'Giám đốc', status: 'da_nghi_viec', username: 'admin', password: 'new-secret', start_date: '2000-01-01' };
      for (const [field, value] of Object.entries(protectedFields)) {
        assert.equal((await api(11, { fullname: 'Không được lưu', [field]: value })).status, 400, field);
      }
      assert.equal((await (await api(11)).json()).fullname, 'Trịnh Minh Đức');
      assert.equal((await (await api(22)).json()).fullname, 'Hồ sơ 22');
      assert.equal((await api(33, { role: 'manager' })).status, 400);
      assert.equal((await api(11, { fullname: 'Giả mạo' }, '/employee-update/202', 'PUT')).status, 403);
    });
    await t.test('validates inputs and permits clearing optional personal fields', async () => {
      for (const body of [{}, [], { email: 'khong-hop-le' }, { phone_number: '12' }, { birthday: '2035-01-01' },
        { birthday: '31/12/1990' }, { birthday: '2001-02-29' }, { fullname: null }, { email: {} }, { phone_number: 912345678 }]) {
        assert.equal((await api(11, body)).status, 400, JSON.stringify(body));
      }
      const partial = await api(11, { email: 'new@example.com' }); assert.equal(partial.status, 200);
      const data = await partial.json(); assert.equal(data.phone_number, '+84912345678'); assert.equal(data.fullname, 'Trịnh Minh Đức');
      const cleared = await (await api(11, { email: null, phone_number: '', birthday: null })).json();
      assert.equal(cleared.email, null); assert.equal(cleared.phone_number, null); assert.equal(cleared.birthday, null);
    });
    await t.test('blocks inactive employees and accounts without an employee record', async () => {
      assert.equal((await api(44, { fullname: 'Không được lưu' })).status, 403);
      assert.equal((await api(55, { fullname: 'Không được lưu' })).status, 403);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    process.env.DATABASE_URL = originalUrl;
    if (created) {
      for (let attempt = 0; attempt < 60; attempt++) {
        const connections = await admin.query('SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname = $1', [database]);
        if (!connections.rows[0].total) break;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    }
    await admin.end();
  }
});
