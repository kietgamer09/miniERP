import path from 'node:path';
import { lstat, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseId } from './validators.js';

const defaultAttachmentsRoot = path.resolve(fileURLToPath(new URL('../../uploads/attachments/', import.meta.url)));

export function getAttachmentsRoot() {
  return path.resolve(process.env.MINIERP_TEST_ATTACHMENTS_ROOT || defaultAttachmentsRoot);
}

function assertContained(parent, target) {
  const relative = path.relative(parent, target);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error('Đường dẫn attachment nằm ngoài thư mục cho phép');
  }
}

async function assertRealDirectory(directory) {
  try {
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Thư mục attachment không hợp lệ');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export function projectAttachmentPath(projectId) {
  const id = parseId(projectId);
  if (!id) throw new Error('ID dự án không hợp lệ');
  const projectsRoot = path.join(getAttachmentsRoot(), 'projects');
  const target = path.resolve(projectsRoot, String(id));
  assertContained(projectsRoot, target);
  return target;
}

export async function listProjectAttachmentDirectories() {
  const attachmentsRoot = getAttachmentsRoot();
  const projectsRoot = path.join(attachmentsRoot, 'projects');
  if (!await assertRealDirectory(attachmentsRoot)) return [];
  if (!await assertRealDirectory(projectsRoot)) return [];
  return (await readdir(projectsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => entry.name);
}

export async function removeProjectAttachmentDirectory(projectId) {
  const attachmentsRoot = getAttachmentsRoot();
  const projectsRoot = path.join(attachmentsRoot, 'projects');
  if (!await assertRealDirectory(attachmentsRoot)) return false;
  if (!await assertRealDirectory(projectsRoot)) return false;
  const target = projectAttachmentPath(projectId);
  if (!await assertRealDirectory(target)) return false;
  await rm(target, { recursive: true, force: true });
  return true;
}
