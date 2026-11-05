import prisma from '../config/prisma.js';
import { nextRecurrenceDate, formatRecurrenceTitle } from '../utils/taskRecurrence.js';
import { toDateOnly } from '../utils/validators.js';

function getTodayInVietnam(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function createDueRecurringTasks(now = new Date(), db = prisma) {
  const today = getTodayInVietnam(now);
  const series = await db.tasks.groupBy({
    by: ['recurrence_series_id'],
    where: { recurrence_series_id: { not: null }, recurrence_frequency: { not: null } },
    _max: { due_date: true },
  });
  let created = 0;

  for (const item of series) {
    if (!item.recurrence_series_id || !item._max.due_date) continue;
    const current = await db.tasks.findFirst({
      where: {
        recurrence_series_id: item.recurrence_series_id,
        due_date: item._max.due_date,
      },
      select: {
        id: true, project_id: true, title: true, description: true, assignee_id: true,
        created_by: true, due_date: true, due_time: true, priority: true, recurrence_series_id: true,
        recurrence_frequency: true, recurrence_anchor_day: true,
        projects: { select: { status: true, end_date: true } },
      },
    });
    if (!current || current.projects.status === 'hoan_thanh') continue;

    const nextDueDate = nextRecurrenceDate(
      current.due_date, current.recurrence_frequency, current.recurrence_anchor_day,
    );
    if (!nextDueDate || toDateOnly(nextDueDate) > today
      || toDateOnly(nextDueDate) > toDateOnly(current.projects.end_date)) continue;

    const member = await db.project_members.findUnique({
      where: { project_id_employee_id: { project_id: current.project_id, employee_id: current.assignee_id } },
      select: { employees: { select: { status: true } } },
    });
    if (member?.employees.status !== 'dang_lam_viec') continue;

    const occurrences = [];
    let cursor = current;
    let dueDate = nextDueDate;
    while (dueDate && toDateOnly(dueDate) <= today
      && toDateOnly(dueDate) <= toDateOnly(current.projects.end_date)
      && occurrences.length < 1000) {
      const title = formatRecurrenceTitle(cursor.title, dueDate);
      occurrences.push({
        project_id: current.project_id,
        title,
        description: current.description,
        assignee_id: current.assignee_id,
        created_by: current.created_by,
        due_date: dueDate,
        due_time: cursor.due_time || '17:00',
        priority: current.priority,
        status: 'can_lam',
        recurrence_series_id: current.recurrence_series_id,
        recurrence_frequency: current.recurrence_frequency,
        recurrence_anchor_day: current.recurrence_anchor_day,
      });
      cursor = { ...cursor, title, due_date: dueDate };
      dueDate = nextRecurrenceDate(
        cursor.due_date, current.recurrence_frequency, current.recurrence_anchor_day,
      );
    }
    if (!occurrences.length) continue;

    const result = await db.tasks.createMany({
      data: occurrences,
      skipDuplicates: true,
    });
    created += result.count;
  }

  return { created, today };
}

export function startTaskRecurrenceWorker({ intervalMs = 60_000 } = {}) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await createDueRecurringTasks();
      if (result.created) console.log(`Đã tạo ${result.created} task lặp đến ngày ${result.today}.`);
    } catch (error) {
      console.error('Không thể tạo các task lặp đến hạn:', error);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
