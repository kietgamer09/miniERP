import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyDay } from '../src/utils/attendanceRules.js';

const clock = { date: '2026-11-04', time: '18:00:00' };
const time = value => new Date(`1970-01-01T${value}.000Z`);

test('classifyDay - Ngày trong tương lai chưa được phân loại công', () => {
  const day = classifyDay({ date: '2026-11-05', clock });
  assert.equal(day.status, 'future');
  assert.equal(day.can_explain, false);
});

test('classifyDay - Ngày làm việc đã kết thúc thiếu giờ ra cần giải trình', () => {
  const day = classifyDay({
    date: '2026-11-04',
    records: [{ check_in: time('08:00:00'), check_out: null }],
    clock,
  });
  assert.equal(day.status, 'missing');
  assert.equal(day.can_explain, true);
});

test('classifyDay - Nghỉ phép được duyệt được phân loại riêng', () => {
  const day = classifyDay({ date: '2026-11-04', onLeave: true, clock });
  assert.equal(day.status, 'leave');
  assert.equal(day.label, 'Nghỉ phép đã duyệt');
});

test('classifyDay - Vào muộn và ra sớm cùng ngày được phân loại đỏ', () => {
  const day = classifyDay({
    date: '2026-11-04',
    records: [{ check_in: time('08:15:00'), check_out: time('16:30:00') }],
    clock,
  });
  assert.equal(day.status, 'late_early');
  assert.equal(day.color, 'red');
  assert.equal(day.can_explain, true);
});

test('classifyDay - Chấm đúng và đủ ca được phân loại xanh', () => {
  const day = classifyDay({
    date: '2026-11-04',
    records: [{ check_in: time('08:00:00'), check_out: time('17:00:00') }],
    clock,
  });
  assert.equal(day.status, 'complete');
  assert.equal(day.color, 'green');
});

test('classifyDay - Chỉ đi làm muộn nhưng về đúng giờ', () => {
  const day = classifyDay({
    date: '2026-11-04',
    records: [{ check_in: time('08:15:00'), check_out: time('17:00:00') }],
    clock,
  });
  assert.equal(day.status, 'late');
  assert.equal(day.can_explain, true);
});

test('classifyDay - Đi đúng giờ nhưng về sớm', () => {
  const day = classifyDay({
    date: '2026-11-04',
    records: [{ check_in: time('08:00:00'), check_out: time('16:30:00') }],
    clock,
  });
  assert.equal(day.status, 'early');
  assert.equal(day.can_explain, true);
});