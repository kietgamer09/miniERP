import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Space, DatePicker, message, Button, Modal, Form, Input, Alert, Spin, Tag, Statistic } from 'antd';
import { PlusOutlined, SendOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createLeaveRequest, getLeaveSummary, getLeaveRequests, cancelLeaveRequest } from '../services/leaveApi';
import '../components/TimesheetCard.css';
import Attachments from '../components/Attachments';

const { Title, Text } = Typography;

function LeaveManagement() {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [leaveSummary, setLeaveSummary] = useState({ max_days: 12, used_days: 0, remaining_days: 12 });
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [attachmentLeaveId, setAttachmentLeaveId] = useState(null);
  
  const [selectedDates, setSelectedDates] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  
  const [messageApi, contextHolder] = message.useMessage();

  // Tự động nhận diện chế độ Sáng / Tối từ hệ thống
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.body.classList.contains('dark') || 
                         document.documentElement.classList.contains('dark') ||
                         document.body.getAttribute('data-theme') === 'dark' ||
                         document.documentElement.getAttribute('data-theme') === 'dark' ||
                         window.getComputedStyle(document.body).backgroundColor === 'rgb(20, 20, 20)' ||
                         window.getComputedStyle(document.body).backgroundColor === '#141414';
      setIsDark(isDarkMode);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    return () => observer.disconnect();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, requestsRes] = await Promise.all([
        getLeaveSummary(),
        getLeaveRequests()
      ]);

      if (summaryRes) setLeaveSummary(summaryRes);
      if (requestsRes && requestsRes.requests) {
        setMyLeaveRequests(requestsRes.requests);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
      messageApi.error('Không thể tải thông tin nghỉ phép.');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    // Async API loading updates state after the request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const monthData = useMemo(() => {
    const monthStr = selectedMonth.format('YYYY-MM');
    const [year, month] = monthStr.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const todayStr = dayjs().format('YYYY-MM-DD');

    const bookedDaysMap = {};
    myLeaveRequests.forEach(req => {
      if (req.start_date && req.end_date) {
        let curr = dayjs(req.start_date);
        const end = dayjs(req.end_date);
        while (curr.isBefore(end) || curr.isSame(end, 'day')) {
          const dateStr = curr.format('YYYY-MM-DD');
          bookedDaysMap[dateStr] = {
            id: req.Day_off_id,
            status: req.status,
            startDate: dayjs(req.start_date).format('DD/MM/YYYY'),
            endDate: dayjs(req.end_date).format('DD/MM/YYYY')
          };
          curr = curr.add(1, 'day');
        }
      }
    });
    
    const days = Array.from({ length: totalDays }, (_, i) => {
      const dayNum = String(i + 1).padStart(2, '0');
      const dateStr = `${monthStr}-${dayNum}`;
      const currentDateObj = dayjs(dateStr);
      
      const dayOfWeek = currentDateObj.day();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPast = currentDateObj.isBefore(todayStr, 'day');
      const bookingInfo = bookedDaysMap[dateStr];
      
      return {
        date: dateStr,
        isWeekend,
        isPast,
        bookingInfo,
        isAllowed: !isPast && !isWeekend && !bookingInfo
      };
    });

    return days;
  }, [selectedMonth, myLeaveRequests]);

  const handleDayClick = (item) => {
    if (item.bookingInfo && item.bookingInfo.status === 'cho_xac_thuc') {
      Modal.confirm({
        title: 'Hủy đơn xin nghỉ phép',
        icon: <ExclamationCircleOutlined />,
        content: `Bạn có chắc chắn muốn hủy đơn nghỉ từ ngày ${item.bookingInfo.startDate} đến ${item.bookingInfo.endDate} không?`,
        okText: 'Xác nhận hủy',
        okType: 'danger',
        cancelText: 'Quay lại',
        onOk: async () => {
          try {
            const res = await cancelLeaveRequest(item.bookingInfo.id);
            messageApi.success(res.message || 'Đã hủy đơn thành công.');
            setLoading(true);
            fetchData();
            setSelectedDates([]);
          } catch (err) {
            messageApi.error(err.message || 'Hủy đơn thất bại.');
          }
        }
      });
      return;
    }

    if (!item.isAllowed) {
      if (item.isWeekend) {
        messageApi.warning('Không thể chọn ngày nghỉ cuối tuần (Thứ 7, Chủ Nhật)!');
      } else if (item.isPast) {
        messageApi.warning('Không thể chọn các ngày đã qua!');
      } else if (item.bookingInfo) {
        messageApi.warning('Ngày này đã có trạng thái nghỉ được ghi nhận!');
      }
      return;
    }

    setSelectedDates(prev => {
      if (prev.includes(item.date)) {
        return prev.filter(d => d !== item.date);
      } else {
        return [...prev, item.date].sort();
      }
    });
  };

  const handleOpenRequestModal = () => {
    if (selectedDates.length === 0) {
      messageApi.warning('Vui lòng chọn ít nhất một ngày hợp lệ để xin nghỉ.');
      return;
    }
    if (selectedDates.length > leaveSummary.remaining_days) {
      messageApi.error(`Số ngày xin nghỉ (${selectedDates.length}) vượt quá số phép còn lại (${leaveSummary.remaining_days})!`);
      return;
    }
    form.setFieldsValue({
      dates: selectedDates.join(', '),
      recipient: 'Quản lý trực thuộc / Ban Giám Đốc'
    });
    setIsModalVisible(true);
  };

  const handleSubmitLeave = async (values) => {
    setSubmitting(true);
    try {
      const res = await createLeaveRequest({
        dates: selectedDates,
        reason: values.reason
      });

      messageApi.success(res.message || 'Gửi đơn xin nghỉ phép thành công!');
      if (res.data?.Day_off_id) setAttachmentLeaveId(res.data.Day_off_id);
      setIsModalVisible(false);
      setSelectedDates([]);
      form.resetFields();
      setLoading(true);
      fetchData();
    } catch (err) {
      messageApi.error(err.message || 'Gửi đơn thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const monthStr = selectedMonth.format('YYYY-MM');
  const offset = (new Date(`${monthStr}-01T00:00:00Z`).getUTCDay() + 6) % 7;

  // Bảng màu: Chế độ tối nền đen y hệt bản gốc, Chế độ sáng tối ưu màu đậm rõ nét, không bị chói
  const themeStyles = isDark ? {
    pageBg: 'var(--page-bg)',
    cardBg: 'var(--surface)',
    textColor: '#ffffff',
    textSecondary: '#aaa',
    weekdayColor: '#fff',
    normalBg: '#1f2937',
    normalBorder: '#374151',
    normalText: '#fff',
    weekendBg: '#1a1a1a',
    weekendBorder: '#2a2a2a',
    weekendText: '#777',
    pastBg: 'var(--subtle-bg)',
    pastBorder: 'var(--border)',
    pastText: 'var(--muted)',
    pendingBg: 'rgba(250, 173, 20, 0.2)',
    pendingBorder: '#faad14',
    pendingText: '#faad14',
    approvedBg: 'rgba(82, 196, 26, 0.2)',
    approvedBorder: '#52c41a',
    approvedText: '#52c41a',
    selectedBg: 'rgba(24, 144, 255, 0.2)',
    selectedBorder: '#1890ff',
    selectedText: '#fff',
  } : {
    pageBg: 'var(--page-bg)',
    cardBg: '#ffffff',
    textColor: '#1f2937',
    textSecondary: '#4b5563',
    weekdayColor: '#1f2937',
    normalBg: '#ffffff',
    normalBorder: '#cbd5e1',
    normalText: '#0f172a',
    weekendBg: '#e2e8f0',
    weekendBorder: '#cbd5e1',
    weekendText: '#475569',
    // Chế độ sáng: Tăng độ đậm và rõ nét cho các trạng thái để dễ nhìn, không bị chói
    pastBg: 'var(--subtle-bg)',
    pastBorder: 'var(--border)',
    pastText: 'var(--muted)',
    pendingBg: '#fde68a',    // Vàng cam đậm
    pendingBorder: '#fbbf24',
    pendingText: '#92400e',
    approvedBg: '#bbf7d0',   // Xanh lá đậm rõ ràng
    approvedBorder: '#4ade80',
    approvedText: '#166534',
    selectedBg: '#bae6fd',   // Xanh dương đậm
    selectedBorder: '#38bdf8',
    selectedText: '#0369a1',
  };

  return (
    <div className="leave-management-page" style={{ background: themeStyles.pageBg, transition: 'background 0.3s' }}>
      {contextHolder}
      <Modal open={Boolean(attachmentLeaveId)} title="Tệp đính kèm đơn nghỉ phép" footer={null} onCancel={() => setAttachmentLeaveId(null)}>
        {attachmentLeaveId && <Attachments key={attachmentLeaveId} type="leaves" targetId={attachmentLeaveId} />}
      </Modal>

      {/* Header & Thống kê số phép */}
      <div className="leave-page-header">
        <div>
          <Title level={3} style={{ margin: 0, color: themeStyles.textColor }}>Quản lý & Đăng ký nghỉ phép</Title>
          <Text style={{ color: themeStyles.textSecondary }}>Chọn các ngày trong tương lai trên lịch để tiến hành xin nghỉ phép (Tối đa 12 ngày/năm, không cộng dồn).</Text>
        </div>
        <Space wrap size={12}>
          <Card bordered={false} style={{ background: isDark ? '#1f2937' : themeStyles.cardBg, borderRadius: 8, boxShadow: isDark ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.08)' }} bodyStyle={{ padding: '8px 16px' }}>
            <Statistic 
              title={<span style={{ fontSize: '12px', color: themeStyles.textSecondary, fontWeight: 500 }}>Phép còn lại trong năm</span>}
              value={leaveSummary.remaining_days} 
              suffix={`/ ${leaveSummary.max_days} ngày`}
              valueStyle={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}
            />
          </Card>
          <DatePicker 
            picker="month" 
            value={selectedMonth} 
            onChange={(date) => date && setSelectedMonth(date)} 
            allowClear={false}
            format="MM/YYYY"
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            disabled={selectedDates.length === 0}
            onClick={handleOpenRequestModal}
          >
            Xin nghỉ các ngày đã chọn ({selectedDates.length})
          </Button>
        </Space>
      </div>

      {/* Thẻ chứa lịch đồng bộ màu sắc */}
      <Card 
        bordered={false} 
        style={{ background: themeStyles.cardBg, borderRadius: 8, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.08)' }}
        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '24px', background: themeStyles.cardBg }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16, color: themeStyles.textColor }}>Lịch làm việc tháng {selectedMonth.format('MM/YYYY')}</Text>
              <Space>
                <Tag color="processing">Đang chọn: {selectedDates.length} ngày</Tag>
                {selectedDates.length > 0 && (
                  <Button type="link" size="small" onClick={() => setSelectedDates([])}>Bỏ chọn tất cả</Button>
                )}
              </Space>
            </div>

            {/* Lưới lịch dạng grid */}
            <div className="attendance-calendar" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => (
                <div className="attendance-weekday" key={label} style={{ textAlign: 'center', fontWeight: 'bold', color: themeStyles.weekdayColor, paddingBottom: '8px' }}>{label}</div>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {monthData.map(item => {
                const isSelected = selectedDates.includes(item.date);
                
                let bgColor = themeStyles.normalBg;
                let borderColor = themeStyles.normalBorder;
                let textColor = themeStyles.normalText;
                let labelText = 'Tương lai';
                let labelColor = themeStyles.textSecondary;

                if (item.isWeekend) {
                  bgColor = themeStyles.weekendBg;
                  borderColor = themeStyles.weekendBorder;
                  textColor = themeStyles.weekendText;
                  labelText = 'Ngày nghỉ';
                  labelColor = themeStyles.weekendText;
                } else if (item.isPast) {
                  bgColor = themeStyles.pastBg;
                  borderColor = themeStyles.pastBorder;
                  textColor = themeStyles.pastText;
                  labelText = 'Đã qua';
                  labelColor = themeStyles.pastText;
                } else if (item.bookingInfo) {
                  if (item.bookingInfo.status === 'cho_xac_thuc') {
                    bgColor = themeStyles.pendingBg;
                    borderColor = themeStyles.pendingBorder;
                    textColor = themeStyles.pendingText;
                    labelText = 'Đã xin nghỉ (chờ duyệt)';
                    labelColor = themeStyles.pendingText;
                  } else if (item.bookingInfo.status === 'da_duoc_duyet') {
                    bgColor = themeStyles.approvedBg;
                    borderColor = themeStyles.approvedBorder;
                    textColor = themeStyles.approvedText;
                    labelText = 'Đã duyệt';
                    labelColor = themeStyles.approvedText;
                  }
                } else if (isSelected) {
                  bgColor = themeStyles.selectedBg;
                  borderColor = themeStyles.selectedBorder;
                  textColor = themeStyles.selectedText;
                }

                return (
                  <button 
                    key={item.date} 
                    type="button"
                    style={{
                      border: `1.5px solid ${borderColor}`,
                      background: bgColor,
                      cursor: (item.isPast || item.isWeekend) ? 'not-allowed' : 'pointer',
                      opacity: (item.isPast || item.isWeekend) ? 0.9 : 1,
                      minHeight: '85px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '10px',
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleDayClick(item)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <strong style={{ fontSize: '15px', color: textColor, fontWeight: 'bold' }}>{Number(item.date.slice(-2))}</strong>
                      {isSelected && <Tag color="blue" style={{ margin: 0, fontSize: 10, fontWeight: 600 }}>Đã chọn</Tag>}
                      {item.bookingInfo && item.bookingInfo.status === 'cho_xac_thuc' && <Tag color="warning" style={{ margin: 0, fontSize: 10, fontWeight: 600 }}>Chờ duyệt</Tag>}
                    </div>
                    <span style={{ fontSize: '11px', color: labelColor, fontWeight: 'bold' }}>
                      {item.isWeekend ? 'Ngày nghỉ' : (item.isPast ? 'Đã qua' : (item.bookingInfo ? labelText : (isSelected ? 'Sẽ xin nghỉ' : 'Tương lai')))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {myLeaveRequests.length > 0 && <Card title="Tệp đính kèm đơn nghỉ phép">
        <Space wrap>{myLeaveRequests.map(item => <Button key={item.Day_off_id} onClick={() => setAttachmentLeaveId(item.Day_off_id)}>
          Đơn #{item.Day_off_id} · {dayjs(item.start_date).format('DD/MM/YYYY')}
        </Button>)}</Space>
      </Card>}
      {/* Modal Gửi Đơn Xin Nghỉ Phép */}
      <Modal
        title="Tạo đơn xin nghỉ phép"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={550}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitLeave}>
          <Alert 
            message="Thông tin định tuyến đơn & Hạn mức" 
            description={`Số phép còn lại trong năm: ${leaveSummary.remaining_days} ngày. Đơn sẽ được tự động gửi đến cấp quản lý.`} 
            type="info" 
            showIcon 
            style={{ marginBottom: 16 }}
          />

          <Form.Item label="Người nhận đơn" name="recipient">
            <Input disabled style={{ fontWeight: 'bold', color: '#1890ff' }} />
          </Form.Item>

          <Form.Item label="Các ngày xin nghỉ" name="dates">
            <Input.TextArea rows={2} disabled />
          </Form.Item>

          <Form.Item 
            label="Lý do xin nghỉ phép" 
            name="reason" 
            rules={[{ required: true, message: 'Vui lòng nhập lý do xin nghỉ phép!' }]}
          >
            <Input.TextArea rows={4} placeholder="Nhập lý do chi tiết..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={submitting}>
                Gửi đơn xin nghỉ
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default LeaveManagement;
