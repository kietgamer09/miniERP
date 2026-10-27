/**
 * AttendanceCard – Khu chấm công trên Trang chủ.
 *
 * Đồng hồ Việt Nam và thao tác vào/ra ca qua API thật.
 *
 * Tách riêng vì logic đồng hồ + state chấm công không liên quan các khu khác.
 */
import { useState, useEffect } from 'react';
import { App, Card, Button, Typography, Space, Divider, Alert, Popconfirm, Tag } from 'antd';
import { ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { formatDateOnlyVN, formatFullDateVN, parseDateOnly } from '../utils/dates';
import { useAttendance } from '../hooks/useAttendance';
import { useNavigate } from 'react-router-dom';
import { explanationLabels } from '../utils/attendance';

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
  const [now, setNow] = useState(() => new Date());
  const { day, record, dayInfo, loading, busy, error, notice, weekend, refresh, submitAttendance } = useAttendance();
  const navigate = useNavigate();
  const { message } = App.useApp();

  // Cập nhật đồng hồ mỗi giây
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
  const dateStr = formatDateOnlyVN(day);

  async function punch(action) {
    try {
      const result = await submitAttendance(action);
      if (result) message.success(result.message || 'Chấm công thành công');
    } catch { /* Hiện nguyên văn lỗi backend trong thẻ bên dưới. */ }
  }

  return (
    <Card
      style={{ height: '100%' }}
      styles={{ body: { padding: 0 } }}
    >
      {/* Dòng trên: giờ + ngày + nút */}
      <div
        className="attendance-summary"
        style={{
          background: 'var(--subtle-bg)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space size="large" className="attendance-time-info">
          <Space>
            <ClockCircleOutlined />
            <Text strong>{timeStr}</Text>
          </Space>
          <Space>
            <CalendarOutlined />
            <Text strong>{dateStr}</Text>
          </Space>
        </Space>

        <Space wrap className="attendance-action">
          <Button type="primary" icon={<HandIcon />} loading={busy === 'in'}
            disabled={loading || !dayInfo || weekend || Boolean(busy) || Boolean(record?.check_in) || dayInfo?.status === 'conflict'} onClick={() => punch('in')}>
            Vào ca
          </Button>
          <Popconfirm title="Xác nhận ra ca?" description="Máy chủ sẽ ghi nhận giờ ra ca ngay lúc xác nhận."
            okText="Ra ca" cancelText="Hủy" onConfirm={() => punch('out')}
            disabled={loading || !dayInfo || weekend || Boolean(busy) || !record?.check_in || Boolean(record?.check_out)}>
            <Button loading={busy === 'out'} disabled={loading || !dayInfo || weekend || Boolean(busy) || !record?.check_in || Boolean(record?.check_out)}>Ra ca</Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Dòng dưới: khung thông tin ca */}
      <div style={{ padding: 16 }}>
        <div
          className={`attendance-status--${dayInfo?.color || 'default'}`}
          style={{
            background: 'var(--subtle-bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text type="secondary" style={{ background: 'var(--border)', padding: '2px 8px', borderRadius: 4 }}>
              Hôm nay
            </Text>
          </div>
          <div style={{ marginTop: 8 }}>
            <Text strong>{formatFullDateVN(parseDateOnly(day))}</Text>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} action={<Button onClick={refresh}>Tải lại</Button>} />}
          {notice && <Alert type="warning" title={notice} showIcon style={{ marginBottom: 12 }} />}
          {weekend && <Alert type="info" title="Thứ 7 và Chủ nhật không cần chấm công." style={{ marginBottom: 12 }} />}
          <Tag style={{ whiteSpace: 'normal' }} color={dayInfo?.color}>
            {loading ? 'Đang tải công từ máy chủ' : dayInfo?.label || 'Chưa tải được chấm công'}
          </Tag>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
            Dữ liệu lưu trên máy chủ, đọc lại giữa các tab và trình duyệt. Giờ Việt Nam; tự đồng bộ mỗi 15 giây và khi quay lại tab.
          </Typography.Paragraph>
          {dayInfo?.can_explain && !dayInfo.explanation && <Alert type={dayInfo.color === 'red' ? 'error' : 'warning'}
            title="Có thể gửi giải trình và đề nghị chấm bù." showIcon style={{ marginBottom: 12 }}
            action={<Button onClick={() => navigate(`/cham-cong/bang-cong?date=${day}`)}>Giải trình</Button>} />}
          {dayInfo?.explanation && <Tag>{explanationLabels[dayInfo.explanation.status]}</Tag>}

          <div className="attendance-punch-times" style={{ display: 'flex', gap: 40 }}>
            <div>
              <Text type="secondary">Giờ vào</Text>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {record?.check_in || '--:--:--'}
                </Title>
              </div>
            </div>
            <Divider orientation="vertical" style={{ height: 'auto' }} />
            <div>
              <Text type="secondary">Giờ ra</Text>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {record?.check_out || '--:--:--'}
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
