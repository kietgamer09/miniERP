import { useRef, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal } from 'antd';
import { createAttendanceExplanation } from '../services/attendanceApi';
import { attendanceDay, isAttendanceWeekend } from '../utils/attendance';
import { formatDateOnlyVN } from '../utils/dates';

export default function AttendanceExplanationModal({ day, onCancel, onSaved }) {
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
      await createAttendanceExplanation({ date: day.date, reason: values.reason.trim(), makeup_date: values.makeup_date?.format('YYYY-MM-DD') || null });
      onSaved();
    } catch (err) { if (!err.errorFields) setError(err.message || 'Không gửi được giải trình'); }
    finally { pending.current = false; setSaving(false); }
  }
  return <Modal open forceRender title={`Giải trình ngày ${formatDateOnlyVN(day.date)}`} okText="Gửi đề nghị" cancelText="Hủy"
    onOk={save} onCancel={() => { if (!pending.current) onCancel(); }} confirmLoading={saving}
    closable={!saving} cancelButtonProps={{ disabled: saving }}>
    <Alert type="info" showIcon title="Admin duyệt đề nghị; giờ công và màu ngày công thực tế được giữ nguyên." style={{ marginBottom: 16 }} />
    {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
    <Form form={form} layout="vertical" disabled={saving}>
      <Form.Item name="reason" label="Lý do và đề nghị chấm bù" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do' },
        { max: 2000, message: 'Lý do tối đa 2000 ký tự' }]}>
        <Input.TextArea rows={4} maxLength={2000} showCount placeholder="Giải thích lý do vào muộn/ra sớm hoặc thiếu công, và phương án chấm bù" />
      </Form.Item>
      <Form.Item name="makeup_date" label="Ngày đề nghị chấm bù (không bắt buộc)">
        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={date => {
          const value = date.format('YYYY-MM-DD');
          return value < attendanceDay() || isAttendanceWeekend(value);
        }} />
      </Form.Item>
    </Form>
  </Modal>;
}
