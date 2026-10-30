// Kiểm thử controller bằng DB giả lập; không ghi dữ liệu chấm công thật.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import * as rules from '../src/utils/attendanceRules.js';
import * as validators from '../src/utils/validators.js';

let rows = [], leaves = [], writes = 0, queryFailure = false, leaveQueryFailure = false;
let clock = { date: '2026-10-27', time: '16:00:00' };
const model = {
  findMany: async () => { if (queryFailure) throw new Error('DB unavailable'); return rows; },
  update: async ({ data }) => { writes++; return { ...rows[0], ...data }; },
  create: async ({ data }) => { writes++; return { attendances_id: 1, ...data }; },
};
const db = {
  employees: { findUnique: async () => ({ employee_id: 1, status: 'dang_lam_viec' }) },
  attendances: model,
  Day_off_requests: { findMany: async ({ where }) => {
    if (leaveQueryFailure) throw new Error('Leave DB unavailable');
    assert.equal(where.employee_send_id, 1);
    assert.equal(where.status, 'da_duoc_duyet');
    return leaves.filter(item => item.status === where.status && item.employee_send_id === where.employee_send_id
      && item.start_date <= where.start_date.lte);
  } },
  attendance_explanations: { findMany: async () => [] },
  $queryRaw: async () => [],
};
db.$transaction = action => action(db);
const context = createContext({ console: { error() {} } });
const dependencies = {
  '../config/prisma.js': { default: db },
  '../utils/attendanceRules.js': { ...rules, vietnamClock: () => clock },
  '../utils/validators.js': validators,
};
const controller = new SourceTextModule(await readFile(new URL('../src/controllers/attendanceController.js', import.meta.url), 'utf8'), { context });
await controller.link(specifier => {
  const exports = dependencies[specifier];
  return new SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
});
await controller.evaluate();
async function call(name, body = {}) {
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await controller.namespace[name]({ user: { user_id: 1 }, body, query: { month: '2026-10' } }, response);
  return response;
}
const row = { attendances_id: 1, employee_id: 1, date: new Date('2026-10-27Z'), check_in: new Date('1970-01-01T08:00:00Z'), check_out: null };
rows = [row];
for (const confirmedEarly of [undefined, false, 'false', 'true', 1]) {
  const response = await call('checkOut', { confirmedEarly });
  assert.equal(response.body.requireConfirmation, true);
  assert.equal(writes, 0, 'Unconfirmed early checkout must never write');
}
let response = await call('checkOut', { confirmedEarly: true });
assert.equal(response.body.data.check_out, '16:00:00');
assert.equal(writes, 1);
clock = { ...clock, time: '17:00:00' };
response = await call('checkOut');
assert.equal(response.body.data.check_out, '17:00:00');
assert.equal(writes, 2);
rows = [{ ...row, check_out: new Date('1970-01-01T16:00:00Z') }];
assert.equal((await call('checkOut', { confirmedEarly: true })).code, 400);
assert.equal(writes, 2);
rows = [];
assert.equal((await call('checkOut', { confirmedEarly: true })).code, 400);
leaves = [{ employee_send_id: 1, status: 'da_duoc_duyet', start_date: new Date('2026-10-27T00:00:00Z'), end_date: new Date('2026-10-30T00:00:00Z') }];
for (const existing of [[], [row]]) {
  rows = existing;
  const today = await call('getToday');
  assert.equal(today.body.day.status, 'leave');
  assert.equal(today.body.day.can_explain, false);
  assert.equal((await call('checkIn')).code, 409);
  assert.equal((await call('checkOut', { confirmedEarly: true })).code, 409);
  const month = await call('getMyAttendances');
  assert.equal(month.body.days.find(day => day.date === '2026-10-27').status, 'leave');
  assert.equal(month.body.days.find(day => day.date === '2026-10-30').status, 'leave');
}
assert.equal(writes, 2, 'Approved leave must block all punches without deleting existing records');
for (const status of ['cho_xac_thuc', 'bi_tu_choi']) {
  leaves[0].status = status;
  rows = [];
  assert.notEqual((await call('getToday')).body.day.status, 'leave');
  assert.equal((await call('checkIn')).code, 200);
}
leaves = []; rows = []; leaveQueryFailure = true;
assert.equal((await call('getToday')).code, 500);
assert.equal((await call('checkIn')).code, 500, 'Leave lookup failure must not permit punches');
leaveQueryFailure = false;
queryFailure = true;
assert.equal((await call('getToday')).code, 500, 'DB failure must not become an absent day');
assert.equal((await call('getMyAttendances')).code, 500);
console.log('PASS: approved leave with/without old punches, future leave, pending/rejected leave, punch blocking, strict confirmation, DB errors; no real DB writes.');
