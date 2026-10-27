import { Row, Col, Card } from 'antd';
import AttendanceCard from '../components/AttendanceCard';
import TimesheetCard from '../components/TimesheetCard';
import MyTasksBoard from '../components/MyTasksBoard';

function Home() {
  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={11}>
          <AttendanceCard />
        </Col>
        <Col xs={24} lg={13}>
          <TimesheetCard />
        </Col>
      </Row>
      <Card styles={{ body: { padding: 16 } }}>
        <MyTasksBoard />
      </Card>
    </div>
  );
}

export default Home;
