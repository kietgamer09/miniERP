// Sửa đúng bộ dữ liệu mẫu đã kiểm tra; không xóa bản ghi hoặc đổi mật khẩu.
// Mặc định chỉ xem kế hoạch. Thêm --apply để lưu trong một giao dịch.
import 'dotenv/config';
import pg from 'pg';

const targets = [
  { username: 'admin', user_id: 7, employee_id: 1, role: 'admin' },
  { username: 'quan_ly', user_id: 8, employee_id: 2, role: 'manager' },
  { username: 'nhan_vien', user_id: 9, employee_id: 3, role: 'employee' },
];
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
  const changes = [];
  for (const target of targets) {
    const { rows } = await client.query(
      'SELECT u.user_id, u.username, u.role, e.employee_id, e.status FROM users u LEFT JOIN employees e ON e.user_id = u.user_id WHERE u.username = $1 ORDER BY u.user_id',
      [target.username],
    );
    const canonical = rows.find((row) => row.user_id === target.user_id);
    if (!canonical || canonical.employee_id !== target.employee_id || canonical.status !== 'dang_lam_viec') {
      throw new Error(`Hồ sơ ${target.username} khác dữ liệu đã kiểm tra; dừng để tránh sửa nhầm.`);
    }
    for (const row of rows) {
      if (row.user_id === target.user_id) continue;
      const renamed = `${target.username}_legacy_${row.user_id}`;
      const { rowCount } = await client.query('SELECT 1 FROM users WHERE username = $1', [renamed]);
      if (rowCount) throw new Error(`Tên ${renamed} đã tồn tại; dừng để tránh trùng mới.`);
      await client.query('UPDATE users SET username = $1 WHERE user_id = $2', [renamed, row.user_id]);
      changes.push({ user_id: row.user_id, old_username: row.username, new_username: renamed });
    }
    if (canonical.role !== target.role) {
      await client.query('UPDATE users SET role = $1 WHERE user_id = $2', [target.role, target.user_id]);
      changes.push({ user_id: target.user_id, old_role: canonical.role, new_role: target.role });
    }
  }
  const apply = process.argv.includes('--apply');
  await client.query(apply ? 'COMMIT' : 'ROLLBACK');
  console.log(JSON.stringify({ applied: apply, changes }, null, 2));
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
