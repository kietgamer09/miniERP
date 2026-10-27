const taskStatuses = ['can_lam', 'dang_lam', 'xong'];

export function getAllowedMoves({ status, isAssignee, canManage, projectStatus }) {
  if (projectStatus === 'hoan_thanh') return [];
  const index = taskStatuses.indexOf(status);
  if (index < 0) return [];

  if (canManage) {
    return [taskStatuses[index - 1], taskStatuses[index + 1]].filter(Boolean);
  }
  if (!isAssignee) return [];
  if (status === 'can_lam') return ['dang_lam'];
  if (status === 'dang_lam') return ['can_lam', 'xong'];
  return [];
}
