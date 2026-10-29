import 'dotenv/config';
import { readFile, appendFile } from 'node:fs/promises';
import pg from 'pg';
import webpush from 'web-push';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let client;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  for (const name of ['comment-notifications.sql', 'web-push.sql']) {
    await client.query(await readFile(new URL(`../prisma/sql/${name}`, import.meta.url), 'utf8'));
  }
  await client.query('COMMIT');
  if (!process.env.VAPID_PUBLIC_KEY && !process.env.VAPID_PRIVATE_KEY) {
    const keys = webpush.generateVAPIDKeys();
    await appendFile(new URL('../.env', import.meta.url), `\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`);
    console.log('Đã tạo khóa VAPID trong backend/.env (không in khóa ra log).');
  } else if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) throw new Error('VAPID_CONFIG');
  console.log('Đã chuẩn bị Web Push. Khởi động lại backend; giữ nguyên cặp khóa khi triển khai/chuyển máy.');
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Không chuẩn bị được Web Push:', error.code || error.message || error.name);
  process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
