import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import * as rules from '../src/utils/payrollRules.js';
import * as attendance from '../src/utils/attendanceRules.js';

const date = value => new Date(`${value}T00:00:00Z`);
const fixture = { month: '2026-02', employee: {}, records: [], leaves: [], clock: { date: '2026-03-01', time: '18:00:00' } };
assert.equal(rules.workingDates('2026-02').length, 20);
assert.equal(rules.workingDates('2026-10').length, 22);
assert.equal(rules.payrollDays(fixture).off_days, 20);
const leave = { status: 'da_duoc_duyet', start_date: date('2026-02-02'), end_date: date('2026-02-03') };
assert.equal(rules.payrollDays({ ...fixture, leaves: [leave, leave] }).off_days, 18);
assert.equal(rules.payrollDays({ ...fixture, leaves: [{ ...leave, status: 'cho_xac_thuc' }] }).off_days, 20);
const punch = { date: date('2026-02-02'), check_in: new Date('1970-01-01T07:59:00Z'), check_out: new Date('1970-01-01T17:01:00Z') };
assert.equal(rules.payrollDays({ ...fixture, records: [punch] }).off_days, 19);
assert.equal(rules.payrollDays({ ...fixture, records: [{ ...punch, check_out: null }] }).off_days, 20);
assert.equal(rules.payrollDays({ ...fixture, records: [punch, punch] }).off_days, 20);
assert.equal(rules.payrollDays({ ...fixture, clock: { date: '2026-02-02', time: '07:00:00' } }).off_days, 0);
assert.equal(rules.payrollDays({ ...fixture, explanations: [{ status: 'approved', explanation_type: 'makeup' }] }).off_days, 20);
assert.equal(rules.payrollAmounts({ standard_days: 20, off_days: 2 }, 10000000, 0).net_salary, 9000000);
assert.equal(rules.payrollAmounts({ standard_days: 20, off_days: 0 }, 0, 0).base_salary, 0);

let writes = 0;
let existing = { status: 'paid', base_salary: 1234567, net_salary: 1234567, month: '2026-02' };
const employee = { employee_id: 9, user_id: 12, fullname: 'Test', status: 'dang_lam_viec' };
const db = {
  employees: { findUnique: async ({ where }) => { assert.equal(where.user_id, 12); assert.equal(Object.keys(where).length, 1); return employee; }, findMany: async () => [employee] },
  payrolls: { findUnique: async () => existing, upsert: async () => { writes++; throw new Error('Unexpected payroll write'); } },
  attendances: { findMany: async () => [] }, Day_off_requests: { findMany: async () => [] },
};
db.$transaction = fn => fn(db);
const context = createContext({ console });
const dependencies = { '../config/prisma.js': { default: db }, '../utils/attendanceRules.js': attendance, '../utils/payrollRules.js': rules };
const module = new SourceTextModule(await readFile(new URL('../src/controllers/PayrollController.js', import.meta.url), 'utf8'), { context });
await module.link(name => {
  const values = dependencies[name];
  return new SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
});
await module.evaluate();
async function invoke(name, user = { user_id: 12 }) {
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await module.namespace[name]({ user, query: { month: '2026-02' }, body: {} }, response);
  return response;
}
assert.equal((await invoke('getMyPayroll')).body.data.net_salary, 1234567);
assert.equal((await invoke('getMyPayroll', { id: 12 })).code, 401);
await invoke('calculateCompanyPayroll');
existing = { ...existing, status: 'da_thanh_toan' };
await invoke('calculateCompanyPayroll');
existing = null;
assert.equal((await invoke('getMyPayroll')).code, 200);
assert.equal(writes, 0);
db.payrolls.upsert = async ({ create }) => { writes++; return create; };
const calculated = await invoke('calculateCompanyPayroll');
assert.equal(calculated.code, 200);
assert.equal(calculated.body.data[0].standard_days, 20);
assert.equal(calculated.body.data[0].employee_id, 9);
assert.equal(writes, 1);
console.log('PASS: month weekdays, leave, missing/duplicate punches, future days, makeup, salary, own identity, read-only preview and paid payroll protection.');
