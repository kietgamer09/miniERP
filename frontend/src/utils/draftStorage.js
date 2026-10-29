const PREFIX = 'miniErpDraft:v1:';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_DRAFTS = 50;
const MAX_SIZE = 64000;
export const DRAFT_CHANGED = 'miniERP:drafts-changed';

function changed() { window.dispatchEvent?.(new Event(DRAFT_CHANGED)); }

export function draftKey(userId, scope) {
  return userId == null ? null : `${PREFIX}${encodeURIComponent(String(userId))}:${scope}`;
}

function valid(record) {
  return record && Number.isFinite(record.updatedAt) && record.updatedAt <= Date.now()
    && Date.now() - record.updatedAt < MAX_AGE && record.values && typeof record.values === 'object'
    && !Array.isArray(record.values);
}

function prune(storage, keepKey) {
  const records = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(PREFIX)) records.push(key);
  }
  const active = [];
  for (const key of records) {
    let record;
    try { record = JSON.parse(storage.getItem(key)); } catch { /* Xóa bản nháp không đọc được. */ }
    if (!valid(record)) storage.removeItem(key);
    else active.push({ key, updatedAt: record.updatedAt });
  }
  active.sort((a, b) => a.key === keepKey ? -1 : b.key === keepKey ? 1 : b.updatedAt - a.updatedAt)
    .slice(MAX_DRAFTS).forEach(item => storage.removeItem(item.key));
}

export function readDraft(key) {
  if (!key) return null;
  try {
    prune(window.localStorage);
    const record = JSON.parse(window.localStorage.getItem(key) || 'null');
    return valid(record) ? record : null;
  } catch { return null; }
}

export function removeDraft(key) {
  if (key) { window.localStorage.removeItem(key); changed(); }
}

export function writeDraft(key, values) {
  if (!key) return;
  const meaningful = Object.values(values).some(value => Array.isArray(value) ? value.length > 0
    : value != null && String(value).trim() !== '');
  if (!meaningful) { removeDraft(key); return; }
  const serialized = JSON.stringify({ updatedAt: Date.now(), values });
  if (serialized.length > MAX_SIZE) throw new Error('Bản nháp quá lớn để lưu trên máy này.');
  const storage = window.localStorage;
  prune(storage);
  storage.setItem(key, serialized);
  prune(storage, key);
  changed();
}

export function listDrafts(userId) {
  const prefix = draftKey(userId, '');
  if (!prefix) return [];
  try {
    const storage = window.localStorage;
    prune(storage);
    const drafts = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const record = JSON.parse(storage.getItem(key));
      if (valid(record)) drafts.push({ ...record, scope: key.slice(prefix.length) });
    }
    return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch { return []; }
}
