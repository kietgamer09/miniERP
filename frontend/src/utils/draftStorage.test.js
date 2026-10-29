import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT_CHANGED, draftKey, listDrafts, readDraft, removeDraft, writeDraft } from './draftStorage.js';
import { draftNotification } from './draftNotifications.js';

let data;
beforeEach(() => {
  data = new Map();
  globalThis.window = { localStorage: {
    get length() { return data.size; },
    key: index => [...data.keys()][index],
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  } };
});

test('persists across module reload, separates users and records, clears after success', async () => {
  const key = draftKey(1, 'task:2:new');
  writeDraft(key, { description: 'Nội dung chưa gửi', due_date: '2026-11-20', assignee_id: null });
  const reloaded = await import('./draftStorage.js?reload');
  assert.deepEqual(reloaded.readDraft(key).values, { description: 'Nội dung chưa gửi', due_date: '2026-11-20', assignee_id: null });
  assert.equal(readDraft(draftKey(2, 'task:2:new')), null);
  assert.equal(readDraft(draftKey(1, 'task:3:new')), null);
  assert.equal(draftKey(null, 'task:new'), null);
  removeDraft(key);
  assert.equal(readDraft(key), null);
});

test('removes expired and corrupt drafts without touching other app storage', () => {
  const key = draftKey(1, 'project:new');
  data.set(key, JSON.stringify({ updatedAt: Date.now() - 7 * 86400000, values: { name: 'Old' } }));
  data.set(draftKey(1, 'broken'), '{');
  data.set('unrelated', 'keep');
  assert.equal(readDraft(key), null);
  assert.equal(data.size, 1);
  assert.equal(data.get('unrelated'), 'keep');
});

test('caps drafts at 50, keeps latest draft and refuses oversized writes', () => {
  for (let i = 0; i < 60; i++) writeDraft(draftKey(1, `task:${i}`), { title: `Draft ${i}` });
  assert.equal(data.size, 50);
  assert.equal(readDraft(draftKey(1, 'task:59')).values.title, 'Draft 59');
  const key = draftKey(1, 'task:59');
  assert.throws(() => writeDraft(key, { description: 'x'.repeat(65000) }));
  assert.equal(readDraft(key).values.title, 'Draft 59');
  writeDraft(key, { title: '', due_date: null, member_ids: [] });
  assert.equal(readDraft(key), null);
});

test('handles inaccessible storage on reads and exposes write failure', () => {
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  assert.equal(readDraft(draftKey(1, 'task:new')), null);
  assert.throws(() => writeDraft(draftKey(1, 'task:new'), { title: 'Unsaved' }));
});

test('inbox lists only current account drafts and updates after save/delete', () => {
  const events = [];
  window.dispatchEvent = event => events.push(event.type);
  writeDraft(draftKey(1, 'project:new'), { name: 'Dự án đang soạn' });
  writeDraft(draftKey(11, 'project:new'), { name: 'Tài khoản khác' });
  writeDraft(draftKey(1, 'task:2:new'), { title: 'Công việc đang soạn' });
  const drafts = listDrafts(1);
  assert.equal(drafts.length, 2);
  assert.ok(drafts.every(draft => !Object.values(draft.values).includes('Tài khoản khác')));
  const notification = draftNotification(drafts.find(draft => draft.scope === 'project:new'));
  assert.equal(notification.path, '/du-an/cua-toi');
  assert.equal(notification.draftScope, 'project:new');
  assert.equal(notification.title, 'Bạn có việc đang dở');
  removeDraft(draftKey(1, 'project:new'));
  assert.equal(listDrafts(1).length, 1);
  assert.equal(events.length, 4);
  assert.ok(events.every(type => type === DRAFT_CHANGED));
});

test('maps supported draft types to internal pages and rejects unknown scopes', () => {
  const examples = {
    'project:3': '/du-an/3', 'task:3:8': '/du-an/3', 'project-members:3': '/du-an/3',
    'comment:project-3': '/du-an/3', 'comment:task-8': '/viec-cua-toi/duoc-giao',
    'employee:new': '/quan-ly-nhan-vien', 'department:2': '/quan-ly-phong-ban',
    'attendance-explanation:2026-10-28': '/cham-cong/bang-cong?date=2026-10-28',
    'leave:new': '/cham-cong/nghi-phep',
    'profile:me': '/thong-tin',
  };
  for (const [scope, path] of Object.entries(examples)) {
    assert.equal(draftNotification({ scope, values: {}, updatedAt: Date.now() }).path, path);
  }
  assert.equal(draftNotification({ scope: 'project:https://example.com', values: {}, updatedAt: Date.now() }), null);
});
