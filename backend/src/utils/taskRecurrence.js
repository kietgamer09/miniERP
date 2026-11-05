const frequencies = new Set(['daily', 'weekly', 'monthly']);

export function isRecurrenceFrequency(value) {
  return frequencies.has(value);
}

function toUtcDate(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function recurrenceAnchorDay(value) {
  return toUtcDate(value)?.getUTCDate() ?? null;
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

  if (frequency === 'daily') date.setUTCDate(date.getUTCDate() + 1);
  if (frequency === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  if (frequency === 'monthly') {
    if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) return null;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    date.setUTCFullYear(year, month, Math.min(anchorDay, lastDay));
  }

  return date;
}
