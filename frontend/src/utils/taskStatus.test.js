import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDateOnly } from './dates.js';
import { getDueState } from './taskStatus.js';

test('task deadline status changes to overdue after the selected time on the same date', () => {
  const task = { status: 'todo', dueDate: parseDateOnly('2026-11-05'), dueTime: '17:00' };
  assert.equal(getDueState(task, new Date(2026, 10, 5, 16, 59)), 'near-due');
  assert.equal(getDueState(task, new Date(2026, 10, 5, 17, 1)), 'overdue');
});
