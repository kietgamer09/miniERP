/** Màn hình tiến độ riêng, dùng trường tổng hợp do API dự án trả về. */
import { Alert, Button, Card, Empty, List, Space, Spin, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import useProjects from '../hooks/useProjects';
import ProgressBar from '../components/ProgressBar';

const { Title, Text } = Typography;

function formatDate(date) {
  if (!date) return 'Chưa có ngày';
  const parts = date.slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
}

function ProjectProgress() {
  const { projects, loading, error, reload } = useProjects();

  return (
    <div className="project-progress-page">
      <Space wrap className="project-page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Tiến độ dự án</Title>
          <Text type="secondary">Theo dõi phần việc đã hoàn thành trong từng dự án</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
      </Space>

      {error ? (
        <Alert type="error" showIcon title={error} action={<Button onClick={reload}>Thử lại</Button>} />
      ) : loading ? (
        <div className="project-panel-loading"><Spin /></div>
      ) : projects.length ? (
        <Card>
          <List
            dataSource={projects}
            rowKey="id"
            renderItem={(project) => (
              <List.Item>
                <Card className="project-progress-item" size="small">
                  <Space className="project-progress-item-heading" align="start">
                    <div>
                      <Text strong>{project.name}</Text>
                      <div><Text type="secondary">Mã dự án: {project.code}</Text></div>
                    </div>
                    <Tag color={project.status === 'hoan_thanh' ? 'green' : 'blue'}>
                      {project.status === 'hoan_thanh' ? 'Hoàn thành' : 'Đang thực hiện'}
                    </Tag>
                  </Space>
                  <Text type="secondary">
                    Thời hạn: {formatDate(project.start_date)} – {formatDate(project.end_date)}
                  </Text>
                  <ProgressBar {...project} />
                </Card>
              </List.Item>
            )}
          />
        </Card>
      ) : (
        <Card><Empty description="Chưa có dự án để theo dõi tiến độ" /></Card>
      )}
    </div>
  );
}

export default ProjectProgress;
