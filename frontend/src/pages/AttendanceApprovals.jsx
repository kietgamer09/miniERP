import { Alert, Tabs, Typography } from 'antd';
import { useRole } from '../hooks/useAuth';
import LeaveApprovals from '../components/LeaveApprovals'; // Component duyệt nghỉ phép
import AttendanceExplanationApprovals from '../components/AttendanceExplanationApprovals'; // Component duyệt giải trình chấm công vừa tạo
import Overtime from './Overtime';

export default function AttendanceApprovals() {
  const { role } = useRole();
  const canReview = ['admin', 'manager', 'hr'].includes(role?.toLowerCase());

  if (!canReview) {
    return <Alert type="info" message="Chỉ Quản lý / HR / Admin mới được quyền phê duyệt." showIcon style={{ margin: 24 }} />;
  }

  return (
    <div className="approvals-page">
      <Typography.Title level={3} style={{ margin: 0 }}>Trung tâm phê duyệt</Typography.Title>
      
      <Tabs 
        defaultActiveKey="1" // Đặt mặc định mở tab Duyệt giải trình chấm công để test nhanh
        items={[
          { 
            key: '1', 
            label: 'Duyệt giải trình chấm công', 
            children: <AttendanceExplanationApprovals /> 
          },
          {
            key: '2',
            label: 'Duyệt đơn nghỉ phép',
            children: <LeaveApprovals />
          },
          { 
            key: 'overtime', 
            label: 'Duyệt làm thêm', 
            children: <Overtime approvalsOnly /> 
          }
        ]} 
      />
    </div>
  );
}