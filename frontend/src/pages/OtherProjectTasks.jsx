import { useEffect, useState } from 'react';
import { Alert, Button, Collapse, Empty, Space, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { listProjects, listProjectTasks } from '../services/projectApi';
import TaskViews from '../components/TaskViews';
import TaskDetailDrawer from '../components/TaskDetailDrawer';

const { Title, Text } = Typography;

export default function OtherProjectTasks() {
  const [loadState, setLoadState] = useState({ key: -1, projects: [], tasksByProject: {}, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [activeKey, setActiveKey] = useState([]);
  const [taskId, setTaskId] = useState(null);

  useEffect(() => {
    let active = true;
    listProjects().then(async (list) => {
      if (!Array.isArray(list)) throw new Error('Dữ liệu dự án từ máy chủ không hợp lệ');
      const results = await Promise.all(list.map(async (project) => {
        try {
          const tasks = await listProjectTasks(project.id);
          return [project.id, Array.isArray(tasks) ? tasks.filter((task) => !task.is_mine) : []];
        } catch (fetchError) {
          throw new Error(`${project.name}: ${fetchError.message || 'Không tải được task'}`);
        }
      }));
      if (active) {
        setLoadState({ key: reloadKey, projects: list, tasksByProject: Object.fromEntries(results), error: '' });
      }
    }).catch((fetchError) => {
      if (active) setLoadState({ key: reloadKey, projects: [], tasksByProject: {}, error: fetchError.message || 'Không tải được công việc' });
    });
    return () => { active = false; };
  }, [reloadKey]);

  const loading = loadState.key !== reloadKey;
  const projects = loading ? [] : loadState.projects;
  const tasksByProject = loading ? {} : loadState.tasksByProject;
  const error = loading ? '' : loadState.error;
  function reload() { setReloadKey((key) => key + 1); }

  const projectsWithTasks = projects
    .filter((project) => (tasksByProject[project.id] || []).length > 0);
  const items = projectsWithTasks.map((project) => {
    const tasks = tasksByProject[project.id] || [];
    return {
      key: String(project.id),
      label: <Space wrap><Text strong>{project.name}</Text><Text type="secondary">{project.code}</Text>
        <Text type="secondary">{tasks.length} công việc của thành viên khác</Text></Space>,
      children: <TaskViews tasks={tasks} readOnly loading={loading}
        onOpen={(task) => setTaskId(task.id)}
        emptyText="Không có công việc của thành viên khác" />,
    };
  });

  return <main className="work-projects-page">
    <Space wrap className="work-projects-header">
      <div><Title level={3} style={{ margin: 0 }}>Việc khác trong dự án</Title>
        <Text type="secondary">Các công việc được giao cho thành viên khác trong dự án bạn tham gia</Text></div>
      <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
    </Space>
    {error ? <Alert type="error" showIcon title={error} action={<Button onClick={reload}>Thử lại</Button>} />
      : loading ? <div className="project-panel-loading"><Spin /></div>
        : items.length ? <Collapse accordion activeKey={activeKey}
          onChange={(key) => setActiveKey(key ? [key] : [])} expandIconPlacement="end" items={items} />
          : <Empty description="Chưa có công việc nào được giao cho thành viên khác trong các dự án của bạn" />}
    <TaskDetailDrawer key={taskId || 'closed'} taskId={taskId} open={Boolean(taskId)}
      onClose={() => setTaskId(null)} readOnly />
  </main>;
}
