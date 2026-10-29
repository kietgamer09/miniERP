import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let client;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query(await readFile(new URL('../prisma/sql/overtime.sql', import.meta.url), 'utf8'));
  await client.query('COMMIT');
  console.log('Đã chuẩn bị đơn làm thêm và thông báo duyệt. Dữ liệu hiện có được giữ nguyên.');
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Không chuẩn bị được làm thêm:', error.code || error.name);
  process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
