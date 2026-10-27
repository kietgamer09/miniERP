import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Col, Empty, Row, Select, Space, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useMyWork } from '../hooks/useMyWork';
import { parseDateOnly } from '../utils/dates';
import { sortTasks } from '../utils/taskStatus';
import TaskCard from './TaskCard';

const statusMap = { can_lam: 'todo', dang_lam: 'doing', xong: 'done' };
const priorityMap = { cao: 'Cao', trung_binh: 'Trung bình', thap: 'Thấp' };

export default function MyTasksBoard() {
  const { tasks, loading, error, warning, reload } = useMyWork();
  const [sortMode, setSortMode] = useState('due');
  const normalized = tasks.map(task => ({ ...task, projectName: task.project_name,
    status: statusMap[task.status], priority: priorityMap[task.priority], dueDate: parseDateOnly(task.due_date) }));
  return <Space orientation="vertical" size={16} className="task-board" style={{ display: 'flex' }}>
    <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
      <Space wrap size={16}>
        <Typography.Text strong>Công việc của tôi ({tasks.length})</Typography.Text>
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
    {loading ? <Spin /> : <Row gutter={[12, 12]}>
      {[['todo', 'Cần làm'], ['doing', 'Đang làm'], ['done', 'Hoàn thành']].map(([status, label]) => {
        const items = sortTasks(normalized.filter(task => task.status === status), sortMode);
        return <Col xs={24} lg={8} key={status}>
          <Card size="small" className="task-column" title={`${label} — ${items.length}`}>
            {!items.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có công việc" />}
            {items.map(task => <Link key={task.id} to={`/du-an/${task.project_id}`} style={{ display: 'block' }}>
              <TaskCard task={task} />
            </Link>)}
          </Card>
        </Col>;
      })}
    </Row>}
  </Space>;
}
