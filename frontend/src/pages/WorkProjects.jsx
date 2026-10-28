import { useEffect, useState } from 'react';
import {
  Alert, Button, Empty, Popconfirm, Select, Space, Spin, Tag, Typography, message,
} from 'antd';
import {
  DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import {
  completeProject, deleteProject, getProject, listProjects, reopenProject,
} from '../services/projectApi';
import ProjectFormModal from '../components/ProjectFormModal';
import ProjectKanban from '../components/ProjectKanban';
import MemberList from '../components/MemberList';
import AddMembersModal from '../components/AddMembersModal';
import TaskFormModal from '../components/TaskFormModal';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import ProgressBar from '../components/ProgressBar';
import Attachments from '../components/Attachments';
import AllProjectTasks from '../components/AllProjectTasks';
import TaskComments from '../components/TaskComments';
import { formatDateOnlyVN } from '../utils/dates';

const { Title, Text } = Typography;

function WorkProjectPanel({ summary, role, onRefresh }) {
  const [loadState, setLoadState] = useState({ key: '', project: null, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const requestKey = `${summary.id}:${reloadKey}`;

  useEffect(() => {
    let active = true;
    getProject(summary.id)
      .then((data) => { if (active) setLoadState({ key: requestKey, project: data, error: '' }); })
      .catch((fetchError) => {
        if (active) setLoadState({ key: requestKey, project: null, error: fetchError.message || 'Không tải được dự án' });
      });
    return () => { active = false; };
  }, [summary.id, reloadKey, requestKey]);

  const loaded = loadState.key === requestKey;
  const project = loadState.project;
  const loading = !loaded && !project;
  const error = loaded ? loadState.error : '';

  function reload() { setReloadKey((key) => key + 1); }

  async function handleProjectAction(action, successText) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      messageApi.success(successText);
      reload();
      onRefresh();
    } catch (actionError) {
      messageApi.error(actionError.message || 'Không thực hiện được thao tác');
    } finally { setBusy(false); }
  }

  function handleSaved(text) {
    setFormOpen(false);
    setMembersOpen(false);
    setTaskFormOpen(false);
    setEditingTask(null);
    setTaskId(null);
    messageApi.success(text);
    reload();
    onRefresh();
  }

  const canManage = Boolean(project?.can_manage);
  const completed = project?.status === 'hoan_thanh';
  const canDelete = role === 'admin';

  return <div className="work-project-panel">
    {contextHolder}
    {loading ? <div className="project-panel-loading"><Spin /></div>
      : error ? <Alert type="error" showIcon title={error}
        action={<Button onClick={reload}>Thử lại</Button>} />
        : project && <>
          <div className="work-project-summary">
            <div className="work-project-meta">
              <Space wrap>
                <Text strong>{project.code}</Text>
                <Tag color={completed ? 'green' : 'blue'}>{completed ? 'Hoàn thành' : 'Đang thực hiện'}</Tag>
                {role === 'admin' ? <Tag color="purple">Toàn công ty</Tag>
                  : canManage ? <Tag color="gold">Quản lý</Tag> : <Tag>Thành viên</Tag>}
              </Space>
              <Text type="secondary">Thời hạn: {formatDateOnlyVN(project.start_date)} – {formatDateOnlyVN(project.end_date)}</Text>
              <Text type="secondary">Quản lý dự án: {project.manager_name || 'Chưa phân công'} · {project.members.length} thành viên</Text>
            </div>
            {project.description && <Text className="work-project-description">{project.description}</Text>}
            <ProgressBar {...project} />
            <Attachments type="projects" targetId={project.id} />
            <TaskComments projectId={project.id} />
          </div>

          {canManage && <Space wrap className="work-project-actions">
            <Button icon={<EditOutlined />} disabled={busy} onClick={() => setFormOpen(true)}>Sửa dự án</Button>
            <Button icon={<PlusOutlined />} disabled={busy} onClick={() => setMembersOpen(true)}>Thêm thành viên</Button>
            <Button type="primary" icon={<PlusOutlined />} disabled={busy || completed}
              onClick={() => setTaskFormOpen(true)}>Tạo task</Button>
            <Popconfirm title={completed ? 'Mở lại dự án này?' : 'Hoàn thành dự án này?'}
              okText={completed ? 'Mở lại' : 'Hoàn thành'} cancelText="Hủy"
              onConfirm={() => handleProjectAction(
                () => (completed ? reopenProject(project.id) : completeProject(project.id)),
                completed ? 'Đã mở lại dự án' : 'Đã hoàn thành dự án',
              )}>
              <Button disabled={busy}>{completed ? 'Mở lại dự án' : 'Hoàn thành dự án'}</Button>
            </Popconfirm>
            {canDelete && <Popconfirm title="Xóa dự án và toàn bộ task thuộc dự án?"
              description="Thao tác này không thể hoàn tác." okText="Xóa dự án" cancelText="Hủy"
              okButtonProps={{ danger: true }} onConfirm={() => handleProjectAction(
                () => deleteProject(project.id), 'Đã xóa dự án',
              )}>
              <Button danger icon={<DeleteOutlined />} disabled={busy}>Xóa dự án</Button>
            </Popconfirm>}
          </Space>}

          <MemberList project={project} onChanged={() => handleSaved('Đã cập nhật thành viên dự án')} />
          <ProjectKanban key={project.id} revision={reloadKey} projectId={project.id} projectStatus={project.status}
            onOpen={(task) => setTaskId(task.id)}
            onEdit={(task) => { setTaskId(null); setEditingTask(task); }}
            onTaskChanged={reload} />
          <TaskDetailDrawer key={taskId || 'closed'} taskId={taskId} open={Boolean(taskId)}
            onClose={() => setTaskId(null)} onEdit={(task) => {
              setTaskId(null);
              setEditingTask(task);
            }} />
          {formOpen && <ProjectFormModal open project={project} onCancel={() => setFormOpen(false)}
            onSaved={() => handleSaved('Cập nhật dự án thành công')} />}
          {membersOpen && <AddMembersModal projectId={project.id} onCancel={() => setMembersOpen(false)}
            onSaved={() => handleSaved('Thêm thành viên thành công')} />}
          {taskFormOpen && <TaskFormModal project={project} onCancel={() => setTaskFormOpen(false)}
            onSaved={() => handleSaved('Tạo task thành công')} />}
          {editingTask && <TaskFormModal project={project} task={editingTask}
            onCancel={() => setEditingTask(null)} onSaved={() => handleSaved('Cập nhật task thành công')} />}
        </>}
  </div>;
}

export default function WorkProjects() {
  const { user } = useAuth();
  const role = user?.role;
  const [loadState, setLoadState] = useState({ key: -1, projects: [], error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState(() => {
    try { return localStorage.getItem('miniErpWorkProject') || 'all'; } catch { return 'all'; }
  });
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let active = true;
    listProjects()
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu dự án từ máy chủ không hợp lệ');
        if (active) setLoadState({ key: reloadKey, projects: data, error: '' });
      })
      .catch((fetchError) => {
        if (active) setLoadState({ key: reloadKey, projects: [], error: fetchError.message || 'Không tải được danh sách dự án' });
      });
    return () => { active = false; };
  }, [reloadKey]);

  const loading = loadState.key !== reloadKey;
  const projects = loading ? [] : loadState.projects;
  const error = loading ? '' : loadState.error;
  function reload() { setReloadKey((key) => key + 1); }

  const canCreate = role === 'admin' || role === 'manager';
  const selectedProject = projects.find(project => String(project.id) === selectedId);

  return <main className="work-projects-page">
    <Space wrap className="work-projects-header">
      <div><Title level={3} style={{ margin: 0 }}>Công việc</Title>
        <Text type="secondary">{role === 'admin' ? 'Tất cả dự án trong công ty'
          : role === 'manager' ? 'Dự án bạn tham gia và quản lý'
            : 'Dự án bạn tham gia'}</Text></div>
      <Space wrap>
        <Select className="work-project-picker" showSearch optionFilterProp="label" aria-label="Dự án hiển thị công việc"
          value={selectedProject ? selectedId : 'all'} loading={loading} style={{ width: 340, maxWidth: '100%' }}
          options={[{ value: 'all', label: 'Tất cả dự án trong phạm vi của bạn' }, ...projects.map(project => ({ value: String(project.id), label: `${project.name} (${project.code})` }))]}
          onChange={value => { setSelectedId(value); try { localStorage.setItem('miniErpWorkProject', value); } catch { /* Giữ trong phiên. */ } }} />
        <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
        {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo dự án</Button>}
      </Space>
    </Space>
    {error ? <Alert type="error" showIcon title={error}
      action={<Button onClick={reload}>Thử lại</Button>} />
      : loading ? <div className="project-panel-loading"><Spin /></div>
        : projects.length ? selectedProject
          ? <WorkProjectPanel key={selectedProject.id} summary={selectedProject} role={role} onRefresh={reload} />
          : <AllProjectTasks projects={projects} onChanged={reload} />
          : <Empty description={role === 'admin' ? 'Chưa có dự án trong công ty' : 'Bạn chưa tham gia dự án nào'} />}
    {createOpen && <ProjectFormModal open onCancel={() => setCreateOpen(false)}
      onSaved={() => { setCreateOpen(false); reload(); }} />}
  </main>;
}
