import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import prisma from '../src/config/prisma.js';
import chatRoutes from '../src/routes/chatRoutes.js';
import { chatDay, validChatGrant } from '../src/routes/chatSecurityRoutes.js';
import { chatSigningKey, decryptChatBytes, encryptChatBytes, encryptChatText } from '../src/services/chatCrypto.js';

test('chat stores messages/files and enforces conversation membership', async t => {
  const users = [], people = [];
  let server;
  try {
    const department = await prisma.departments.findFirst({ select: { department_id: true } });
    assert.ok(department, 'Cần một phòng ban có sẵn để tạo hồ sơ kiểm thử tạm.');
    const password = 'Chat-test-only-12345';
    const passwordHash = await bcrypt.hash(password, 4);
    for (let i = 0; i < 3; i++) {
      const user = await prisma.users.create({ data: { username: `chat-test-${randomUUID()}`, password: passwordHash, role: i === 2 ? 'admin' : 'employee' } });
      users.push(user.user_id);
      const person = await prisma.employees.create({ data: { user_id: user.user_id, department_id: department.department_id, fullname: `Kiểm thử chat ${i}`, status: 'dang_lam_viec' } });
      people.push(person.employee_id);
    }
    const app = express();
    app.use(express.json()); app.use('/api/chat', chatRoutes);
    server = await new Promise((resolve, reject) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); instance.once('error', reject);
    });
    const url = `http://127.0.0.1:${server.address().port}/api/chat`;
    const tokens = users.map((id, index) => jwt.sign({ user_id: id, role: index === 2 ? 'admin' : 'employee' }, process.env.JWT_SECRET || 'mini_erp_super_secret_key_2026', { expiresIn: '2d' }));
    const grants = [];
    async function api(index, path, { method = 'GET', body, file, name = 'bien-ban.txt', unlock = grants[index], auth = tokens[index] } = {}) {
      return fetch(`${url}${path}`, { method, headers: {
        Authorization: `Bearer ${auth}`,
        ...(unlock ? { 'X-Chat-Unlock': unlock } : {}),
        'Content-Type': file ? 'application/octet-stream' : 'application/json',
        ...(file ? { 'X-File-Name': encodeURIComponent(name) } : {}),
      }, ...(file ? { body: file } : body === undefined ? {} : { body: JSON.stringify(body) }) });
    }
    let directId, groupId, messageId, fileMessageId;
    await t.test('requires daily reauthentication and binds unlock to the account and login session', async () => {
      assert.equal((await api(0, '/conversations')).status, 423);
      assert.equal((await api(0, '/people')).status, 423);
      assert.equal((await (await api(0, '/security')).json()).has_pin, false);
      for (let i = 0; i < 3; i++) {
        const response = await api(i, '/security/unlock', { method: 'POST', body: { method: 'password', credential: password } });
        assert.equal(response.status, 200);
        const session = await response.json(); grants[i] = session.token;
        assert.equal(Date.parse(session.expires_at), chatDay().expires * 1000);
      }
      assert.equal((await api(1, '/conversations', { unlock: grants[0] })).status, 423);
      const otherLogin = jwt.sign({ user_id: users[0], role: 'employee', nonce: randomUUID() }, process.env.JWT_SECRET || 'mini_erp_super_secret_key_2026', { expiresIn: '1d' });
      assert.equal((await api(0, '/conversations', { auth: otherLogin })).status, 423);
      const decoded = jwt.decode(grants[0]);
      const expired = jwt.sign({ ...decoded, exp: Math.floor(Date.now() / 1000) - 1 }, chatSigningKey(), { algorithm: 'HS256' });
      assert.equal((await api(0, '/conversations', { unlock: expired })).status, 423);
      const yesterday = chatDay(new Date(Date.now() - 86400000)).day;
      const oldDay = jwt.sign({ ...decoded, day: yesterday }, chatSigningKey(), { algorithm: 'HS256' });
      assert.equal((await api(0, '/conversations', { unlock: oldDay })).status, 423);
      const req = { user: { user_id: users[0] }, employee: { employee_id: people[0] }, get: name => name === 'Authorization' ? `Bearer ${tokens[0]}` : grants[0] };
      assert.ok(validChatGrant(req, 0, new Date(decoded.exp * 1000 - 1000)));
      assert.equal(validChatGrant(req, 0, new Date(decoded.exp * 1000)), null);
      assert.equal(chatDay(new Date('2026-10-29T16:59:59Z')).day, '2026-10-29');
      assert.equal(chatDay(new Date('2026-10-29T17:00:00Z')).day, '2026-10-30');
    });
    await t.test('sets and resets a hashed PIN only after verifying the account password', async () => {
      const original = grants[0];
      const wrong = await api(0, '/security/pin', { method: 'PUT', body: { method: 'password', credential: 'wrong', pin: '123456' } });
      assert.equal(wrong.status, 403);
      const set = await api(0, '/security/pin', { method: 'PUT', body: { method: 'password', credential: password, pin: '123456' } });
      assert.equal(set.status, 200); grants[0] = (await set.json()).token;
      assert.equal((await api(0, '/conversations', { unlock: original })).status, 423);
      const [security] = await prisma.$queryRaw`SELECT pin_hash FROM work_chat_security WHERE employee_id = ${people[0]}`;
      assert.notEqual(security.pin_hash, '123456'); assert.ok(await bcrypt.compare('123456', security.pin_hash));
      const pin = await api(0, '/security/unlock', { method: 'POST', body: { method: 'pin', credential: '123456' } });
      assert.equal(pin.status, 200); grants[0] = (await pin.json()).token;
      assert.equal((await (await api(0, '/security')).json()).has_pin, true);
      const oldGrant = grants[0];
      const reset = await api(0, '/security/pin', { method: 'PUT', body: { method: 'password', credential: password, pin: '789012' } });
      assert.equal(reset.status, 200); grants[0] = (await reset.json()).token;
      assert.equal((await api(0, '/people', { unlock: oldGrant })).status, 423);
      assert.equal((await api(0, '/security/unlock', { method: 'POST', body: { method: 'pin', credential: '123456' } })).status, 403);
      const newPin = await api(0, '/security/unlock', { method: 'POST', body: { method: 'pin', credential: '789012' } });
      assert.equal(newPin.status, 200); grants[0] = (await newPin.json()).token;
      const fallback = await api(0, '/security/unlock', { method: 'POST', body: { method: 'password', credential: password } });
      assert.equal(fallback.status, 200); grants[0] = (await fallback.json()).token;
    });
    await t.test('requires login and reuses the same direct conversation', async () => {
      assert.equal((await fetch(`${url}/conversations`)).status, 401);
      const first = await api(0, '/conversations', { method: 'POST', body: { kind: 'direct', employee_ids: [people[1]] } });
      assert.equal(first.status, 201); directId = (await first.json()).id;
      const second = await api(1, '/conversations', { method: 'POST', body: { kind: 'direct', employee_ids: [people[0]] } });
      assert.equal((await second.json()).id, directId);
      assert.equal((await api(2, `/conversations/${directId}/messages`)).status, 403);
      assert.equal((await api(0, `/conversations/${directId}/messages`, { unlock: null })).status, 423);
      assert.equal((await api(0, `/conversations/${directId}/messages`, { method: 'POST', unlock: null, body: { content: 'Không được gửi khi chưa mở khóa' } })).status, 423);
    });
    await t.test('persists messages, counts unread separately and marks only valid messages read', async () => {
      const sent = await api(0, `/conversations/${directId}/messages`, { method: 'POST', body: { content: 'Tin nhắn kiểm thử riêng biệt' } });
      assert.equal(sent.status, 201); messageId = (await sent.json()).id;
      const feed = await (await api(1, `/conversations/${directId}/messages`)).json();
      assert.equal(feed.messages[0].content, 'Tin nhắn kiểm thử riêng biệt');
      assert.equal(feed.messages[0].author_id, people[0]);
      const [stored] = await prisma.$queryRaw`SELECT content, encryption_version FROM work_chat_messages WHERE id = ${messageId}`;
      assert.equal(stored.encryption_version, 1); assert.notEqual(stored.content, feed.messages[0].content);
      const list = await (await api(1, '/conversations')).json();
      assert.equal(list.find(chat => chat.id === directId).unread, 1);
      assert.equal((await (await api(0, '/conversations')).json()).find(chat => chat.id === directId).unread, 0);
      await api(1, `/conversations/${directId}/read`, { method: 'PATCH', body: { message_id: messageId } });
      assert.equal((await (await api(1, '/conversations')).json()).find(chat => chat.id === directId).unread, 0);
      assert.equal((await api(0, `/conversations/${directId}/messages`, { method: 'POST', body: { content: ' ' } })).status, 400);
      assert.equal((await api(0, `/conversations/${directId}/messages`, { method: 'POST', body: { content: 'x'.repeat(4001) } })).status, 400);
    });
    await t.test('creates groups and only the group owner can add people', async () => {
      const response = await api(0, '/conversations', { method: 'POST', body: { kind: 'group', name: 'Nhóm kiểm thử tạm', employee_ids: [people[1]] } });
      assert.equal(response.status, 201); groupId = (await response.json()).id;
      assert.equal((await api(1, `/conversations/${groupId}/members`, { method: 'POST', body: { employee_ids: [people[2]] } })).status, 403);
      assert.equal((await api(2, `/conversations/${groupId}/messages`, { method: 'POST', body: { content: 'Không được phép' } })).status, 403);
      assert.equal((await api(0, `/conversations/${groupId}/members`, { method: 'POST', body: { employee_ids: [people[2]] } })).status, 204);
      assert.equal((await api(2, `/conversations/${groupId}/messages`)).status, 200);
    });
    await t.test('round trips attachments and refuses downloads outside the conversation', async () => {
      const file = Buffer.from('Tệp chỉ dành cho tài khoản kiểm thử.');
      const upload = await api(0, `/conversations/${directId}/files`, { method: 'POST', file });
      assert.equal(upload.status, 201); fileMessageId = (await upload.json()).id;
      const [stored] = await prisma.$queryRaw`SELECT file_id, file_name FROM work_chat_messages WHERE id = ${fileMessageId}`;
      assert.notEqual(stored.file_name, 'bien-ban.txt');
      const encrypted = await readFile(new URL(`../uploads/chat/${stored.file_id}.enc`, import.meta.url));
      assert.equal(encrypted.includes(file), false);
      assert.deepEqual(decryptChatBytes(encrypted, `chat:${directId}:file:${stored.file_id}`), file);
      assert.equal((await api(1, `/conversations/${directId}/files/${fileMessageId}`, { unlock: null })).status, 423);
      const response = await api(1, `/conversations/${directId}/files/${fileMessageId}`);
      assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), file);
      assert.equal((await api(2, `/conversations/${directId}/files/${fileMessageId}`)).status, 403);
      assert.equal((await api(0, `/conversations/${groupId}/files/${fileMessageId}`)).status, 404);
      assert.equal((await api(0, `/conversations/${directId}/files`, { method: 'POST', file, name: '../bi-mat.txt' })).status, 400);
      assert.equal((await api(0, `/conversations/${directId}/files`, { method: 'POST', file, name: 'chuong-trinh.exe' })).status, 400);
    });
    await t.test('paginates old and new messages without crossing chat boundaries', async () => {
      const values = Array.from({ length: 55 }, (_, n) => Prisma.sql`(${groupId}, ${people[0]}, ${encryptChatText(`Tin phân trang ${n}`, `chat:${groupId}:content`)}, 1)`);
      await prisma.$executeRaw(Prisma.sql`INSERT INTO work_chat_messages(chat_id, author_id, content, encryption_version) VALUES ${Prisma.join(values)}`);
      const latest = await (await api(1, `/conversations/${groupId}/messages`)).json();
      assert.equal(latest.messages.length, 50); assert.equal(latest.has_more, true);
      assert.ok(latest.messages.every((row, index, rows) => row.chat_id === groupId && (!index || row.id > rows[index - 1].id)));
      const older = await (await api(1, `/conversations/${groupId}/messages?before=${latest.messages[0].id}`)).json();
      assert.equal(older.messages.length, 5); assert.equal(older.has_more, false);
      const newer = await (await api(1, `/conversations/${groupId}/messages?after=${older.messages.at(-1).id}`)).json();
      assert.equal(newer.messages.length, 50);
      await api(1, `/conversations/${groupId}/read`, { method: 'PATCH', body: { message_id: fileMessageId } });
      assert.equal((await (await api(1, '/conversations')).json()).find(chat => chat.id === groupId).unread, 55);
    });
    await t.test('stores drafts encrypted per employee and removes the sent draft', async () => {
      const content = 'Nháp chat riêng chưa gửi';
      assert.equal((await api(0, `/conversations/${groupId}/draft`, { method: 'PUT', body: { content } })).status, 204);
      assert.equal((await (await api(0, `/conversations/${groupId}/draft`)).json()).content, content);
      assert.equal((await (await api(1, `/conversations/${groupId}/draft`)).json()).content, '');
      const [draft] = await prisma.$queryRaw`SELECT content FROM work_chat_drafts WHERE chat_id = ${groupId} AND employee_id = ${people[0]}`;
      assert.notEqual(draft.content, content);
      await api(0, `/conversations/${groupId}/messages`, { method: 'POST', body: { content } });
      assert.equal((await (await api(0, `/conversations/${groupId}/draft`)).json()).content, '');
    });
    await t.test('migrates legacy text/files safely and is repeatable', async () => {
      const id = randomUUID();
      const plain = Buffer.from('Nội dung tệp cũ để chuyển mã hóa');
      const oldFile = new URL(`../uploads/chat/${id}.bin`, import.meta.url);
      await writeFile(oldFile, plain);
      const [legacy] = await prisma.$queryRaw`INSERT INTO work_chat_messages(chat_id, author_id, content, file_id, file_name, file_size)
        VALUES (${groupId}, ${people[0]}, 'Tin cũ', ${id}::uuid, 'tep-cu.txt', ${plain.length}) RETURNING id`;
      const exec = promisify(execFile);
      await exec(process.execPath, ['scripts/setup-chat.js'], { cwd: new URL('..', import.meta.url) });
      await exec(process.execPath, ['scripts/setup-chat.js'], { cwd: new URL('..', import.meta.url) });
      const feed = await (await api(0, `/conversations/${groupId}/messages?after=${legacy.id - 1}`)).json();
      assert.equal(feed.messages[0].content, 'Tin cũ'); assert.equal(feed.messages[0].file_name, 'tep-cu.txt');
      const downloaded = await api(1, `/conversations/${groupId}/files/${legacy.id}`);
      assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), plain);
      await assert.rejects(readFile(oldFile), { code: 'ENOENT' });
    });
    await t.test('detects ciphertext tampering and limits PIN/password guessing across sessions', async () => {
      const sealed = encryptChatBytes(Buffer.from('riêng tư'), 'test-context');
      assert.notDeepEqual(sealed, encryptChatBytes(Buffer.from('riêng tư'), 'test-context'));
      assert.throws(() => decryptChatBytes(sealed, 'different-context'));
      sealed[sealed.length - 1] ^= 1;
      assert.throws(() => decryptChatBytes(sealed, 'test-context'));
      for (let i = 0; i < 5; i++) {
        const response = await api(2, '/security/unlock', { method: 'POST', body: { method: 'password', credential: 'wrong-password' } });
        assert.equal(response.status, i === 4 ? 429 : 403);
      }
      assert.equal((await api(2, '/security/unlock', { method: 'POST', body: { method: 'password', credential: password } })).status, 429);
      await prisma.$executeRaw`UPDATE work_chat_security SET blocked_until = now() - interval '1 second' WHERE employee_id = ${people[2]}`;
      assert.equal((await api(2, '/security/unlock', { method: 'POST', body: { method: 'password', credential: password } })).status, 200);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (people.length) {
      const ids = Prisma.join(people);
      const files = await prisma.$queryRaw(Prisma.sql`SELECT file_id FROM work_chat_messages WHERE author_id IN (${ids}) AND file_id IS NOT NULL`);
      await prisma.$executeRaw(Prisma.sql`DELETE FROM work_chats WHERE owner_id IN (${ids})`);
      for (const file of files) {
        await unlink(new URL(`../uploads/chat/${file.file_id}.bin`, import.meta.url)).catch(() => {});
        await unlink(new URL(`../uploads/chat/${file.file_id}.enc`, import.meta.url)).catch(() => {});
      }
      await prisma.employees.deleteMany({ where: { employee_id: { in: people } } });
    }
    if (users.length) await prisma.users.deleteMany({ where: { user_id: { in: users } } });
    await prisma.$disconnect();
  }
});
