import { useEffect, useState } from 'react';
import { Alert, Button, Card, Space, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { listProjectTasks } from '../services/projectApi';
import { getDueState } from '../utils/taskStatus';
import { formatDateOnlyVN, parseDateOnly } from '../utils/dates';
import './ProjectTaskTable.css';

const priorityLabels = { thap: 'Thấp', trung_binh: 'Trung bình', cao: 'Cao' };
const statusLabels = { can_lam: 'Cần làm', dang_lam: 'Đang làm', xong: 'Xong' };

function getTaskDueState(task, today) {
  const dueDate = parseDateOnly(task.due_date);
  if (!dueDate) return 'normal';
  // Chỉ đổi định dạng tại đây để dùng lại quy tắc cảnh báo của TaskCard.
  return getDueState({ status: task.status === 'xong' ? 'done' : 'todo', dueDate }, today);
}

function ProjectTaskTable({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    listProjectTasks(projectId)
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu task từ máy chủ không hợp lệ');
        if (active) setTasks(data);
      })
      .catch((error) => { if (active) setLoadError(error.message || 'Không tải được công việc'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, reloadKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  function reload() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  const columns = [
    { title: 'Tiêu đề', dataIndex: 'title', width: 260, render: (value) => <span style={{ overflowWrap: 'anywhere' }}>{value}</span> },
    { title: 'Người làm', dataIndex: 'assignee_name', width: 180, render: (value) => value || '—' },
    { title: 'Hạn chót', dataIndex: 'due_date', width: 180, render: (value, task) => {
      const state = getTaskDueState(task, today);
      return <Space wrap>{formatDateOnlyVN(value)}
        {state === 'overdue' && <Tag color="red">Quá hạn</Tag>}
        {state === 'near-due' && <Tag color="gold">Sắp hạn</Tag>}
      </Space>;
    } },
    { title: 'Ưu tiên', dataIndex: 'priority', width: 120, render: (value) => <Tag>{priorityLabels[value] || value}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (value) => statusLabels[value] || value },
  ];

  return <Card title="Công việc của dự án" extra={<Button icon={<ReloadOutlined />} disabled={loading} onClick={reload}>Tải lại</Button>}>
    {loadError ? <Alert type="error" showIcon title={loadError} action={<Button onClick={reload}>Thử lại</Button>} />
      : <Table className="project-task-table" rowKey="id" loading={loading} columns={columns} dataSource={tasks}
        rowClassName={(task) => `task-row-${getTaskDueState(task, today)}`}
        pagination={false} scroll={{ x: 870 }} locale={{ emptyText: 'Dự án chưa có task nào' }} />}
  </Card>;
}

export default ProjectTaskTable;
