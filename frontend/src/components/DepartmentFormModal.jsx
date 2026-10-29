import { useEffect, useState } from 'react';
import { Form, Input, Modal, message } from 'antd';
import { createDepartment, updateDepartment } from '../services/departmentApi';
import { useFormDraft } from '../hooks/useDraft';

function DepartmentFormModal({ open, department, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const draft = useFormDraft(form, `department:${department?.department_id ?? 'new'}`, {
    enabled: open, fields: ['department_name'],
  });

  useEffect(() => {
    if (!open) return;
    form.resetFields();
  }, [open, department, form]);

  async function handleSave() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (department) {
        await updateDepartment(department.department_id, values);
        messageApi.success('Cập nhật phòng ban thành công');
      } else {
        await createDepartment(values);
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
        <Form form={form} layout="vertical" preserve={false} initialValues={{ department_name: department?.department_name || '' }} onValuesChange={draft.onValuesChange}>
          <Form.Item
            label="Tên phòng ban"
            name="department_name"
            rules={[{
              required: true,
              whitespace: true,
              message: 'Vui lòng nhập tên phòng ban',
            }]}
          >
            <Input maxLength={200} placeholder="Nhập tên phòng ban" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default DepartmentFormModal;
