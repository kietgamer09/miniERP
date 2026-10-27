/** Hiển thị kết quả chấm công hôm nay; chưa tổng hợp tháng khi chưa có API đọc. */
import { Card, Alert, Descriptions } from 'antd';
import { useAttendance } from '../hooks/useAttendance';
import { formatDateOnlyVN } from '../utils/dates';

function TimesheetCard() {
  const { day, record } = useAttendance();
  return (
    <Card title="Bảng công" style={{ height: '100%' }}>
      <Alert
        type="info"
        showIcon
        title="Chưa có API bảng công tháng"
        description="API hiện hỗ trợ vào/ra ca. Bên dưới là kết quả hôm nay đã nhận được trên tab này, chưa phải bảng tổng hợp tháng."
        style={{ marginBottom: 16 }}
      />
      <Descriptions column={1} items={[
        { key: 'day', label: 'Hôm nay', children: formatDateOnlyVN(day) },
        { key: 'in', label: 'Giờ vào', children: record?.check_in || 'Chưa có kết quả' },
        { key: 'out', label: 'Giờ ra', children: record?.check_out || 'Chưa có kết quả' },
      ]} />
    </Card>
  );
}

export default TimesheetCard;
