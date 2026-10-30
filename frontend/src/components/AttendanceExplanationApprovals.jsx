import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { getAttendanceExplanations, reviewAttendanceExplanation } from '../services/attendanceApi';
import { useAuth } from '../hooks/useAuth';
import { explanationTypeLabels } from '../utils/attendance';

// Nhãn và màu sắc trạng thái giải trình chấm công
const explanationStatusLabels = {
  pending: { label: 'Chờ duyệt', color: 'warning' },
  approved: { label: 'Đã duyệt', color: 'success' },
  rejected: { label: 'Từ chối', color: 'error' }
};

// Hàm định dạng ngày an toàn
function safeFormatDate(dateStr) {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

// Modal xử lý duyệt/từ chối
function ReviewExplanationModal({ item, onCancel, onSaved }) {
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

      await reviewAttendanceExplanation(item.id, { 
        status: values.status,
        review_note: values.review_note
      });

      onSaved();
    } catch (err) { 
      if (!err.errorFields) setError(err.message || 'Không xử lý được yêu cầu'); 
    } finally { 
      pending.current = false; 
      setSaving(false); 
    }
  }

  const employeeName = item.employees?.fullname || 'Nhân viên';

  return (
    <Modal 
      open 
      forceRender 
      title={`Xử lý giải trình chấm công: ${employeeName}`} 
      okText="Xác nhận quyết định" 
      cancelText="Hủy"
      confirmLoading={saving} 
      closable={!saving} 
      cancelButtonProps={{ disabled: saving }} 
      onOk={save}
      onCancel={() => { if (!pending.current) onCancel(); }}
    >
      <Typography.Paragraph>
        <strong>Ngày cần giải trình:</strong> {safeFormatDate(item.date || item.attendance_date)}
      </Typography.Paragraph>
      <Typography.Paragraph><strong>Loại đề nghị:</strong> {explanationTypeLabels[item.request_type] || 'Giải trình cũ'}</Typography.Paragraph>

      {(item.makeup_date || item.compensatory_date) && (
        <Typography.Paragraph>
          <strong>Ngày đề nghị chấm bù:</strong> {safeFormatDate(item.makeup_date || item.compensatory_date)}
        </Typography.Paragraph>
      )}
      
      <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        <strong>Lý do giải trình:</strong> {item.reason}
      </Typography.Paragraph>
      <Typography.Paragraph>
        <strong>Giờ đề nghị:</strong> Vào {item.requested_check_in || '—'} · Ra {item.requested_check_out || '—'}
      </Typography.Paragraph>

      <Alert 
        type="info" 
        title={item.request_type === 'correction' ? 'Duyệt sẽ cập nhật giờ công và lưu giờ cũ để đối chiếu.' : 'Duyệt kế hoạch làm bù không tự ghi đủ công hoặc trừ phép năm.'}
        style={{ marginBottom: 12 }} 
      />

      {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}

      <Form form={form} layout="vertical" disabled={saving} initialValues={{ status: 'approved' }}>
        <Form.Item name="status" label="Quyết định" rules={[{ required: true, message: 'Vui lòng chọn quyết định' }]}>
          <Select options={[
            { value: 'approved', label: 'Duyệt giải trình' },
            { value: 'rejected', label: 'Từ chối' }
          ]} />
        </Form.Item>

        <Form.Item name="review_note" label="Ghi chú của quản lý (tuỳ chọn)">
          <Input.TextArea rows={3} placeholder="Nhập ghi chú hoặc lý do nếu từ chối..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function AttendanceExplanationApprovals() {
  const [status, setStatus] = useState('pending'); // Mặc định lọc đơn Chờ duyệt
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null);
  const { message } = App.useApp();
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        // Truyền trạng thái lọc xuống API
        const res = await getAttendanceExplanations(status);
        const data = res?.explanations || [];
        if (!Array.isArray(data)) throw new Error('Danh sách giải trình không hợp lệ');
        
        if (active) {
          setRows(data);
        }
      } catch (err) { 
        if (active) setError(err.message || 'Không thể tải danh sách giải trình'); 
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [status, reload]); // Chạy lại mỗi khi đổi dropdown Status hoặc bấm Tải lại

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select 
          aria-label="Trạng thái giải trình" 
          value={status} 
          style={{ width: 200 }} 
          onChange={setStatus}
          options={Object.entries(explanationStatusLabels).map(([value, info]) => ({ 
            value, 
            label: info.label 
          }))} 
        />
        <Button onClick={() => setReload(v => v + 1)}>Tải lại</Button>
        <Typography.Text type="secondary">Danh sách đơn giải trình chấm công</Typography.Text>
      </Space>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      <Table 
        rowKey="id" 
        loading={loading} 
        dataSource={rows}
        scroll={{ x: 1230 }}
        pagination={{ pageSize: 10 }} 
        locale={{ emptyText: 'Không có đơn giải trình nào' }} 
        columns={[
          { 
            title: 'Nhân viên', 
            dataIndex: ['employees', 'fullname'], 
            width: 180,
            render: text => text || 'Nhân viên'
          },
          { 
            title: 'Loại đề nghị', key: 'request_type', width: 200,
            render: (_, row) => explanationTypeLabels[row.request_type] || 'Giải trình cũ',
          },
          {
            title: 'Ngày giải trình', 
            render: (_, row) => safeFormatDate(row.date || row.attendance_date),
            width: 150 
          },
          { 
            title: 'Chấm bù vào ngày', 
            render: (_, row) => {
              const val = row.makeup_date || row.compensatory_date;
              return val ? safeFormatDate(val) : <Typography.Text type="secondary">Không có</Typography.Text>;
            },
            width: 150 
          },
          { 
            title: 'Giờ đề nghị',
            key: 'requested_times',
            width: 180,
            render: (_, row) => <>Vào {row.requested_check_in || '—'}<br />Ra {row.requested_check_out || '—'}</>,
          },
          {
            title: 'Lý do giải trình', 
            dataIndex: 'reason', 
            width: 250, 
            render: text => <span style={{ overflowWrap: 'anywhere' }}>{text}</span> 
          },
          { 
            title: 'Trạng thái', 
            dataIndex: 'status', 
            width: 130,
            render: value => {
              const info = explanationStatusLabels[value] || { label: value, color: 'default' };
              return <Tag color={info.color}>{info.label}</Tag>;
            } 
          },
          { 
            title: 'Xử lý', 
            width: 140,
            render: (_, row) => row.status === 'pending' && row.employee_id !== user?.employee_id ? (
              <Button type="primary" size="small" onClick={() => setSelected(row)}>Xử lý</Button>
            ) : row.status === 'pending' ? (
              <Typography.Text type="secondary">Không thể tự duyệt</Typography.Text>
            ) : (
              <Typography.Text type="secondary">Đã xử lý</Typography.Text>
            ) 
          },
        ]} 
      />

      {selected && (
        <ReviewExplanationModal 
          item={selected} 
          onCancel={() => setSelected(null)} 
          onSaved={() => {
            setSelected(null); 
            setReload(v => v + 1); 
            message.success('Đã lưu quyết định duyệt giải trình');
          }} 
        />
      )}
    </div>
  );
}
