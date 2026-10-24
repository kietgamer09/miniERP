/** Màn hình tổng quan dự án theo phác thảo; không tự tạo dữ liệu dự án mẫu. */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, List, Row, Spin, Typography } from 'antd';
import { listDepartments } from '../services/departmentApi';

const { Title, Text } = Typography;

function ProjectOverview() {
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [departmentError, setDepartmentError] = useState('');

  useEffect(() => {
    let isMounted = true;
    listDepartments()
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu phòng ban từ máy chủ không hợp lệ');
        if (isMounted) setDepartments(data);
      })
      .catch((error) => {
        if (isMounted) setDepartmentError(error.message || 'Không tải được danh sách phòng ban');
      })
      .finally(() => {
        if (isMounted) setLoadingDepartments(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <Title level={3}>Dự án</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Danh sách phòng ban" extra={<Text type="secondary">Đơn vị tham gia dự án</Text>}>
            {departmentError ? (
              <Alert type="error" showIcon message={departmentError} />
            ) : loadingDepartments ? (
              <Spin />
            ) : departments.length ? (
              <List
                dataSource={departments}
                rowKey="department_id"
                renderItem={(department) => (
                  <List.Item>
                    <Text strong>{department.department_name || 'Phòng ban chưa có tên'}</Text>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Chưa có phòng ban" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Danh sách dự án của bạn">
            <Empty description="Backend chưa cung cấp API danh sách dự án." />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Tiến độ dự án">
            <Empty description="Tiến độ sẽ hiển thị khi backend cung cấp API dự án và công việc." />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ProjectOverview;
