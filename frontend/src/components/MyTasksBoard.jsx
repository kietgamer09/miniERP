import { Alert } from 'antd';

function MyTasksBoard() {
  return (
    <Alert
      type="info"
      showIcon
      message="Backend chưa cung cấp API danh sách công việc."
      description="Khu vực này sẽ hiển thị công việc từ dữ liệu thật khi backend bổ sung endpoint tương ứng."
    />
  );
}

export default MyTasksBoard;
