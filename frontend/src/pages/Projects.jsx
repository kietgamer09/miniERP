import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useRole } from '../hooks/useAuth';
import useProjects from '../hooks/useProjects';
import ProjectFormModal from '../components/ProjectFormModal';
import ProgressBar from '../components/ProgressBar';
import { formatDateOnlyVN } from '../utils/dates';
import DepartmentPreview from '../components/DepartmentPreview';

const { Title, Text } = Typography;

function Projects() {
  const { role } = useRole();
  const { projects, loading, error, reload } = useProjects();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const isAdmin = role === 'admin';

  function openForm(project = null) {
    setSelectedProject(project);
    setFormOpen(true);
  }

  function handleSaved() {
    setFormOpen(false);
    messageApi.success(selectedProject ? 'Cập nhật dự án thành công' : 'Tạo dự án thành công');
    reload();
  }

  function renderProjects(progress = false) {
    if (error) return <Alert type="error" showIcon title={error} action={<Button onClick={reload}>Thử lại</Button>} />;
    if (loading) return <div className="project-panel-loading"><Spin /></div>;
    if (!projects.length) return <Empty description="Bạn chưa tham gia dự án nào" />;
    return <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      {projects.map((project) => <Card key={project.id} size="small" className="project-summary-card">
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Link to={`/du-an/${project.id}`} style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{project.name}</Link>
          <Tag color={project.status === 'hoan_thanh' ? 'green' : 'blue'}>
            {project.status === 'hoan_thanh' ? 'Hoàn thành' : 'Đang thực hiện'}
          </Tag>
        </Space>
        <div className="project-summary-details">
          {!progress && <Text type="secondary">Mã dự án: {project.code}</Text>}
          <Text>Thời hạn: {formatDateOnlyVN(project.start_date)} – {formatDateOnlyVN(project.end_date)}</Text>
          {!progress && <>
            <Text>Thành viên: {project.members_count ?? 0}</Text>
            <Text>Quản lý dự án: {project.manager_name || 'Chưa phân công'}</Text>
          </>}
        </div>
        {progress ? <ProgressBar {...project} /> : <Space wrap>
          <Link to={`/du-an/${project.id}`}>Xem chi tiết</Link>
          {project.can_manage && <Button size="small" icon={<EditOutlined />} onClick={() => openForm(project)}>Sửa dự án</Button>}
        </Space>}
      </Card>)}
    </Space>;
  }

  return (
    <div className="projects-page">
      {contextHolder}
      <Space wrap className="project-page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>{isAdmin ? 'Dự án công ty' : 'Dự án của tôi'}</Title>
          <Text type="secondary">{isAdmin ? 'Danh sách dự án và tiến độ toàn công ty' : 'Các dự án bạn đang tham gia'}</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
          {['manager', 'admin'].includes(role) && <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Tạo dự án</Button>}
        </Space>
      </Space>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Danh sách các ban nhóm công ty" className="project-overview-panel">
            <DepartmentPreview />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={isAdmin ? 'Danh sách dự án công ty' : 'Danh sách dự án của bạn'} className="project-overview-panel">
            {renderProjects()}
          </Card>
        </Col>
      </Row>
      <Card title="Tiến độ dự án hiện tại">{renderProjects(true)}</Card>
      {formOpen && <ProjectFormModal open project={selectedProject} onCancel={() => setFormOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}

export default Projects;
