/**
 * Home – Trang chủ của miniERP.
 *
 * Bố cục 2 hàng:
 * - Hàng trên: AttendanceCard (khoảng 46%) + TimesheetCard (khoảng 54%)
 * - Hàng dưới: MyTasksBoard (toàn chiều rộng)
 *
 * Một bản dùng cho cả 3 vai trò (menu khác, nội dung trang chủ giống nhau).
 */
import { Row, Col, Card } from 'antd';
import AttendanceCard from '../components/AttendanceCard';
import TimesheetCard from '../components/TimesheetCard';
import MyTasksBoard from '../components/MyTasksBoard';

function Home() {
  return (
    <div>
      {/* Hàng trên: Chấm công + Bảng công */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={11}>
          <AttendanceCard />
        </Col>
        <Col xs={24} lg={13}>
          <TimesheetCard />
        </Col>
      </Row>

      {/* Hàng dưới: Việc của tôi */}
      <Card styles={{ body: { padding: 16 } }}>
        <MyTasksBoard />
      </Card>
    </div>
  );
}

export default Home;
