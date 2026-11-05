export const TASK_COLUMNS = [
  { status: 'can_lam', uiStatus: 'todo', label: 'Cần làm' },
  { status: 'dang_lam', uiStatus: 'doing', label: 'Đang làm' },
  { status: 'xong', uiStatus: 'done', label: 'Hoàn thành' },
];

export const TASK_STATUS_LABELS = Object.fromEntries(TASK_COLUMNS.map(({ status, label }) => [status, label]));

export const TASK_PRIORITY_LABELS = {
  thap: 'Thấp',
  trung_binh: 'Trung bình',
  cao: 'Cao',
};

export const TASK_PRIORITY_OPTIONS = [
  { value: 'thap', label: TASK_PRIORITY_LABELS.thap },
  { value: 'trung_binh', label: TASK_PRIORITY_LABELS.trung_binh },
  { value: 'cao', label: TASK_PRIORITY_LABELS.cao },
];

export const TASK_RECURRENCE_LABELS = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
};

export const TASK_RECURRENCE_OPTIONS = [
  { value: '', label: 'Không lặp lại' },
  ...Object.entries(TASK_RECURRENCE_LABELS).map(([value, label]) => ({ value, label })),
];

export const DONE_COLUMN_LABEL = 'Hoàn thành';
