import { Alert, Tabs, Typography } from 'antd';
import { useRole } from '../hooks/useAuth';
import LeaveApprovals from '../components/LeaveApprovals'; // Component duyệt nghỉ phép

// Tab giải trình chấm công tạm ẩn / cô lập để tránh lỗi bảng chưa tồn tại
function AttendanceExplanationsTab() {
  return (
    <div style={{ padding: '12px 0' }}>
      <Alert type="info" message="Chức năng giải trình chấm công đang tạm ẩn để tập trung cho hệ thống duyệt nghỉ phép." showIcon />
    </div>
  );
}

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
        defaultActiveKey="2" // Mặc định mở tab Duyệt đơn nghỉ phép để xem ngay các đơn vừa đăng ký
        items={[
          { 
            key: '1', 
            label: 'Duyệt giải trình chấm công', 
            children: <AttendanceExplanationsTab /> 
          },
          { 
            key: '2', 
            label: 'Duyệt đơn nghỉ phép', 
            children: <LeaveApprovals /> 
          }
        ]} 
      />
    </div>
  );
}
