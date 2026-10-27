import { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Divider, message, Modal } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { formatDateVN, formatFullDateVN } from '../utils/dates';
import { checkInApi, checkOutApi, getTodayAttendanceApi } from '../services/attendanceApi';

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
  const [loading, setLoading] = useState(false);
  
  const [checkInTime, setCheckInTime] = useState('--:--:--');
  const [checkOutTime, setCheckOutTime] = useState('--:--:--');
  
  const [isCheckOutMode, setIsCheckOutMode] = useState(false); 
  const [isCompleted, setIsCompleted] = useState(false);       

  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
        const res = await getTodayAttendanceApi();
        if (res && res.data) {
          const { check_in, check_out } = res.data;

          if (check_in) {
            setCheckInTime(check_in);
            setIsCheckOutMode(true);
          }

          if (check_out) {
            setCheckOutTime(check_out);
            setIsCompleted(true);
          }
        }
      } catch (error) {
        console.error('Không thể tải trạng thái chấm công hôm nay:', error);
      }
    };

    fetchTodayAttendance();
  }, []);

  const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
  const dateStr = formatDateVN(now);

  const executeCheckOut = async (confirmedEarly = false) => {
    try {
      const res = await checkOutApi(confirmedEarly);

      if (res && res.requireConfirmation) {
        Modal.confirm({
          title: 'Xác nhận ra ca sớm',
          content: res.message,
          okText: 'Đồng ý ra sớm',
          cancelText: 'Hủy',
          onOk: async () => {
            try {
              const confirmedRes = await checkOutApi(true);
              messageApi.success('Ra ca thành công (Về sớm)!');
              
              const updatedRes = await getTodayAttendanceApi();
              if (updatedRes && updatedRes.data && updatedRes.data.check_out) {
                setCheckOutTime(updatedRes.data.check_out);
              }
              setIsCompleted(true);
            } catch (err) {
              messageApi.error(err.message || 'Có lỗi khi xác nhận ra ca sớm');
            }
          },
        });
      } else {
        messageApi.success('Ra ca thành công đúng giờ!');
        
        const updatedRes = await getTodayAttendanceApi();
        if (updatedRes && updatedRes.data && updatedRes.data.check_out) {
          setCheckOutTime(updatedRes.data.check_out);
        }
        setIsCompleted(true);
      }
    } catch (error) {
      messageApi.error(error.message || 'Có lỗi xảy ra khi ra ca');
    }
  };

  const handleAttendanceClick = async () => {
    setLoading(true);
    try {
      if (!isCheckOutMode) {
        const res = await checkInApi();
        messageApi.success(res.message || 'Vào ca thành công!');
        
        const updatedRes = await getTodayAttendanceApi();
        if (updatedRes && updatedRes.data && updatedRes.data.check_in) {
          setCheckInTime(updatedRes.data.check_in);
        }
        setIsCheckOutMode(true);
      } else {
        await executeCheckOut(false);
      }
    } catch (error) {
      messageApi.error(error.message || 'Có lỗi xảy ra khi chấm công');
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC MÀU SẮC VÀ TEXT CỦA NÚT BẤM ---
  const isCurrentLate = timeStr > '08:00:00'; // Kiểm tra xem hiện tại đã qua 8h sáng chưa
  let btnText = 'Chấm công';
  let btnBg = '#1890ff';
  let btnIcon = <HandIcon />;
  let isDisabled = false;

  if (!isCheckOutMode && !isCompleted) {
    if (isCurrentLate) {
      btnText = 'Vào ca muộn';
      btnBg = '#faad14'; // Màu cam khi quá 8h sáng
    } else {
      btnText = 'Chấm công';
      btnBg = '#1890ff'; // Màu xanh dương chuẩn trước 8h sáng
    }
  } else if (isCheckOutMode && !isCompleted) {
    btnText = 'Ra ca';
    btnBg = '#faad14'; // Màu cam cho nút Ra ca
  } else if (isCompleted) {
    btnText = 'Đã hoàn thành chấm công';
    btnBg = '#d9d9d9';
    isDisabled = true;
    btnIcon = <CheckCircleOutlined />;
  }

  // --- LOGIC MÀU SẮC HIỂN THỊ THỜI GIAN ---
  // Giờ vào: > 08:00:00 là đi muộn (màu cam), ngược lại đúng giờ (màu xanh lá)
  const checkInColor = checkInTime !== '--:--:--' 
    ? (checkInTime > '08:00:00' ? '#faad14' : '#52c41a') 
    : 'inherit';

  // Giờ ra: < 17:00:00 là về sớm (màu cam), ngược lại đúng giờ/muộn (màu xanh lá)
  const checkOutColor = checkOutTime !== '--:--:--' 
    ? (checkOutTime < '17:00:00' ? '#faad14' : '#52c41a') 
    : 'inherit';

  return (
    <Card style={{ height: '100%' }} styles={{ body: { padding: 0 } }}>
      {contextHolder}

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
          type={isCompleted ? 'default' : 'primary'}
          className="attendance-action"
          icon={btnIcon}
          loading={loading}
          disabled={isDisabled}
          onClick={handleAttendanceClick}
          style={{ 
            minWidth: 140, 
            backgroundColor: btnBg,
            borderColor: btnBg,
            color: isCompleted ? 'rgba(0, 0, 0, 0.45)' : '#fff',
            borderRadius: 6,
            fontWeight: 500
          }}
        >
          {btnText}
        </Button>
      </div>

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

          <div className="attendance-punch-times" style={{ display: 'flex', gap: 40 }}>
            <div>
              <Text type="secondary">Giờ vào</Text>
              <div>
                <Title level={4} style={{ margin: 0, color: checkInColor }}>
                  {checkInTime}
                </Title>
              </div>
            </div>
            <Divider orientation="vertical" style={{ height: 'auto' }} />
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