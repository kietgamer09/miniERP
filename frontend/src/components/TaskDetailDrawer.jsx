import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Spin, Tag, Tooltip } from 'antd';
import { EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { getTask } from '../services/taskApi';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../config/taskConstants';
import { adaptTask } from '../utils/taskAdapter';
import { formatDateVN } from '../utils/dates';
import { getDueState } from '../utils/taskStatus';
import TaskComments from './TaskComments';
import Attachments from './Attachments';

export default function TaskDetailDrawer({ taskId, open, onClose, onEdit, readOnly = false }) {
  const [loadState, setLoadState] = useState({ key: '', task: null, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${taskId ?? ''}:${reloadKey}`;

  useEffect(() => {
    if (!open || !taskId) return undefined;
    let active = true;
    getTask(taskId)
      .then((result) => {
        if (!result || typeof result !== 'object') throw new Error('Dữ liệu task từ máy chủ không hợp lệ');
        if (active) setLoadState({ key: requestKey, task: result, error: '' });
      })
      .catch((fetchError) => {
        if (active) setLoadState({ key: requestKey, task: null, error: fetchError.message || 'Không tải được chi tiết task' });
      });
    return () => { active = false; };
  }, [taskId, open, reloadKey, requestKey]);

  const currentLoad = loadState.key === requestKey;
  const task = currentLoad ? loadState.task : null;
  const loading = Boolean(open && taskId && !currentLoad);
  const error = currentLoad ? loadState.error : '';
  const adapted = task ? adaptTask(task) : null;
  const dueState = adapted ? getDueState(adapted) : null;
  const dueWarning = dueState === 'overdue' || dueState === 'near-due';
  const completedProject = task?.project_status === 'hoan_thanh';
  const canEdit = Boolean(task?.can_edit);

  return (
    <Drawer title={task?.title || 'Chi tiết task'} open={open} onClose={onClose}
      width={560} styles={{ wrapper: { maxWidth: '100vw' } }}
      extra={canEdit && !readOnly && <Tooltip title={completedProject ? 'Mở lại dự án để sửa task' : undefined}>
        <span><Button icon={<EditOutlined />} disabled={completedProject || loading}
          onClick={() => onEdit?.(task)}>Sửa task</Button></span>
      </Tooltip>}>
      {loading && !task ? <div style={{ display: 'grid', minHeight: 180, placeItems: 'center' }}><Spin /></div>
        : error ? <Alert type="error" showIcon title={error}
          action={<Button icon={<ReloadOutlined />} onClick={() => setReloadKey((key) => key + 1)}>Thử lại</Button>} />
          : task && <>
            <Descriptions bordered column={1} size="small" items={[
              { key: 'description', label: 'Mô tả', children: <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{task.description || 'Chưa có mô tả'}</span> },
              { key: 'assignee', label: 'Người làm', children: task.assignee_name || 'Chưa phân công' },
              { key: 'creator', label: 'Người tạo', children: task.created_by_name || '—' },
              { key: 'due', label: 'Hạn chót', children: <>
                {formatDateVN(adapted.dueDate)} {dueWarning && <Tag color={dueState === 'overdue' ? 'red' : 'gold'}>
                  {dueState === 'overdue' ? 'Quá hạn' : 'Sắp hạn'}
                </Tag>}
              </> },
              { key: 'priority', label: 'Mức ưu tiên', children: TASK_PRIORITY_LABELS[task.priority] || task.priority },
              { key: 'status', label: 'Trạng thái', children: TASK_STATUS_LABELS[task.status] || task.status },
              { key: 'project', label: 'Dự án', children: task.project_name },
            ]} />
            <Attachments key={`files-${task.id}`} type="tasks" targetId={task.id} readOnly={readOnly} />
            <TaskComments taskId={task.id} />
          </>}
    </Drawer>
  );
}
