/**
 * utils/dates.js – Hàm tiện ích xử lý ngày tháng kiểu Việt.
 *
 * Tách riêng vì nhiều component cần dùng chung (Chấm công, Bảng công, TaskCard).
 * Tất cả là hàm thuần (pure function), dễ test và tái sử dụng.
 */

const DAY_NAMES = [
  'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7',
];

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

/**
 * Kiểm tra xem một ngày có phải là ngày làm việc hay không:
 * Nghỉ Thứ 7 (dow = 6) và Chủ nhật (dow = 0).
 */
function isWorkingDay(date) {
  const dow = new Date(date).getDay();
  return dow !== 0 && dow !== 6;
}

/**
 * Đếm số ngày làm việc trong tháng:
 * Nghỉ Thứ 7 và Chủ nhật.
 * @param {number} year
 * @param {number} month 0-indexed (0=tháng 1)
 */
function countWorkingDays(year, month) {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    // Nghỉ Chủ nhật (0) và Thứ 7 (6)
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/**
 * Tạo danh sách ngày làm việc trong tháng:
 * Trừ Thứ 7 và Chủ nhật, chỉ hiển thị ngày làm việc thực tế trong bảng công.
 */
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
  DAY_NAMES,
  formatDateVN,
  getDayName,
  formatFullDateVN,
  addDays,
  startOfDay,
  isWorkingDay,
  countWorkingDays,
  getWorkingDaysInMonth,
};
