/**
 * data/mockTimesheet.js – Dữ liệu bảng công mẫu.
 *
 * Tạo danh sách ngày làm việc gần nhất kèm trạng thái mẫu.
 * Tên thứ tính bằng code, không hard-code.
 */
// TODO: nối API bảng công

/**
 * Trạng thái ngày công:
 * - 'full'     : Ngày công đầy đủ (xanh lá)
 * - 'leave'    : Nghỉ có phép (xanh lơ)
 * - 'partial'  : Thiếu công – thiếu giờ ra hoặc vào (vàng)
 * - 'absent'   : Không công – nghỉ không phép (đỏ)
 * - 'pending'  : Ngày chưa đi làm (trắng, viền)
 */

const STATUS_CONFIG = {
  full:    { label: 'Ngày công đầy đủ', color: '#52c41a' },
  leave:   { label: 'Ngày nghỉ có phép', color: '#1890ff' },
  partial: { label: 'Ngày thiếu công (thiếu giờ ra hoặc vào)', color: '#faad14' },
  absent:  { label: 'Ngày không công (nghỉ không phép)', color: '#ff4d4f' },
  pending: { label: 'Ngày chưa đi làm', color: '#ffffff', borderColor: '#d9d9d9' },
};

/**
 * Tạo dữ liệu bảng công mẫu cho tháng hiện tại.
 * Các ngày đã qua: gán trạng thái xen kẽ. Ngày chưa đến: pending.
 */
function buildMockTimesheet(workingDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Vòng lặp trạng thái mẫu cho ngày đã qua
  const pastStatuses = ['full', 'full', 'full', 'leave', 'full', 'partial', 'full', 'absent'];
  let idx = 0;

  return workingDays.map((wd) => {
    const dayDate = new Date(wd.date);
    dayDate.setHours(0, 0, 0, 0);

    if (dayDate > today) {
      return { ...wd, status: 'pending' };
    }
    const status = pastStatuses[idx % pastStatuses.length];
    idx++;
    return { ...wd, status };
  });
}

/** Đếm số ngày đã chấm công (không pending) */
function countWorkedDays(timesheetData) {
  return timesheetData.filter((d) => d.status !== 'pending').length;
}

/** Đếm theo từng trạng thái */
function countByStatus(timesheetData) {
  const counts = { full: 0, leave: 0, partial: 0, absent: 0, pending: 0 };
  timesheetData.forEach((d) => {
    counts[d.status] = (counts[d.status] || 0) + 1;
  });
  return counts;
}

export { STATUS_CONFIG, buildMockTimesheet, countWorkedDays, countByStatus };
