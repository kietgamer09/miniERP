import { Table, Tag } from 'antd';

export default function PayrollTable({ payrolls, loading, month }) {
  const formatMoney = (val) => {
    const num = Math.round(Number(val || 0) / 1000) * 1000;
    return `${num.toLocaleString('vi-VN')} đ`;
  };

  const renderStatusTag = (status) => {
    let color = 'gold';
    let text = 'Chưa chốt';
    if (status === 'chua_thanh_toan') {
      color = 'processing';
      text = 'Chưa thanh toán';
    } else if (status === 'paid' || status === 'da_thanh_toan') {
      color = 'success';
      text = 'Đã thanh toán';
    } else if (status === 'draft') {
      color = 'default';
      text = 'Bản nháp';
    }
    return <Tag color={color} className="text-xs px-2.5 py-0.5 rounded-md font-medium whitespace-nowrap">{text}</Tag>;
  };

  const columns = [
    {
      title: 'Họ và tên',
      key: 'fullname',
      width: 150,
      render: (_, record) => (
        <span className="font-semibold text-white text-sm whitespace-nowrap">
          {record.employee?.fullname || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Phòng ban',
      key: 'department_name',
      width: 140,
      render: (_, record) => (
        <Tag color="default" className="text-slate-300 bg-slate-800 border-slate-700 whitespace-nowrap">
          {record.employee?.departments?.department_name || 'Chưa phân ban'}
        </Tag>
      ),
    },
    {
      title: 'Lương cố định',
      dataIndex: 'base_salary',
      key: 'base_salary',
      width: 130,
      render: (val) => <span className="text-slate-200 font-medium whitespace-nowrap">{formatMoney(val)}</span>,
    },
    {
      title: 'Chuẩn / Nghỉ',
      key: 'absence',
      width: 110,
      render: (_, record) => (
        <span className="text-slate-300 whitespace-nowrap text-xs">
          {record.standard_days || 22} | <span className="text-rose-400 font-semibold">-{record.off_days || 0}n</span>
        </span>
      ),
    },
    {
      title: 'Khấu trừ (-)',
      dataIndex: 'deduction',
      key: 'deduction',
      width: 130,
      render: (val) => <span className="text-rose-400 font-semibold whitespace-nowrap">-{formatMoney(val)}</span>,
    },
    {
      title: 'Thêm (+)',
      dataIndex: 'extra',
      key: 'extra',
      width: 110,
      render: (val) => (
        <span className="text-emerald-400 font-semibold whitespace-nowrap">
          {Number(val || 0) > 0 ? `+${formatMoney(val)}` : formatMoney(val)}
        </span>
      ),
    },
    {
      title: 'Thực lĩnh (Net)',
      dataIndex: 'net_salary',
      key: 'net_salary',
      width: 130,
      render: (val) => (
        <span className="font-bold text-amber-400 whitespace-nowrap">
          {formatMoney(val)}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'computed_status',
      width: 120,
      align: 'center',
      render: (_, record) => renderStatusTag(record.computed_status),
    },
  ];

  return (
    <Table
      dataSource={payrolls}
      columns={columns}
      rowKey={(record) => record.payroll_id || record.employee_id}
      loading={loading}
      pagination={{ pageSize: 8, showSizeChanger: false }}
      locale={{
        emptyText: `Chưa có dữ liệu bảng lương cho tháng ${month}.`,
      }}
      className="shadow-xl rounded-2xl overflow-hidden border border-slate-800/60 dark-theme-table"
    />
  );
}