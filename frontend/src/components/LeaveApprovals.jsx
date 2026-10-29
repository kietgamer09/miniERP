import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Form, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { getLeaveRequests, reviewLeaveRequest } from '../services/leaveApi';
import { formatDateOnlyVN } from '../utils/dates';
import Attachments from './Attachments';
import { useAuth } from '../hooks/useAuth';

const leaveStatusLabels = {
  cho_xac_thuc: { label: 'Chờ duyệt', color: 'warning' },
  da_duoc_duyet: { label: 'Đã duyệt', color: 'success' },
  bi_tu_choi: { label: 'Từ chối', color: 'error' }
};

function ReviewLeaveModal({ item, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function save() {
    if (pending.current) return;
    pending.current = true;
    try {
      const values = await form.validateFields();
      setSaving(true);
      setError('');

      await reviewLeaveRequest(item.Day_off_id, {
        status: values.status
      });

      onSaved();
    } catch (err) {
      if (!err.errorFields) setError(err.message || 'Không xử lý được yêu cầu');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  const employeeName = item.employees_Day_off_requests_employee_send_idToemployees?.fullname || 'Nhân viên';

  return (
    <Modal
      open
      forceRender
      title={`Xử lý đơn nghỉ phép: ${employeeName}`}
      okText="Xác nhận quyết định"
      cancelText="Hủy"
      confirmLoading={saving}
      closable={!saving}
      cancelButtonProps={{ disabled: saving }}
      onOk={save}
      onCancel={() => { if (!pending.current) onCancel(); }}
    >
      <Typography.Paragraph>
        <strong>Thời gian nghỉ:</strong> {formatDateOnlyVN(item.start_date)} {item.start_date !== item.end_date ? `đến ${formatDateOnlyVN(item.end_date)}` : ''}
      </Typography.Paragraph>

      <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        <strong>Lý do xin nghỉ:</strong> {item.reason}
      </Typography.Paragraph>

      <Attachments type="leaves" targetId={item.Day_off_id} readOnly />
      {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}

      <Form form={form} layout="vertical" disabled={saving} initialValues={{ status: 'da_duoc_duyet' }}>
        <Form.Item name="status" label="Quyết định" rules={[{ required: true, message: 'Vui lòng chọn quyết định' }]}>
          <Select options={[
            { value: 'da_duoc_duyet', label: 'Duyệt đơn nghỉ phép' },
            { value: 'bi_tu_choi', label: 'Từ chối' }
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function LeaveApprovals() {
  const [status, setStatus] = useState('cho_xac_thuc');
  const [result, setResult] = useState({ status: '', rows: [], error: '' });
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null);
  const { message } = App.useApp();
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await getLeaveRequests(status);
        const rows = res?.requests || [];
        if (!Array.isArray(rows)) throw new Error('Danh sách yêu cầu không hợp lệ');
        if (active) setResult({ status, rows, error: '' });
      } catch (error) {
        if (active) setResult({ status, rows: [], error: error.message });
      }
    }
    load();
    return () => { active = false; };
  }, [status, reload]);

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          aria-label="Trạng thái đơn nghỉ"
          value={status}
          style={{ width: 200 }}
          onChange={setStatus}
          options={Object.entries(leaveStatusLabels).map(([value, info]) => ({
            value,
            label: info.label
          }))}
        />
        <Button onClick={() => setReload(value => value + 1)}>Tải lại</Button>
        <Typography.Text type="secondary">Tối đa 500 yêu cầu gần nhất</Typography.Text>
      </Space>

      {result.error && <Alert type="error" message={result.error} showIcon style={{ marginBottom: 12 }} />}

      <Table
        rowKey="Day_off_id"
        loading={result.status !== status}
        dataSource={result.status === status ? result.rows : []}
        scroll={{ x: 850 }}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'Chưa có đơn xin nghỉ' }}
        columns={[
          {
            title: 'Nhân viên',
            dataIndex: ['employees_Day_off_requests_employee_send_idToemployees', 'fullname'],
            width: 180,
            render: text => text || 'Nhân viên'
          },
          {
    title: 'Thời gian nghỉ',
    width: 220,
    render: (_, row) => {
      const formatDate = (dateVal) => {
        if (!dateVal) return '';
        try {
          const d = new Date(dateVal);
          if (isNaN(d.getTime())) return dateVal;
          return d.toLocaleDateString('vi-VN');
        } catch {
          return dateVal;
        }
      };

      const start = formatDate(row.start_date);
      const end = formatDate(row.end_date);

      if (!start) return '---';
      return start !== end && end ? `${start} - ${end}` : start;
    }
  },
          {
            title: 'Lý do xin nghỉ',
            dataIndex: 'reason',
            width: 280,
            render: text => <span style={{ overflowWrap: 'anywhere' }}>{text}</span>
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 140,
            render: value => {
              const info = leaveStatusLabels[value] || { label: value, color: 'default' };
              return <Tag color={info.color}>{info.label}</Tag>;
            }
          },
          {
            title: 'Xử lý',
            width: 140,
            render: (_, row) => row.status === 'cho_xac_thuc' && row.employee_send_id !== user?.employee_id ? (
              <Button type="primary" size="small" onClick={() => setSelected(row)}>Xử lý</Button>
            ) : row.status === 'cho_xac_thuc' ? (
              <Typography.Text type="secondary">Không thể tự duyệt</Typography.Text>
            ) : (
              <Typography.Text type="secondary">Đã xử lý</Typography.Text>
            )
          },
        ]}
      />

      {selected && (
        <ReviewLeaveModal
          item={selected}
          onCancel={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            setReload(value => value + 1);
            message.success('Đã lưu quyết định duyệt đơn');
          }}
        />
      )}
    </div>
  );
}
