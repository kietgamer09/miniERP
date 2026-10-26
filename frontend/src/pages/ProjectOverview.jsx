import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Progress, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listProjects } from '../services/projectApi';
import { useAuth } from '../context/AuthContext';
import ProjectFormModal from '../components/ProjectFormModal';

const { Title, Text } = Typography;

function ProjectOverview() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    let active = true;
    listProjects()
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu dự án từ máy chủ không hợp lệ');
        if (active) setProjects(data);
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'Không tải được danh sách dự án');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  function reload() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  function openForm(project = null) {
    setSelectedProject(project);
    setFormOpen(true);
  }

  function handleSaved() {
    setFormOpen(false);
    messageApi.success(selectedProject ? 'Cập nhật dự án thành công' : 'Thêm dự án thành công');
    reload();
  }

  const canCreate = ['manager', 'admin'].includes(user?.role);
  const columns = [
    { title: 'Mã dự án', dataIndex: 'code', width: 140 },
    {
      title: 'Tên dự án', dataIndex: 'name', width: 260,
      render: (name, project) => <div><Text strong>{name}</Text>{project.description && <div><Text type="secondary">{project.description}</Text></div>}</div>,
    },
    { title: 'Quản lý', dataIndex: 'manager_name', width: 170 },
    { title: 'Bắt đầu', dataIndex: 'start_date', width: 120 },
    { title: 'Kết thúc', dataIndex: 'end_date', width: 120 },
    { title: 'Thành viên', dataIndex: 'members_count', width: 110 },
    {
      title: 'Tiến độ', width: 170,
      render: (_, project) => <div><Progress percent={project.progress_percent} size="small" /><Text type="secondary">{project.tasks_done}/{project.tasks_total} công việc</Text></div>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 160,
      render: (status) => <Tag color={status === 'hoan_thanh' ? 'green' : 'blue'}>{status === 'hoan_thanh' ? 'Hoàn thành' : 'Đang thực hiện'}</Tag>,
    },
    {
      title: 'Thao tác', width: 90, fixed: 'right',
      // user_id và employee_id là hai khóa khác nhau; backend vẫn kiểm tra quyền khi lưu.
      render: (_, project) => (user?.role === 'admin' || (user?.employee_id != null && project.manager_id === user.employee_id))
        ? <Button icon={<EditOutlined />} onClick={() => openForm(project)}>Sửa</Button> : null,
    },
  ];

  return (
    <div>
      {contextHolder}
      <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Dự án</Title>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
          {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Thêm dự án</Button>}
        </Space>
      </Space>
      {loadError ? (
        <Alert type="error" showIcon title={loadError} action={<Button onClick={reload}>Thử lại</Button>} />
      ) : (
        <Table rowKey="id" columns={columns} dataSource={projects} loading={loading}
          scroll={{ x: 1340 }} pagination={false} locale={{ emptyText: <Empty description="Chưa có dự án" /> }} />
      )}
      {formOpen && <ProjectFormModal open project={selectedProject} onCancel={() => setFormOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}

export default ProjectOverview;
