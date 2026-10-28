const DAY_NAMES = [
  'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7',
];

/** Tạo ngày theo giờ địa phương, tránh việc chuỗi YYYY-MM-DD bị hiểu là UTC. */
function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return null;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date : null;
}

function formatDateOnlyVN(value) {
  if (!parseDateOnly(value)) return '—';
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

/** Định dạng thời điểm ISO theo múi giờ địa phương: HH:mm DD/MM/YYYY. */
function formatDateTimeVN(isoString) {
  if (typeof isoString !== 'string') return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${hour}:${minute} ${day}/${month}/${date.getFullYear()}`;
}

/** "22/10/2026" */
function formatDateVN(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** "Thứ 5" */
function getDayName(date) {
  return DAY_NAMES[new Date(date).getDay()];
}

/** "Thứ 5, ngày 22/10/2026" */
function formatFullDateVN(date) {
  return `${getDayName(date)}, ngày ${formatDateVN(date)}`;
}

/** Cộng n ngày vào date, trả Date mới */
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Chỉ lấy phần ngày (00:00:00) để so sánh chính xác */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Kiểm tra date có nằm trong tuần hiện tại (Thứ 2 đến Chủ nhật) không. */
function isInCurrentWeek(date, today = new Date()) {
  const weekStart = startOfDay(today);
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  const dateStart = startOfDay(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return dateStart >= weekStart && dateStart < weekEnd;
}

/** Ngày làm việc là Thứ 2 đến Thứ 6. */
function isWorkingDay(date) {
  const dow = new Date(date).getDay();
  return dow !== 0 && dow !== 6;
}

/**
 * Đếm số ngày làm việc từ Thứ 2 đến Thứ 6 trong tháng.
 * @param {number} year
 * @param {number} month 0-indexed (0=tháng 1)
 */
function countWorkingDays(year, month) {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** Tạo danh sách ngày làm việc từ Thứ 2 đến Thứ 6 trong tháng. */
function getWorkingDaysInMonth(year, month) {
  const days = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push({
        date,
        label: `${DAY_NAMES[dow]} ${day}/${month + 1}`,
        dayOfMonth: day,
      });
    }
  }
  return days;
}

export {
  parseDateOnly,
  formatDateOnlyVN,
  formatDateTimeVN,
  DAY_NAMES,
  formatDateVN,
  getDayName,
  formatFullDateVN,
  addDays,
  startOfDay,
  isWorkingDay,
  isInCurrentWeek,
  countWorkingDays,
  getWorkingDaysInMonth,
};
