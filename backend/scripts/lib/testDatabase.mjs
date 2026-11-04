import { randomUUID } from 'node:crypto';
import pg from 'pg';

const testDatabasePattern = /^minierp_[a-z0-9]+(?:_[a-z0-9]+)*_test_[a-f0-9]{32}$/;

function testDatabaseUrl(adminUrl, databaseName) {
  const url = new URL(adminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function currentDatabase(connection) {
  const result = typeof connection.$queryRaw === 'function'
    ? await connection.$queryRaw`SELECT current_database() AS name`
    : (await connection.query('SELECT current_database() AS name')).rows;
  return result[0]?.name;
}

export async function assertIsolatedTestDatabase(connection, expectedName = process.env.TEST_DATABASE_NAME) {
  if (!expectedName || !testDatabasePattern.test(expectedName)) {
    throw new Error('Database test không có tên hợp lệ. Chỉ cho phép minierp_<suite>_test_<uuid>.');
  }
  const actualName = await currentDatabase(connection);
  if (actualName !== expectedName || !testDatabasePattern.test(actualName)) {
    throw new Error(`Từ chối ghi/xóa: đang kết nối database "${actualName}", mong đợi "${expectedName}".`);
  }
  return actualName;
}

export async function createTestDatabase(prefix) {
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(prefix)) throw new Error('Prefix database test không hợp lệ.');
  const adminUrl = process.env.TEST_ADMIN_DATABASE_URL;
  if (!adminUrl) throw new Error('Thiếu TEST_ADMIN_DATABASE_URL; test integration sẽ không dùng DATABASE_URL ứng dụng.');
  const parsedAdminUrl = new URL(adminUrl);
  const adminDatabase = parsedAdminUrl.pathname.replace(/^\//, '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsedAdminUrl.hostname)) {
    throw new Error('TEST_ADMIN_DATABASE_URL chỉ được trỏ PostgreSQL loopback để tránh ghi nhầm máy chủ dùng thật.');
  }
  if (!['postgres', 'template1'].includes(adminDatabase)) {
    throw new Error('TEST_ADMIN_DATABASE_URL phải kết nối database quản trị postgres/template1, không phải database ứng dụng.');
  }

  const name = `minierp_${prefix}_test_${randomUUID().replaceAll('-', '')}`;
  if (!testDatabasePattern.test(name)) throw new Error('Tên database test không vượt qua kiểm tra an toàn.');
  const admin = new pg.Pool({ connectionString: adminUrl });
  const url = testDatabaseUrl(adminUrl, name);
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    const probe = new pg.Pool({ connectionString: url, max: 1 });
    try {
      await assertIsolatedTestDatabase(probe, name);
    } finally {
      await probe.end();
    }
  } catch (error) {
    try {
      if (created && testDatabasePattern.test(name)) await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    } finally {
      await admin.end();
    }
    throw error;
  }

  let dropped = false;
  return {
    name,
    url,
    admin,
    async assertIsolated(connection) {
      return assertIsolatedTestDatabase(connection, name);
    },
    async assertIsolatedUrl() {
      const probe = new pg.Pool({ connectionString: url, max: 1 });
      try {
        return await assertIsolatedTestDatabase(probe, name);
      } finally {
        await probe.end();
      }
    },
    async drop() {
      if (dropped) return;
      try {
        if (!created || !testDatabasePattern.test(name)) throw new Error('Từ chối xóa database không được tạo bởi helper test.');
        const tracked = await admin.query('SELECT datname FROM pg_database WHERE datname = $1', [name]);
        if (tracked.rows[0]?.datname !== name) throw new Error('Không tìm thấy database test dự kiến để dọn dẹp.');
        for (let attempt = 0; attempt < 60; attempt += 1) {
          const active = await admin.query('SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname = $1', [name]);
          if (!active.rows[0].total) break;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
        dropped = true;
      } finally {
        await admin.end();
      }
    },
  };
}
