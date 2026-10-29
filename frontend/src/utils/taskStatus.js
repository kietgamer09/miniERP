// BRD: quá hạn đỏ, sắp hạn 0–3 ngày vàng; task xong không cảnh báo.
import { startOfDay, formatDateVN } from './dates';

const STATUS = {
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
};

const PRIORITY_ORDER = { 'Cao': 0, 'Trung bình': 1, 'Thấp': 2 };

/** @returns {'overdue' | 'near-due' | 'normal' | 'done'} */
function getDueState(task, today = new Date()) {

  if (task.status === STATUS.DONE) return 'done';

  const todayStart = startOfDay(today);
  const dueStart = startOfDay(task.dueDate);
  const diffMs = dueStart.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'near-due';

  return 'normal';
}

function getDueColor(dueState) {
  switch (dueState) {
    case 'overdue': return { bg: '#fff1f0', border: '#ff4d4f' };
    case 'near-due': return { bg: '#fffbe6', border: '#faad14' };
    case 'normal': return { bg: '#e6f7ff', border: '#91d5ff' };
    case 'done': return { bg: '#ffffff', border: '#d9d9d9' };
    default: return { bg: '#ffffff', border: '#d9d9d9' };
  }
}

function getDueLabel(task, dueState) {
  if (dueState === 'done') {
    const dateStr = task.completedAt
      ? formatDateVN(task.completedAt)
      : formatDateVN(task.dueDate);
    return `Xong (${dateStr})`;
  }
  const dateStr = formatDateVN(task.dueDate);
  switch (dueState) {
    case 'overdue': return `Quá hạn (${dateStr})`;
    case 'near-due': return `Sắp hạn (${dateStr})`;
    default: return `Hạn (${dateStr})`;
  }
}

/**
 * Sắp xếp task trong mỗi cột:
 * - "Theo ưu tiên": Quá hạn lên đầu; sau đó Cao -> Trung bình -> Thấp, bằng ưu tiên thì hạn gần lên trước.
 * - "Theo hạn" (mode === 'due'): Quá hạn luôn lên đầu, sau đó hạn gần -> xa. Nếu bằng hạn: ưu tiên Cao -> Thấp.
 */
function sortTasks(tasks, mode = 'due', today = new Date()) {
  return [...tasks].sort((a, b) => {
    const stateA = getDueState(a, today);
    const stateB = getDueState(b, today);
    const isOverdueA = stateA === 'overdue' ? 0 : 1;
    const isOverdueB = stateB === 'overdue' ? 0 : 1;
    if (isOverdueA !== isOverdueB) return isOverdueA - isOverdueB;

    if (mode === 'priority') {

      const priDiff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      if (priDiff !== 0) return priDiff;

      return new Date(a.dueDate) - new Date(b.dueDate);
    }

    const dateDiff = new Date(a.dueDate) - new Date(b.dueDate);
    if (dateDiff !== 0) return dateDiff;

    return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
  });
}

export { STATUS, PRIORITY_ORDER, getDueState, getDueColor, getDueLabel, sortTasks };
