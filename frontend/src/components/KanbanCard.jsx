import { Button, Tooltip } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import TaskCard from './TaskCard';

export default function KanbanCard({ task, locked = false, disabled = false, onOpen, onEdit }) {
  const hasAllowedMoves = task.allowed_moves?.length > 0;
  const projectCompleted = locked || task.project_status === 'hoan_thanh';
  const canMove = !projectCompleted && !disabled && hasAllowedMoves;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    disabled: !canMove,
  });
  const dragStyle = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const lockLabel = projectCompleted ? 'Dự án đã hoàn thành'
    : !task.can_edit && task.is_mine && task.status === 'xong'
      ? 'Chỉ Quản lý dự án hoặc Admin được kéo lùi task đã Xong'
      : 'Bạn không có quyền chuyển task này';
  const actions = <>
    {(projectCompleted || !hasAllowedMoves) && <Tooltip title={lockLabel}>
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
        dragRef={setNodeRef} dragAttributes={attributes} dragListeners={listeners} dragStyle={dragStyle}
        isDragging={isDragging} draggable={canMove} actions={actions} />
    </div>
  );
}
