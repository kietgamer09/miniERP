// Kiểm tra dịch vụ frontend bằng phản hồi HTTP giả lập, không ghi database.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, createContext } from 'node:vm';

let response = [];
let status = 200;
let networkFailure = false;
let lastRequest;
const events = [];
const context = createContext({
  Event,
  URLSearchParams,
  window: {
    localStorage: { getItem: () => JSON.stringify({ token: 'test-token' }) },
    dispatchEvent: (event) => events.push(event.type),
  },
  fetch: async (url, options) => {
    if (networkFailure) throw new Error('Offline');
    lastRequest = { url, ...options };
    return { ok: status >= 200 && status < 300, status, json: async () => response };
  },
});
const cache = new Map();
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const module = new SourceTextModule(await readFile(new URL(`../src/services/${name}.js`, import.meta.url), 'utf8'), {
    context,
    initializeImportMeta: (meta) => { meta.env = { VITE_API_URL: 'http://api.test/' }; },
  });
  cache.set(name, module);
  await module.link((specifier) => load(specifier.replace('./', '')));
  await module.evaluate();
  return module;
}

const projects = (await load('projectApi')).namespace;
const employees = (await load('employeeApi')).namespace;
const auth = (await load('authApi')).namespace;
const attendance = (await load('attendanceApi')).namespace;
// Token hiện được AuthProvider đồng bộ trong bộ nhớ, không đọc lại localStorage mỗi request.
(await load('http')).namespace.setAuthToken('test-token');
const projectBody = { code: 'DA-01', name: 'Dự án', start_date: '2026-10-01', end_date: '2026-10-01' };
const employeeBody = { fullname: 'Nhân viên', phone_number: '0900000000', department_id: 1, role: 'employee' };
const cases = [
  [() => attendance.getTodayAttendance(), '/api/attendances/today', 'GET', undefined, { record: null, day: { date: '2026-10-27', status: 'waiting' } }],
  [() => attendance.getMyAttendances('2026-10'), '/api/attendances/me?month=2026-10', 'GET', undefined, { month: '2026-10', days: [] }],
  [() => attendance.createAttendanceExplanation({ date: '2026-10-26', reason: 'Giải trình' }), '/api/attendances/explanations', 'POST', { date: '2026-10-26', reason: 'Giải trình' }, { id: 1, status: 'pending' }],
  [() => attendance.listAttendanceExplanations('pending'), '/api/attendances/explanations?status=pending', 'GET', undefined, []],
  [() => attendance.reviewAttendanceExplanation(1, { decision: 'approved' }), '/api/attendances/explanations/1/review', 'PUT', { decision: 'approved' }, { message: 'Đã duyệt' }],
  [() => attendance.checkIn(), '/api/attendances/check-in', 'POST', undefined,
    { message: 'Vào ca thành công', data: { attendances_id: 1, check_in: '1970-01-01T08:00:00.000Z' } }],
  [() => attendance.checkOut(), '/api/attendances/check-out', 'POST', { confirmedEarly: false },
    { message: 'Ra ca thành công', data: { attendances_id: 1, check_out: '1970-01-01T17:00:00.000Z' } }],
  [() => attendance.checkOut(), '/api/attendances/check-out', 'POST', { confirmedEarly: false },
    { success: false, requireConfirmation: true, message: 'Xác nhận ra ca sớm' }],
  [() => attendance.checkOut(true), '/api/attendances/check-out', 'POST', { confirmedEarly: true },
    { message: 'Ra ca thành công', data: { attendances_id: 1, check_out: '16:00:00' } }],
  [() => projects.listProjects(), '/api/projects', 'GET', undefined, [{ id: 1, progress_percent: 50 }]],
  [() => projects.createProject(projectBody), '/api/projects', 'POST', projectBody, { id: 1, ...projectBody }],
  [() => projects.updateProject(12, projectBody), '/api/projects/12', 'PUT', projectBody, { id: 12 }],
  [() => employees.listEmployees(), '/api/users/employee-list', 'GET', undefined, [{ employee_id: 10, users: { role: 'employee' } }]],
  [() => employees.createEmployee(employeeBody), '/api/users/employee-create', 'POST', employeeBody, { data: { employee_id: 10 }, login_info: { username: '0900000000', default_password: 'test-only' } }],
  [() => employees.updateEmployee(10, employeeBody), '/api/users/employee-update/10', 'PUT', employeeBody, { employee_id: 10 }],
];
for (const [call, path, method, body, result] of cases) {
  response = result;
  assert.equal(await call(), result);
  assert.equal(lastRequest.url, `http://api.test${path}`);
  assert.equal(lastRequest.method, method);
  assert.equal(lastRequest.headers.Authorization, 'Bearer test-token');
  assert.equal(lastRequest.body, body === undefined ? undefined : JSON.stringify(body));
}
for (const errorStatus of [400, 403, 409, 500]) {
  status = errorStatus;
  response = { error: 'Thông điệp từ backend' };
  await assert.rejects(() => employees.createEmployee(employeeBody), (error) => error.status === status && error.message === response.error);
  assert.equal(events.length, 0);
}
status = 401;
await assert.rejects(() => projects.listProjects(), (error) => error.status === 401);
assert.deepEqual(events, ['auth:unauthorized']);
networkFailure = true;
await assert.rejects(() => projects.listProjects(), (error) => error.status === 0);
networkFailure = false;
status = 200;
response = { token: 'login-token', user: { user_id: 99, employee_id: 7, username: 'test', role: 'manager' } };
const session = await auth.login('test', 'test-only');
assert.equal(session.user.id, 99);
assert.equal(session.user.employee_id, 7);
assert.equal(lastRequest.url, 'http://api.test/api/auth/login');
console.log('PASS: 15 API calls including attendance/history/explanations, Bearer token, request bodies, response shapes, error handling, employee_id mapping.');
