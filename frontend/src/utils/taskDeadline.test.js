import assert from 'node:assert/strict';
import test from 'node:test';
import dayjs from 'dayjs';
import { clampDeadlineToProject, defaultRecurringDeadline } from './taskDeadline.js';

test('recurring deadline defaults use the end of the selected period at shift end', () => {
  assert.equal(defaultRecurringDeadline(dayjs('2026-11-05T10:30'), 'daily').format('YYYY-MM-DD HH:mm'), '2026-11-05 17:00');
  assert.equal(defaultRecurringDeadline(dayjs('2026-11-06T10:30'), 'daily').format('YYYY-MM-DD HH:mm'), '2026-11-06 17:00');
  assert.equal(defaultRecurringDeadline(dayjs('2026-11-07T10:30'), 'daily').format('YYYY-MM-DD HH:mm'), '2026-11-09 17:00');
  assert.equal(defaultRecurringDeadline(dayjs('2026-11-05T10:30'), 'weekly').format('YYYY-MM-DD HH:mm'), '2026-11-06 17:00');
  assert.equal(defaultRecurringDeadline(dayjs('2026-11-07T10:30'), 'weekly').format('YYYY-MM-DD HH:mm'), '2026-11-06 17:00');
  assert.equal(defaultRecurringDeadline(dayjs('2026-02-05T10:30'), 'monthly').format('YYYY-MM-DD HH:mm'), '2026-02-27 17:00');
  assert.equal(defaultRecurringDeadline(dayjs('2026-10-05T10:30'), 'monthly').format('YYYY-MM-DD HH:mm'), '2026-10-30 17:00');
  assert.equal(defaultRecurringDeadline(dayjs('2026-05-05T10:30'), 'monthly').format('YYYY-MM-DD HH:mm'), '2026-05-29 17:00');
});

test('recurring end of period is clamped to project end', () => {
  assert.equal(clampDeadlineToProject(
    defaultRecurringDeadline(dayjs('2026-11-05T10:30'), 'weekly'), '2026-11-06',
  ).format('YYYY-MM-DD HH:mm'), '2026-11-06 17:00');
  assert.equal(clampDeadlineToProject(
    defaultRecurringDeadline(dayjs('2026-02-05T10:30'), 'monthly'), '2026-02-20',
  ).format('YYYY-MM-DD HH:mm'), '2026-02-20 17:00');
});
