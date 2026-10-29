import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Select, Space, Spin, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { getProject, listProjects } from '../services/projectApi';
import ProjectKanban from '../components/ProjectKanban';
import TaskFormModal from '../components/TaskFormModal';
import TaskDetailDrawer from '../components/TaskDetailDrawer';

const { Title, Text } = Typography;

export default function AssignTasks() {
  const [projectListState, setProjectListState] = useState({ key: -1, projects: [], error: '' });
  const [projectState, setProjectState] = useState({ key: -1, id: null, project: null, error: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    let active = true;
    listProjects().then((items) => {
      if (!Array.isArray(items)) throw new Error('Dữ liệu dự án từ máy chủ không hợp lệ');
      const manageable = items.filter((item) => item.can_manage);
      if (active) {
        setProjectListState({ key: reloadKey, projects: manageable, error: '' });
        setSelectedId((current) => manageable.some((item) => item.id === current)
          ? current : manageable[0]?.id ?? null);
      }
    }).catch((fetchError) => {
      if (active) setProjectListState({ key: reloadKey, projects: [], error: fetchError.message || 'Không tải được dự án' });
    });
    return () => { active = false; };
  }, [reloadKey]);

  const projectsLoading = projectListState.key !== reloadKey;
  const projects = projectsLoading ? [] : projectListState.projects;
  const activeId = projects.some((item) => item.id === selectedId) ? selectedId : projects[0]?.id ?? null;

  useEffect(() => {
    if (!activeId) return undefined;
    let active = true;
    getProject(activeId).then((data) => {
      if (active) setProjectState({ key: reloadKey, id: activeId, project: data, error: '' });
    }).catch((fetchError) => {
      if (active) setProjectState({ key: reloadKey, id: activeId, project: null, error: fetchError.message || 'Không tải được chi tiết dự án' });
    });
    return () => { active = false; };
  }, [activeId, reloadKey]);

  const projectSettled = projectState.key === reloadKey && projectState.id === activeId;
  const activeProject = projectSettled ? projectState.project : null;
  const projectLoading = Boolean(activeId && !projectSettled);
  const loading = projectsLoading || projectLoading;
  const error = projectsLoading ? '' : projectListState.error
    || (projectSettled ? projectState.error : '');

  function refresh() { setReloadKey((key) => key + 1); }

  function taskSaved(text) {
    setTaskFormOpen(false);
    setEditingTask(null);
    setTaskId(null);
    messageApi.success(text);
    refresh();
  }

  return <main className="work-projects-page">
    {contextHolder}
    <Space wrap className="work-projects-header">
      <div><Title level={3} style={{ margin: 0 }}>Giao việc</Title>
        <Text type="secondary">Chọn dự án bạn quản lý để phân công và theo dõi công việc</Text></div>
      <Space wrap>
        <Select aria-label="Chọn dự án để giao việc" value={activeId} onChange={setSelectedId}
          placeholder="Chọn dự án" style={{ minWidth: 220 }} loading={loading}
          options={projects.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))} />
        <Button icon={<ReloadOutlined />} disabled={loading} onClick={refresh}>Tải lại</Button>
        <Button type="primary" icon={<PlusOutlined />} disabled={!activeProject || activeProject.status === 'hoan_thanh' || loading}
          onClick={() => setTaskFormOpen(true)}>Tạo task</Button>
      </Space>
    </Space>
    {error ? <Alert type="error" showIcon title={error} />
      : loading || (selectedId && !activeProject) ? <div className="project-panel-loading"><Spin /></div>
        : !projects.length ? <Empty description="Bạn chưa quản lý dự án nào" />
          : activeProject && <>
            <div className="work-project-summary">
              <Space wrap><Text strong>{activeProject.name}</Text><Text type="secondary">{activeProject.code}</Text>
                <Text type="secondary">{activeProject.members.length} thành viên</Text></Space>
            </div>
            <ProjectKanban key={`${activeProject.id}-${reloadKey}`} projectId={activeProject.id} projectStatus={activeProject.status}
              onOpen={(task) => setTaskId(task.id)}
              onEdit={(task) => { setTaskId(null); setEditingTask(task); }}
              onTaskChanged={refresh} />
            <TaskDetailDrawer key={taskId || 'closed'} taskId={taskId} open={Boolean(taskId)}
              onClose={() => setTaskId(null)} onEdit={(task) => { setTaskId(null); setEditingTask(task); }} />
            {taskFormOpen && <TaskFormModal project={activeProject} onCancel={() => setTaskFormOpen(false)}
              onSaved={() => taskSaved('Đã giao task thành công')} />}
            {editingTask && <TaskFormModal project={activeProject} task={editingTask}
              onCancel={() => setEditingTask(null)} onSaved={() => taskSaved('Đã cập nhật task')} />}
          </>}
  </main>;
}
