import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, Space, message } from 'antd';
import { updateDepartment } from '../services/departmentApi';

export default function EditDepartmentModal({ open, onCancel, onSuccess, department, employees }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (department && open) {
      // Lấy chính xác manager_id từ object department (hỗ trợ cả manager_id hoặc manager object)
      const currentManagerId = department.manager_id || department.manager?.employee_id || department.managment;
      
      form.setFieldsValue({
        department_name: department.department_name,
        category: department.category,
        manager_id: currentManagerId ? Number(currentManagerId) : undefined
      });
    }
  }, [department, open, form]);

  const handleSubmit = async (values) => {
    if (!department) return;
    setLoading(true);
    try {
      // Gửi đúng tên trường manager_id lên Backend
      await updateDepartment(department.department_id, {
        department_name: values.department_name,
        category: values.category,
        manager_id: values.manager_id !== undefined ? values.manager_id : null
      });
      message.success('Cập nhật phòng ban thành công!');
      onSuccess();
      onCancel();
    } catch (err) {
      message.error(err.message || 'Cập nhật phòng ban thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Chỉnh sửa phòng ban: ${department?.department_name || ''}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>

        <Form.Item
          name="department_name"
          label="Tên phòng ban"
          rules={[{ required: true, message: 'Vui lòng nhập tên phòng ban!' }]}
        >
          <Input placeholder="Nhập tên phòng ban..." />
        </Form.Item>

        <Form.Item name="category" label="Phân loại">
          <Input placeholder="Nhập phân loại phòng ban..." />
        </Form.Item>

        <Form.Item name="manager_id" label="Quản lý phòng ban (Trưởng phòng)">
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
              Lưu thay đổi
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}