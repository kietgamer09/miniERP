import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortNotifications } from './notifications.js';

test('unread notifications precede read ones, then urgency and newest time decide order', () => {
  const items = [
    { id: 'read-urgent', read: true, priority: 999, time: '2026-10-29T10:00:00Z' },
    { id: 'next-week', read: false, priority: 993, time: '2026-10-29T10:00:00Z' },
    { id: 'tomorrow-old', read: false, priority: 999, time: '2026-10-28T10:00:00Z' },
    { id: 'tomorrow-new', read: false, priority: 999, time: '2026-10-29T10:00:00Z' },
    { id: 'ordinary-new', read: false, time: '2026-10-29T12:00:00Z' },
    { id: 'ordinary-old', read: false, time: '2026-10-29T09:00:00Z' },
  ];
  const order = sortNotifications(items, item => item.read).map(item => item.id);
  assert.deepEqual(order, ['tomorrow-new', 'tomorrow-old', 'next-week', 'ordinary-new', 'ordinary-old', 'read-urgent']);
  assert.equal(items[0].id, 'read-urgent');
  const marked = items.map(item => item.id === 'tomorrow-new' ? { ...item, read: true } : item);
  assert.equal(sortNotifications(marked, item => item.read).slice(0, 4).some(item => item.read), false);
});
