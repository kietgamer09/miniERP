import { Card, Typography } from 'antd';
import { getDueState, getDueColor, getDueLabel } from '../utils/taskStatus';
import { formatDateVN } from '../utils/dates';

const { Text } = Typography;

function TaskCard({ task, onClick, clickable = true, draggable = false, dragRef, dragAttributes,
  dragListeners, isDragging = false, actions = null }) {
  const dueState = getDueState(task);
  const { border } = getDueColor(dueState);
  const bg = dueState === 'overdue' ? 'var(--red-bg)' : dueState === 'near-due' ? 'var(--gold-bg)'
    : dueState === 'done' ? 'var(--surface)' : 'var(--task-normal-bg)';
  const label = dueState === 'done' && !task.completedAt
    ? `Đã xong · Hạn ${formatDateVN(task.dueDate)}` : getDueLabel(task, dueState);

  const labelColor =
    dueState === 'overdue' ? 'var(--red-text)' :
    dueState === 'near-due' ? 'var(--gold-text)' :
    dueState === 'done' ? 'var(--muted)' :
    'var(--task-normal-text)';

  return (
    <Card
      size="small"
      style={{
        background: bg,
        borderColor: border,
        borderWidth: 1,
        borderStyle: 'solid',
        marginBottom: 8,
        borderRadius: 6,
        cursor: isDragging ? 'grabbing' : draggable ? 'grab' : clickable ? 'pointer' : 'default',
        opacity: isDragging ? 0 : 1,
      }}
      styles={{ body: { padding: '8px 12px' } }}
      ref={dragRef}
      {...dragAttributes}
      {...dragListeners}
      hoverable={clickable}
      onClick={onClick}
      role={onClick ? 'button' : dragAttributes?.role}
      tabIndex={dragAttributes?.tabIndex ?? (onClick ? 0 : undefined)}
      onKeyDown={(event) => {
        dragListeners?.onKeyDown?.(event);
        if (!event.defaultPrevented && event.key === 'Enter') onClick?.(event);
      }}
    >
      <div className="kanban-task-content">
        <Text strong style={{ display: 'block', fontSize: 13 }}>
          {task.title} - {task.projectName}
        </Text>
        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
          Ưu tiên: {task.priority}
        </Text>
        <Text style={{ display: 'block', fontSize: 12, color: labelColor, fontWeight: 500 }}>
          {label}
        </Text>
      </div>
      {actions && <div className="kanban-task-actions" onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        {actions}
      </div>}
    </Card>
  );
}

export default TaskCard;
