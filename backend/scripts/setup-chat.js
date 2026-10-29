import 'dotenv/config';
import { appendFile, readFile, writeFile, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { chatKey, decodeChatMessage, decryptChatText, encryptChatBytes, decryptChatBytes, encryptChatText } from '../src/services/chatCrypto.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let client;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query(await readFile(new URL('../prisma/sql/chat.sql', import.meta.url), 'utf8'));
  if (!process.env.CHAT_ENCRYPTION_KEY) {
    const existing = await client.query('SELECT ((SELECT count(*) FROM work_chat_messages WHERE encryption_version = 1) + (SELECT count(*) FROM work_chat_drafts))::int AS total');
    if (existing.rows[0].total) throw new Error('MISSING_EXISTING_CHAT_KEY');
    const key = randomBytes(32).toString('base64');
    await appendFile(new URL('../.env', import.meta.url), `\nCHAT_ENCRYPTION_KEY=${key}\n`, { mode: 0o600 });
    process.env.CHAT_ENCRYPTION_KEY = key;
  }
  chatKey();
  const encrypted = await client.query('SELECT chat_id, content, file_name, encryption_version FROM work_chat_messages WHERE encryption_version = 1');
  for (const row of encrypted.rows) decodeChatMessage(row);
  const drafts = await client.query('SELECT chat_id, employee_id, content FROM work_chat_drafts');
  for (const row of drafts.rows) decryptChatText(row.content, `chat:${row.chat_id}:draft:${row.employee_id}`);
  const legacy = await client.query('SELECT id, chat_id, content, file_id, file_name FROM work_chat_messages WHERE encryption_version = 0 FOR UPDATE');
  for (const row of legacy.rows) {
    if (row.file_id) {
      const plain = await readFile(new URL(`../uploads/chat/${row.file_id}.bin`, import.meta.url));
      const encryptedPath = new URL(`../uploads/chat/${row.file_id}.enc`, import.meta.url);
      const context = `chat:${row.chat_id}:file:${row.file_id}`;
      try { await writeFile(encryptedPath, encryptChatBytes(plain, context), { flag: 'wx' }); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (!decryptChatBytes(await readFile(encryptedPath), context).equals(plain)) throw new Error('CHAT_FILE_MISMATCH');
      }
    }
    await client.query('UPDATE work_chat_messages SET content = $1, file_name = $2, encryption_version = 1 WHERE id = $3', [
      encryptChatText(row.content, `chat:${row.chat_id}:content`), encryptChatText(row.file_name, `chat:${row.chat_id}:filename`), row.id,
    ]);
  }
  await client.query('COMMIT');
  const files = await client.query('SELECT chat_id, file_id FROM work_chat_messages WHERE encryption_version = 1 AND file_id IS NOT NULL');
  for (const row of files.rows) {
    decryptChatBytes(await readFile(new URL(`../uploads/chat/${row.file_id}.enc`, import.meta.url)), `chat:${row.chat_id}:file:${row.file_id}`);
    await unlink(new URL(`../uploads/chat/${row.file_id}.bin`, import.meta.url)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  console.log(`Đã chuẩn bị khóa chat theo ngày và mã hóa ${legacy.rows.length} tin nhắn cũ. Giữ an toàn CHAT_ENCRYPTION_KEY trong backend/.env, rồi khởi động lại backend.`);
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Không chuẩn bị được chat:', error.code || error.message);
  process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
