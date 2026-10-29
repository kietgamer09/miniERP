import { useRef, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs'; // Đảm bảo đã import dayjs
import { createAttendanceExplanation } from '../services/attendanceApi';
import { isAttendanceWeekend } from '../utils/attendance';
import { formatDateOnlyVN } from '../utils/dates';
import { useFormDraft } from '../hooks/useDraft';

export default function AttendanceExplanationModal({ day, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  const draft = useFormDraft(form, `attendance-explanation:${day.date}`, {
    fields: ['reason', 'makeup_date'], 
    dateFields: ['makeup_date'],
  });

  async function save() {
    if (pending.current) return;
    pending.current = true;
    try {
      const values = await form.validateFields();
      setSaving(true); 
      setError('');
      await createAttendanceExplanation({ 
        date: day.date, 
        reason: values.reason.trim(), 
        makeup_date: values.makeup_date?.format('YYYY-MM-DD') || null 
      });
      draft.clear();
      onSaved();
    } catch (err) { 
      if (!err.errorFields) setError(err.message || 'Không gửi được giải trình'); 
    } finally { 
      pending.current = false; 
      setSaving(false); 
    }
  }

  return (
    <Modal 
      open 
      forceRender 
      title={`Giải trình ngày ${formatDateOnlyVN(day.date)}`} 
      okText="Gửi đề nghị" 
      cancelText="Hủy"
      onOk={save} 
      onCancel={() => { if (!pending.current) onCancel(); }} 
      confirmLoading={saving}
      closable={!saving} 
      cancelButtonProps={{ disabled: saving }}
    >
      <Alert 
        type="info" 
        showIcon 
        title={`Bạn đang gửi giải trình cho ngày ${formatDateOnlyVN(day.date)}. Quản lý sẽ duyệt đề nghị này.`} 
        style={{ marginBottom: 16 }} 
      />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
      {draft.notice}
      
      {/* Thêm initialValues để tự động điền sẵn ngày được chọn vào ô chấm bù */}
      <Form 
        form={form} 
        layout="vertical" 
        disabled={saving} 
        initialValues={{
          makeup_date: dayjs(day.date)
        }}
        onValuesChange={draft.onValuesChange}
      >
        <Form.Item 
          name="reason" 
          label="Lý do và đề nghị chấm bù" 
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập lý do' },
            { max: 2000, message: 'Lý do tối đa 2000 ký tự' }
          ]}
        >
          <Input.TextArea 
            rows={4} 
            maxLength={2000} 
            showCount 
            placeholder="Giải thích lý do vào muộn/ra sớm hoặc thiếu công, và phương án chấm bù" 
          />
        </Form.Item>

        <Form.Item name="makeup_date" label="Ngày đề nghị chấm bù (không bắt buộc)">
          <DatePicker 
            format="DD/MM/YYYY" 
            style={{ width: '100%' }} 
            disabledDate={date => {
              const value = date.format('YYYY-MM-DD');
              return isAttendanceWeekend(value);
            }} 
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}