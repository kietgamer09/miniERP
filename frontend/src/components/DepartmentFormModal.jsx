import { useEffect, useState } from 'react';
import { Form, Input, Modal, Select, message } from 'antd';
import { createDepartment, updateDepartment } from '../services/departmentApi';
import { listEmployees } from '../services/employeeApi'; // <-- Thêm import lấy danh sách nhân viên
import { useFormDraft } from '../hooks/useDraft';

function DepartmentFormModal({ open, department, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]); // <-- State chứa nhân viên
  const [messageApi, contextHolder] = message.useMessage();
  const draft = useFormDraft(form, `department:${department?.department_id ?? 'new'}`, {
    enabled: open, fields: ['department_name', 'manager_id'],
  });

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    // Lấy danh sách nhân viên để đổ vào dropdown chọn quản lý
    listEmployees().then(res => {
      if (Array.isArray(res)) setEmployees(res);
    }).catch(err => console.error("Lỗi tải nhân viên", err));
  }, [open, department, form]);

  async function handleSave() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        department_name: values.department_name,
        manager_id: values.manager_id || null // Gửi manager_id lên backend
      };

      if (department) {
        await updateDepartment(department.department_id, payload);
        messageApi.success('Cập nhật phòng ban thành công');
      } else {
        await createDepartment(payload);
        messageApi.success('Thêm phòng ban thành công');
      }
      draft.clear();
      onSaved();
    } catch (error) {
      if (error?.errorFields) return;
      messageApi.error(error.message || 'Không lưu được phòng ban');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {contextHolder}
      <Modal
        title={department ? 'Sửa phòng ban' : 'Thêm phòng ban'}
        open={open}
        forceRender
        onCancel={onCancel}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden={false}
      >
        {draft.notice}
        <Form 
          form={form} 
          layout="vertical" 
          preserve={false} 
          initialValues={{ 
            department_name: department?.department_name || '',
            manager_id: department?.manager_id || undefined 
          }} 
          onValuesChange={draft.onValuesChange}
        >
          <Form.Item
            label="Tên phòng ban"
            name="department_name"
            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên phòng ban' }]}
          >
            <Input maxLength={200} placeholder="Nhập tên phòng ban" />
          </Form.Item>

          {/* Bổ sung trường chọn Quản lý phòng ban */}
          <Form.Item label="Quản lý phòng ban (Trưởng phòng)" name="manager_id">
            <Select
              allowClear
              placeholder="Chọn nhân viên phụ trách"
              optionFilterProp="children"
              showSearch
              options={employees.map(emp => ({
                value: emp.employee_id,
                label: `${emp.fullname} (${emp.position || 'Nhân viên'})`
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default DepartmentFormModal;