import { Card, Empty } from 'antd';
import { useDroppable } from '@dnd-kit/core';

export default function KanbanColumn({ label, count, children, emptyText = 'Không có công việc', status, dropStatus, dropState }) {
  const { setNodeRef, isOver } = useDroppable({ id: dropStatus });
  const stateClass = dropState ? ` kanban-column--${dropState}` : '';
  const overClass = isOver ? ' is-drop-over' : '';
  return (
    <div ref={setNodeRef} className={`kanban-drop-target${stateClass}${overClass}`}>
      <Card size="small" className={`kanban-column kanban-column--${status}`} title={`${label} — ${count}`}>
        {count ? children : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />}
      </Card>
    </div>
  );
}
