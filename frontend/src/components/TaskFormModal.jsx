import { useEffect, useRef, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal, Select } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { createTask } from '../services/projectApi';
import { updateTask } from '../services/taskApi';
import { formatDateOnlyVN } from '../utils/dates';
import { TASK_PRIORITY_OPTIONS } from '../config/taskConstants';

dayjs.locale('vi');

function TaskFormModal({ project, task = null, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const submitting = useRef(false);
  const editing = Boolean(task);
  const assigneeOptions = (project.members || []).map((member) => ({
    value: member.employee_id, label: member.fullname || `Nhân viên ${member.employee_id}`,
  }));
  if (task && !assigneeOptions.some((option) => option.value === task.assignee_id)) {
    assigneeOptions.unshift({
      value: task.assignee_id,
      label: task.assignee_name || `Nhân viên ${task.assignee_id} (người làm hiện tại)`,
    });
  }

  useEffect(() => {
    form.resetFields();
    if (task) {
      form.setFieldsValue({
        title: task.title,
        description: task.description || '',
        assignee_id: task.assignee_id,
        due_date: task.due_date ? dayjs(task.due_date) : null,
        priority: task.priority,
      });
    }
  }, [form, project.id, task]);

  async function handleSave() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const values = await form.validateFields();
      setSaving(true);
      setSaveError('');
      const payload = {
        title: values.title.trim(), description: values.description?.trim() || null,
        assignee_id: values.assignee_id, due_date: values.due_date.format('YYYY-MM-DD'), priority: values.priority,
      };
      if (editing) await updateTask(task.id, payload);
      else await createTask(project.id, payload);
      onSaved();
    } catch (error) {
      if (!error?.errorFields) setSaveError(error.message || (editing ? 'Không sửa được task' : 'Không tạo được task'));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return <Modal open forceRender title={editing ? 'Sửa task' : 'Tạo task'}
    okText={editing ? 'Lưu thay đổi' : 'Tạo task'} cancelText="Hủy"
    onOk={handleSave} onCancel={() => { if (!submitting.current) onCancel(); }}
    confirmLoading={saving} closable={!saving} cancelButtonProps={{ disabled: saving }}
    okButtonProps={{ disabled: project.status === 'hoan_thanh' }}>
    {saveError && <Alert type="error" title={saveError} showIcon style={{ marginBottom: 16 }} />}
    <Form form={form} layout="vertical" disabled={saving} preserve={false} onValuesChange={() => setSaveError('')}>
      <Form.Item label="Tiêu đề" name="title" rules={[
        { required: true, whitespace: true, message: 'Vui lòng nhập tiêu đề' },
        { max: 200, message: 'Tiêu đề không được quá 200 ký tự' },
      ]}>
        <Input maxLength={200} placeholder="Nhập tiêu đề công việc" />
      </Form.Item>
      <Form.Item label="Mô tả" name="description"><Input.TextArea rows={3} placeholder="Nhập mô tả công việc" /></Form.Item>
      <Form.Item label="Người làm" name="assignee_id" rules={[{ required: true, message: 'Vui lòng chọn người làm' }]}>
        <Select showSearch optionFilterProp="label" placeholder="Chọn thành viên dự án"
          notFoundContent="Dự án chưa có thành viên" options={assigneeOptions} />
      </Form.Item>
      <Form.Item label="Hạn chót" name="due_date" rules={[
        { required: true, message: 'Vui lòng chọn hạn chót' },
        { validator(_, value) {
          return value && value.format('YYYY-MM-DD') > project.end_date
            ? Promise.reject(new Error(`Hạn chót không được sau ngày kết thúc dự án (${formatDateOnlyVN(project.end_date)})`))
            : Promise.resolve();
        } },
      ]}>
        <DatePicker locale={viVN.DatePicker} format="DD/MM/YYYY" placeholder="Chọn hạn chót" style={{ width: '100%' }}
          disabledDate={(date) => date.format('YYYY-MM-DD') > project.end_date} />
      </Form.Item>
      <Form.Item label="Mức ưu tiên" name="priority" rules={[{ required: true, message: 'Vui lòng chọn mức ưu tiên' }]}>
        <Select placeholder="Chọn mức ưu tiên" options={TASK_PRIORITY_OPTIONS} />
      </Form.Item>
    </Form>
  </Modal>;
}

export default TaskFormModal;
