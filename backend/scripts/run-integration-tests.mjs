import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createTestDatabase } from './lib/testDatabase.mjs';

const backendDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const prismaCli = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');
const jwtSecret = process.env.JWT_SECRET || randomBytes(48).toString('hex');
const chatKey = randomBytes(32).toString('base64');
const commandTimeoutMs = 10 * 60 * 1000;

async function runCommand(label, executable, args, env) {
  console.log(`\n> ${label}`);
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: backendDir, env, stdio: 'inherit', windowsHide: true });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Timeout sau 10 phút: ${label}`));
    }, commandTimeoutMs);

    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`${label} thất bại (exit ${code ?? signal}).`));
    });
  });
}

async function prepareSchemaSuite(prefix, suiteEnv = {}) {
  const testDb = await createTestDatabase(prefix);
  const env = {
    ...process.env,
    ...suiteEnv,
    DATABASE_URL: testDb.url,
    TEST_DATABASE_NAME: testDb.name,
    JWT_SECRET: jwtSecret,
  };
  try {
    await testDb.assertIsolatedUrl();
    await runCommand(`${prefix}: prisma db push trên database cô lập ${testDb.name}`, process.execPath,
      [prismaCli, 'db', 'push'], env);
    return { testDb, env };
  } catch (error) {
    await testDb.drop();
    throw error;
  }
}

async function runSchemaSuite(prefix, testArgs, suiteEnv = {}, beforeTest) {
  const { testDb, env } = await prepareSchemaSuite(prefix, suiteEnv);
  try {
    await testDb.assertIsolatedUrl();
    if (beforeTest) await beforeTest(env, testDb);
    await runCommand(`${prefix}: integration test`, process.execPath, testArgs, env);
  } finally {
    await testDb.drop();
  }
}

async function main() {
  await runCommand('issue95 attachment/comment integration: PGlite isolated in-memory suite', process.execPath,
    ['--test', 'tests/issue95.integration.test.js'], {
      ...process.env,
      JWT_SECRET: jwtSecret,
    });

  if (!process.env.TEST_ADMIN_DATABASE_URL) {
    throw new Error('Thiếu TEST_ADMIN_DATABASE_URL. Integration tests chỉ chạy trên DB test riêng; không dùng DATABASE_URL ứng dụng.');
  }

  await runSchemaSuite('project_task', ['--test', 'tests/project-task.integration.test.js']);
  await runCommand('auth integration: PGlite isolated in-memory suite', process.execPath,
    ['--test', 'tests/auth.integration.test.js'], {
      ...process.env,
      JWT_SECRET: jwtSecret,
    });
  await runSchemaSuite('chat', ['--test', 'scripts/check-chat-contract.mjs'], { CHAT_ENCRYPTION_KEY: chatKey }, async (env, testDb) => {
    await testDb.assertIsolatedUrl();
    const fixture = new pg.Pool({ connectionString: env.DATABASE_URL });
    try {
      await testDb.assertIsolated(fixture);
      await fixture.query("INSERT INTO departments (department_id, department_name) VALUES (99001, 'Phòng test chat')");
    } finally {
      await fixture.end();
    }
    await runCommand('chat: setup trên database test', process.execPath, ['scripts/setup-chat.js'], env);
  });

  for (const script of [
    'scripts/check-profile-contract.mjs',
    'scripts/check-overtime-contract.mjs',
    'scripts/check-explanation-review.mjs',
  ]) {
    await runCommand(script, process.execPath, ['--experimental-vm-modules', '--test', script], {
      ...process.env,
      JWT_SECRET: jwtSecret,
      TEST_ADMIN_DATABASE_URL: process.env.TEST_ADMIN_DATABASE_URL,
    });
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
