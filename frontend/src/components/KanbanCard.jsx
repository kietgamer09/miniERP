import { Button, Tooltip } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import TaskCard from './TaskCard';

export default function KanbanCard({ task, locked = false, readOnly = false, disabled = false, onOpen, onEdit }) {
  const hasAllowedMoves = task.allowed_moves?.length > 0;
  const projectCompleted = locked || task.project_status === 'hoan_thanh';
  const canMove = !projectCompleted && !readOnly && !disabled && hasAllowedMoves;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    disabled: !canMove,
  });
  const lockLabel = projectCompleted ? 'Dự án đã hoàn thành'
    : readOnly ? 'Bạn chỉ có quyền xem công việc của thành viên khác'
    : !task.can_edit && task.is_mine && task.status === 'xong'
      ? 'Chỉ Quản lý dự án hoặc Admin được kéo lùi task đã Xong'
      : 'Bạn không có quyền chuyển task này';
  const actions = <>
    {(projectCompleted || readOnly || !hasAllowedMoves) && <Tooltip title={lockLabel}>
      <LockOutlined aria-label={lockLabel} />
    </Tooltip>}
    {task.can_edit && <Tooltip title={projectCompleted ? 'Mở lại dự án để sửa task' : 'Sửa task'}>
      <span><Button type="text" size="small" aria-label={`Sửa task ${task.title}`} icon={<EditOutlined />}
        disabled={!onEdit || projectCompleted} onClick={() => onEdit?.(task)} /></span>
    </Tooltip>}
  </>;
  return (
    <div className="kanban-task-item">
      <TaskCard task={task} onClick={onOpen ? () => onOpen(task) : undefined} clickable={Boolean(onOpen)}
        dragRef={setNodeRef} dragAttributes={attributes} dragListeners={listeners}
        isDragging={isDragging} draggable={canMove} actions={actions} />
    </div>
  );
}
