import { useRef, useState } from 'react';
import { Alert, Col, DatePicker, Form, Input, Modal, Row } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { updateMyProfile } from '../services/employeeApi';
import { useMyWork } from '../hooks/useMyWork';
import { useFormDraft } from '../hooks/useDraft';
import { attendanceDay } from '../utils/attendance';

dayjs.extend(customParseFormat);
function birthdayValue(value) {
  if (typeof value !== 'string') return null;
  const date = /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? dayjs(value, 'DD/MM/YYYY', true) : dayjs(value.slice(0, 10), 'YYYY-MM-DD', true);
  return date.isValid() ? date : null;
}

export default function ProfileFormModal({ profile, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const { updateProfile } = useMyWork();
  const draft = useFormDraft(form, 'profile:me', { fields: ['fullname', 'email', 'phone_number', 'birthday'], dateFields: ['birthday'] });
  async function save() {
    if (pending.current) return;
    pending.current = true;
    try {
      const values = await form.validateFields();
      setSaving(true); setError('');
      const result = await updateMyProfile({ fullname: values.fullname.trim(), email: values.email?.trim() || null,
        phone_number: values.phone_number?.trim() || null, birthday: values.birthday?.format('YYYY-MM-DD') || null });
      draft.clear(); updateProfile(result); onSaved(result);
    } catch (err) { if (!err.errorFields) setError(err.message || 'Không lưu được thông tin cá nhân.'); }
    finally { pending.current = false; setSaving(false); }
  }
  return <Modal open title="Chỉnh sửa thông tin cá nhân" width={620} okText="Lưu thay đổi" cancelText="Đóng" onOk={save}
    onCancel={() => { if (!pending.current) onCancel(); }} confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving}>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
    {draft.notice}
    <Form form={form} layout="vertical" disabled={saving} onValuesChange={draft.onValuesChange}
      initialValues={{ fullname: profile.fullname || '', email: profile.email || '', phone_number: profile.phone_number || '', birthday: birthdayValue(profile.birthday) }}>
      <Form.Item name="fullname" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Nhập họ và tên' }, { max: 100, message: 'Họ tên tối đa 100 ký tự' }]}>
        <Input autoComplete="name" maxLength={100} /></Form.Item>
      <Row gutter={16}>
        <Col xs={24} sm={12}><Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Địa chỉ email không hợp lệ' }, { max: 254 }]}>
          <Input autoComplete="email" type="email" maxLength={254} /></Form.Item></Col>
        <Col xs={24} sm={12}><Form.Item name="phone_number" label="Số điện thoại" rules={[{
          validator: (_, value) => !value?.trim() || /^\+?\d{7,15}$/.test(value.replace(/[\s().-]/g, '')) ? Promise.resolve() : Promise.reject(new Error('Nhập số điện thoại hợp lệ (7–15 chữ số)')),
        }]}><Input autoComplete="tel" type="tel" maxLength={30} /></Form.Item></Col>
      </Row>
      <Form.Item name="birthday" label="Ngày sinh" rules={[{
        validator: (_, value) => !value || (value.isValid() && value.format('YYYY-MM-DD') <= attendanceDay()) ? Promise.resolve() : Promise.reject(new Error('Ngày sinh không được trong tương lai')),
      }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={date => date.format('YYYY-MM-DD') > attendanceDay()} /></Form.Item>
    </Form>
  </Modal>;
}
