import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceDirs = ['src', 'scripts', 'tests'];
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(target);
    else if (/\.(?:js|mjs|cjs)$/.test(entry.name)) files.push(target);
  }
}

for (const directory of sourceDirs) await collect(path.join(root, directory));
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}
if (failed) process.exitCode = 1;
else console.log(`Syntax check passed for ${files.length} backend JavaScript files.`);
