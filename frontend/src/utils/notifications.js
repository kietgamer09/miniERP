export function attendanceReminders(now = new Date(), attendance = null) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  if (['Sat', 'Sun'].includes(parts.weekday)) return [];
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return [{ hour: 8, label: 'vào ca' }, { hour: 17, label: 'ra ca' }]
    .filter(item => Number(parts.hour) >= item.hour && !(attendance?.date === day
      && (item.hour === 8 ? attendance.check_in : attendance.check_out)))
    .map(item => ({ id: `attendance-${day}-${item.hour}`, title: `Nhắc chấm công ${item.label}`,
      description: 'Nhắc theo lịch Thứ 2–Thứ 6, giờ Việt Nam. Nếu đã chấm công, bạn có thể bỏ qua.', path: '/',
      time: `${day}T${String(item.hour).padStart(2, '0')}:00:00+07:00`, type: 'attendance' }));
}

export function taskNotifications(tasks) {
  return tasks.filter(task => task.status !== 'xong').map(task => ({
    id: `task-${task.id}-${task.assignee_id}`, title: `Bạn được giao: ${task.title}`,
    description: task.project_name, path: `/du-an/${task.project_id}`, time: task.created_at, type: 'task',
  }));
}

function vietnamDate(now) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function taskDueReminders(tasks, now = new Date()) {
  const today = vietnamDate(now);
  const todayUtc = Date.parse(`${today}T00:00:00Z`);
  return tasks.flatMap(task => {
    if (task.status === 'xong' || !/^\d{4}-\d{2}-\d{2}/.test(task.due_date || '')) return [];
    const due = task.due_date.slice(0, 10);
    const daysLeft = Math.round((Date.parse(`${due}T00:00:00Z`) - todayUtc) / 86400000);
    const base = { path: `/du-an/${task.project_id}`, time: `${today}T09:00:00+07:00`, type: 'task-due' };
    if (daysLeft < 0) return [{ ...base, id: `task-overdue-${task.id}-${due}-${today}`,
      title: `Công việc quá hạn: ${task.title}`, description: `${task.project_name} · Quá hạn ${Math.abs(daysLeft)} ngày. Vui lòng cập nhật trạng thái.` }];
    if (daysLeft <= 3) return [{ ...base, id: `task-due-soon-${task.id}-${due}`,
      title: `Sắp đến hạn: ${task.title}`, description: daysLeft === 0
        ? `${task.project_name} · Hạn chót hôm nay.`
        : `${task.project_name} · Còn ${daysLeft} ngày đến hạn chót.` }];
    return [];
  });
}

export function sortNotifications(items, isRead) {
  return [...items].sort((a, b) => Number(Boolean(isRead(a))) - Number(Boolean(isRead(b)))
    || (b.priority || 0) - (a.priority || 0)
    || (Date.parse(b.time) || 0) - (Date.parse(a.time) || 0)
    || String(a.id).localeCompare(String(b.id)));
}
