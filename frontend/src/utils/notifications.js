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
