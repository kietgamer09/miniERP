import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, Space, message } from 'antd';
import { updateDepartment } from '../services/departmentApi';

export default function EditDepartmentModal({ open, onCancel, onSuccess, department, employees }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (department && open) {
      form.setFieldsValue({
        department_name: department.department_name,
        category: department.category,
        managment: department.managment ? Number(department.managment) : undefined
      });
    }
  }, [department, open, form]);

  const handleSubmit = async (values) => {
    if (!department) return;
    setLoading(true);
    try {
      await updateDepartment(department.department_id, {
        department_name: values.department_name,
        category: values.category,
        managment: values.managment
      });
      message.success('Cập nhật phòng ban thành công!');
      onSuccess(); // Reload lại danh sách phòng ban ở trang cha
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
        {/* Đã bỏ trường mã phòng ban theo yêu cầu */}

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
              Lưu thay đổi
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}