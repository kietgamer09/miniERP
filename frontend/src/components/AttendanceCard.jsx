/**
 * AttendanceCard – Khu chấm công trên Trang chủ.
 *
 * Hiển thị giờ hiện tại (cập nhật mỗi giây), ngày hiện tại, nút Vào/Ra ca.
 * Chuỗi trạng thái: chưa vào → "Vào ca" → "Ra ca" → "Đã đủ ca hôm nay".
 *
 * Tách riêng vì logic đồng hồ + state chấm công không liên quan các khu khác.
 */
import { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Divider } from 'antd';
import { ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { formatDateVN, formatFullDateVN } from '../utils/dates';

const { Text, Title } = Typography;

/** Icon bàn tay chấm công theo phác thảo */
function HandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: '-2px', marginRight: 4 }}>
      <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v6.25a.75.75 0 0 0 1.5 0v-5a1.5 1.5 0 0 1 3 0v5a.75.75 0 0 0 1.5 0v-2.5a1.5 1.5 0 0 1 3 0v7.25c0 5.25-4.25 9.5-9.5 9.5S3.5 17.25 3.5 12c0-1.7.5-3.3 1.4-4.6l3.6 4.35V4.5A1.5 1.5 0 0 1 10 3a1.5 1.5 0 0 1 1.5 1.5v4.25a.75.75 0 0 0 1.5 0V3.5A1.5 1.5 0 0 1 12 2z" />
    </svg>
  );
}

function AttendanceCard() {
  const [now, setNow] = useState(new Date());
  const [checkIn, setCheckIn] = useState(null);   // giờ vào ca
  const [checkOut, setCheckOut] = useState(null);  // giờ ra ca

  // Cập nhật đồng hồ mỗi giây
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
  const dateStr = formatDateVN(now);

  // Xác định trạng thái nút
  let btnLabel = 'Vào ca';
  let btnDisabled = false;
  if (checkIn && checkOut) {
    btnLabel = 'Đã đủ ca hôm nay';
    btnDisabled = true;
  } else if (checkIn) {
    btnLabel = 'Ra ca';
  }

  function handleClick() {
    const currentTime = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    if (!checkIn) {
      setCheckIn(currentTime);
    } else if (!checkOut) {
      setCheckOut(currentTime);
    }
  }

  return (
    <Card
      style={{ height: '100%' }}
      styles={{ body: { padding: 0 } }}
    >
      {/* Dòng trên: giờ + ngày + nút */}
      <div
        style={{
          background: '#f0f0f0',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space size="large">
          <Space>
            <ClockCircleOutlined />
            <Text strong>{timeStr}</Text>
          </Space>
          <Space>
            <CalendarOutlined />
            <Text strong>{dateStr}</Text>
          </Space>
        </Space>

        <Button
          type="primary"
          icon={<HandIcon />}
          disabled={btnDisabled}
          onClick={handleClick}
          style={{ minWidth: 120 }}
        >
          {btnLabel}
        </Button>
      </div>

      {/* Dòng dưới: khung thông tin ca */}
      <div style={{ padding: 16 }}>
        <div
          style={{
            background: '#fafafa',
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <Text type="secondary" style={{ background: '#e8e8e8', padding: '2px 8px', borderRadius: 4 }}>
            Hôm nay
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text strong>{formatFullDateVN(now)}</Text>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div style={{ display: 'flex', gap: 40 }}>
            <div>
              <Text type="secondary">Giờ vào</Text>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {checkIn || '--:--:--'}
                </Title>
              </div>
            </div>
            <Divider type="vertical" style={{ height: 'auto' }} />
            <div>
              <Text type="secondary">Giờ ra</Text>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {checkOut || '--:--:--'}
                </Title>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default AttendanceCard;
