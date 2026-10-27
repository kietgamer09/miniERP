import { Typography } from 'antd';
import MyTasksBoard from '../components/MyTasksBoard';

export default function MyTasks() {
  return (
    <main className="my-tasks-page">
      <Typography.Title level={3}>Việc của tôi</Typography.Title>
      <MyTasksBoard />
    </main>
  );
}
