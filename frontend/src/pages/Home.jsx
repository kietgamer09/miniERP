import { Row, Col, Card } from 'antd';
import AttendanceCard from '../components/AttendanceCard';
import TimesheetCard from '../components/TimesheetCard';
import MyTasksBoard from '../components/MyTasksBoard';
import HomeSummary from '../components/HomeSummary';

function Home() {
  return (
    <div className="home-page">
      <div className="home-overview">
        <HomeSummary />
        <AttendanceCard />
        <TimesheetCard compact />
      </div>
      <Card className="home-tasks" styles={{ body: { padding: 16 } }}>
        <MyTasksBoard compact />
      </Card>
    </div>
  );
}

export default Home;
