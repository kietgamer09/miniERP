import { randomBytes } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createTestDatabase } from './lib/testDatabase.mjs';

const execFile = promisify(execFileCallback);
const backendDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const prismaCli = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');
const jwtSecret = process.env.JWT_SECRET || randomBytes(48).toString('hex');
const chatKey = randomBytes(32).toString('base64');

async function runCommand(label, executable, args, env) {
  console.log(`\n> ${label}`);
  try {
    const result = await execFile(executable, args, { cwd: backendDir, env, maxBuffer: 8 * 1024 * 1024 });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    throw error;
  }
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
