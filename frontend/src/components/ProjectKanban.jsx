import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Select, Space, Switch, Typography } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { listProjectTasks } from '../services/projectApi';
import { changeTaskStatus } from '../services/taskApi';
import TaskViews from './TaskViews';

const sortOptions = [
  { value: 'due', label: 'Theo hạn' },
  { value: 'priority', label: 'Theo ưu tiên' },
];

export default function ProjectKanban({ projectId, projectStatus, revision = 0, onOpen, onEdit, onTaskChanged }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(0);
  const [sortMode, setSortMode] = useState('due');
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => {
    let active = true;
    listProjectTasks(projectId)
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu task từ máy chủ không hợp lệ');
        if (active) setTasks(data);
      })
      .catch((fetchError) => { if (active) setError(fetchError.message || 'Không tải được công việc'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, requestKey, revision]);

  function reload() {
    setLoading(true);
    setError('');
    setRequestKey((key) => key + 1);
  }

  const visibleTasks = useMemo(() => mineOnly ? tasks.filter((task) => task.is_mine) : tasks, [mineOnly, tasks]);
  async function moveTask(task, status) {
    const updatedTask = await changeTaskStatus(task.id, status);
    onTaskChanged?.(task, updatedTask);
    return updatedTask;
  }
  return (
    <Card className="project-kanban-card" title="Công việc của dự án"
      extra={<Button icon={<ReloadOutlined />} disabled={loading} onClick={reload}>Tải lại</Button>}>
      <div className="kanban-toolbar">
        <div className="task-due-legend" aria-label="Chú giải hạn công việc">
          <span><i className="task-legend-overdue" />Quá hạn</span>
          <span><i className="task-legend-near" />Sắp hạn (trong 3 ngày)</span>
          <span><i className="task-legend-normal" />Chưa đến hạn</span>
        </div>
        <Space wrap>
          <Select aria-label="Sắp xếp công việc" value={sortMode} onChange={setSortMode}
            options={sortOptions} style={{ width: 150 }} />
          <Space size={6}>
            <FilterOutlined aria-hidden="true" />
            <Typography.Text>Công việc của bạn</Typography.Text>
            <Switch checked={mineOnly} onChange={setMineOnly} aria-label="Chỉ hiện công việc của bạn" />
          </Space>
        </Space>
      </div>
      {error ? <Alert type="error" showIcon title={error} action={<Button onClick={reload}>Thử lại</Button>} />
        : <TaskViews tasks={visibleTasks} loading={loading} locked={projectStatus === 'hoan_thanh'}
          onMove={moveTask} onOpen={onOpen} onEdit={onEdit}
          sortMode={sortMode} emptyText="Dự án chưa có task nào" />}
    </Card>
  );
}
