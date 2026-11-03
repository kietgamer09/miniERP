import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { projectAttachmentPath } from '../src/utils/projectAttachments.js';

const schema = `
CREATE TYPE employee_status AS ENUM ('dang_lam_viec', 'da_nghi_viec');
CREATE TYPE project_status AS ENUM ('dang_thuc_hien', 'hoan_thanh');
CREATE TYPE task_priority AS ENUM ('thap', 'trung_binh', 'cao');
CREATE TYPE task_status AS ENUM ('can_lam', 'dang_lam', 'xong');
CREATE TABLE employees (
  employee_id integer PRIMARY KEY,
  user_id integer UNIQUE NOT NULL,
  department_id integer NOT NULL DEFAULT 1,
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
CREATE TABLE projects (
  id serial PRIMARY KEY,
  code varchar(20) UNIQUE NOT NULL,
  name varchar(200) NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status project_status NOT NULL DEFAULT 'dang_thuc_hien',
  manager_id integer NOT NULL REFERENCES employees(employee_id),
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE project_members (
  id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(employee_id),
  project_id integer NOT NULL REFERENCES projects(id),
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (project_id, employee_id)
);
CREATE TABLE tasks (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id),
  title varchar(200) NOT NULL,
  description text,
  assignee_id integer NOT NULL REFERENCES employees(employee_id),
  created_by integer NOT NULL REFERENCES employees(employee_id),
  due_date date NOT NULL,
  priority task_priority NOT NULL DEFAULT 'trung_binh',
  status task_status NOT NULL DEFAULT 'can_lam',
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE task_comments (
  id serial PRIMARY KEY,
  author_id integer NOT NULL REFERENCES employees(employee_id),
  task_id integer NOT NULL REFERENCES tasks(id),
  content text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE work_project_comments (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id integer NOT NULL REFERENCES employees(employee_id),
  content varchar(2000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE work_comment_reads (
  employee_id integer NOT NULL REFERENCES employees(employee_id),
  kind varchar(10) NOT NULL,
  comment_id integer NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, kind, comment_id)
);
CREATE TABLE project_delete_blockers (
  project_id integer NOT NULL REFERENCES projects(id)
);
`;

let database;
let databaseServer;
let httpServer;
let prisma;
let pool;
let deleteProject;
let createTaskComment;
let projectComments;
let updateTaskDetails;
let baseUrl;
const testAttachmentsRoot = path.join(tmpdir(), `miniERP-issue95-${randomUUID()}`);
const jwtSecret = 'issue-95-integration-test-secret';

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
}

async function invoke(handler, req) {
  const res = responseRecorder();
  await handler(req, res);
  return res;
}

async function createProject({ status = 'dang_thuc_hien', managerId = 1, code = 'ISSUE95' } = {}) {
  return prisma.projects.create({
    data: {
      code,
      name: `Dự án ${code}`,
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-12-31T00:00:00.000Z'),
      status,
      manager_id: managerId,
    },
  });
}

async function createTask(projectId) {
  return prisma.tasks.create({
    data: {
      project_id: projectId,
      title: 'Task kiểm thử',
      assignee_id: 2,
      created_by: 1,
      due_date: new Date('2026-11-20T00:00:00.000Z'),
      priority: 'trung_binh',
      status: 'can_lam',
    },
  });
}

before(async () => {
  process.env.MINIERP_TEST_ATTACHMENTS_ROOT = testAttachmentsRoot;
  await mkdir(testAttachmentsRoot, { recursive: true });
  database = await PGlite.create();
  await database.exec(schema);
  databaseServer = new PGLiteSocketServer({ db: database, port: 0, host: '127.0.0.1', maxConnections: 10 });
  await databaseServer.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@${databaseServer.getServerConn()}/postgres?sslmode=disable`;
  process.env.JWT_SECRET = jwtSecret;

  ({ default: prisma, pool } = await import('../src/config/prisma.js'));
  ({ deleteProject } = await import('../src/controllers/projectController.js'));
  ({ createTaskComment } = await import('../src/controllers/commentController.js'));
  ({ projectComments } = await import('../src/controllers/projectCommentController.js'));
  ({ updateTaskDetails } = await import('../src/controllers/taskDetailsController.js'));
  const attachmentRoutes = (await import('../src/routes/attachmentRoutes.js')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/attachments', attachmentRoutes);
  httpServer = createServer(app);
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

beforeEach(async () => {
  await database.exec('TRUNCATE project_delete_blockers, work_comment_reads, task_comments, work_project_comments, tasks, project_members, projects, employees RESTART IDENTITY CASCADE');
  await prisma.employees.createMany({
    data: [
      { employee_id: 1, user_id: 101, department_id: 1, fullname: 'Quản lý' },
      { employee_id: 2, user_id: 102, department_id: 1, fullname: 'Thành viên' },
      { employee_id: 3, user_id: 103, department_id: 1, fullname: 'Thành viên khác' },
    ],
  });
});

after(async () => {
  await new Promise((resolve) => httpServer?.close(resolve));
  await prisma?.$disconnect();
  await pool?.end();
  await databaseServer?.stop();
  await database?.close();
  await rm(testAttachmentsRoot, { recursive: true, force: true });
});

test('deleteProject commits DB removal then deletes only that project attachment folder', async () => {
  const project = await createProject();
  const unrelated = await createProject({ code: 'ISSUE95-OTHER' });
  const projectDir = projectAttachmentPath(project.id);
  const unrelatedDir = projectAttachmentPath(unrelated.id);
  await mkdir(projectDir, { recursive: true });
  await mkdir(unrelatedDir, { recursive: true });
  await writeFile(`${projectDir}/evidence.txt`, 'test file');
  await writeFile(`${unrelatedDir}/keep.txt`, 'keep');
  const comment = await prisma.work_project_comments.create({
    data: { project_id: project.id, author_id: 2, content: 'Ghi chú kiểm thử' },
  });
  await prisma.work_comment_reads.create({
    data: { employee_id: 1, kind: 'project', comment_id: comment.id },
  });

  const res = await invoke(deleteProject, {
    params: { id: String(project.id) },
    user: { role: 'manager' },
    employee: { employee_id: 1 },
  });

  assert.equal(res.statusCode, 204);
  assert.equal(await prisma.projects.findUnique({ where: { id: project.id } }), null);
  assert.equal(await prisma.work_project_comments.count({ where: { project_id: project.id } }), 0);
  assert.equal(await prisma.work_comment_reads.count({ where: { comment_id: comment.id } }), 0);
  await assert.rejects(readFile(`${projectDir}/evidence.txt`), { code: 'ENOENT' });
  assert.equal(await readFile(`${unrelatedDir}/keep.txt`, 'utf8'), 'keep');
  await rm(unrelatedDir, { recursive: true, force: true });
});

test('failed project deletion keeps DB data and attachments available for retry', async () => {
  const project = await createProject({ code: 'ISSUE95-TASK' });
  await createTask(project.id);
  const projectDir = projectAttachmentPath(project.id);
  await mkdir(projectDir, { recursive: true });
  await writeFile(`${projectDir}/keep.txt`, 'still attached');

  const res = await invoke(deleteProject, {
    params: { id: String(project.id) },
    user: { role: 'manager' },
    employee: { employee_id: 1 },
  });

  assert.equal(res.statusCode, 409);
  assert.ok(await prisma.projects.findUnique({ where: { id: project.id } }));
  assert.equal(await readFile(`${projectDir}/keep.txt`, 'utf8'), 'still attached');
  await rm(projectDir, { recursive: true, force: true });
});

test('database delete failure rolls back and leaves attachments available for retry', async () => {
  const project = await createProject({ code: 'ISSUE95-DB-FAIL' });
  await prisma.$executeRaw`INSERT INTO project_delete_blockers(project_id) VALUES (${project.id})`;
  const projectDir = projectAttachmentPath(project.id);
  await mkdir(projectDir, { recursive: true });
  await writeFile(`${projectDir}/keep.txt`, 'retry after DB error');

  const loggedErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => loggedErrors.push(args);
  let res;
  try {
    res = await invoke(deleteProject, {
      params: { id: String(project.id) },
      user: { role: 'manager' },
      employee: { employee_id: 1 },
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 409);
  assert.equal(loggedErrors.length, 1);
  assert.ok(await prisma.projects.findUnique({ where: { id: project.id } }));
  assert.equal(await readFile(`${projectDir}/keep.txt`, 'utf8'), 'retry after DB error');
  await rm(projectDir, { recursive: true, force: true });
});

test('completed project allows comments but blocks task edits and attachment uploads in API', async () => {
  const project = await createProject({ status: 'hoan_thanh', code: 'ISSUE95-DONE' });
  await prisma.project_members.create({ data: { project_id: project.id, employee_id: 2 } });
  const task = await createTask(project.id);

  const taskComment = await invoke(createTaskComment, {
    params: { id: String(task.id) },
    body: { content: 'Lưu ghi chú lịch sử trên task đã hoàn thành' },
    user: { role: 'employee' },
    employee: { employee_id: 2 },
  });
  const projectComment = await invoke(projectComments, {
    method: 'POST',
    params: { id: String(project.id) },
    body: { content: 'Lưu ghi chú lịch sử trên dự án đã hoàn thành' },
    user: { role: 'employee' },
    employee: { employee_id: 2 },
  });
  const taskEdit = await invoke(updateTaskDetails, {
    params: { id: String(task.id) },
    body: {
      title: 'Không được sửa', assignee_id: 2, due_date: '2026-11-20', priority: 'trung_binh',
    },
    user: { role: 'manager' },
    employee: { employee_id: 1 },
  });
  const token = jwt.sign({ user_id: 102, role: 'employee' }, jwtSecret);
  const attachmentList = await fetch(`${baseUrl}/api/attachments/projects/${project.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const attachmentData = await attachmentList.json();
  const upload = await fetch(`${baseUrl}/api/attachments/projects/${project.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'X-File-Name': 'blocked.txt' },
    body: Buffer.from('must not persist'),
  });

  assert.equal(taskComment.statusCode, 201);
  assert.equal(projectComment.statusCode, 201);
  assert.equal(taskEdit.statusCode, 409);
  assert.equal(attachmentList.status, 200);
  assert.equal(attachmentData.can_upload, false);
  assert.equal(upload.status, 403);
  assert.equal(await prisma.task_comments.count({ where: { task_id: task.id } }), 1);
  assert.equal(await prisma.work_project_comments.count({ where: { project_id: project.id } }), 1);
  assert.deepEqual(attachmentData.files, []);
});

test('removed project member cannot create a task or project comment', async () => {
  const project = await createProject({ code: 'ISSUE95-REMOVED' });
  await prisma.project_members.create({ data: { project_id: project.id, employee_id: 2 } });
  const task = await createTask(project.id);
  await prisma.project_members.delete({
    where: { project_id_employee_id: { project_id: project.id, employee_id: 2 } },
  });

  const taskComment = await invoke(createTaskComment, {
    params: { id: String(task.id) }, body: { content: 'No longer authorized' },
    user: { role: 'employee' }, employee: { employee_id: 2 },
  });
  const projectComment = await invoke(projectComments, {
    method: 'POST', params: { id: String(project.id) }, body: { content: 'No longer authorized' },
    user: { role: 'employee' }, employee: { employee_id: 2 },
  });

  assert.equal(taskComment.statusCode, 403);
  assert.equal(projectComment.statusCode, 403);
  assert.equal(await prisma.task_comments.count({ where: { task_id: task.id } }), 0);
  assert.equal(await prisma.work_project_comments.count({ where: { project_id: project.id } }), 0);
});
