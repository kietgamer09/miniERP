import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidTime } from '../src/utils/validators.js';
import {
  formatRecurrenceTitle, isRecurrenceFrequency, isWeekendDate, nextRecurrenceDate, recurrenceAnchorDay,
} from '../src/utils/taskRecurrence.js';
import { validateTask } from '../src/controllers/taskController.js';

function date(value) {
  return nextRecurrenceDate(value, 'daily')?.toISOString().slice(0, 10);
}

test('validates the supported recurrence frequencies', () => {
  assert.equal(isRecurrenceFrequency('daily'), true);
  assert.equal(isRecurrenceFrequency('weekly'), true);
  assert.equal(isRecurrenceFrequency('monthly'), true);
  assert.equal(isRecurrenceFrequency('yearly'), false);
  assert.equal(isRecurrenceFrequency(null), false);
});

test('daily occurrences skip weekends and weekly occurrences land on Friday', () => {
  assert.equal(date('2026-11-04'), '2026-11-05');
  assert.equal(date('2026-11-06'), '2026-11-09');
  assert.equal(date('2026-11-07'), '2026-11-09');
  assert.equal(isWeekendDate('2026-11-07'), true);
  assert.equal(isWeekendDate('2026-11-08'), true);
  assert.equal(isWeekendDate('2026-11-09'), false);
  assert.equal(nextRecurrenceDate('2026-11-05', 'weekly').toISOString().slice(0, 10), '2026-11-06');
  assert.equal(nextRecurrenceDate('2026-11-06', 'weekly').toISOString().slice(0, 10), '2026-11-13');
  assert.equal(nextRecurrenceDate('2026-11-08', 'weekly').toISOString().slice(0, 10), '2026-11-13');
});

test('recurring task creation rejects weekend deadlines', () => {
  const base = { title: 'Việc lặp', assignee_id: 1, priority: 'trung_binh', due_date: '2026-11-07' };
  assert.match(validateTask({ ...base, recurrence_frequency: 'daily' }).error, /Thứ 2 đến Thứ 6/);
  assert.equal(validateTask(base).error, undefined);
});

test('monthly occurrences use the last weekday of each month', () => {
  const anchor = recurrenceAnchorDay('2026-01-31', 'monthly');
  const february = nextRecurrenceDate('2026-01-31', 'monthly', anchor);
  const march = nextRecurrenceDate(february, 'monthly', anchor);
  assert.equal(february.toISOString().slice(0, 10), '2026-02-27');
  assert.equal(march.toISOString().slice(0, 10), '2026-03-31');
  assert.equal(nextRecurrenceDate('2026-04-30', 'monthly', 30).toISOString().slice(0, 10), '2026-05-29');
  assert.equal(nextRecurrenceDate('2026-09-30', 'monthly', 30).toISOString().slice(0, 10), '2026-10-30');
  assert.equal(nextRecurrenceDate('2024-01-31', 'monthly', 31).toISOString().slice(0, 10), '2024-02-29');
  assert.equal(recurrenceAnchorDay('2026-02-28', 'monthly'), 31);
  assert.equal(recurrenceAnchorDay('2026-02-15', 'monthly'), 31);
  assert.equal(recurrenceAnchorDay('2026-11-06', 'monthly'), 31);
});

test('deadline time accepts only 24-hour HH:mm values', () => {
  assert.equal(isValidTime('17:00'), true);
  assert.equal(isValidTime('00:00'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('17:60'), false);
  assert.equal(isValidTime('5:00'), false);
});

test('invalid dates, frequencies, and monthly anchors do not produce an occurrence', () => {
  assert.equal(nextRecurrenceDate('2026-02-30', 'daily'), null);
  assert.equal(nextRecurrenceDate('2026-11-04', 'yearly'), null);
});

test('recurrence titles update an existing date or add the next due date once', () => {
  assert.equal(formatRecurrenceTitle('Báo cáo 05/11/2026', '2026-11-06'), 'Báo cáo 06/11/2026');
  assert.equal(formatRecurrenceTitle('Daily check 2026-11-05', '2026-11-06'), 'Daily check 2026-11-06');
  assert.equal(formatRecurrenceTitle('Kiểm tra máy', '2026-11-06'), 'Kiểm tra máy (06/11/2026)');
  assert.equal(formatRecurrenceTitle('Kiểm tra máy (05/11/2026)', '2026-11-06'), 'Kiểm tra máy (06/11/2026)');
});
