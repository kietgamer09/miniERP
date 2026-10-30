import { classifyDay, dateOnly, vietnamClock, weekend } from './attendanceRules.js';

export const paidPayroll = status => ['paid', 'da_thanh_toan'].includes(status);
export const payrollStatus = (status, month) => paidPayroll(status) ? 'paid'
  : month < vietnamClock().date.slice(0, 7) ? 'chua_thanh_toan' : 'chua_chot';

export function workingDates(month) {
  const [year, number] = month.split('-').map(Number);
  return Array.from({ length: new Date(Date.UTC(year, number, 0)).getUTCDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
    .filter(date => !weekend(date));
}

export function payrollDays({ month, employee, records, leaves, clock = vietnamClock() }) {
  const dates = workingDates(month);
  let off = 0;
  for (const date of dates) {
    if (date > clock.date) continue;
    const day = classifyDay({ date, clock, startDate: dateOnly(employee.start_date),
      records: records.filter(row => dateOnly(row.date) === date),
      onLeave: leaves.some(row => row.status === 'da_duoc_duyet' && dateOnly(row.start_date) <= date && dateOnly(row.end_date || row.start_date) >= date),
    });
    if (['absent', 'missing', 'conflict', 'late_early', 'not_employed'].includes(day.status)) off++;
  }
  return { standard_days: dates.length, off_days: off };
}

export function payrollAmounts(days, salary, extra) {
  const base_salary = Math.round(Number(salary));
  const addition = Math.round(Number(extra));
  const deduction = Math.round(days.off_days * base_salary / days.standard_days / 1000) * 1000;
  return { ...days, base_salary, deduction, extra: addition, net_salary: Math.round(Math.max(0, base_salary - deduction + addition) / 1000) * 1000 };
}
