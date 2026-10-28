import { useCallback, useState, useEffect } from 'react';
import { Card, Table, Typography, Space, Statistic, DatePicker, message, Row, Col, Tag, Modal, Tooltip, Spin } from 'antd';
import { TeamOutlined, CheckCircleOutlined, WarningOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getCompanyAttendanceSummary, getEmployeeAttendanceByAdmin } from '../services/attendanceApi';
import { explanationLabels } from '../utils/attendance';
import { formatDateOnlyVN } from '../utils/dates';
import { detailInteraction } from '../utils/detailInteraction';
import './TimesheetCard.css'; // Dùng chung file CSS với bảng công cá nhân để đồng bộ màu sắc và style lưới

const { Title, Text } = Typography;

function CompanyAttendance() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [loadedMonth, setLoadedMonth] = useState('');
  const [overview, setOverview] = useState({
    total_employees: 0,
    full_attendance_count: 0,
    missing_attendance_count: 0,
    late_or_early_count: 0,
    on_leave_count: 0,
  });
  const [employeesData, setEmployeesData] = useState([]);

  // State quản lý Modal xem chi tiết bảng công của nhân viên
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [attendanceDays, setAttendanceDays] = useState([]);

  const [messageApi, contextHolder] = message.useMessage();
  const monthKey = selectedMonth.format('YYYY-MM');
  const loading = loadedMonth !== monthKey;

  const fetchSummary = useCallback(async (monthStr) => {
    try {
      const res = await getCompanyAttendanceSummary(monthStr);
      if (res) {
        setOverview(res.overview || {});
        setEmployeesData(res.employees || []);
      }
    } catch (err) {
      messageApi.error(err.message || 'Không thể tải dữ liệu bảng công công ty.');
    } finally {
      setLoadedMonth(monthStr);
    }
  }, [messageApi]);

  useEffect(() => {
    const monthStr = selectedMonth.format('YYYY-MM');
    // Async API loading updates state after the request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    fetchSummary(monthStr);
  }, [selectedMonth, fetchSummary]);

  const handleMonthChange = (date) => {
    if (date) {
      setSelectedMonth(date);
    }
  };

  // Mở modal và gọi API lấy chi tiết lịch công của nhân viên được chọn
  const handleViewDetail = async (record) => {
    setCurrentEmployee(record);
    setIsModalVisible(true);
    setDetailLoading(true);
    try {
      const monthStr = selectedMonth.format('YYYY-MM');
      const res = await getEmployeeAttendanceByAdmin(record.employee_id, monthStr);
      if (res) {
        setAttendanceDays(res.days || []);
      }
    } catch (err) {
      messageApi.error(err.message || 'Không thể tải chi tiết bảng công nhân viên.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Cấu hình cột cho bảng chi tiết nhân viên
  const columns = [
    {
      title: 'Mã NV',
      dataIndex: 'employee_id',
      key: 'employee_id',
      width: 80,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullname',
      key: 'fullname',
      width: 210,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 240,
      ellipsis: true,
    },
    {
      title: 'Số ngày làm việc',
      dataIndex: 'days_worked',
      key: 'days_worked',
      align: 'center',
    },
    {
      title: 'Số lần đi muộn',
      dataIndex: 'late_count',
      key: 'late_count',
      align: 'center',
      render: (val) => val > 0 ? <Tag color="warning">{val} lần</Tag> : <Tag color="success">0</Tag>,
    },
    {
      title: 'Số lần về sớm',
      dataIndex: 'early_count',
      key: 'early_count',
      align: 'center',
      render: (val) => val > 0 ? <Tag color="warning">{val} lần</Tag> : <Tag color="success">0</Tag>,
    },
    {
      title: 'Trạng thái tháng',
      dataIndex: 'status_summary',
      key: 'status_summary',
      align: 'center',
      render: (status) => {
        let color = 'blue';
        if (status === 'Đủ công') color = 'success';
        else if (status === 'Thiếu công') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '',
      key: 'action',
      align: 'center',
      width: 36,
      render: () => <RightOutlined aria-hidden />,
    },
  ];

  const monthStr = selectedMonth.format('YYYY-MM');
  const offset = (new Date(`${monthStr}-01T00:00:00Z`).getUTCDay() + 6) % 7;

  return (
    <div className="company-attendance-page">
      {contextHolder}

      {/* Header & Bộ lọc tháng */}
      <div className="company-attendance-header">
        <Title level={3} style={{ margin: 0 }}>Bảng công toàn công ty</Title>
        <Space>
          <Text type="secondary">Chọn tháng:</Text>
          <DatePicker 
            picker="month" 
            value={selectedMonth} 
            onChange={handleMonthChange} 
            allowClear={false}
            format="MM/YYYY"
          />
        </Space>
      </div>

      {/* Các Thẻ Thống Kê Tổng Quan (Cards) */}
      <Row gutter={[12, 12]}>
        <Col xs={12} xl={6}>
          <Card bordered={false} style={{ background: 'var(--subtle-bg)', borderRadius: 8 }} bodyStyle={{ padding: '16px' }}>
            <Statistic 
              title="Tổng số nhân viên" 
              value={overview.total_employees} 
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />} 
            />
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card bordered={false} style={{ background: 'var(--subtle-bg)', borderRadius: 8 }} bodyStyle={{ padding: '16px' }}>
            <Statistic 
              title="Nhân viên đủ công" 
              value={overview.full_attendance_count} 
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} 
            />
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card bordered={false} style={{ background: 'var(--subtle-bg)', borderRadius: 8 }} bodyStyle={{ padding: '16px' }}>
            <Statistic 
              title="Nhân viên thiếu công" 
              value={overview.missing_attendance_count} 
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />} 
            />
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card bordered={false} style={{ background: 'var(--subtle-bg)', borderRadius: 8 }} bodyStyle={{ padding: '16px' }}>
            <Statistic 
              title="Đi muộn / Về sớm" 
              value={overview.late_or_early_count} 
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />} 
            />
          </Card>
        </Col>
      </Row>

      {/* Bảng Danh Sách Chi Tiết Nhân Viên */}
      <Card 
        title="Danh sách chi tiết công nhân viên trong tháng" 
        bordered={false} 
        style={{ borderRadius: 8, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 24px', overflow: 'hidden' }}
      >
        <Table 
          dataSource={employeesData} 
          columns={columns} 
          rowKey="employee_id" 
          loading={loading}
          onRow={employee => ({ className: 'detail-clickable-row', ...detailInteraction(() => handleViewDetail(employee), `Bảng công của ${employee.fullname || 'nhân viên'}`) })}
          pagination={{ pageSize: 8, position: ['bottomRight'] }}
          scroll={{ x: 1200, y: 360 }}
        />
      </Card>

      {/* Modal Hiển Thị Lịch Chi Tiết Chấm Công Của Nhân Viên */}
      <Modal
        title={`Chi tiết bảng công tháng ${selectedMonth.format('MM/YYYY')} - ${currentEmployee?.fullname || ''}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={620}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>
        ) : (
          <>
            <Typography.Paragraph type="secondary">
              Mốc ca: 08:00–17:00, giờ Việt Nam.
            </Typography.Paragraph>
            <div className="attendance-calendar">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => (
                <div className="attendance-weekday" key={label}>{label}</div>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {attendanceDays.map(item => (
                <Tooltip 
                  key={item.date} 
                  title={`${formatDateOnlyVN(item.date)}: ${item.label}${item.explanation ? ` · ${explanationLabels[item.explanation.status]}` : ''}`}
                >
                  <button 
                    className={`attendance-day attendance-day--${item.color}`}
                    aria-label={`Ngày ${formatDateOnlyVN(item.date)}, ${item.label}`}
                    type="button"
                  >
                    <strong>{Number(item.date.slice(-2))}</strong>
                    <span className="attendance-day-label">{item.label}</span>
                    {item.explanation && <span aria-label={explanationLabels[item.explanation.status]}>●</span>}
                  </button>
                </Tooltip>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default CompanyAttendance;
