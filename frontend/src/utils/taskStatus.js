/**
 * utils/taskStatus.js – Quy tắc nghiệp vụ về trạng thái task.
 *
 * Tách thành hàm thuần (pure function) vì:
 * 1. Dễ unit test – không phụ thuộc React hay DOM.
 * 2. Dùng lại ở nhiều nơi: TaskCard, MyTasksBoard, Kanban dự án (ngày sau).
 *
 * Quy tắc (từ BRD mục 1.2):
 * - Quá hạn: hôm nay > hạn chót VÀ task chưa Xong → đỏ
 * - Sắp hạn: chưa quá hạn, còn 0–3 ngày lịch đến hạn chót, chưa Xong → vàng
 * - Chưa đến hạn: task chưa Xong, không quá hạn, không sắp hạn → xanh lơ
 * - Task Xong: không có màu cảnh báo
 */
import { startOfDay, formatDateVN } from './dates';

/** Mã trạng thái nội bộ dùng trong code */
const STATUS = {
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
};

/** Thứ tự ưu tiên: Cao > Trung bình > Thấp */
const PRIORITY_ORDER = { 'Cao': 0, 'Trung bình': 1, 'Thấp': 2 };

/**
 * Tính trạng thái cảnh báo hạn của task.
 * @returns {'overdue' | 'near-due' | 'normal' | 'done'}
 */
function getDueState(task, today = new Date()) {
  // Task đã xong thì không cảnh báo (BRD: "Task Xong không hiện màu cảnh báo")
  if (task.status === STATUS.DONE) return 'done';

  const todayStart = startOfDay(today);
  const dueStart = startOfDay(task.dueDate);
  const diffMs = dueStart.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Quá hạn: hôm nay đã qua hạn chót (diffDays < 0)
  if (diffDays < 0) return 'overdue';
  // Sắp hạn: còn 0–3 ngày lịch (kể cả đúng ngày hạn)
  if (diffDays <= 3) return 'near-due';
  // Chưa đến hạn
  return 'normal';
}

/** Màu nền/viền theo trạng thái cảnh báo */
function getDueColor(dueState) {
  switch (dueState) {
    case 'overdue': return { bg: '#fff1f0', border: '#ff4d4f' };   // đỏ
    case 'near-due': return { bg: '#fffbe6', border: '#faad14' };  // vàng
    case 'normal': return { bg: '#e6f7ff', border: '#91d5ff' };    // xanh lơ
    case 'done': return { bg: '#ffffff', border: '#d9d9d9' };      // trắng xám
    default: return { bg: '#ffffff', border: '#d9d9d9' };
  }
}

/**
 * Nhãn hiển thị cho dòng trạng thái trên thẻ task.
 * Ví dụ: "Quá hạn (20/10/2026)", "Sắp hạn (29/10/2026)", "Xong (27/10/2026)"
 */
function getDueLabel(task, dueState) {
  if (dueState === 'done') {
    // Task hoàn thành: hiện ngày hoàn thành nếu có, không thì ngày hạn
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
 * - "Theo ưu tiên" (mode === 'priority'): Cao -> Trung bình -> Thấp. Nếu bằng ưu tiên: quá hạn lên trước, rồi hạn gần -> xa.
 * - "Theo hạn" (mode === 'due'): Quá hạn luôn lên đầu, sau đó hạn gần -> xa. Nếu bằng hạn: ưu tiên Cao -> Thấp.
 */
function sortTasks(tasks, mode = 'due', today = new Date()) {
  return [...tasks].sort((a, b) => {
    if (mode === 'priority') {
      // 1. Tiêu chí chính: Mức ưu tiên Cao -> Trung bình -> Thấp
      const priDiff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      if (priDiff !== 0) return priDiff;

      // 2. Bằng ưu tiên: Quá hạn lên trước
      const stateA = getDueState(a, today);
      const stateB = getDueState(b, today);
      const isOverdueA = stateA === 'overdue' ? 0 : 1;
      const isOverdueB = stateB === 'overdue' ? 0 : 1;
      if (isOverdueA !== isOverdueB) return isOverdueA - isOverdueB;

      // 3. Hạn gần -> xa
      return new Date(a.dueDate) - new Date(b.dueDate);
    }

    // mode === 'due'
    // 1. Quá hạn luôn lên đầu
    const stateA = getDueState(a, today);
    const stateB = getDueState(b, today);
    const isOverdueA = stateA === 'overdue' ? 0 : 1;
    const isOverdueB = stateB === 'overdue' ? 0 : 1;
    if (isOverdueA !== isOverdueB) return isOverdueA - isOverdueB;

    // 2. Hạn gần -> xa
    const dateDiff = new Date(a.dueDate) - new Date(b.dueDate);
    if (dateDiff !== 0) return dateDiff;

    // 3. Bằng hạn -> ưu tiên Cao -> Thấp
    return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
  });
}

export { STATUS, PRIORITY_ORDER, getDueState, getDueColor, getDueLabel, sortTasks };
