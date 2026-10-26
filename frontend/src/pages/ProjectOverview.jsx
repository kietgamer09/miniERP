import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert, Button, Card, Col, Collapse, Empty, List, Popconfirm, Progress, Row, Space, Spin,
  Tag, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { deleteProject as deleteProjectRequest, listProjects } from '../services/projectApi';
import { useAuth } from '../context/AuthContext';
import ProjectFormModal from '../components/ProjectFormModal';

const { Title, Text } = Typography;

function formatDate(date) {
  if (!date) return 'Chưa có ngày';
  const parts = date.slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
}

function ProjectOverview() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
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

  async function handleDelete(project) {
    setDeletingProjectId(project.id);
    try {
      await deleteProjectRequest(project.id);
      messageApi.success('Đã xóa dự án và toàn bộ công việc, bình luận, thành viên thuộc dự án');
      reload();
    } catch (error) {
      messageApi.error(error.message || 'Không xóa được dự án');
    } finally {
      setDeletingProjectId(null);
    }
  }

  const canCreate = ['manager', 'admin'].includes(user?.role);
  const canEditProject = (project) => project.can_manage;

  function renderProjectSummary(project) {
    return (
      <Card size="small" className="project-summary-card">
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Link to={`/du-an/${project.id}`} style={{ fontWeight: 600 }}>{project.name}</Link>
            <div><Text type="secondary">Mã dự án: {project.code}</Text></div>
          </div>
          <Tag color={project.status === 'hoan_thanh' ? 'green' : 'blue'}>
            {project.status === 'hoan_thanh' ? 'Hoàn thành' : 'Đang thực hiện'}
          </Tag>
        </Space>
        <div className="project-summary-details">
          <Text>Thời hạn: {formatDate(project.start_date)} – {formatDate(project.end_date)}</Text>
          <Text>Thành viên: {project.members_count ?? 0}</Text>
          <Text>Quản lý dự án: {project.manager_name || 'Chưa phân công'}</Text>
        </div>
        {canEditProject(project) && (
          <Space wrap>
            <Button size="small" icon={<EditOutlined />} onClick={() => openForm(project)}>Sửa dự án</Button>
            <Popconfirm
              title="Xóa dự án này?"
              description="Công việc, bình luận và thành viên thuộc dự án cũng sẽ bị xóa vĩnh viễn."
              okText="Xóa dự án"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: deletingProjectId === project.id }}
              onConfirm={() => handleDelete(project)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} loading={deletingProjectId === project.id}>Xóa</Button>
            </Popconfirm>
          </Space>
        )}
      </Card>
    );
  }

  const progressItems = projects.map((project) => ({
    key: String(project.id),
    label: (
      <div className="project-progress-heading">
        <Text strong>{project.name}</Text>
        <Text type="secondary">Thời hạn: {formatDate(project.start_date)} – {formatDate(project.end_date)}</Text>
      </div>
    ),
    children: (
      <>
        <Progress percent={project.progress_percent ?? 0} />
        <Text type="secondary">
          {project.tasks_done ?? 0}/{project.tasks_total ?? 0} công việc hoàn thành
        </Text>
      </>
    ),
  }));

  return (
    <div className="project-overview">
      {contextHolder}
      <Space wrap className="project-page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Dự án</Title>
          <Text type="secondary">Danh sách dự án và tiến độ thực hiện</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
          {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Tạo dự án</Button>}
        </Space>
      </Space>

      <Row gutter={[16, 16]} className="project-overview-top">
        <Col xs={24} xl={12}>
          <Card title="Danh sách các ban nhóm công ty" className="project-overview-panel">
            <Empty description="Danh sách phòng ban chưa có API trong backend hiện tại." />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="Danh sách dự án của bạn" className="project-overview-panel">
            {loadError ? (
              <Alert type="error" showIcon title={loadError} action={<Button onClick={reload}>Thử lại</Button>} />
            ) : loading ? (
              <div className="project-panel-loading"><Spin /></div>
            ) : projects.length ? (
              <List
                className="project-panel-list"
                dataSource={projects}
                rowKey="id"
                renderItem={renderProjectSummary}
              />
            ) : (
              <Empty description="Bạn chưa tham gia dự án nào" />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Tiến độ tất cả dự án" className="project-progress-panel">
        {loadError ? (
          <Alert type="error" showIcon title={loadError} action={<Button onClick={reload}>Thử lại</Button>} />
        ) : loading ? (
          <div className="project-panel-loading"><Spin /></div>
        ) : progressItems.length ? (
          <Collapse items={progressItems} />
        ) : (
          <Empty description="Chưa có dự án để hiển thị tiến độ" />
        )}
      </Card>

      {formOpen && (
        <ProjectFormModal
          open
          project={selectedProject}
          onCancel={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

export default ProjectOverview;
