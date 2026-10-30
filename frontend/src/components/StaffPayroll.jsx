import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Modal, message as antMessage } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { UserOutlined, EyeOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { fetchSelfPayrollApi } from '../services/payrollApi';

export default function StaffPayrollPage() {
  const [loading, setLoading] = useState(false);
  const [personalPayrollList, setPersonalPayrollList] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const loadPersonalPayrolls = async () => {
    setLoading(true);
    try {
      const currentMonth = dayjs();
      const monthsToFetch = [];
      for (let i = 0; i < 6; i++) {
        monthsToFetch.push(currentMonth.subtract(i, 'month').format('YYYY-MM'));
      }

      const promises = monthsToFetch.map(async (m) => {
        try {
          const res = await fetchSelfPayrollApi(m);
          if (res.success && res.data) return res.data;
        } catch (e) {}
        return null;
      });

      const results = await Promise.all(promises);
      const validData = results.filter(Boolean);
      validData.sort((a, b) => dayjs(b.month).unix() - dayjs(a.month).unix());
      setPersonalPayrollList(validData);
    } catch (err) {
      antMessage.error('Không thể tải lịch sử bảng lương cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonalPayrolls();
  }, []);

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

  const personalColumns = [
    {
      title: 'Tháng',
      dataIndex: 'month',
      key: 'month',
      render: (text) => <span className="font-semibold text-white whitespace-nowrap">Tháng {text}</span>
    },
    {
      title: 'Lương cố định',
      dataIndex: 'base_salary',
      key: 'base_salary',
      render: (val) => <span className="text-slate-200 whitespace-nowrap">{formatMoney(val)}</span>
    },
    {
      title: 'Công chuẩn / Nghỉ',
      key: 'days',
      render: (_, record) => (
        <span className="text-slate-300 whitespace-nowrap">
          Chuẩn: {record.standard_days || 22} | Nghỉ: <span className="text-rose-400 font-semibold">{record.off_days || 0} ngày</span>
        </span>
      )
    },
    {
      title: 'Tiền trừ (-)',
      dataIndex: 'deduction',
      key: 'deduction',
      render: (val, record) => (
        <span 
          onClick={() => { 
            setSelectedRecord(record);
            setModalType('deduction'); 
            setIsModalVisible(true); 
          }}
          className="text-rose-400 font-semibold cursor-pointer hover:underline flex items-center gap-1 whitespace-nowrap"
          title="Bấm để xem chi tiết lý do trừ"
        >
          -{formatMoney(val)} <EyeOutlined className="text-xs text-slate-400" />
        </span>
      )
    },
    {
      title: 'Khoản thêm (+)',
      dataIndex: 'extra',
      key: 'extra',
      render: (val, record) => (
        <span 
          onClick={() => { 
            setSelectedRecord(record);
            setModalType('extra'); 
            setIsModalVisible(true); 
          }}
          className="text-emerald-400 font-semibold cursor-pointer hover:underline flex items-center gap-1 whitespace-nowrap"
          title="Bấm để xem chi tiết nguồn extra"
        >
          +{formatMoney(val)} <EyeOutlined className="text-xs text-slate-400" />
        </span>
      )
    },
    {
      title: 'Thực lĩnh (Net)',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: (val) => <span className="text-amber-400 font-bold text-base whitespace-nowrap">{formatMoney(val)}</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'computed_status',
      key: 'computed_status',
      align: 'center',
      render: (status) => renderStatusTag(status)
    }
  ];

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserOutlined className="text-amber-400" /> Lịch sử Bảng lương Cá nhân
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Xem chi tiết thu nhập và các khoản khấu trừ theo từng tháng của bạn.
        </p>
      </div>

      <Card bordered={false} className="bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-slate-800/60">
        <Table 
          dataSource={personalPayrollList} 
          columns={personalColumns} 
          loading={loading}
          rowKey="month"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          className="dark-theme-table"
        />
      </Card>

      <Modal
        title={
          <span className="text-white flex items-center gap-2">
            <InfoCircleOutlined className={modalType === 'deduction' ? 'text-rose-400' : 'text-emerald-400'} />
            {modalType === 'deduction' ? `Chi tiết khấu trừ - Tháng ${selectedRecord?.month}` : `Chi tiết khoản thêm - Tháng ${selectedRecord?.month}`}
          </span>
        }
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        className="dark-modal"
      >
        <div className="py-4 space-y-3">
          {modalType === 'deduction' ? (
            <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-300">Nghỉ {selectedRecord?.off_days || 0} ngày (đã trừ phép hợp lệ) / vi phạm trong tháng</span>
              <span className="text-rose-400 font-semibold">-{formatMoney(selectedRecord?.deduction)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-300">Tổng tiền thưởng / OT / Điều chỉnh cộng dồn</span>
              <span className="text-emerald-400 font-semibold">+{formatMoney(selectedRecord?.extra)}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}