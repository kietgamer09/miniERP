import path from 'node:path';
import { lstat, readdir, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../uploads/attachments/', import.meta.url)));
const attachmentTypes = new Set(['tasks', 'projects', 'leaves', 'overtime']);

export function getAttachmentsRoot() {
  return path.resolve(process.env.MINIERP_TEST_ATTACHMENTS_ROOT || root);
}

function assertContained(parent, target) {
  const relative = path.relative(parent, target);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error('INVALID_ATTACHMENT_PATH');
  }
}

async function isRealDirectory(directory) {
  try {
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('INVALID_ATTACHMENT_PATH');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export function attachmentDir(type, id) {
  if (!attachmentTypes.has(type) || !Number.isSafeInteger(id) || id < 1) {
    throw new Error('INVALID_ATTACHMENT_PATH');
  }
  const attachmentsRoot = getAttachmentsRoot();
  const directory = path.resolve(attachmentsRoot, type, String(id));
  assertContained(attachmentsRoot, directory);
  return directory;
}

export function projectAttachmentPath(projectId) {
  if (typeof projectId === 'string' && /^[1-9]\d*$/.test(projectId)) projectId = Number(projectId);
  return attachmentDir('projects', projectId);
}

export async function removeAttachmentDir(type, id) {
  const directory = attachmentDir(type, id);
  const parent = path.dirname(directory);
  const attachmentsRoot = getAttachmentsRoot();
  if (!await isRealDirectory(attachmentsRoot) || !await isRealDirectory(parent)) return false;
  if (!await isRealDirectory(directory)) return false;
  const trash = `${directory}.deleted-${Date.now()}-${randomUUID()}`;
  assertContained(parent, trash);
  try {
    await rename(directory, trash);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  await rm(trash, { recursive: true, force: true });
  return true;
}

export async function listAttachmentDirectories() {
  const attachmentsRoot = getAttachmentsRoot();
  if (!await isRealDirectory(attachmentsRoot)) return [];
  const entries = [];
  for (const type of attachmentTypes) {
    const parent = path.join(attachmentsRoot, type);
    if (!await isRealDirectory(parent)) continue;
    for (const entry of await readdir(parent, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const normal = /^([1-9]\d*)$/.exec(entry.name);
      const deleted = /^([1-9]\d*)\.deleted-\d+(?:-[0-9a-f-]{36})?$/i.exec(entry.name);
      const match = normal || deleted;
      if (!match) continue;
      const id = Number(match[1]);
      if (!Number.isSafeInteger(id)) continue;
      entries.push({ type, name: entry.name, id, quarantined: Boolean(deleted) });
    }
  }
  return entries;
}

export async function removeAttachmentDirectoryEntry(type, name, id, quarantined) {
  if (!attachmentTypes.has(type) || !Number.isSafeInteger(id) || id < 1) throw new Error('INVALID_ATTACHMENT_PATH');
  const expected = quarantined
    ? new RegExp(`^${id}\\.deleted-\\d+(?:-[0-9a-f-]{36})?$`, 'i')
    : new RegExp(`^${id}$`);
  if (!expected.test(name)) throw new Error('INVALID_ATTACHMENT_PATH');
  if (!quarantined) return removeAttachmentDir(type, id);
  const attachmentsRoot = getAttachmentsRoot();
  const parent = path.resolve(attachmentsRoot, type);
  const directory = path.resolve(parent, name);
  assertContained(parent, directory);
  if (!await isRealDirectory(attachmentsRoot) || !await isRealDirectory(parent) || !await isRealDirectory(directory)) return false;
  await rm(directory, { recursive: true, force: true });
  return true;
}
