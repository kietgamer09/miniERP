import { useRef, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal, Select, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { createAttendanceExplanation } from '../services/attendanceApi';
import { attendanceDay } from '../utils/attendance';
import { formatDateOnlyVN } from '../utils/dates';
import { useFormDraft } from '../hooks/useDraft';
import './AttendanceExplanationModal.css';

export default function AttendanceExplanationModal({ day, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const requestType = Form.useWatch('request_type', form) || 'correction';
  const reason = Form.useWatch('reason', form) || '';

  const draft = useFormDraft(form, `attendance-explanation:${day.date}`, {
    fields: ['request_type', 'reason', 'makeup_date', 'requested_check_in', 'requested_check_out'],
    dateFields: ['makeup_date'],
    onRestore: values => form.setFieldValue('request_type', values.request_type || (values.makeup_date ? 'makeup' : 'correction')),
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
        request_type: values.request_type,
        reason: values.reason.trim(), 
        makeup_date: values.request_type === 'makeup' ? values.makeup_date?.format('YYYY-MM-DD') || null : null,
        requested_check_in: values.requested_check_in || null,
        requested_check_out: values.requested_check_out || null,
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
      width={600}
      centered
      className="attendance-explanation-modal"
      title={`Giải trình ngày ${formatDateOnlyVN(day.date)}`} 
      okText="Gửi đề nghị" 
      cancelText="Hủy"
      onOk={save} 
      onCancel={() => { if (!pending.current) onCancel(); }} 
      confirmLoading={saving}
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto', overflowX: 'hidden' } }}
      closable={!saving} 
      cancelButtonProps={{ disabled: saving }}
    >
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
      {draft.notice}
      
      <Form 
        form={form} 
        layout="vertical" 
        disabled={saving} 
        initialValues={{
          request_type: 'correction', makeup_date: null, requested_check_in: '07:59', requested_check_out: '17:01',
        }}
        onValuesChange={draft.onValuesChange}
      >
        <Form.Item name="request_type" label="Loại đề nghị" rules={[{ required: true }]}>
          <Select options={[
            { value: 'correction', label: 'Bổ sung / điều chỉnh giờ công' },
            { value: 'makeup', label: 'Đăng ký làm bù' },
          ]} />
        </Form.Item>
        <Form.Item 
          name="reason" 
          label="Lý do đề nghị"
          extra={<div className="explanation-character-count">{reason.length} / 2000</div>}
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập lý do' },
            { max: 2000, message: 'Lý do tối đa 2000 ký tự' }
          ]}
        >
          <Input.TextArea 
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={2000} 
            placeholder={requestType === 'correction' ? 'Ví dụ: Quên chấm công ra ca, thực tế kết thúc làm việc lúc 17:30' : 'Lý do cần làm bù và công việc dự kiến thực hiện'}
          />
        </Form.Item>

        <div className="explanation-time-grid">
          {['requested_check_in', 'requested_check_out'].map((field, index) =>
            <Form.Item key={field} name={field} label={requestType === 'correction' ? (index === 0 ? 'Giờ vào ghi nhận' : 'Giờ ra ghi nhận') : (index === 0 ? 'Giờ bắt đầu làm bù' : 'Giờ kết thúc làm bù')}
              dependencies={['request_type', index === 0 ? 'requested_check_out' : 'requested_check_in']}
              getValueProps={value => ({ value: value ? dayjs(`${day.date}T${value}:00`) : null })}
              getValueFromEvent={value => value?.format('HH:mm') || null}
              rules={[({ getFieldValue }) => ({ validator: () => {
                const start = getFieldValue('requested_check_in'), end = getFieldValue('requested_check_out');
                if (getFieldValue('request_type') === 'makeup' && (!start || !end)) return Promise.reject(new Error('Chọn đủ giờ bắt đầu và kết thúc làm bù'));
                if (!start && !end) return Promise.reject(new Error('Chọn ít nhất giờ vào hoặc giờ ra'));
                if (start && end && end <= start) return Promise.reject(new Error('Giờ ra phải sau giờ vào'));
                return Promise.resolve();
              } })]}>
              <TimePicker format="HH:mm" minuteStep={1} style={{ width: '100%' }} placeholder={index === 0 ? 'Chọn giờ vào' : 'Chọn giờ ra'} />
            </Form.Item>
          )}
        </div>

        {requestType === 'makeup' && <Form.Item name="makeup_date" label="Ngày làm bù dự kiến" rules={[{ required: true, message: 'Chọn ngày làm bù' }, {
          validator: (_, date) => {
            if (!date) return Promise.resolve();
            const value = date.format('YYYY-MM-DD');
            return date.isValid() && value >= attendanceDay() && value >= day.date
              ? Promise.resolve() : Promise.reject(new Error('Chọn ngày từ hôm nay trở đi và không trước ngày cần giải trình'));
          },
        }]}>
          <DatePicker 
            format="DD/MM/YYYY" 
            style={{ width: '100%' }} 
            disabledDate={date => {
              const value = date.format('YYYY-MM-DD');
              return value < attendanceDay() || value < day.date;
            }} 
          />
        </Form.Item>}
      </Form>
    </Modal>
  );
}
