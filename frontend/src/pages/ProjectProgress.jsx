/** Màn hình tiến độ riêng, dùng trường tổng hợp do API dự án trả về. */
import { Alert, Button, Card, Space, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import useProjects from '../hooks/useProjects';
import ProjectPerformanceChart from '../components/ProjectPerformanceChart';

const { Title, Text } = Typography;

function ProjectProgress() {
  const { projects, loading, error, reload } = useProjects();

  return (
    <div className="project-progress-page">
      <Space wrap className="project-page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Tiến độ và hiệu suất dự án</Title>
          <Text type="secondary">Số công việc theo trạng thái và tỷ lệ hoàn thành đúng hạn</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
      </Space>

      {error ? (
        <Alert type="error" showIcon title={error} action={<Button onClick={reload}>Thử lại</Button>} />
      ) : loading ? (
        <div className="project-panel-loading"><Spin /></div>
      ) : (
        <Card>
          <ProjectPerformanceChart projects={projects} />
        </Card>
      )}
    </div>
  );
}

export default ProjectProgress;
