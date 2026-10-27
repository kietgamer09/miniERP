import { isAttendanceWeekend } from './attendance.js';

const categories = [
  { key: 'pending', label: 'Chưa tính công', color: 'var(--donut-pending, #fff)', description: 'Ngày chưa đến, chưa có kết quả hoàn tất hoặc trước ngày bắt đầu làm việc.' },
  { key: 'complete', label: 'Công đầy đủ', color: '#52c41a', description: 'Vào trước/đúng 08:00, ra sau/đúng 17:00.' },
  { key: 'leave', label: 'Nghỉ có phép', color: '#13c2c2', description: 'Ngày nghỉ đã được duyệt.' },
  { key: 'warning', label: 'Muộn / ra sớm', color: '#fadb14', description: 'Chỉ vào muộn hoặc chỉ ra sớm.' },
  { key: 'issue', label: 'Không công / cần giải trình', color: '#ff4d4f', description: 'Vắng không phép, vừa muộn vừa sớm, thiếu hoặc trùng lượt công.' },
  { key: 'progress', label: 'Đang trong ca', color: '#69b1ff', description: 'Đã vào đúng giờ, chưa kết thúc ca; chưa tính công đầy đủ.' },
];

export function attendanceGroup(day) {
  if (day.color === 'green') return 'complete';
  if (day.status === 'leave') return 'leave';
  if (day.color === 'gold') return 'warning';
  if (day.color === 'red') return 'issue';
  if (day.status === 'in_progress') return 'progress';
  return 'pending';
}

export function summarizeAttendance(days = []) {
  const workingDays = days.filter(day => !isAttendanceWeekend(day.date));
  const groups = categories.map(category => ({ ...category,
    days: workingDays.filter(day => attendanceGroup(day) === category.key),
  })).map(group => ({ ...group, count: group.days.length }));
  return { groups, total: workingDays.length,
    recorded: workingDays.filter(day => day.check_in || day.check_out).length };
}
