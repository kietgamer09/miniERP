import { Col, Row, Typography } from 'antd';
import AttendanceCard from '../components/AttendanceCard';
import TimesheetCard from '../components/TimesheetCard';

export default function Attendance() {
  return <div>
    <Typography.Title level={3}>Chấm công</Typography.Title>
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={11}><AttendanceCard /></Col>
      <Col xs={24} lg={13}><TimesheetCard /></Col>
    </Row>
  </div>;
}
