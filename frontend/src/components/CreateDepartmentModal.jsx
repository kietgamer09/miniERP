import { useState } from 'react';
import { Modal, Form, Input, Select, Button, Space, message } from 'antd';
import { createDepartment } from '../services/departmentApi';

export default function CreateDepartmentModal({ open, onCancel, onSuccess, employees }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await createDepartment({
        department_id: values.department_id,
        department_name: values.department_name,
        category: values.category,
        managment: values.managment
      });
      message.success('Tạo phòng ban thành công!');
      form.resetFields();
      onSuccess();
      onCancel();
    } catch (err) {
      message.error(err.message || 'Tạo phòng ban thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Tạo phòng ban mới"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="department_id"
          label="Mã phòng ban (ID dạng số)"
          rules={[{ required: true, message: 'Vui lòng nhập mã phòng ban!' }]}
        >
          <Input placeholder="Ví dụ: 101, 102..." type="number" />
        </Form.Item>

        <Form.Item
          name="department_name"
          label="Tên phòng ban"
          rules={[{ required: true, message: 'Vui lòng nhập tên phòng ban!' }]}
        >
          <Input placeholder="Ví dụ: Phòng Kỹ thuật, Phòng Nhân sự..." />
        </Form.Item>

        <Form.Item name="category" label="Phân loại">
          <Input placeholder="Nhập phân loại phòng ban..." />
        </Form.Item>

        <Form.Item name="managment" label="Quản lý phòng ban (Trưởng phòng)">
          <Select
            placeholder="Chọn nhân viên làm quản lý..."
            allowClear
            showSearch
            optionFilterProp="children"
            options={employees.map(emp => ({
              value: emp.employee_id,
              label: `${emp.fullname} (${emp.position || 'Nhân viên'})`
            }))}
          />
        </Form.Item>

        <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
          <Space>
            <Button onClick={onCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Tạo phòng ban
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}