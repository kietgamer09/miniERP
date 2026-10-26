/** Danh sách các dự án người dùng tham gia, tách khỏi trang tổng quan dự án. */
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import useProjects from '../hooks/useProjects';

const { Title, Text } = Typography;

function formatDate(date) {
  if (!date) return 'Chưa có ngày';
  const parts = date.slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
}

function MyProjects() {
  const { projects, loading, error, reload } = useProjects();
  const navigate = useNavigate();

  return (
    <div className="my-projects-page">
      <Space className="project-page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Dự án của tôi</Title>
          <Text type="secondary">Các dự án bạn đang tham gia</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
      </Space>

      {error ? (
        <Alert type="error" showIcon title={error} action={<Button onClick={reload}>Thử lại</Button>} />
      ) : loading ? (
        <div className="project-panel-loading"><Spin /></div>
      ) : projects.length ? (
        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col xs={24} lg={12} key={project.id}>
              <Card
                title={<span><Link to={`/du-an/${project.id}`}>{project.name}</Link> <Text type="secondary">({project.code})</Text></span>}
                extra={<Tag color={project.status === 'hoan_thanh' ? 'green' : 'blue'}>
                  {project.status === 'hoan_thanh' ? 'Hoàn thành' : 'Đang thực hiện'}
                </Tag>}
                actions={[
                  <Link key="detail" to={`/du-an/${project.id}`}>Xem chi tiết</Link>,
                  <Button key="progress" type="link" onClick={() => navigate('/du-an/tien-do')}>Xem tiến độ</Button>,
                ]}
              >
                <Space direction="vertical" size={6}>
                  <Text>Thời hạn: {formatDate(project.start_date)} – {formatDate(project.end_date)}</Text>
                  <Text>Quản lý dự án: {project.manager_name || 'Chưa phân công'}</Text>
                  <Text>Thành viên: {project.members_count ?? 0}</Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card><Empty description="Bạn chưa tham gia dự án nào" /></Card>
      )}
    </div>
  );
}

export default MyProjects;
