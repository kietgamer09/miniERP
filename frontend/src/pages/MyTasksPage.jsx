/** Bố cục Kanban theo phác thảo, chờ API công việc để tải dữ liệu thật. */
import { Alert, Card, Col, Empty, Row, Typography } from 'antd';

const { Title } = Typography;
const taskStatuses = ['Cần làm', 'Đang làm', 'Hoàn thành'];

function MyTasksPage() {
  return (
    <div>
      <Title level={3}>Việc của tôi</Title>
      <Alert
        type="info"
        showIcon
        message="Backend chưa cung cấp API danh sách công việc."
        description="Bảng Kanban sẽ hiển thị công việc được giao khi có dữ liệu từ máy chủ."
        style={{ marginBottom: 16 }}
      />

      <Card title="Bảng công việc">
        <Row gutter={[16, 16]}>
          {taskStatuses.map((status) => (
            <Col xs={24} md={8} key={status}>
              <Card size="small" title={status}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu" />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}

export default MyTasksPage;
