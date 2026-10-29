import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(await readFile(new URL('../prisma/sql/comment-notifications.sql', import.meta.url), 'utf8'));
  await client.query('COMMIT');
  console.log('Đã chuẩn bị thảo luận dự án và trạng thái đọc thông báo. Dữ liệu hiện có được giữ nguyên.');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Không chuẩn bị được thông báo:', error.code || error.name);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
