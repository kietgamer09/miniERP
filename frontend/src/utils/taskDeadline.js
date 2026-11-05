import dayjs from 'dayjs';

export function defaultRecurringDeadline(value, frequency) {
  const deadline = value.second(0).millisecond(0);
  if (frequency === 'daily') {
    const day = deadline.day();
    if (day === 6) return deadline.add(2, 'day').hour(17).minute(0);
    if (day === 0) return deadline.add(1, 'day').hour(17).minute(0);
    return deadline.hour(17).minute(0);
  }
  if (frequency === 'weekly') {
    const day = deadline.day();
    const daysToFriday = day === 0 ? -2 : day === 6 ? -1 : 5 - day;
    return deadline.add(daysToFriday, 'day').hour(17).minute(0);
  }
  if (frequency === 'monthly') {
    const endOfMonth = deadline.endOf('month');
    if (endOfMonth.day() === 6) return endOfMonth.subtract(1, 'day').hour(17).minute(0);
    if (endOfMonth.day() === 0) return endOfMonth.subtract(2, 'day').hour(17).minute(0);
    return endOfMonth.hour(17).minute(0);
  }
  return deadline;
}

export function clampDeadlineToProject(deadline, projectEndDate) {
  if (deadline.format('YYYY-MM-DD') <= projectEndDate) return deadline;
  let clamped = dayjs(`${projectEndDate}T17:00:00`);
  if (clamped.day() === 6) clamped = clamped.subtract(1, 'day');
  if (clamped.day() === 0) clamped = clamped.subtract(2, 'day');
  return clamped;
}
