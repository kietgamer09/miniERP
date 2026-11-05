const frequencies = new Set(['daily', 'weekly', 'monthly']);

export function isRecurrenceFrequency(value) {
  return frequencies.has(value);
}

export function isWeekendDate(value) {
  const date = toUtcDate(value);
  return Boolean(date && (date.getUTCDay() === 0 || date.getUTCDay() === 6));
}

function toUtcDate(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function recurrenceAnchorDay(value, frequency) {
  const date = toUtcDate(value);
  if (!date) return null;
  if (frequency === 'monthly') return 31;
  return date.getUTCDate();
}

function previousWeekday(date) {
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() - 1);
  return date;
}

export function formatRecurrenceTitle(title, dueDate) {
  const date = toUtcDate(dueDate);
  if (!date || typeof title !== 'string') return title;

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear());
  const vietnameseDate = `${day}/${month}/${year}`;
  const datePattern = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b|\b(\d{1,2})([/.\-])(\d{1,2})\5(\d{4})\b/;
  const match = title.match(datePattern);

  if (!match) return `${title.trim()} (${vietnameseDate})`;
  if (match[1]) return title.replace(datePattern, `${year}-${month}-${day}`);

  const formattedDay = match[4].length === 1 ? String(date.getUTCDate()) : day;
  const formattedMonth = match[6].length === 1 ? String(date.getUTCMonth() + 1) : month;
  return title.replace(datePattern, `${formattedDay}${match[5]}${formattedMonth}${match[5]}${year}`);
}

export function nextRecurrenceDate(value, frequency, anchorDay = recurrenceAnchorDay(value)) {
  const date = toUtcDate(value);
  if (!date || !isRecurrenceFrequency(frequency)) return null;

  if (frequency === 'daily') {
    date.setUTCDate(date.getUTCDate() + 1);
    while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1);
  }
  if (frequency === 'weekly') {
    const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() + (day === 5 ? 7 : day === 6 ? 6 : day === 0 ? 5 : 5 - day));
  }
  if (frequency === 'monthly') {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    date.setUTCFullYear(year, month, lastDay);
    previousWeekday(date);
  }

  return date;
}
