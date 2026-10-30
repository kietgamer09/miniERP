import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attendanceReminders } from './notifications.js';

const now = new Date('2026-10-30T18:00:00+07:00');
const day = { date: '2026-10-30', status: 'absent' };
test('approved leave suppresses both reminders, including old punches', () => {
  for (const record of [null, { date: day.date, check_in: '08:13:54' }]) {
    assert.deepEqual(attendanceReminders(now, record, { ...day, status: 'leave' }), []);
  }
});
test('unknown, stale and non-working days do not generate reminders', () => {
  for (const info of [null, { ...day, date: '2026-10-29' }, { ...day, status: 'not_employed' }]) {
    assert.deepEqual(attendanceReminders(now, null, info), []);
  }
  assert.deepEqual(attendanceReminders(new Date('2026-10-31T18:00:00+07:00'), null, { date: '2026-10-31', status: 'weekend' }), []);
});
test('working day reminders follow time and recorded punches', () => {
  assert.equal(attendanceReminders(now, null, day).length, 2);
  assert.equal(attendanceReminders(now, { date: day.date, check_in: '08:00:00' }, day).length, 1);
  assert.equal(attendanceReminders(now, { date: day.date, check_in: '08:00:00', check_out: '17:00:00' }, day).length, 0);
  assert.equal(attendanceReminders(new Date('2026-10-30T07:59:00+07:00'), null, day).length, 0);
});
