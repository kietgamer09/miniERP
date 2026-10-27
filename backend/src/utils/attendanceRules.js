export function vietnamClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}:${parts.second}` };
}

export const weekend = date => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
const timeOnly = value => value == null ? null : value.toISOString().slice(11, 19);
export const dateOnly = value => value == null ? null : value.toISOString().slice(0, 10);

export function classifyDay({ date, records = [], onLeave = false, startDate = null, clock = vietnamClock() }) {
  const base = { date, check_in: null, check_out: null, late: false, early: false, can_explain: false };
  const state = (status, color, label, extra = {}) => ({ ...base, status, color, label, ...extra });
  if (date > clock.date) return state('future', 'default', 'Chưa đến ngày');
  if (startDate && date < startDate) return state('not_employed', 'default', 'Chưa bắt đầu làm việc');
  if (weekend(date)) return state('weekend', 'default', 'Cuối tuần');
  if (records.length > 1) return state('conflict', 'red', 'Trùng bản ghi công, cần kiểm tra', { can_explain: true });
  const checkIn = timeOnly(records[0]?.check_in);
  const checkOut = timeOnly(records[0]?.check_out);
  const times = { check_in: checkIn, check_out: checkOut };
  if (onLeave && !checkIn && !checkOut) return state('leave', 'blue', 'Nghỉ phép đã duyệt');
  const closed = date < clock.date || clock.time >= '17:00:00';
  if (!checkIn && !checkOut) return closed
    ? state('absent', 'red', 'Không có công hoặc nghỉ phép đã duyệt', { can_explain: true })
    : state('waiting', 'default', 'Chưa vào ca, ngày làm việc chưa kết thúc');
  if (!checkIn || !checkOut) {
    if (closed || !checkIn) return state('missing', 'red', 'Thiếu lượt vào/ra ca', { ...times, can_explain: true });
    const late = checkIn > '08:00:00';
    return state(late ? 'late' : 'in_progress', late ? 'gold' : 'blue', late ? 'Vào muộn, đang trong ca' : 'Đang trong ca',
      { ...times, late, can_explain: late });
  }
  if (checkOut < checkIn) return state('conflict', 'red', 'Giờ ra trước giờ vào', { ...times, can_explain: true });
  const late = checkIn > '08:00:00';
  const early = checkOut < '17:00:00';
  const extra = { ...times, late, early, can_explain: late || early };
  if (late && early) return state('late_early', 'red', 'Vào muộn và ra sớm', extra);
  if (late) return state('late', 'gold', 'Vào muộn', extra);
  if (early) return state('early', 'gold', 'Ra sớm', extra);
  return state('complete', 'green', 'Đúng giờ, đủ ca', extra);
}
