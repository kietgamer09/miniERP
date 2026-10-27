import { Card, Typography } from 'antd';
import MyTasksBoard from '../components/MyTasksBoard';

export default function MyTasksPage() {
  return <div>
    <Typography.Title level={3}>Việc của tôi</Typography.Title>
    <Card><MyTasksBoard /></Card>
  </div>;
}
