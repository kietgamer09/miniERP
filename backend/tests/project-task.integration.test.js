import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../src/config/prisma.js';
import projectRoutes from '../src/routes/projectRoutes.js';
import taskRoutes from '../src/routes/taskRoutes.js';
import { assertIsolatedTestDatabase } from '../scripts/lib/testDatabase.mjs';

let server;
let baseUrl;
let actors;
let projectId;
let taskId;

async function api(actor, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt.sign({ user_id: actor.user_id, role: actor.role }, process.env.JWT_SECRET, { expiresIn: '10m' })}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return response;
}

async function createProject(actor, code) {
  return api(actor, '/api/projects', {
    method: 'POST',
    body: {
      code,
      name: `Dự án kiểm thử ${code}`,
      start_date: '2020-01-01',
      end_date: '2099-12-31',
      member_ids: [actors.employee.employee_id],
    },
  });
}

function taskBody(dueDate, title = 'Task kiểm thử') {
  return { title, assignee_id: actors.employee.employee_id, due_date: dueDate, priority: 'trung_binh' };
}

before(async () => {
  assert.ok(process.env.JWT_SECRET, 'Integration runner phải cấp JWT_SECRET riêng cho test.');
  await assertIsolatedTestDatabase(prisma);

  const departmentId = 90001;
  await prisma.departments.create({ data: { department_id: departmentId, department_name: 'Phòng test tạm' } });
  async function makeActor(role, username, fullname) {
    const user = await prisma.users.create({ data: { username, password: 'integration-only', role } });
    const employee = await prisma.employees.create({
      data: { user_id: user.user_id, department_id: departmentId, fullname, status: 'dang_lam_viec' },
    });
    return { ...user, employee_id: employee.employee_id };
  }
  actors = {
    manager: await makeActor('manager', 'project-manager-test', 'Quản lý test'),
    otherManager: await makeActor('manager', 'project-manager-other-test', 'Quản lý khác test'),
    employee: await makeActor('employee', 'project-employee-test', 'Nhân viên test'),
  };

  const app = express();
  app.use(express.json());
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
});

test('project permissions, task date bounds, lifecycle and concurrent status writes', async () => {
  await assertIsolatedTestDatabase(prisma);
  const employeeProject = await api(actors.employee, '/api/projects', {
    method: 'POST', body: { code: 'EMPLOYEE-TEST', name: 'Không được tạo', start_date: '2020-01-01', end_date: '2099-12-31' },
  });
  assert.equal(employeeProject.status, 403);

  const created = await createProject(actors.manager, 'PROJECT-TEST');
  assert.equal(created.status, 201);
  const project = await created.json();
  projectId = project.id;

  const deniedUpdate = await api(actors.otherManager, `/api/projects/${projectId}`, {
    method: 'PUT', body: { name: 'Không được sửa', start_date: '2020-01-01', end_date: '2099-12-31' },
  });
  assert.equal(deniedUpdate.status, 403);
  assert.equal((await api(actors.otherManager, `/api/projects/${projectId}`, { method: 'DELETE' })).status, 403);
  assert.equal((await prisma.projects.findUnique({ where: { id: projectId } })).name, project.name);

  const invalidBeforeStart = await api(actors.manager, `/api/projects/${projectId}/tasks`, {
    method: 'POST', body: taskBody('2019-12-31', 'Trước ngày bắt đầu'),
  });
  const invalidAfterEnd = await api(actors.manager, `/api/projects/${projectId}/tasks`, {
    method: 'POST', body: taskBody('2100-01-01', 'Sau ngày kết thúc'),
  });
  assert.equal(invalidBeforeStart.status, 400);
  assert.equal(invalidAfterEnd.status, 400);
  assert.equal(await prisma.tasks.count({ where: { project_id: projectId } }), 0, 'invalid create must not write a task');
  const unassignedMember = await api(actors.manager, `/api/projects/${projectId}/tasks`, {
    method: 'POST',
    body: { ...taskBody('2026-11-30'), assignee_id: actors.otherManager.employee_id },
  });
  assert.equal(unassignedMember.status, 400, 'task assignee must belong to the project');
  assert.equal(await prisma.tasks.count({ where: { project_id: projectId } }), 0);

  const taskResponse = await api(actors.manager, `/api/projects/${projectId}/tasks`, {
    method: 'POST', body: taskBody('2026-11-30'),
  });
  assert.equal(taskResponse.status, 201);
  const task = await taskResponse.json();
  taskId = task.id;

  const body = taskBody('2026-12-01', 'Task đã sửa');
  assert.equal((await api(actors.manager, `/api/tasks/${taskId}`, {
    method: 'PUT', body: { ...body, due_date: '2019-12-31' },
  })).status, 400);
  assert.equal((await api(actors.manager, `/api/tasks/${taskId}`, {
    method: 'PUT', body: { ...body, due_date: '2100-01-01' },
  })).status, 400);
  assert.equal((await prisma.tasks.findUnique({ where: { id: taskId } })).due_date.toISOString().slice(0, 10), '2026-11-30');
  const validUpdate = await api(actors.manager, `/api/tasks/${taskId}`, { method: 'PUT', body });
  assert.equal(validUpdate.status, 200);

  const invalidProjectStart = await api(actors.manager, `/api/projects/${projectId}`, {
    method: 'PUT', body: { name: project.name, start_date: '2026-12-02', end_date: '2099-12-31' },
  });
  const invalidProjectEnd = await api(actors.manager, `/api/projects/${projectId}`, {
    method: 'PUT', body: { name: project.name, start_date: '2020-01-01', end_date: '2026-11-30' },
  });
  assert.equal(invalidProjectStart.status, 409);
  assert.equal(invalidProjectEnd.status, 409);
  const unchangedProject = await prisma.projects.findUnique({ where: { id: projectId } });
  assert.equal(unchangedProject.start_date.toISOString().slice(0, 10), '2020-01-01');
  assert.equal(unchangedProject.end_date.toISOString().slice(0, 10), '2099-12-31');

  assert.equal((await api(actors.manager, `/api/projects/${projectId}/complete`, { method: 'POST' })).status, 409);
  const concurrentMoves = await Promise.all([
    api(actors.employee, `/api/tasks/${taskId}/status`, { method: 'PATCH', body: { status: 'dang_lam' } }),
    api(actors.employee, `/api/tasks/${taskId}/status`, { method: 'PATCH', body: { status: 'dang_lam' } }),
  ]);
  assert.deepEqual(concurrentMoves.map(response => response.status).sort(), [200, 409]);

  assert.equal((await api(actors.employee, `/api/tasks/${taskId}/status`, {
    method: 'PATCH', body: { status: 'xong' },
  })).status, 200);
  assert.equal((await api(actors.manager, `/api/projects/${projectId}/complete`, { method: 'POST' })).status, 200);
  assert.equal((await api(actors.manager, `/api/projects/${projectId}/tasks`, {
    method: 'POST', body: taskBody('2026-12-05', 'Task sau khi hoàn thành'),
  })).status, 409);
  assert.equal((await api(actors.manager, `/api/tasks/${taskId}`, { method: 'PUT', body })).status, 409);
});
