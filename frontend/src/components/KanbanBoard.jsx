import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Col, message, Row, Spin } from 'antd';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { DONE_COLUMN_LABEL, TASK_COLUMNS } from '../config/taskConstants';
import { adaptTasks } from '../utils/taskAdapter';
import { sortTasks } from '../utils/taskStatus';
import KanbanCard from './KanbanCard';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import './KanbanBoard.css';

const statusIndexes = Object.fromEntries(TASK_COLUMNS.map(({ status }, index) => [status, index]));

function getInvalidMoveMessage(task, targetStatus, locked) {
  if (locked || task.project_status === 'hoan_thanh') return 'Dự án đã hoàn thành, Kanban bị khóa';
  const distance = Math.abs(statusIndexes[targetStatus] - statusIndexes[task.status]);
  if (distance > 1) return 'Chỉ được chuyển task sang cột kề nhau';
  if (!task.can_edit && task.is_mine && task.status === 'xong') {
    return 'Chỉ Quản lý dự án hoặc Admin được kéo lùi task đã Xong';
  }
  if (!task.can_edit && !task.is_mine) return 'Bạn chỉ được đổi trạng thái task do mình phụ trách';
  return 'Bạn chỉ được đổi trạng thái task do mình phụ trách';
}

export default function KanbanBoard({ tasks = [], loading = false, locked = false, onMove,
  onOpen, onEdit, emptyText = 'Không có công việc', doneLabel = DONE_COLUMN_LABEL, sortMode = 'due' }) {
  const [boardState, setBoardState] = useState({ source: tasks, items: tasks });
  const boardTasks = boardState.source === tasks ? boardState.items : tasks;
  const [activeTask, setActiveTask] = useState(null);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const pendingRef = useRef(new Set());
  const [messageApi, contextHolder] = message.useMessage();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function updateBoardTasks(update) {
    setBoardState((previous) => {
      const current = previous.source === tasks ? previous.items : tasks;
      return { source: tasks, items: update(current) };
    });
  }

  const adaptedTasks = adaptTasks(boardTasks);
  const activeItem = adaptedTasks.find((task) => String(task.id) === String(activeTask?.id));

  function handleDragStart({ active }) {
    const id = String(active.id).replace(/^task-/, '');
    setActiveTask(boardTasks.find((task) => String(task.id) === id) || null);
  }

  async function handleDragEnd({ active, over }) {
    setActiveTask(null);
    if (!over || !onMove) return;
    const id = String(active.id).replace(/^task-/, '');
    const task = boardTasks.find((item) => String(item.id) === id);
    const targetStatus = String(over.id);
    if (!task || task.status === targetStatus) return;
    if (pendingRef.current.has(id)) return;

    if (locked || !task.allowed_moves?.includes(targetStatus)) {
      messageApi.warning(getInvalidMoveMessage(task, targetStatus, locked));
      return;
    }

    const completedAt = targetStatus === 'xong' ? new Date().toISOString() : null;
    pendingRef.current.add(id);
    setPendingIds(new Set(pendingRef.current));
    updateBoardTasks((current) => current.map((item) => String(item.id) === id
      ? { ...item, status: targetStatus, completed_at: completedAt } : item));

    try {
      const savedTask = await onMove(task, targetStatus);
      if (!savedTask || typeof savedTask !== 'object') throw new Error('Máy chủ không trả task đã cập nhật');
      updateBoardTasks((current) => current.map((item) => String(item.id) === id ? savedTask : item));
    } catch (error) {
      updateBoardTasks((current) => current.map((item) => String(item.id) === id ? task : item));
      messageApi.error(error.message || 'Không chuyển được task');
    } finally {
      pendingRef.current.delete(id);
      setPendingIds(new Set(pendingRef.current));
    }
  }

  return (
    <>
      {contextHolder}
      {locked && <Alert className="kanban-locked-alert" type="warning" showIcon
        title="Dự án đã hoàn thành, Kanban bị khóa" />}
      <Spin spinning={loading}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}>
          <Row gutter={[12, 12]} className="kanban-board">
            {TASK_COLUMNS.map((column, index) => {
              const columnTasks = sortTasks(
                adaptedTasks.filter((task) => task.status_code === column.status), sortMode,
              );
              const dropState = activeItem && activeItem.status_code !== column.status
                ? activeItem.allowed_moves?.includes(column.status) ? 'drop-valid' : 'drop-invalid'
                : undefined;
              return (
                <Col xs={24} lg={8} key={column.status}>
                  <KanbanColumn status={column.uiStatus} dropStatus={column.status} dropState={dropState}
                    label={index === 2 ? doneLabel : column.label} count={columnTasks.length} emptyText={emptyText}>
                    {columnTasks.map((task) => <KanbanCard key={task.id} task={task} locked={locked}
                      disabled={loading || pendingIds.has(String(task.id))} onOpen={onOpen} onEdit={onEdit} />)}
                  </KanbanColumn>
                </Col>
              );
            })}
          </Row>
          {createPortal(
            <DragOverlay dropAnimation={null} zIndex={2000}>
              {activeItem && <div className="kanban-drag-overlay"><TaskCard task={activeItem} clickable={false} /></div>}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
      </Spin>
    </>
  );
}
