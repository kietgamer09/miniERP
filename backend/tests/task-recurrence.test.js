import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatRecurrenceTitle, isRecurrenceFrequency, nextRecurrenceDate, recurrenceAnchorDay,
} from '../src/utils/taskRecurrence.js';

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

test('daily and weekly occurrences advance from the current due date', () => {
  assert.equal(date('2026-11-04'), '2026-11-05');
  assert.equal(nextRecurrenceDate('2026-11-04', 'weekly').toISOString().slice(0, 10), '2026-11-11');
});

test('monthly occurrences clamp short months and recover the original anchor day', () => {
  const anchor = recurrenceAnchorDay('2026-01-31');
  const february = nextRecurrenceDate('2026-01-31', 'monthly', anchor);
  const march = nextRecurrenceDate(february, 'monthly', anchor);
  assert.equal(february.toISOString().slice(0, 10), '2026-02-28');
  assert.equal(march.toISOString().slice(0, 10), '2026-03-31');
  assert.equal(nextRecurrenceDate('2024-01-31', 'monthly', 31).toISOString().slice(0, 10), '2024-02-29');
});

test('invalid dates, frequencies, and monthly anchors do not produce an occurrence', () => {
  assert.equal(nextRecurrenceDate('2026-02-30', 'daily'), null);
  assert.equal(nextRecurrenceDate('2026-11-04', 'yearly'), null);
  assert.equal(nextRecurrenceDate('2026-11-04', 'monthly', 0), null);
});

test('recurrence titles update an existing date or add the next due date once', () => {
  assert.equal(formatRecurrenceTitle('Báo cáo 05/11/2026', '2026-11-06'), 'Báo cáo 06/11/2026');
  assert.equal(formatRecurrenceTitle('Daily check 2026-11-05', '2026-11-06'), 'Daily check 2026-11-06');
  assert.equal(formatRecurrenceTitle('Kiểm tra máy', '2026-11-06'), 'Kiểm tra máy (06/11/2026)');
  assert.equal(formatRecurrenceTitle('Kiểm tra máy (05/11/2026)', '2026-11-06'), 'Kiểm tra máy (06/11/2026)');
});
