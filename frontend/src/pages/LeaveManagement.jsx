import { useState, useEffect } from 'react';
import { Card, Typography, Space, DatePicker, message, Button, Modal, Form, Input, Alert, Spin, Tag, Statistic } from 'antd';
import { PlusOutlined, SendOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createLeaveRequest, getLeaveSummary, getLeaveRequests, cancelLeaveRequest } from '../services/leaveApi';
import '../components/TimesheetCard.css';

const { Title, Text } = Typography;

function LeaveManagement() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [monthData, setMonthData] = useState([]);
  const [leaveSummary, setLeaveSummary] = useState({ max_days: 12, used_days: 0, remaining_days: 12 });
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  
  const [selectedDates, setSelectedDates] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  
  const [messageApi, contextHolder] = message.useMessage();

  // Tải thông tin số phép và danh sách đơn đã đăng ký
  const fetchData = async () => {
    setLoading(true);
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
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  // Xây dựng dữ liệu lịch tháng kèm trạng thái đơn nghỉ
  useEffect(() => {
    const monthStr = selectedMonth.format('YYYY-MM');
    const [year, month] = monthStr.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const todayStr = dayjs().format('YYYY-MM-DD');

    // Chuyển đổi các đơn nghỉ của user thành danh sách các ngày chi tiết kèm requestId
    const bookedDaysMap = {};
    myLeaveRequests.forEach(req => {
      if (req.start_date && req.end_date) {
        let curr = dayjs(req.start_date);
        const end = dayjs(req.end_date);
        while (curr.isBefore(end) || curr.isSame(end, 'day')) {
          const dateStr = curr.format('YYYY-MM-DD');
          bookedDaysMap[dateStr] = {
            id: req.Day_off_id,
            status: req.status, // 'cho_xac_thuc', 'da_duoc_duyet', etc.
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

    setMonthData(days);
  }, [selectedMonth, myLeaveRequests]);

  // Xử lý click vào ngày trên lịch
  const handleDayClick = (item) => {
    // Nếu ngày này đã có đơn đang chờ xác thực -> Mở modal hỏi hủy đơn
    if (item.bookingInfo && item.bookingInfo.status === 'cho_xac_thuc') {
      Modal.confirm({
        title: 'Hủy đơn xin nghỉ phép',
        icon: <ExclamationCircleOutlined />,
        content: `Bạn có chắc chắn muốn hủy đơn nghỉ từ ngày ${item.bookingInfo.startDate} đến ${item.bookingInfo.endDate} không? (Thao tác này sẽ hủy toàn bộ các ngày chung trong đơn và hoàn lại số phép).`,
        okText: 'Xác nhận hủy',
        okType: 'danger',
        cancelText: 'Quay lại',
        onOk: async () => {
          try {
            const res = await cancelLeaveRequest(item.bookingInfo.id);
            messageApi.success(res.message || 'Đã hủy đơn thành công.');
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
      setIsModalVisible(false);
      setSelectedDates([]);
      form.resetFields();
      fetchData();
    } catch (err) {
      messageApi.error(err.message || 'Gửi đơn thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const monthStr = selectedMonth.format('YYYY-MM');
  const offset = (new Date(`${monthStr}-01T00:00:00Z`).getUTCDay() + 6) % 7;

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--layout-body-background, #141414)' }}>
      {contextHolder}

      {/* Header & Thống kê số phép */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản lý & Đăng ký nghỉ phép</Title>
          <Text type="secondary">Chọn các ngày trong tương lai trên lịch để tiến hành xin nghỉ phép (Tối đa 12 ngày/năm, không cộng dồn).</Text>
        </div>
        <Space size={16}>
          <Card bordered={false} style={{ background: '#1f2937', borderRadius: 8 }} bodyStyle={{ padding: '8px 16px' }}>
            <Statistic 
              title={<span style={{ fontSize: '12px', color: '#aaa' }}>Phép còn lại trong năm</span>}
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

      {/* Thển chứa lịch toàn màn hình */}
      <Card 
        bordered={false} 
        style={{ borderRadius: 8, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '24px' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>Lịch làm việc tháng {selectedMonth.format('MM/YYYY')}</Text>
              <Space>
                <Tag color="processing">Đang chọn: {selectedDates.length} ngày</Tag>
                {selectedDates.length > 0 && (
                  <Button type="link" size="small" onClick={() => setSelectedDates([])}>Bỏ chọn tất cả</Button>
                )}
              </Space>
            </div>

            {/* Lưới lịch dạng grid */}
            <div className="attendance-calendar" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => (
                <div className="attendance-weekday" key={label} style={{ textAlign: 'center', fontWeight: 'bold' }}>{label}</div>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {monthData.map(item => {
                const isSelected = selectedDates.includes(item.date);
                
                let bgColor = '#1f2937';
                let borderColor = '#374151';
                let textColor = '#fff';
                let labelText = 'Tương lai';
                let labelColor = '#bbb';

                if (item.isWeekend) {
                  bgColor = '#1a1a1a';
                  borderColor = '#2a2a2a';
                  textColor = '#777';
                  labelText = 'Ngày nghỉ';
                  labelColor = '#888';
                } else if (item.isPast) {
                  bgColor = '#3a1c1c';
                  borderColor = '#5c2222';
                  textColor = '#ff9999';
                  labelText = 'Đã qua';
                  labelColor = '#ff7875';
                } else if (item.bookingInfo) {
                  if (item.bookingInfo.status === 'cho_xac_thuc') {
                    // Màu vàng cho trạng thái chờ duyệt
                    bgColor = 'rgba(250, 173, 20, 0.2)';
                    borderColor = '#faad14';
                    textColor = '#faad14';
                    labelText = 'Đã xin nghỉ (chờ duyệt)';
                    labelColor = '#faad14';
                  } else if (item.bookingInfo.status === 'da_duoc_duyet') {
                    // Màu xanh lá cho đã duyệt
                    bgColor = 'rgba(82, 196, 26, 0.2)';
                    borderColor = '#52c41a';
                    textColor = '#52c41a';
                    labelText = 'Đã duyệt';
                    labelColor = '#52c41a';
                  }
                } else if (isSelected) {
                  bgColor = 'rgba(24, 144, 255, 0.2)';
                  borderColor = '#1890ff';
                }

                return (
                  <button 
                    key={item.date} 
                    type="button"
                    style={{
                      border: `1px solid ${borderColor}`,
                      background: bgColor,
                      cursor: (item.isPast || item.isWeekend) ? 'not-allowed' : 'pointer',
                      opacity: (item.isPast || item.isWeekend) ? 0.6 : 1,
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
                      <strong style={{ fontSize: '15px', color: textColor }}>{Number(item.date.slice(-2))}</strong>
                      {isSelected && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Đã chọn</Tag>}
                      {item.bookingInfo && item.bookingInfo.status === 'cho_xac_thuc' && <Tag color="warning" style={{ margin: 0, fontSize: 10 }}>Chờ duyệt</Tag>}
                    </div>
                    <span style={{ fontSize: '11px', color: labelColor, fontWeight: item.bookingInfo ? 'bold' : 'normal' }}>
                      {item.isWeekend ? 'Ngày nghỉ' : (item.isPast ? 'Đã qua' : (item.bookingInfo ? labelText : (isSelected ? 'Sẽ xin nghỉ' : 'Tương lai')))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

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