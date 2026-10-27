import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useRole } from '../context/AuthContext';
import { listAttendanceExplanations, reviewAttendanceExplanation } from '../services/attendanceApi';
import { explanationLabels } from '../utils/attendance';
import { formatDateOnlyVN } from '../utils/dates';

function ReviewModal({ item, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function save() {
    if (pending.current) return;
    pending.current = true;
    try {
      const values = await form.validateFields();
      setSaving(true); setError('');
      await reviewAttendanceExplanation(item.id, { decision: values.decision, review_note: values.review_note?.trim() || null });
      onSaved();
    } catch (err) { if (!err.errorFields) setError(err.message || 'Không xử lý được yêu cầu'); }
    finally { pending.current = false; setSaving(false); }
  }
  return <Modal open forceRender title={`Duyệt giải trình: ${item.employee_name || 'Nhân viên'}`} okText="Xác nhận quyết định" cancelText="Hủy"
    confirmLoading={saving} closable={!saving} cancelButtonProps={{ disabled: saving }} onOk={save}
    onCancel={() => { if (!pending.current) onCancel(); }}>
    <Typography.Paragraph>Ngày công: {formatDateOnlyVN(item.date)}</Typography.Paragraph>
    <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.reason}</Typography.Paragraph>
    {item.makeup_date && <Typography.Paragraph>Ngày đề nghị chấm bù: {formatDateOnlyVN(item.makeup_date)}</Typography.Paragraph>}
    <Alert type="info" title="Duyệt chỉ ghi nhận quyết định; không sửa giờ và màu ngày công thực tế." style={{ marginBottom: 12 }} />
    {error && <Alert type="error" title={error} style={{ marginBottom: 12 }} />}
    <Form form={form} layout="vertical" disabled={saving} initialValues={{ decision: 'approved' }}>
      <Form.Item name="decision" label="Quyết định" rules={[{ required: true }]}>
        <Select options={[{ value: 'approved', label: 'Duyệt đề nghị chấm bù' }, { value: 'rejected', label: 'Từ chối' }]} />
      </Form.Item>
      <Form.Item name="review_note" label="Ghi chú của Admin" dependencies={['decision']} rules={[
        { max: 2000, message: 'Ghi chú tối đa 2000 ký tự' }, ({ getFieldValue }) => ({
          validator: (_, value) => getFieldValue('decision') === 'rejected' && !value?.trim()
            ? Promise.reject(new Error('Cần nhập lý do từ chối')) : Promise.resolve(),
        }),
      ]}><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
    </Form>
  </Modal>;
}

function AdminApprovals() {
  const [status, setStatus] = useState('pending');
  const [result, setResult] = useState({ status: '', rows: [], error: '' });
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null);
  const { message } = App.useApp();
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const rows = await listAttendanceExplanations(status);
        if (!Array.isArray(rows)) throw new Error('Danh sách yêu cầu không hợp lệ');
        if (active) setResult({ status, rows, error: '' });
      } catch (error) { if (active) setResult({ status, rows: [], error: error.message }); }
    }
    load();
    return () => { active = false; };
  }, [status, reload]);
  return <div>
    <Typography.Title level={3}>Duyệt giải trình chấm công</Typography.Title>
    <Space wrap style={{ marginBottom: 16 }}>
      <Select aria-label="Trạng thái giải trình" value={status} style={{ width: 200 }} onChange={setStatus}
        options={Object.entries(explanationLabels).map(([value, label]) => ({ value, label }))} />
      <Button onClick={() => setReload(value => value + 1)}>Tải lại</Button>
      <Typography.Text type="secondary">Tối đa 500 yêu cầu gần nhất</Typography.Text>
    </Space>
    {result.error && <Alert type="error" title={result.error} showIcon style={{ marginBottom: 12 }} />}
    <Table rowKey="id" loading={result.status !== status} dataSource={result.status === status ? result.rows : []}
      scroll={{ x: 850 }} pagination={{ pageSize: 10 }} locale={{ emptyText: 'Chưa có yêu cầu' }} columns={[
        { title: 'Nhân viên', dataIndex: 'employee_name', width: 180 },
        { title: 'Ngày công', dataIndex: 'date', width: 120, render: formatDateOnlyVN },
        { title: 'Lý do', dataIndex: 'reason', width: 280, render: text => <span style={{ overflowWrap: 'anywhere' }}>{text}</span> },
        { title: 'Đề nghị chấm bù', dataIndex: 'makeup_date', width: 140, render: value => value ? formatDateOnlyVN(value) : '—' },
        { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag>{explanationLabels[value]}</Tag> },
        { title: 'Xử lý', render: (_, row) => row.can_review ? <Button onClick={() => setSelected(row)}>Xem và duyệt</Button>
          : row.status === 'pending' ? <Typography.Text type="secondary">Không tự duyệt</Typography.Text> : row.review_note || 'Đã xử lý' },
      ]} />
    {selected && <ReviewModal item={selected} onCancel={() => setSelected(null)} onSaved={() => {
      setSelected(null); setReload(value => value + 1); message.success('Đã lưu quyết định');
    }} />}
  </div>;
}

export default function AttendanceApprovals() {
  const { role } = useRole();
  return role === 'admin' ? <AdminApprovals /> : <Alert type="info" title="Chỉ Admin được duyệt giải trình chấm công." showIcon />;
}
