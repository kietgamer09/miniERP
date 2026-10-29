import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { overtimeMaxDate, overtimeToday, validateOvertime } from '../src/utils/overtimeRules.js';

test('overtime calendar rules use Vietnam dates and a clamped calendar month', () => {
  assert.equal(overtimeMaxDate('2026-01-31'), '2026-02-28');
  assert.equal(overtimeMaxDate('2028-01-31'), '2028-02-29');
  assert.equal(overtimeMaxDate('2026-12-31'), '2027-01-31');
  assert.equal(overtimeToday(new Date('2026-10-29T17:00:00Z')), '2026-10-30');
  const body = { mode: 'planned', date: '2026-02-28', start_time: '22:00', end_time: '02:00', end_next_day: true, reason: 'Triển khai' };
  assert.ok(validateOvertime(body, '2026-01-31').data);
  assert.ok(validateOvertime({ ...body, date: '2026-03-01' }, '2026-01-31').error);
  assert.ok(validateOvertime({ ...body, end_next_day: false }, '2026-01-31').error);
  assert.ok(validateOvertime({ ...body, mode: 'past', date: '2026-01-31' }, '2026-01-31').error);
});

test('overtime workflow and push policy in an isolated disposable database', async t => {
  const originalUrl = process.env.DATABASE_URL;
  assert.ok(originalUrl, 'Cần DATABASE_URL để kiểm tra.');
  const admin = new pg.Pool({ connectionString: originalUrl });
  const database = `minierp_ot_test_${randomUUID().replaceAll('-', '')}`;
  assert.match(database, /^minierp_ot_test_[a-f0-9]{32}$/);
  let created = false, prisma, server;
  try {
    await admin.query(`CREATE DATABASE "${database}"`); created = true;
    const url = new URL(originalUrl); url.pathname = `/${database}`;
    process.env.DATABASE_URL = url.toString();
    const fixture = new pg.Pool({ connectionString: url.toString() });
    try {
      await fixture.query(`
        CREATE TABLE users(user_id INT PRIMARY KEY, role TEXT, username TEXT, password TEXT);
        CREATE TABLE departments(department_id INT PRIMARY KEY, department_name TEXT);
        CREATE TABLE employees(employee_id INT PRIMARY KEY, user_id INT UNIQUE REFERENCES users(user_id),
          department_id INT REFERENCES departments(department_id), fullname TEXT, status TEXT, start_date DATE);
        INSERT INTO departments VALUES (1, 'Phòng kiểm thử A'), (2, 'Phòng kiểm thử B');
        INSERT INTO users(user_id,role) VALUES (1,'employee'),(2,'manager'),(3,'manager'),(4,'admin'),(5,'employee'),(6,'manager');
        INSERT INTO employees VALUES (1,1,1,'NV kiểm thử','dang_lam_viec','2020-01-01'),
          (2,2,1,'QL A','dang_lam_viec','2020-01-01'), (3,3,2,'QL B','dang_lam_viec','2020-01-01'),
          (4,4,2,'Admin kiểm thử','dang_lam_viec','2020-01-01'),(5,5,1,'NV khác','dang_lam_viec','2020-01-01'),
          (6,6,1,'QL A thứ hai','dang_lam_viec','2020-01-01');
        CREATE TABLE work_push_subscriptions(id SERIAL PRIMARY KEY, employee_id INT, endpoint TEXT, p256dh TEXT, auth TEXT, created_at TIMESTAMPTZ DEFAULT now());
        CREATE TABLE work_push_deliveries(subscription_id INT REFERENCES work_push_subscriptions(id) ON DELETE CASCADE,
          kind VARCHAR(10), comment_id INT, attempts INT DEFAULT 0, next_attempt_at TIMESTAMPTZ DEFAULT now(), delivered_at TIMESTAMPTZ,
          PRIMARY KEY(subscription_id,kind,comment_id));
        INSERT INTO work_push_subscriptions(employee_id,endpoint,p256dh,auth) VALUES (2,'https://example.invalid/test-only','not-a-real-key','not-real');
      `);
      await fixture.query(await readFile(new URL('../prisma/sql/overtime.sql', import.meta.url), 'utf8'));
    } finally { await fixture.end(); }
    prisma = (await import('../src/config/prisma.js')).default;
    assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name, database);
    const router = (await import('../src/routes/overtimeRoutes.js')).default;
    const attachmentRoutes = (await import('../src/routes/attachmentRoutes.js')).default;
    const { pendingOvertimePush, overtimePushPayload } = await import('../src/services/overtime.js');
    const { deliverPush } = await import('../src/services/webPush.js');
    const app = express(); app.use(express.json()); app.use('/api/overtime', router); app.use('/api/attachments', attachmentRoutes);
    server = await new Promise((resolve, reject) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); instance.once('error', reject); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const roles = ['employee', 'manager', 'manager', 'admin', 'employee', 'manager'];
    const tokens = roles.map((role, i) => jwt.sign({ user_id: i + 1, role }, process.env.JWT_SECRET || 'mini_erp_super_secret_key_2026', { expiresIn: '10m' }));
    async function api(actor, path = '', method = 'GET', body) {
      return fetch(`${base}/api/overtime${path}`, { method, headers: { Authorization: `Bearer ${tokens[actor - 1]}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    }
    const today = overtimeToday();
    const day = delta => new Date(Date.parse(`${today}T00:00:00Z`) + delta * 86400000).toISOString().slice(0, 10);
    const body = (delta, extra = {}) => ({ mode: delta < 0 ? 'past' : 'planned', date: day(delta), start_time: '18:00', end_time: '20:00', reason: 'Kiểm thử đơn tăng ca', ...extra });
    async function create(delta, extra, actor = 1) {
      const response = await api(actor, '', 'POST', body(delta, extra));
      const result = await response.json(); assert.equal(response.status, 201, result.error); return result;
    }
    let past, tomorrow, second, third, week, race, cancelled;
    await t.test('validates dates/hours and blocks duplicate overlapping requests including overnight', async () => {
      assert.equal((await fetch(`${base}/api/overtime`)).status, 401);
      const max = overtimeMaxDate(today);
      const afterMax = new Date(Date.parse(`${max}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
      assert.equal((await api(1, '', 'POST', body(1, { date: afterMax }))).status, 400);
      assert.equal((await api(1, '', 'POST', body(-1, { date: today }))).status, 400);
      assert.equal((await api(1, '', 'POST', body(1, { mode: 'past' }))).status, 400);
      assert.equal((await api(1, '', 'POST', body(1, { end_time: '18:00' }))).status, 400);
      assert.equal((await api(1, '', 'POST', body(-1, { date: '2019-12-31' }))).status, 400);
      past = await create(-1); assert.equal(past.total_minutes, 120);
      const night = await create(-3, { start_time: '22:00', end_time: '02:00', end_next_day: true });
      assert.equal(night.total_minutes, 240);
      assert.equal((await api(1, '', 'POST', body(-2, { start_time: '01:00', end_time: '03:00' }))).status, 409);
      const responses = await Promise.all([api(1, '', 'POST', body(12)), api(1, '', 'POST', body(12))]);
      assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
      tomorrow = await create(1); second = await create(2); third = await create(3); week = await create(7);
    });
    await t.test('notifies same-department managers and admins only and protects private requests/files', async () => {
      const [owner, manager, otherManager, adminFeed, coworker] = await Promise.all([1,2,3,4,5].map(async actor => (await api(actor, '/notifications')).json()));
      assert.equal(owner.length, 0); assert.equal(otherManager.length, 0); assert.equal(coworker.length, 0);
      assert.ok(manager.some(item => item.path.includes(`request=${tomorrow.id}`)));
      assert.ok(adminFeed.some(item => item.path.includes(`request=${tomorrow.id}`)));
      assert.equal((await api(3, `/${tomorrow.id}`)).status, 403);
      assert.equal((await api(5, `/${tomorrow.id}`)).status, 403);
      assert.equal((await api(1, '?view=review')).status, 403);
      const visible = await (await api(2, '?view=review')).json(); assert.ok(visible.requests.every(row => row.department_id === 1));
      const fileView = await fetch(`${base}/api/attachments/overtime/${tomorrow.id}`, { headers: { Authorization: `Bearer ${tokens[2]}` } });
      assert.equal(fileView.status, 403);
      await prisma.$executeRaw`UPDATE employees SET department_id = 2 WHERE employee_id = 2`;
      assert.equal((await api(2, `/${tomorrow.id}`)).status, 403);
      assert.equal((await (await api(2, '/notifications')).json()).length, 0);
      await prisma.$executeRaw`UPDATE employees SET department_id = 1 WHERE employee_id = 2`;
    });
    await t.test('prioritizes approaching dates and never pushes past-date or distant requests', async () => {
      const feed = await (await api(2, '/notifications')).json();
      const priority = id => feed.find(item => item.path.includes(`request=${id}`)).priority;
      assert.ok(priority(tomorrow.id) > priority(second.id)); assert.ok(priority(second.id) > priority(week.id)); assert.equal(priority(past.id), 0);
      const pending = await pendingOvertimePush();
      assert.ok(pending.some(item => item.request_id === tomorrow.id));
      assert.ok(!pending.some(item => [past.id, week.id].includes(item.request_id)));
      for (const [request, urgency] of [[tomorrow, 'high'], [second, 'normal'], [third, 'low']]) {
        assert.equal((await overtimePushPayload(pending.find(item => item.request_id === request.id))).urgency, urgency);
      }
      let sent = 0;
      const notification = pending.find(item => item.request_id === tomorrow.id);
      await deliverPush(notification, prisma, async (_, payload, options) => { sent++; assert.equal(options.urgency, 'high'); assert.ok(JSON.parse(payload).path.includes(`request=${tomorrow.id}`)); });
      await deliverPush(notification, prisma, async () => { sent++; }); assert.equal(sent, 1);
      const next = feed.find(item => item.path.includes(`request=${second.id}`));
      await api(5, '/notifications/read', 'PATCH', { ids: [next.id] });
      assert.equal((await (await api(2, '/notifications')).json()).find(item => item.id === next.id).read, false);
      await api(2, '/notifications/read', 'PATCH', { ids: [next.id] });
      assert.equal((await (await api(2, '/notifications')).json()).find(item => item.id === next.id).read, true);
      assert.ok(!(await pendingOvertimePush()).some(item => item.request_id === second.id));
      const unread = await (await api(2, '/notifications')).json();
      const firstRead = unread.findIndex(item => item.read); assert.ok(unread.slice(firstRead).every(item => item.read));
    });
    await t.test('blocks self-approval and only one of multiple reviewers can decide', async () => {
      const ownManager = await create(4, {}, 2);
      const ownAdmin = await create(4, {}, 4);
      assert.equal((await api(2, `/${ownManager.id}/review`, 'POST', { decision: 'approved' })).status, 403);
      assert.equal((await api(4, `/${ownAdmin.id}/review`, 'POST', { decision: 'approved' })).status, 403);
      assert.equal((await api(1, `/${past.id}/review`, 'POST', { decision: 'approved' })).status, 403);
      assert.equal((await api(3, `/${past.id}/review`, 'POST', { decision: 'approved' })).status, 403);
      race = await create(5);
      const results = await Promise.all([api(2, `/${race.id}/review`, 'POST', { decision: 'approved' }), api(4, `/${race.id}/review`, 'POST', { decision: 'rejected', note: 'Kiểm thử quyết định đồng thời' })]);
      assert.deepEqual(results.map(response => response.status).sort(), [200, 409]);
      const processed = await (await api(1, `/${race.id}`)).json(); assert.notEqual(processed.status, 'pending');
      const [counts] = await prisma.$queryRaw`SELECT count(*)::int AS total FROM work_overtime_notifications WHERE request_id = ${race.id} AND event = 'result'`;
      assert.equal(counts.total, 1);
      const notices = await (await api(1, '/notifications')).json(); assert.ok(notices.some(item => !item.read && item.path.includes(`request=${race.id}`)));
      assert.ok(!(await pendingOvertimePush()).some(item => item.request_id === race.id));
    });
    await t.test('handles cancellation and rejection with required reasons', async () => {
      cancelled = await create(6);
      assert.equal((await api(5, `/${cancelled.id}/cancel`, 'POST')).status, 403);
      assert.equal((await api(1, `/${cancelled.id}/cancel`, 'POST')).status, 204);
      assert.equal((await api(2, `/${cancelled.id}/review`, 'POST', { decision: 'approved' })).status, 409);
      assert.equal((await api(2, `/${past.id}/review`, 'POST', { decision: 'rejected' })).status, 400);
      assert.equal((await api(2, `/${past.id}/review`, 'POST', { decision: 'rejected', note: 'Bổ sung thông tin' })).status, 200);
      assert.equal((await api(1, `/${past.id}/cancel`, 'POST')).status, 409);
      assert.equal((await api(4, `/${past.id}/review`, 'POST', { decision: 'approved' })).status, 409);
      await create(-1);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    process.env.DATABASE_URL = originalUrl;
    if (created) {
      for (let attempt = 0; attempt < 60; attempt++) {
        const result = await admin.query('SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname = $1', [database]);
        if (!result.rows[0].total) break;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    }
    await admin.end();
  }
});
