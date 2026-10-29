import { useRef, useState } from 'react';
import { Alert, Checkbox, DatePicker, Form, Input, Modal, Segmented, Typography } from 'antd';
import dayjs from 'dayjs';
import { createOvertime } from '../services/overtimeApi';
import { attendanceDay } from '../utils/attendance';
import { useFormDraft } from '../hooks/useDraft';
import { formatDateOnlyVN } from '../utils/dates';

export default function OvertimeFormModal({ onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const mode = Form.useWatch('mode', form) || 'planned';
  const start = Form.useWatch('start_time', form), end = Form.useWatch('end_time', form), nextDay = Form.useWatch('end_next_day', form);
  const minute = value => /^\d{2}:\d{2}$/.test(value || '') ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : 0;
  const total = minute(end) + (nextDay ? 1440 : 0) - minute(start);
  const today = attendanceDay(), maxDate = dayjs(today).add(1, 'month').format('YYYY-MM-DD');
  const draft = useFormDraft(form, 'overtime:new', { fields: ['mode', 'date', 'start_time', 'end_time', 'end_next_day', 'reason'], dateFields: ['date'] });
  async function save() {
    if (pending.current) return;
    pending.current = true;
    try {
      const values = await form.validateFields();
      if (total <= 0 || total > 1440) { setError('Giờ kết thúc phải sau giờ bắt đầu, tối đa 24 giờ. Chọn qua ngày nếu cần.'); return; }
      setSaving(true); setError('');
      const result = await createOvertime({ ...values, date: values.date.format('YYYY-MM-DD'), reason: values.reason.trim() });
      draft.clear(); onSaved(result);
    } catch (err) { if (!err.errorFields) setError(err.message || 'Không gửi được đơn làm thêm.'); }
    finally { pending.current = false; setSaving(false); }
  }
  return <Modal open title="Tạo đơn làm thêm" width={600} okText="Gửi đơn" cancelText="Đóng" onOk={save}
    onCancel={() => { if (!pending.current) onCancel(); }} confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving}>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
    {draft.notice}
    <Form form={form} layout="vertical" disabled={saving} onValuesChange={draft.onValuesChange}
      initialValues={{ mode: 'planned', start_time: '18:00', end_time: '20:00', end_next_day: false }}>
      <Form.Item name="mode" label="Loại đơn"><Segmented block options={[{ value: 'planned', label: 'Ngày sắp tới' }, { value: 'past', label: 'Bổ sung ngày đã qua' }]} /></Form.Item>
      <Typography.Paragraph type="secondary">{mode === 'past' ? 'Chọn ngày trước hôm nay. Đơn gửi vào hòm thư quản lý cùng phòng và Admin, không đẩy desktop.'
        : `Chọn từ hôm nay đến ${formatDateOnlyVN(maxDate)} (tối đa 1 tháng). Đơn gần ngày làm được ưu tiên; đẩy desktop khi còn tối đa 3 ngày.`}</Typography.Paragraph>
      <Form.Item name="date" label="Ngày làm thêm" dependencies={['mode']} rules={[{ required: true, message: 'Chọn ngày làm thêm' }, {
        validator: (_, value) => !value || (mode === 'past' ? value.format('YYYY-MM-DD') < attendanceDay()
          : value.format('YYYY-MM-DD') >= attendanceDay() && value.format('YYYY-MM-DD') <= dayjs(attendanceDay()).add(1, 'month').format('YYYY-MM-DD'))
          ? Promise.resolve() : Promise.reject(new Error('Ngày không phù hợp với loại đơn hoặc vượt một tháng.')),
      }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={date => mode === 'past'
        ? date.format('YYYY-MM-DD') >= today : date.format('YYYY-MM-DD') < today || date.format('YYYY-MM-DD') > maxDate} /></Form.Item>
      <div className="overtime-time-fields">
        <Form.Item name="start_time" label="Giờ bắt đầu" rules={[{ required: true, message: 'Nhập giờ bắt đầu' }]}><Input type="time" /></Form.Item>
        <Form.Item name="end_time" label="Giờ kết thúc" rules={[{ required: true, message: 'Nhập giờ kết thúc' }]}><Input type="time" /></Form.Item>
      </div>
      <Form.Item name="end_next_day" valuePropName="checked"><Checkbox>Kết thúc vào ngày hôm sau</Checkbox></Form.Item>
      {start && end && total > 0 && total <= 1440 && <Typography.Paragraph strong>Tổng thời gian: {Math.floor(total / 60)} giờ {total % 60 ? `${total % 60} phút` : ''}</Typography.Paragraph>}
      <Form.Item name="reason" label="Nội dung công việc / Lý do làm thêm" rules={[{ required: true, whitespace: true, message: 'Nhập lý do làm thêm' }, { max: 2000 }]}>
        <Input.TextArea rows={4} maxLength={2000} showCount placeholder="Công việc cần xử lý và lý do làm thêm…" /></Form.Item>
    </Form>
  </Modal>;
}
