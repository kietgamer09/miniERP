import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { explanationTimes } from '../src/utils/explanationTimes.js';
import { isValidDate } from '../src/utils/validators.js';

assert.deepEqual(explanationTimes({}).data, { requested_check_in: '07:59', requested_check_out: '17:01' });
assert.equal(explanationTimes({ requested_check_in: null, requested_check_out: '18:30' }).data.requested_check_out, '18:30');
assert.equal(explanationTimes({ requested_check_in: '09:30', requested_check_out: null }).data.requested_check_in, '09:30');
for (const value of ['24:00', '08:60', '8:00', '08:00:00', '', 800, {}, []]) {
  assert.ok(explanationTimes({ requested_check_in: value }).error);
}
assert.ok(explanationTimes({ requested_check_in: null, requested_check_out: null }).error);
assert.ok(explanationTimes({ requested_check_in: '17:00', requested_check_out: '08:00' }).error);
assert.ok(explanationTimes({ requested_check_in: '08:00', requested_check_out: '08:00' }).error);

let writes = 0;
const db = {
  employees: { findUnique: async () => ({ employee_id: 12, department_id: 1 }), findFirst: async () => ({ user_id: 5 }) },
  attendance_explanations: {
    findUnique: async () => null,
    create: async ({ data }) => { writes++; return { id: 1, ...data }; },
  },
};
const context = createContext({ console });
const dependencies = {
  '../config/prisma.js': { default: db },
  '../utils/explanationTimes.js': { explanationTimes },
  '../utils/validators.js': { isValidDate },
  '../utils/attendanceRules.js': { vietnamClock: () => ({ date: '2026-10-30', time: '10:00:00' }) },
  '../services/attendanceCorrection.js': { applyAttendanceCorrection: () => { throw new Error('Create must not apply corrections'); } },
};
const controller = new SourceTextModule(await readFile(new URL('../src/controllers/attendanceExplanationController.js', import.meta.url), 'utf8'), { context });
await controller.link(specifier => {
  const values = dependencies[specifier];
  return new SyntheticModule(Object.keys(values), function () {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context });
});
await controller.evaluate();
const date = '2026-10-30';
async function create(body) {
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await controller.namespace.createAttendanceExplanation({ employee: { employee_id: 12 }, body: { date, reason: 'Xin chấm bù', ...body } }, response);
  return response;
}
for (const body of [{}, { requested_check_in: '09:15', requested_check_out: '18:01' },
  { requested_check_in: null, requested_check_out: '17:01' }]) {
  const response = await create(body);
  assert.equal(response.code, 201);
  const data = response.body.data;
  assert.equal(data.requested_check_in, body.requested_check_in === undefined ? '07:59' : body.requested_check_in);
  assert.equal(data.requested_check_out, body.requested_check_out === undefined ? '17:01' : body.requested_check_out);
  assert.equal(data.employee_id, 12);
  assert.equal(data.status, 'pending');
}
for (const body of [{ requested_check_in: '25:00' }, { requested_check_in: null, requested_check_out: null },
  { requested_check_in: '18:00', requested_check_out: '08:00' }, { date: '2026-02-30' }, { makeup_date: 'bad-date' }]) {
  assert.equal((await create(body)).code, 400);
}
assert.equal(writes, 3, 'Invalid requests must not write to the database');
for (const body of [
  { request_type: 'wrong' }, { request_type: 'correction', makeup_date: '2026-10-30' },
  { request_type: 'makeup' }, { request_type: 'makeup', makeup_date: '2026-10-31', requested_check_out: null },
  { request_type: 'correction', date: '2026-11-02' },
]) assert.equal((await create(body)).code, 400, JSON.stringify(body));
for (const makeup_date of ['2026-10-22', '2026-10-29', '2026-10-24', '2026-10-25']) {
  assert.equal((await create({ makeup_date })).code, 400, makeup_date);
}
assert.equal((await create({ date: '2026-11-03', makeup_date: '2026-11-02' })).code, 400);
assert.equal(writes, 3, 'Past dates must not write, including old restored drafts');
for (const makeup_date of ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', null]) {
  const response = await create({ makeup_date });
  assert.equal(response.code, 201);
  assert.equal(response.body.data.makeup_date?.toISOString().slice(0, 10) || null, makeup_date);
}
console.log('PASS: defaults, single/both times, order and format validation, API persistence; no real DB writes.');
