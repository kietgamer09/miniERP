import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcrypt';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let client;

try {
  const sql = await readFile(new URL('../prisma/sql/auth.sql', import.meta.url), 'utf8');
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query(sql);

  const users = await client.query(
    'SELECT user_id, password FROM users WHERE password IS NOT NULL AND must_change_password = FALSE',
  );
  const checkedHashes = new Map();
  const legacyUserIds = [];
  for (const user of users.rows) {
    if (!checkedHashes.has(user.password)) {
      let isLegacyPassword = user.password === '12345';
      if (!isLegacyPassword) {
        try { isLegacyPassword = await bcrypt.compare('12345', user.password); } catch { isLegacyPassword = false; }
      }
      checkedHashes.set(user.password, isLegacyPassword);
    }
    if (checkedHashes.get(user.password)) legacyUserIds.push(user.user_id);
  }

  if (legacyUserIds.length) {
    await client.query(
      `UPDATE users
       SET must_change_password = TRUE,
           temp_password_expires_at = COALESCE(temp_password_expires_at, NOW() + INTERVAL '30 days')
       WHERE user_id = ANY($1::int[])`,
      [legacyUserIds],
    );
  }
  await client.query(
    `UPDATE users SET temp_password_expires_at = NOW() + INTERVAL '30 days'
     WHERE must_change_password = TRUE AND temp_password_expires_at IS NULL`,
  );
  await client.query('COMMIT');
  console.log(`Auth schema is ready. ${legacyUserIds.length} legacy default-password account(s) must change their password within 30 days.`);
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Could not prepare auth schema:', error.code || error.name);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
