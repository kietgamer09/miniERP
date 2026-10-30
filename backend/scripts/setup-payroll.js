import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let client;
try {
  const sql = await readFile(new URL('../prisma/sql/payrolls.sql', import.meta.url), 'utf8');
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log('Đã chuẩn bị bảng payrolls. Có thể chạy lại lệnh này; dữ liệu bảng hiện có được giữ nguyên.');
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Không chuẩn bị được bảng payrolls:', error.code || error.name);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
