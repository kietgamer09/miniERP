import { useState } from 'react';
import { Alert, Button, Select, Space, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useMyWork } from '../hooks/useMyWork';
import { changeTaskStatus } from '../services/taskApi';
import { getProject } from '../services/projectApi';
import { adaptTasks } from '../utils/taskAdapter';
import { getDueState } from '../utils/taskStatus';
import KanbanBoard from './KanbanBoard';
import TaskDetailDrawer from './TaskDetailDrawer';
import TaskFormModal from './TaskFormModal';

export default function MyTasksBoard() {
  const { tasks, loading, error, warning, reload } = useMyWork();
  const [sortMode, setSortMode] = useState('due');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const overdueCount = adaptTasks(tasks)
    .filter((task) => task.status_code !== 'xong' && getDueState(task) === 'overdue').length;
  async function moveTask(task, status) {
    const updatedTask = await changeTaskStatus(task.id, status);
    reload();
    return updatedTask;
  }

  async function editTask(task) {
    setSelectedTaskId(null);
    try {
      const project = await getProject(task.project_id);
      setEditor({ project, task });
    } catch (error) {
      messageApi.error(error.message || 'Không tải được dự án để sửa task');
    }
  }

  return <>
    {contextHolder}
    <Space orientation="vertical" size={16} className="task-board my-tasks-board" style={{ display: 'flex' }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap size={16}>
          <Typography.Text strong>Công việc của tôi</Typography.Text>
          <Typography.Text style={{ color: overdueCount ? 'var(--red-text)' : 'var(--muted)' }}>
            Quá hạn: {overdueCount}
          </Typography.Text>
          <div className="task-due-legend" aria-label="Chú giải hạn công việc">
            <span><i className="task-legend-overdue" />Quá hạn</span>
            <span><i className="task-legend-near" />Sắp hạn (trong 3 ngày)</span>
            <span><i className="task-legend-normal" />Chưa đến hạn</span>
          </div>
        </Space>
        <Space wrap>
          <Select aria-label="Sắp xếp công việc" value={sortMode} onChange={setSortMode} style={{ width: 150 }}
            options={[{ value: 'due', label: 'Theo hạn' }, { value: 'priority', label: 'Theo ưu tiên' }]} />
          <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
        </Space>
      </Space>
      {error && <Alert type="error" title={error} showIcon />}
      {warning && <Alert type="warning" title={warning} showIcon />}
      <KanbanBoard tasks={tasks} loading={loading} onMove={moveTask} sortMode={sortMode}
        doneLabel="Hoàn thành (trong tuần này)" emptyText="Bạn chưa có việc nào"
        onOpen={(task) => setSelectedTaskId(task.id)} onEdit={editTask} />
    </Space>
    <TaskDetailDrawer key={selectedTaskId || 'closed'} taskId={selectedTaskId} open={Boolean(selectedTaskId)} onClose={() => setSelectedTaskId(null)}
      onEdit={editTask} />
    {editor && <TaskFormModal project={editor.project} task={editor.task}
      onCancel={() => setEditor(null)} onSaved={() => {
        setEditor(null);
        reload();
        messageApi.success('Cập nhật task thành công');
      }} />}
  </>;
}
