import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Modal, DatePicker, Select, message as antMessage } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { TeamOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { fetchCompanyPayrollsApi } from '../services/payrollApi';

export default function AdminPayrollPage() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [companyPayrollList, setCompanyPayrollList] = useState([]);

  const loadCompanyPayrolls = async (monthToGet) => {
    setLoading(true);
    try {
      const res = await fetchCompanyPayrollsApi(monthToGet);
      if (res.success) {
        // Sắp xếp nhân sự mới nhất lên đầu (employee_id giảm dần)
        const sortedData = (res.data || []).sort((a, b) => (b.employee_id || 0) - (a.employee_id || 0));
        setCompanyPayrollList(sortedData);
      }
    } catch (err) {
      antMessage.error('Không thể tải bảng lương toàn công ty.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyPayrolls(selectedMonth);
  }, [selectedMonth]);

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

  const departmentOptions = [
    { label: 'Tất cả phòng ban', value: 'all' },
    ...Array.from(
      new Set(
        companyPayrollList
          .map(item => item.employee?.departments?.department_name)
          .filter(Boolean)
      )
    ).map(dept => ({ label: dept, value: dept }))
  ];

  const filteredCompanyPayrolls = companyPayrollList.filter(item => {
    if (selectedDepartment === 'all') return true;
    return item.employee?.departments?.department_name === selectedDepartment;
  });

  const adminColumns = [
    {
      title: 'Họ và tên',
      key: 'fullname',
      width: 150,
      render: (_, record) => (
        <span className="font-semibold text-white text-sm whitespace-nowrap">{record.employee?.fullname || '---'}</span>
      )
    },
    {
      title: 'Phòng ban',
      key: 'department',
      width: 140,
      render: (_, record) => (
        <Tag color="default" className="text-slate-300 bg-slate-800 border-slate-700 whitespace-nowrap">
          {record.employee?.departments?.department_name || 'Chưa phân ban'}
        </Tag>
      )
    },
    {
      title: 'Lương cố định',
      dataIndex: 'base_salary',
      key: 'base_salary',
      width: 130,
      render: (val) => <span className="text-slate-200 font-medium whitespace-nowrap">{formatMoney(val)}</span>
    },
    {
      title: 'Chuẩn / Nghỉ',
      key: 'days',
      width: 110,
      render: (_, record) => (
        <span className="text-slate-300 whitespace-nowrap text-xs">
          {record.standard_days || 22} | <span className="text-rose-400 font-semibold">{record.off_days || 0}n</span>
        </span>
      )
    },
    {
      title: 'Khấu trừ (-)',
      dataIndex: 'deduction',
      key: 'deduction',
      width: 130,
      render: (val) => <span className="text-rose-400 font-semibold whitespace-nowrap">-{formatMoney(val)}</span>
    },
    {
      title: 'Thêm (+)',
      dataIndex: 'extra',
      key: 'extra',
      width: 110,
      render: (val) => <span className="text-emerald-400 font-semibold whitespace-nowrap">+{formatMoney(val)}</span>
    },
    {
      title: 'Thực lĩnh (Net)',
      dataIndex: 'net_salary',
      key: 'net_salary',
      width: 130,
      render: (val) => <span className="text-amber-400 font-bold whitespace-nowrap">{formatMoney(val)}</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'computed_status',
      key: 'computed_status',
      width: 120,
      align: 'center',
      render: (status) => renderStatusTag(status)
    }
  ];

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen">
      <div className="mb-4 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TeamOutlined className="text-blue-400" /> Quản lý Bảng lương Toàn Công ty
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Thống kê và theo dõi tự động bảng lương toàn bộ nhân sự trong công ty theo tháng.
        </p>
      </div>

      <div className="flex justify-end items-center gap-3 mb-4">
        <Select
          value={selectedDepartment}
          onChange={(value) => setSelectedDepartment(value)}
          options={departmentOptions}
          className="w-48 bg-slate-900 border-slate-700 text-white"
          dropdownStyle={{ backgroundColor: '#0f172a', color: '#fff' }}
          placeholder="Lọc phòng ban"
        />

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl shadow-sm">
          <span className="text-slate-300 text-sm font-medium">Tháng:</span>
          <DatePicker
            picker="month"
            value={selectedMonth ? dayjs(selectedMonth, 'YYYY-MM') : dayjs()}
            onChange={(date) => {
              if (date) {
                setSelectedMonth(date.format('YYYY-MM'));
              }
            }}
            format="MM/YYYY"
            allowClear={false}
            bordered={false}
            className="text-white custom-dark-picker w-24"
            inputReadOnly
          />
        </div>
      </div>

      <Card bordered={false} className="bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-slate-800/60">
        <Table 
          dataSource={filteredCompanyPayrolls} 
          columns={adminColumns} 
          loading={loading}
          rowKey={(record) => record.payroll_id || record.employee_id}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          className="dark-theme-table"
        />
      </Card>
    </div>
  );
}