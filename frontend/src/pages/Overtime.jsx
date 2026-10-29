import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Descriptions, Form, Input, Modal, Popconfirm, Select, Space, Spin, Table, Tabs, Tag, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useRole } from '../hooks/useAuth';
import { cancelOvertime, getOvertime, listOvertime, OVERTIME_CHANGED, reviewOvertime } from '../services/overtimeApi';
import OvertimeFormModal from '../components/OvertimeFormModal';
import Attachments from '../components/Attachments';
import { formatDateOnlyVN } from '../utils/dates';
import { detailInteraction } from '../utils/detailInteraction';
import './Overtime.css';

const statusInfo = { pending: { label: 'Chờ duyệt', color: 'gold' }, approved: { label: 'Đã duyệt', color: 'green' }, rejected: { label: 'Từ chối', color: 'red' }, cancelled: { label: 'Đã hủy', color: 'default' } };
const duration = minutes => `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`;
const statusTag = status => <Tag color={statusInfo[status]?.color}>{statusInfo[status]?.label || status}</Tag>;

function OvertimeDetail({ id, onClose }) {
  const [row, setRow] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const pending = useRef(false);
  const { message } = App.useApp();
  const decision = Form.useWatch('decision', form);
  useEffect(() => {
    let active = true, running = false;
    async function load() {
      if (running || document.hidden) return;
      running = true;
      try { const data = await getOvertime(id); if (active) { setRow(data); setError(''); } }
      catch (err) { if (active) { setError(err.message); if ([403, 404].includes(err.status)) setRow(null); } }
      finally { running = false; }
    }
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener(OVERTIME_CHANGED, load);
    return () => { active = false; clearInterval(timer); window.removeEventListener(OVERTIME_CHANGED, load); };
  }, [id]);
  async function act(cancel = false) {
    if (pending.current) return;
    pending.current = true;
    try {
      const values = cancel ? null : await form.validateFields();
      setSaving(true); setError('');
      if (cancel) { await cancelOvertime(id); setRow(await getOvertime(id)); message.success('Đã hủy đơn làm thêm'); }
      else { setRow(await reviewOvertime(id, { decision: values.decision, note: values.note })); message.success('Đã xử lý đơn làm thêm'); }
    } catch (err) { if (!err.errorFields) setError(err.message); }
    finally { pending.current = false; setSaving(false); }
  }
  return <Modal open title={`Đơn làm thêm #${id}`} width={720} onCancel={() => { if (!pending.current) onClose(); }} closable={!saving}
    footer={<Space wrap>
      {row?.can_cancel && <Popconfirm title="Hủy đơn làm thêm đang chờ duyệt?" okText="Hủy đơn" cancelText="Quay lại" onConfirm={() => act(true)}>
        <Button danger disabled={saving}>Hủy đơn</Button></Popconfirm>}
      <Button disabled={saving} onClick={onClose}>Đóng</Button>
      {row?.can_review && <Button type="primary" loading={saving} onClick={() => act()}>Xác nhận quyết định</Button>}
    </Space>}>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
    {!row && !error && <Spin />}
    {row && <>
      <Descriptions column={1} size="small" items={[
        { key: 'employee', label: 'Nhân viên', children: `${row.employee_name || 'Nhân viên'} · ${row.department_name || ''}` },
        { key: 'mode', label: 'Loại đơn', children: row.mode === 'past' ? 'Bổ sung ngày đã qua' : 'Kế hoạch ngày sắp tới' },
        { key: 'date', label: 'Ngày làm thêm', children: formatDateOnlyVN(row.date) },
        { key: 'time', label: 'Khoảng giờ', children: `${row.start_time} – ${row.end_time}${row.end_next_day ? ' (ngày hôm sau)' : ''} · ${duration(row.total_minutes)}` },
        { key: 'status', label: 'Trạng thái', children: statusTag(row.status) },
        { key: 'reason', label: 'Nội dung / Lý do', children: <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.reason}</div> },
        ...(row.reviewed_at ? [{ key: 'reviewer', label: 'Người duyệt', children: `${row.reviewer_name || 'Người duyệt'} · ${new Date(row.reviewed_at).toLocaleString('vi-VN')}` },
          { key: 'note', label: 'Ý kiến xử lý', children: <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.review_note || '—'}</div> }] : []),
      ]} />
      <Attachments type="overtime" targetId={row.id} readOnly={!row.can_cancel} />
      {row.can_review && <Form form={form} layout="vertical" disabled={saving} initialValues={{ decision: 'approved' }} style={{ marginTop: 20 }}>
        <Form.Item label="Quyết định" name="decision" rules={[{ required: true }]}><Select options={[{ value: 'approved', label: 'Duyệt đơn' }, { value: 'rejected', label: 'Từ chối' }]} /></Form.Item>
        <Form.Item label="Ý kiến xử lý" name="note" rules={[{ required: decision === 'rejected', whitespace: true, message: 'Nhập lý do từ chối' }, { max: 1000 }]}>
          <Input.TextArea rows={3} maxLength={1000} showCount placeholder={decision === 'rejected' ? 'Lý do từ chối…' : 'Ghi chú (không bắt buộc)…'} /></Form.Item>
      </Form>}
    </>}
  </Modal>;
}

export default function Overtime({ approvalsOnly = false }) {
  const { role } = useRole();
  const canReview = ['admin', 'manager'].includes(role);
  const [params, setParams] = useSearchParams();
  const view = approvalsOnly || (canReview && params.get('view') === 'review') ? 'review' : 'mine';
  const selectedId = /^[1-9]\d*$/.test(params.get('request') || '') ? params.get('request') : null;
  const [status, setStatus] = useState(() => view === 'review' ? 'pending' : 'all');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState({ key: '', rows: [], error: '' });
  const [revision, setRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const { message } = App.useApp();
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const key = `${view}:${status}:${revision}`;
  useEffect(() => {
    let active = true;
    listOvertime({ view, status: status === 'all' ? undefined : status }).then(data => {
      if (active) setResult({ key, rows: data.requests, error: '' });
    }).catch(err => { if (active) setResult({ key, rows: [], error: err.message }); });
    return () => { active = false; };
  }, [view, status, key]);
  useEffect(() => {
    const visible = () => { if (!document.hidden) reload(); };
    window.addEventListener(OVERTIME_CHANGED, reload); window.addEventListener('focus', visible);
    const timer = setInterval(visible, 30000);
    return () => { clearInterval(timer); window.removeEventListener(OVERTIME_CHANGED, reload); window.removeEventListener('focus', visible); };
  }, [reload]);
  const rows = result.key === key ? result.rows : [];
  const filtered = rows.filter(row => `${row.employee_name || ''} ${row.department_name || ''} ${row.reason} ${row.date}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  const choose = id => { const next = new URLSearchParams(params); if (id) next.set('request', id); else next.delete('request'); setParams(next, { replace: !id }); };
  const columns = [
    ...(view === 'review' ? [{ title: 'Nhân viên', dataIndex: 'employee_name', width: 190, render: (value, row) => <div><Typography.Text strong>{value || 'Nhân viên'}</Typography.Text><div className="overtime-muted">{row.department_name}</div></div> }] : []),
    { title: 'Ngày làm thêm', dataIndex: 'date', width: 165, render: (value, row) => <div><Typography.Text strong>{formatDateOnlyVN(value)}</Typography.Text><div className="overtime-muted">{row.mode === 'past' ? 'Bổ sung ngày cũ' : 'Kế hoạch'}</div></div> },
    { title: 'Thời gian', key: 'time', width: 180, render: (_, row) => <div>{row.start_time} – {row.end_time}{row.end_next_day && <div className="overtime-muted">Kết thúc hôm sau</div>}<div className="overtime-muted">{duration(row.total_minutes)}</div></div> },
    { title: 'Nội dung / Lý do', dataIndex: 'reason', ellipsis: true, width: 240 },
    { title: 'Trạng thái', dataIndex: 'status', width: 140, render: statusTag },
    { title: 'Ngày gửi', dataIndex: 'created_at', width: 170, render: value => new Date(value).toLocaleString('vi-VN') },
  ];
  return <div className="overtime-page">
    {!approvalsOnly && <div className="overtime-header"><div><Typography.Title level={3}>Làm thêm</Typography.Title>
      <Typography.Text type="secondary">Đăng ký tăng ca hoặc bổ sung ngày đã làm; theo dõi kết quả duyệt.</Typography.Text></div>
      <Space wrap><Button icon={<ReloadOutlined />} onClick={reload}>Tải lại</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>Tạo đơn làm thêm</Button></Space></div>}
    {!approvalsOnly && canReview && <Tabs activeKey={view} onChange={value => { setStatus(value === 'review' ? 'pending' : 'all'); setParams({ view: value }); }}
      items={[{ key: 'mine', label: 'Đơn của tôi' }, { key: 'review', label: 'Đơn cần duyệt' }]} />}
    <section className="list-panel">
      <div className="overtime-filters"><Input allowClear prefix={<SearchOutlined />} aria-label="Tìm đơn làm thêm" placeholder="Tìm nội dung, ngày, nhân viên…" value={query} onChange={event => setQuery(event.target.value)} />
        <Select aria-label="Trạng thái đơn làm thêm" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(statusInfo).map(([value, info]) => ({ value, label: info.label }))]} />
        {approvalsOnly && <Button icon={<ReloadOutlined />} onClick={reload}>Tải lại</Button>}
        <Typography.Text type="secondary">{filtered.length} đơn · tối đa 500 đơn gần nhất</Typography.Text></div>
      {result.key === key && result.error && <Alert type="error" showIcon title={result.error} action={<Button onClick={reload}>Thử lại</Button>} />}
      <Table rowKey="id" columns={columns} dataSource={filtered} loading={result.key !== key} scroll={{ x: view === 'review' ? 1100 : 950 }}
        pagination={{ pageSize: 10, hideOnSinglePage: true }} locale={{ emptyText: 'Chưa có đơn làm thêm phù hợp' }}
        onRow={row => ({ className: 'detail-clickable-row', ...detailInteraction(() => choose(String(row.id)), `Xem đơn làm thêm ngày ${formatDateOnlyVN(row.date)}`) })} />
    </section>
    {selectedId && <OvertimeDetail key={selectedId} id={selectedId} onClose={() => choose(null)} />}
    {creating && <OvertimeFormModal onCancel={() => setCreating(false)} onSaved={row => { setCreating(false); choose(String(row.id)); message.success('Đã gửi đơn đến quản lý cùng phòng và Admin'); }} />}
  </div>;
}
