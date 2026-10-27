import { Row, Col, Card } from 'antd';
import AttendanceCard from '../components/AttendanceCard';
import TimesheetCard from '../components/TimesheetCard';
import MyTasksBoard from '../components/MyTasksBoard';

function Home() {
  return (
    <div className="home-page">
      <Row className="home-top" gutter={[12, 12]}>
        <Col xs={24} lg={11}>
          <AttendanceCard />
        </Col>
        <Col xs={24} lg={13}>
          <TimesheetCard />
        </Col>
      </Row>
      <Card className="home-tasks" styles={{ body: { padding: 16 } }}>
        <MyTasksBoard />
      </Card>
    </div>
  );
}

export default Home;
