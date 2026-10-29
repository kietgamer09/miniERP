import express from 'express';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import prisma from '../config/prisma.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';
import { parseId } from '../utils/validators.js';
import chatSecurityRoutes, { requireChatUnlock } from './chatSecurityRoutes.js';
import { decodeChatMessage, decryptChatBytes, decryptChatText, encryptChatBytes, encryptChatText } from '../services/chatCrypto.js';

const root = fileURLToPath(new URL('../../uploads/chat/', import.meta.url));
const extensions = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.docx', '.xlsx', '.pptx', '.txt', '.csv', '.zip']);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const router = express.Router();
router.use(verifyToken, attachEmployee);
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
router.use('/security', chatSecurityRoutes);
router.use(requireChatUnlock);

async function member(db, id, employeeId, lock = false) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT c.* FROM work_chats c JOIN work_chat_members m ON m.chat_id = c.id
    WHERE c.id = ${id} AND m.employee_id = ${employeeId} ${lock ? Prisma.sql`FOR UPDATE OF c` : Prisma.empty}`);
  if (!rows.length) fail(403, 'Bạn không thuộc cuộc trò chuyện này.');
  return rows[0];
}

router.param('id', (req, res, next, value) => {
  const id = parseId(value);
  if (!id) return res.status(400).json({ error: 'ID cuộc trò chuyện không hợp lệ.' });
  req.chatId = id;
  member(prisma, id, req.employee.employee_id).then(chat => { req.chat = chat; next(); }).catch(next);
});

function participantIds(values, self) {
  if (!Array.isArray(values) || !values.length || values.length > 49 || values.some(value => !parseId(value))) {
    fail(400, 'Chọn từ 1 đến 49 thành viên hợp lệ.');
  }
  const ids = [...new Set(values.map(Number))].filter(id => id !== self);
  if (!ids.length) fail(400, 'Hãy chọn người khác để trò chuyện.');
  return ids;
}

async function activePeople(db, ids) {
  const people = await db.employees.findMany({
    where: { employee_id: { in: ids }, status: 'dang_lam_viec' }, select: { employee_id: true },
  });
  if (people.length !== ids.length) fail(400, 'Có người không tồn tại hoặc đã nghỉ việc.');
}

router.get('/people', handle(async (req, res) => {
  const rows = await prisma.employees.findMany({
    where: { employee_id: { not: req.employee.employee_id }, status: 'dang_lam_viec' },
    select: { employee_id: true, fullname: true, departments: { select: { department_name: true } } },
    orderBy: [{ fullname: 'asc' }, { employee_id: 'asc' }],
  });
  res.json(rows.map(({ departments, ...person }) => ({ ...person, department_name: departments.department_name })));
}));

router.get('/conversations', handle(async (req, res) => {
  const self = req.employee.employee_id;
  const rows = await prisma.$queryRaw`
    SELECT c.*, latest.content AS last_content, latest.file_name AS last_file_name, latest.encryption_version,
      latest.created_at AS last_message_at,
      (SELECT count(*)::int FROM work_chat_messages t WHERE t.chat_id = c.id AND t.id > mine.last_read_message_id AND t.author_id <> ${self}) AS unread,
      (SELECT json_agg(json_build_object('employee_id', e.employee_id, 'fullname', e.fullname) ORDER BY e.employee_id)
       FROM work_chat_members m JOIN employees e ON e.employee_id = m.employee_id WHERE m.chat_id = c.id) AS members
    FROM work_chats c JOIN work_chat_members mine ON mine.chat_id = c.id AND mine.employee_id = ${self}
    LEFT JOIN LATERAL (SELECT content, file_name, encryption_version, created_at FROM work_chat_messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1) latest ON true
    ORDER BY c.updated_at DESC, c.id DESC`;
  res.json(rows.map(({ encryption_version, ...chat }) => {
    const last = chat.last_message_at ? decodeChatMessage({ chat_id: chat.id, content: chat.last_content, file_name: chat.last_file_name, encryption_version }) : null;
    return { ...chat, last_content: last?.content || null, last_file_name: last?.file_name || null,
      name: chat.kind === 'direct' ? chat.members.find(person => person.employee_id !== self)?.fullname || 'Nhân viên' : chat.name };
  }));
}));

router.post('/conversations', handle(async (req, res) => {
  const self = req.employee.employee_id;
  const { kind, name, employee_ids: values } = req.body || {};
  if (!['direct', 'group'].includes(kind)) fail(400, 'Loại cuộc trò chuyện không hợp lệ.');
  const ids = participantIds(values, self);
  if (kind === 'direct' && ids.length !== 1) fail(400, 'Chat riêng chỉ chọn một người.');
  if (kind === 'group' && (typeof name !== 'string' || !name.trim() || name.trim().length > 100)) fail(400, 'Tên nhóm cần từ 1 đến 100 ký tự.');
  const chat = await prisma.$transaction(async db => {
    await activePeople(db, ids);
    const key = kind === 'direct' ? [self, ids[0]].sort((a, b) => a - b).join(':') : null;
    const rows = await db.$queryRaw`
      INSERT INTO work_chats(kind, name, direct_key, owner_id) VALUES (${kind}, ${kind === 'group' ? name.trim() : null}, ${key}, ${self})
      ON CONFLICT (direct_key) DO UPDATE SET direct_key = EXCLUDED.direct_key RETURNING id`;
    const id = rows[0].id;
    for (const employeeId of [self, ...ids]) {
      await db.$executeRaw`INSERT INTO work_chat_members(chat_id, employee_id) VALUES (${id}, ${employeeId}) ON CONFLICT DO NOTHING`;
    }
    return { id };
  });
  res.status(201).json(chat);
}));

router.post('/conversations/:id/members', handle(async (req, res) => {
  const self = req.employee.employee_id;
  const ids = participantIds(req.body?.employee_ids, self);
  await prisma.$transaction(async db => {
    const chat = await member(db, req.chatId, self, true);
    if (chat.kind !== 'group' || chat.owner_id !== self) fail(403, 'Chỉ người tạo nhóm được thêm thành viên.');
    await activePeople(db, ids);
    const members = await db.$queryRaw`SELECT employee_id FROM work_chat_members WHERE chat_id = ${chat.id}`;
    if (new Set([...members.map(item => item.employee_id), ...ids]).size > 50) fail(400, 'Nhóm tối đa 50 người.');
    for (const employeeId of ids) {
      await db.$executeRaw`INSERT INTO work_chat_members(chat_id, employee_id) VALUES (${chat.id}, ${employeeId}) ON CONFLICT DO NOTHING`;
    }
  });
  res.sendStatus(204);
}));

router.get('/conversations/:id/messages', handle(async (req, res) => {
  const before = req.query.before ? parseId(req.query.before) : null;
  const after = req.query.after ? parseId(req.query.after) : null;
  if ((req.query.before && !before) || (req.query.after && !after) || (before && after)) fail(400, 'Mốc tin nhắn không hợp lệ.');
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT t.id, t.chat_id, t.author_id, e.fullname AS author_name, t.content, t.file_name, t.file_size, t.created_at, t.encryption_version
    FROM work_chat_messages t JOIN employees e ON e.employee_id = t.author_id
    WHERE t.chat_id = ${req.chatId}
      ${before ? Prisma.sql`AND t.id < ${before}` : Prisma.empty}
      ${after ? Prisma.sql`AND t.id > ${after}` : Prisma.empty}
    ORDER BY t.id ${after ? Prisma.sql`ASC` : Prisma.sql`DESC`} LIMIT 51`);
  const hasMore = rows.length > 50;
  const messages = rows.slice(0, 50).map(decodeChatMessage);
  res.json({ messages: after ? messages : messages.reverse(), has_more: hasMore });
}));

async function insertMessage(db, chatId, self, content, file = null) {
  await member(db, chatId, self, true);
  const rows = await db.$queryRaw`
    INSERT INTO work_chat_messages(chat_id, author_id, content, file_id, file_name, file_size, encryption_version)
    VALUES (${chatId}, ${self}, ${encryptChatText(content, `chat:${chatId}:content`)}, ${file?.id || null}::uuid,
      ${encryptChatText(file?.name || null, `chat:${chatId}:filename`)}, ${file?.size || null}, 1) RETURNING id`;
  await db.$executeRaw`UPDATE work_chats SET updated_at = now() WHERE id = ${chatId}`;
  if (content != null) await db.$executeRaw`DELETE FROM work_chat_drafts WHERE chat_id = ${chatId} AND employee_id = ${self}`;
  return rows[0];
}

router.get('/conversations/:id/draft', handle(async (req, res) => {
  const self = req.employee.employee_id;
  const [draft] = await prisma.$queryRaw`SELECT content FROM work_chat_drafts WHERE chat_id = ${req.chatId} AND employee_id = ${self}`;
  res.json({ content: draft ? decryptChatText(draft.content, `chat:${req.chatId}:draft:${self}`) : '' });
}));

router.put('/conversations/:id/draft', handle(async (req, res) => {
  const self = req.employee.employee_id;
  const content = req.body?.content;
  if (typeof content !== 'string' || content.length > 4000) fail(400, 'Bản nháp tối đa 4000 ký tự.');
  if (!content.trim()) await prisma.$executeRaw`DELETE FROM work_chat_drafts WHERE chat_id = ${req.chatId} AND employee_id = ${self}`;
  else await prisma.$executeRaw`INSERT INTO work_chat_drafts(chat_id, employee_id, content)
    VALUES (${req.chatId}, ${self}, ${encryptChatText(content, `chat:${req.chatId}:draft:${self}`)})
    ON CONFLICT (chat_id, employee_id) DO UPDATE SET content = EXCLUDED.content`;
  res.sendStatus(204);
}));

router.post('/conversations/:id/messages', handle(async (req, res) => {
  const content = req.body?.content;
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 4000) fail(400, 'Tin nhắn cần từ 1 đến 4000 ký tự.');
  const result = await prisma.$transaction(db => insertMessage(db, req.chatId, req.employee.employee_id, content.trim()));
  res.status(201).json(result);
}));

router.post('/conversations/:id/files', express.raw({ type: 'application/octet-stream', limit: '10mb' }), handle(async (req, res) => {
  let name;
  try { name = decodeURIComponent(req.get('X-File-Name') || '').normalize('NFC'); } catch { fail(400, 'Tên tệp không hợp lệ.'); }
  if (!name || name.length > 180 || /[\\/\x00-\x1f\x7f]/.test(name) || !extensions.has(path.extname(name).toLowerCase())) fail(400, 'Tên hoặc định dạng tệp chưa được hỗ trợ.');
  if (!Buffer.isBuffer(req.body) || !req.body.length) fail(400, 'Tệp rỗng hoặc dữ liệu tệp không hợp lệ.');
  const id = randomUUID();
  await mkdir(root, { recursive: true });
  const location = path.join(root, `${id}.enc`);
  await writeFile(location, encryptChatBytes(req.body, `chat:${req.chatId}:file:${id}`), { flag: 'wx' });
  try {
    const result = await prisma.$transaction(db => insertMessage(db, req.chatId, req.employee.employee_id, null, { id, name, size: req.body.length }));
    res.status(201).json(result);
  } catch (error) { await unlink(location).catch(() => {}); throw error; }
}));

router.get('/conversations/:id/files/:messageId', handle(async (req, res) => {
  const messageId = parseId(req.params.messageId);
  if (!messageId) fail(400, 'ID tin nhắn không hợp lệ.');
  const rows = await prisma.$queryRaw`SELECT file_id, file_name, encryption_version FROM work_chat_messages WHERE id = ${messageId} AND chat_id = ${req.chatId}`;
  const file = rows[0];
  if (!file?.file_id) fail(404, 'Không tìm thấy tệp.');
  if (file.encryption_version !== 1) fail(503, 'Tệp chưa chuyển sang mã hóa. Chạy npm run setup:chat.');
  const content = decryptChatBytes(await readFile(path.join(root, `${file.file_id}.enc`)), `chat:${req.chatId}:file:${file.file_id}`);
  const name = decryptChatText(file.file_name, `chat:${req.chatId}:filename`);
  res.set('X-Content-Type-Options', 'nosniff');
  res.attachment(name).send(content);
}));

router.patch('/conversations/:id/read', handle(async (req, res) => {
  const messageId = parseId(req.body?.message_id);
  if (!messageId) fail(400, 'ID tin nhắn không hợp lệ.');
  await prisma.$executeRaw`
    UPDATE work_chat_members SET last_read_message_id = greatest(last_read_message_id, ${messageId})
    WHERE chat_id = ${req.chatId} AND employee_id = ${req.employee.employee_id}
      AND EXISTS (SELECT 1 FROM work_chat_messages WHERE id = ${messageId} AND chat_id = ${req.chatId})`;
  res.sendStatus(204);
}));

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Mỗi tệp tối đa 10 MB.' });
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error('Chat error:', error.code || error.name);
  const missingTable = error.code === 'P2010' && error.meta?.code === '42P01';
  res.status(500).json({ error: missingTable ? 'Chat chưa được khởi tạo. Chạy npm run setup:chat trong backend.' : 'Không xử lý được cuộc trò chuyện. Vui lòng thử lại.' });
});

export default router;
