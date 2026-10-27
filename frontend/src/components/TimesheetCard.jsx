/** Bảng công: hiển thị trạng thái tích hợp cho tới khi backend có API bảng công. */
import { Card, Alert } from 'antd';

function TimesheetCard() {
  return (
    <Card title="Bảng công" style={{ height: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="Backend chưa cung cấp API bảng công."
        description="Chưa có dữ liệu chấm công để hiển thị."
      />
    </Card>
  );
}

export default TimesheetCard;
