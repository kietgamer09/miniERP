import { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Divider, message, Alert, Modal } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { formatDateVN, formatFullDateVN, parseDateOnly } from '../utils/dates';
import { useAttendance } from '../hooks/useAttendance';

const { Text, Title } = Typography;

function HandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: '-2px', marginRight: 4 }}>
      <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v6.25a.75.75 0 0 0 1.5 0v-5a1.5 1.5 0 0 1 3 0v5a.75.75 0 0 0 1.5 0v-2.5a1.5 1.5 0 0 1 3 0v7.25c0 5.25-4.25 9.5-9.5 9.5S3.5 17.25 3.5 12c0-1.7.5-3.3 1.4-4.6l3.6 4.35V4.5A1.5 1.5 0 0 1 10 3a1.5 1.5 0 0 1 1.5 1.5v4.25a.75.75 0 0 0 1.5 0V3.5A1.5 1.5 0 0 1 12 2z" />
    </svg>
  );
}

function AttendanceCard() {
  const [now, setNow] = useState(() => new Date());
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const attendance = useAttendance();
  const record = attendance?.record;
  const day = attendance?.day;
  const dayInfo = attendance?.dayInfo;
  const weekend = attendance?.weekend;
  const busy = attendance?.busy;
  const loading = attendance?.loading;
  const error = attendance?.error;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
  const dayDate = parseDateOnly(day);
  const dateStr = formatDateVN(dayDate || now);
  const checkInTime = record?.check_in || '--:--:--';
  const checkOutTime = record?.check_out || '--:--:--';
  const isCheckOutMode = Boolean(record?.check_in && !record?.check_out);
  const isCompleted = Boolean(record?.check_in && record?.check_out);
  const punching = busy === 'in' || busy === 'out';

  const handleAttendanceClick = async (confirmedEarly = false) => {
    if (!attendance?.submitAttendance) return;
    try {
      const action = record?.check_in ? 'out' : 'in';
      const res = await attendance.submitAttendance(action, confirmedEarly);
      if (!res) return;
      if (res.requireConfirmation) {
        modal.confirm({
          title: 'Xác nhận ra ca sớm', content: res.message,
          okText: 'Đồng ý ra sớm', cancelText: 'Hủy',
          onOk: () => handleAttendanceClick(true),
        });
        return;
      }
      messageApi.success(res?.message || (action === 'in' ? 'Vào ca thành công!' : 'Ra ca thành công!'));
    } catch (err) {
      messageApi.error(err.message || 'Có lỗi xảy ra khi chấm công');
    }
  };

  const isCurrentLate = timeStr > '08:00:00';
  let btnText = 'Chấm công';
  let btnBg = '#1890ff';
  let btnIcon = <HandIcon />;
  let isDisabled = weekend || loading || Boolean(error) || punching || !attendance?.submitAttendance;

  if (weekend) {
    btnText = 'Cuối tuần không chấm công';
    btnBg = '#d9d9d9';
    isDisabled = true;
  } else if (!isCheckOutMode && !isCompleted) {
    if (isCurrentLate) {
      btnText = 'Vào ca muộn';
      btnBg = '#faad14';
    } else {
      btnText = 'Chấm công';
      btnBg = '#1890ff';
    }
  } else if (isCheckOutMode && !isCompleted) {
    btnText = 'Ra ca';
    btnBg = '#faad14';
  } else if (isCompleted) {
    btnText = 'Đã hoàn thành chấm công';
    btnBg = '#d9d9d9';
    isDisabled = true;
    btnIcon = <CheckCircleOutlined />;
  }

  const checkInColor = checkInTime !== '--:--:--'
    ? (checkInTime > '08:00:00' ? '#faad14' : '#52c41a')
    : 'inherit';
  const checkOutColor = checkOutTime !== '--:--:--'
    ? (checkOutTime < '17:00:00' ? '#faad14' : '#52c41a')
    : 'inherit';

  return (
    <Card style={{ height: '100%' }} styles={{ body: { padding: 0 } }}>
      {contextHolder}
      {modalContextHolder}

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

        <Button
          type={isCompleted || weekend ? 'default' : 'primary'}
          className="attendance-action"
          icon={btnIcon}
          loading={punching || loading}
          disabled={isDisabled}
          onClick={() => handleAttendanceClick()}
          style={{
            minWidth: 140,
            backgroundColor: btnBg,
            borderColor: btnBg,
            color: isCompleted || weekend ? 'rgba(0, 0, 0, 0.45)' : '#fff',
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          {btnText}
        </Button>
      </div>

      <div style={{ padding: 16 }}>
        {error && <Alert type="warning" showIcon title={error} style={{ marginBottom: 12 }} />}
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
            {dayInfo?.label && <Text type="secondary">{dayInfo.label}</Text>}
          </div>
          <div style={{ marginTop: 8 }}>
            <Text strong>{dayDate ? formatFullDateVN(dayDate) : formatFullDateVN(now)}</Text>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div className="attendance-punch-times" style={{ display: 'flex', gap: 40 }}>
            <div>
              <Text type="secondary">Giờ vào</Text>
              <div>
                <Title level={4} style={{ margin: 0, color: checkInColor }}>
                  {checkInTime}
                </Title>
              </div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div>
              <Text type="secondary">Giờ ra</Text>
              <div>
                <Title level={4} style={{ margin: 0, color: checkOutColor }}>
                  {checkOutTime}
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
