import { useEffect, useRef, useState } from 'react';
import { Alert, AutoComplete, Form, Input, Modal, Select } from 'antd';
import { createEmployee, updateEmployee } from '../services/employeeApi';
import { normalizeRole } from '../services/authApi';

const roles = [
  { value: 'employee', label: 'Nhân viên' },
  { value: 'manager', label: 'Quản lý' },
  { value: 'admin', label: 'Admin' },
];

function EmployeeFormModal({ open, employee, departments, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const submitting = useRef(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(employee ? {
      ...employee,
      department_id: String(employee.department_id),
      role: normalizeRole(employee.users?.role),
    } : { role: 'employee' });
  }, [open, employee, form]);

  async function handleSave() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const values = await form.validateFields();
      setSaving(true);
      setSaveError('');
      const body = {
        fullname: values.fullname.trim(),
        phone_number: values.phone_number.trim(),
        department_id: Number(values.department_id),
        role: values.role,
        email: values.email?.trim() || null,
        birthday: values.birthday || null,
      };
      const result = employee
        ? await updateEmployee(employee.employee_id, body)
        : await createEmployee(body);
      onSaved(employee ? null : result.login_info);
    } catch (error) {
      if (!error?.errorFields) setSaveError(error.message || 'Không lưu được nhân viên');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal title={employee ? 'Sửa nhân viên' : 'Thêm nhân viên'} open={open} forceRender
      onOk={handleSave} onCancel={() => { if (!submitting.current) onCancel(); }}
      confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} okText="Lưu" cancelText="Hủy">
      {saveError && <Alert title={saveError} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" disabled={saving} preserve={false}>
        <Form.Item name="fullname" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone_number" label="Số điện thoại"
          extra={employee ? `Tài khoản đăng nhập vẫn là: ${employee.users?.username || '—'}` : 'Số điện thoại sẽ được dùng làm tài khoản đăng nhập.'}
          rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập số điện thoại' }]}>
          <Input type="tel" />
        </Form.Item>
        <Form.Item name="department_id" label="Phòng ban" extra="Chọn phòng ban gợi ý hoặc nhập mã phòng ban đã có."
          rules={[{ required: true, message: 'Vui lòng nhập mã phòng ban' }, {
            validator: (_, value) => value == null || value === '' || (/^[1-9]\d*$/.test(String(value)) && Number(value) <= 2147483647)
              ? Promise.resolve() : Promise.reject(new Error('Mã phòng ban phải là số nguyên dương')),
          }]}>
          <AutoComplete options={departments} placeholder="Chọn hoặc nhập mã phòng ban" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
          <Input type="email" />
        </Form.Item>
        <Form.Item name="birthday" label="Ngày sinh"><Input type="date" /></Form.Item>
        <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }, {
          validator: (_, value) => !value || roles.some((role) => role.value === value)
            ? Promise.resolve() : Promise.reject(new Error('Vui lòng chọn vai trò hợp lệ')),
        }]}>
          <Select options={roles} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default EmployeeFormModal;
