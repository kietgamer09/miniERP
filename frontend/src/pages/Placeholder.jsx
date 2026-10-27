import { useLocation } from 'react-router-dom';
import { Card, Typography } from 'antd';

const { Title, Text } = Typography;

function Placeholder() {
  const { pathname } = useLocation();

  return (
    <Card style={{ textAlign: 'center', marginTop: 40 }}>
      <Title level={3}>🚧 Đang phát triển</Title>
      <Text type="secondary">Trang: {pathname}</Text>
    </Card>
  );
}

export default Placeholder;
