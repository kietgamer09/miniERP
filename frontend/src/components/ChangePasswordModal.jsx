import { useRef, useState } from 'react';
import { Alert, App, Form, Input, Modal } from 'antd';
import { request } from '../services/http';

export default function ChangePasswordModal({ onClose, required = false }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const { message } = App.useApp();
  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const { oldPassword, newPassword } = await form.validateFields();
      setSaving(true);
      setError('');
      await request('/api/users/change-password', { method: 'PUT', body: { oldPassword, newPassword } });
      message.success('Đổi mật khẩu thành công');
      onClose();
    } catch (err) { if (!err.errorFields) setError(err.message || 'Không đổi được mật khẩu'); }
    finally { submitting.current = false; setSaving(false); }
  }
  return <Modal open forceRender title={required ? 'Đổi mật khẩu tạm' : 'Đổi mật khẩu'} okText="Lưu mật khẩu" cancelText="Hủy"
    onOk={submit} onCancel={() => { if (!required && !submitting.current) onClose(); }}
    confirmLoading={saving} closable={!saving && !required} maskClosable={!required && !saving}
    keyboard={!required && !saving} cancelButtonProps={{ disabled: saving, style: required ? { display: 'none' } : undefined }}>
    {required && <Alert type="info" showIcon title="Bạn cần đổi mật khẩu tạm trước khi sử dụng các chức năng khác." style={{ marginBottom: 12 }} />}
    {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
    <Form form={form} layout="vertical" disabled={saving}>
      <Form.Item name="oldPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}>
        <Input.Password autoComplete="current-password" />
      </Form.Item>
      <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: 'Nhập mật khẩu mới' },
        { min: 8, message: 'Mật khẩu mới cần ít nhất 8 ký tự' },
        { validator: (_, value) => !value || new TextEncoder().encode(value).length <= 72
          ? Promise.resolve() : Promise.reject(new Error('Mật khẩu mới tối đa 72 byte UTF-8')) }]}>
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="confirmPassword" label="Nhập lại mật khẩu mới" dependencies={['newPassword']}
        rules={[{ required: true, message: 'Nhập lại mật khẩu mới' }, ({ getFieldValue }) => ({
          validator: (_, value) => !value || value === getFieldValue('newPassword')
            ? Promise.resolve() : Promise.reject(new Error('Mật khẩu nhập lại chưa khớp')),
        })]}>
        <Input.Password autoComplete="new-password" />
      </Form.Item>
    </Form>
  </Modal>;
}
