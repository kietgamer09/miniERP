import { Col, Row, Typography } from 'antd';
import AttendanceCard from '../components/AttendanceCard';
import TimesheetCard from '../components/TimesheetCard';
import { useLocation } from 'react-router-dom';

export default function Attendance() {
  const { key } = useLocation();
  return <div className="attendance-page">
    <Typography.Title level={3} style={{ margin: 0 }}>Chấm công</Typography.Title>
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={11}><AttendanceCard /></Col>
      <Col xs={24} lg={13}><TimesheetCard key={key} /></Col>
    </Row>
  </div>;
}
