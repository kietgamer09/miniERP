import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { vietnamClock } from '../src/utils/attendanceRules.js';

const originalUrl = process.env.DATABASE_URL;
assert.ok(originalUrl);
const database = `minierp_explanation_test_${randomUUID().replaceAll('-', '')}`;
assert.match(database, /^minierp_explanation_test_[a-f0-9]{32}$/);
const admin = new pg.Pool({ connectionString: originalUrl });
let created = false, prisma, server;
try {
  await admin.query(`CREATE DATABASE "${database}"`); created = true;
  const url = new URL(originalUrl); url.pathname = `/${database}`;
  process.env.DATABASE_URL = url.toString();
  const fixture = new pg.Pool({ connectionString: url.toString() });
  try {
    await fixture.query(`
      CREATE TYPE employee_status AS ENUM ('dang_lam_viec', 'da_nghi_viec');
      CREATE TYPE leave_status AS ENUM ('cho_xac_thuc', 'da_duoc_duyet', 'bi_tu_choi');
      CREATE TABLE users(user_id INT PRIMARY KEY, role TEXT, username TEXT, password TEXT, created_at TIMESTAMP);
      CREATE TABLE departments(department_id INT PRIMARY KEY, department_name TEXT);
      CREATE TABLE employees(employee_id INT PRIMARY KEY, user_id INT UNIQUE REFERENCES users(user_id), department_id INT REFERENCES departments(department_id),
        fullname TEXT, email TEXT, phone_number TEXT, birthday TEXT, manage_by TEXT, position TEXT, start_date DATE, status employee_status, created_at TIMESTAMP);
      CREATE TABLE attendances(attendances_id SERIAL PRIMARY KEY, employee_id INT REFERENCES employees(employee_id), date DATE, check_in TIME, check_out TIME, created_at TIMESTAMP);
      CREATE TABLE "Day_off_requests"("Day_off_id" SERIAL PRIMARY KEY, employee_send_id INT, employee_receive_id INT, start_date DATE, end_date DATE, reason TEXT, status leave_status, created_at TIMESTAMP);
      INSERT INTO departments VALUES (1,'Phòng A');
      INSERT INTO users(user_id,role,username,password) VALUES (11,'employee','e11','test'),(12,'employee','e12','test'),(13,'employee','e13','test'),
        (14,'employee','e14','test'),(15,'employee','e15','test'),(16,'employee','e16','test'),(22,'manager','m22','test'),(33,'admin','a33','test');
      INSERT INTO employees(employee_id,user_id,department_id,fullname,status,start_date)
      SELECT user_id+90,user_id,1,username,'dang_lam_viec'::employee_status,'2020-01-01' FROM users;
    `);
    await fixture.query(await readFile(new URL('../prisma/sql/attendance-explanations.sql', import.meta.url), 'utf8'));
  } finally { await fixture.end(); }
  prisma = (await import('../src/config/prisma.js')).default;
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, database);
  const app = express(); app.use(express.json());
  app.use('/api/attendances', (await import('../src/routes/attendancesRoutes.js')).default);
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}/api/attendances`;
  const today = vietnamClock().date;
  const previous = new Date(`${today}T00:00:00Z`);
  do { previous.setUTCDate(previous.getUTCDate() - 1); } while ([0, 6].includes(previous.getUTCDay()));
  const date = previous.toISOString().slice(0, 10), at = time => new Date(`1970-01-01T${time}Z`);
  async function api(user, method, path, body) {
    const token = jwt.sign({ user_id: user, role: user === 33 ? 'admin' : user === 22 ? 'manager' : 'employee' }, process.env.JWT_SECRET || 'mini_erp_super_secret_key_2026');
    const res = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, data: await res.json() };
  }
  async function submit(user, extra) {
    const result = await api(user, 'POST', '/create-explanations', { date, reason: 'Quên chấm công', request_type: 'correction',
      requested_check_in: '07:59', requested_check_out: '17:01', ...extra });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    return result.data.data;
  }
  const review = (id, user = 33, status = 'approved') => api(user, 'PUT', `/review-explanations/${id}/review`, { status });
  await prisma.attendances.create({ data: { employee_id: 101, date: previous, check_in: at('08:30:00') } });
  const out = await submit(11, { requested_check_in: null });
  const attempts = await Promise.all([review(out.id), review(out.id)]);
  assert.deepEqual(attempts.map(item => item.status).sort(), [200, 409], 'Only one concurrent approval may apply');
  const approved = attempts.find(item => item.status === 200).data.data;
  assert.equal(approved.original_attendance.check_in, '1970-01-01T08:30:00.000Z');
  assert.equal(approved.original_attendance.check_out, null);
  assert.equal(approved.reviewed_by, 33);
  assert.ok(approved.reviewed_at);
  const row = await prisma.attendances.findFirst({ where: { employee_id: 101 } });
  assert.equal(row.check_in.toISOString(), '1970-01-01T08:30:00.000Z');
  assert.equal(row.check_out.toISOString(), '1970-01-01T17:01:00.000Z');
  const month = await api(11, 'GET', `/me?month=${date.slice(0, 7)}`);
  const day = month.data.days.find(item => item.date === date);
  assert.equal(day.status, 'late'); assert.equal(day.color, 'gold'); assert.equal(day.explanation.request_type, 'correction');

  await prisma.attendances.create({ data: { employee_id: 102, date: previous, check_out: at('17:30:00') } });
  assert.equal((await review((await submit(12, { requested_check_out: null })).id)).status, 200);
  assert.equal((await prisma.attendances.findFirst({ where: { employee_id: 102 } })).check_out.toISOString(), '1970-01-01T17:30:00.000Z');
  assert.equal((await review((await submit(13)).id)).status, 200);
  const completeMonth = await api(13, 'GET', `/me?month=${date.slice(0, 7)}`);
  assert.equal(completeMonth.data.days.find(item => item.date === date).status, 'complete');

  const makeup = await submit(14, { request_type: 'makeup', makeup_date: today });
  assert.equal((await review(makeup.id)).status, 200);
  assert.equal(await prisma.attendances.count({ where: { employee_id: 104 } }), 0, 'Makeup approval only registers a plan');
  assert.equal(Number((await prisma.$queryRaw`SELECT count(*) FROM "Day_off_requests"`)[0].count), 0, 'Neither flow deducts annual leave');

  const self = await submit(33);
  assert.equal((await review(self.id, 33)).status, 403);
  assert.equal((await review(self.id, 11)).status, 403);
  const reject = await submit(15);
  assert.equal((await review(reject.id, 22, 'rejected')).status, 200);
  assert.equal(await prisma.attendances.count({ where: { employee_id: 105 } }), 0);
  await prisma.attendances.create({ data: { employee_id: 106, date: previous, check_in: at('08:30:00') } });
  const invalid = await submit(16, { requested_check_in: null, requested_check_out: '08:00' });
  assert.equal((await review(invalid.id)).status, 400);
  assert.equal((await prisma.attendance_explanations.findUnique({ where: { id: invalid.id } })).status, 'pending');
  assert.equal((await prisma.attendances.findFirst({ where: { employee_id: 106 } })).check_out, null);
  console.log('PASS: correction of either/both times, audit snapshot, concurrent approval, permissions, rejection, unchanged remaining time, makeup plan, no leave deduction and correct calendar colors.');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (prisma) await prisma.$disconnect();
  process.env.DATABASE_URL = originalUrl;
  if (created) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const state = await admin.query('SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname = $1', [database]);
      if (!state.rows[0].total) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
  }
  await admin.end();
}
