import { useEffect, useRef, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal, Select } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { createTask } from '../services/projectApi';
import { updateTask } from '../services/taskApi';
import { formatDateOnlyVN } from '../utils/dates';
import { clampDeadlineToProject, defaultRecurringDeadline } from '../utils/taskDeadline';
import { TASK_PRIORITY_OPTIONS, TASK_RECURRENCE_OPTIONS } from '../config/taskConstants';
import { useFormDraft } from '../hooks/useDraft';

dayjs.locale('vi');

function TaskFormModal({ project, task = null, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const recurrenceFrequency = Form.useWatch('recurrence_frequency', form);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const submitting = useRef(false);
  const deadlineDateRef = useRef('');
  const editing = Boolean(task);
  const draft = useFormDraft(form, `task:${project.id}:${task?.id ?? 'new'}`, {
    fields: ['title', 'description', 'assignee_id', 'due_date', 'priority', 'recurrence_frequency'], dateTimeFields: ['due_date'],
  });
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
    deadlineDateRef.current = form.getFieldValue('due_date')?.format('YYYY-MM-DD') || '';
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
        assignee_id: values.assignee_id, due_date: values.due_date.format('YYYY-MM-DD'),
        due_time: values.due_date.format('HH:mm'), priority: values.priority,
        recurrence_frequency: values.recurrence_frequency || null,
      };
      if (editing) await updateTask(task.id, payload);
      else await createTask(project.id, payload);
      draft.clear();
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
    {draft.notice}
    <Form form={form} layout="vertical" disabled={saving} preserve={false}
      initialValues={task ? { title: task.title, description: task.description || '', assignee_id: task.assignee_id,
        due_date: task.due_date ? dayjs(`${task.due_date} ${task.due_time || '17:00'}`) : null, priority: task.priority,
        recurrence_frequency: task.recurrence_frequency || '' } : { recurrence_frequency: '' }}
      onValuesChange={(changed, values) => {
        setSaveError('');
        const dateKey = values.due_date?.format('YYYY-MM-DD') || '';
        const frequencyChanged = Object.hasOwn(changed, 'recurrence_frequency');
        const selectedDateChanged = Object.hasOwn(changed, 'due_date') && dateKey !== deadlineDateRef.current;
        if (values.due_date && values.recurrence_frequency && (frequencyChanged || selectedDateChanged)) {
          const normalized = clampDeadlineToProject(
            defaultRecurringDeadline(values.due_date, values.recurrence_frequency), project.end_date,
          );
          form.setFieldValue('due_date', normalized);
          deadlineDateRef.current = normalized.format('YYYY-MM-DD');
        } else if (Object.hasOwn(changed, 'due_date')) {
          deadlineDateRef.current = dateKey;
        }
        draft.onValuesChange(changed, form.getFieldsValue());
    }}>
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
          if (!value) return Promise.resolve();
          const dueDate = value.format('YYYY-MM-DD');
          if (dueDate < project.start_date) {
            return Promise.reject(new Error(`Hạn chót không được trước ngày bắt đầu dự án (${formatDateOnlyVN(project.start_date)})`));
          }
          if (dueDate > project.end_date) {
            return Promise.reject(new Error(`Hạn chót không được sau ngày kết thúc dự án (${formatDateOnlyVN(project.end_date)})`));
          }
          if (recurrenceFrequency && [0, 6].includes(value.day())) {
            return Promise.reject(new Error('Task lặp lại chỉ được đặt hạn từ Thứ 2 đến Thứ 6'));
          }
          return Promise.resolve();
        } },
      ]}>
        <DatePicker locale={viVN.DatePicker} showTime={{ format: 'HH:mm', defaultValue: dayjs().hour(17).minute(0).second(0) }}
          format="DD/MM/YYYY HH:mm" placeholder="Chọn ngày và giờ hạn chót" style={{ width: '100%' }}
          disabledDate={(date) => {
            const dueDate = date.format('YYYY-MM-DD');
            return dueDate < project.start_date || dueDate > project.end_date
              || (recurrenceFrequency && [0, 6].includes(date.day()));
          }} />
      </Form.Item>
      <Form.Item label="Mức ưu tiên" name="priority" rules={[{ required: true, message: 'Vui lòng chọn mức ưu tiên' }]}>
        <Select placeholder="Chọn mức ưu tiên" options={TASK_PRIORITY_OPTIONS} />
      </Form.Item>
      <Form.Item label="Lặp lại" name="recurrence_frequency" extra="Task tiếp theo tự tạo theo lịch, bỏ Thứ 7 và Chủ nhật. Mặc định hạn lúc 17:00: hàng ngày vào ngày làm việc kế tiếp, hàng tuần vào Thứ 6, hàng tháng vào ngày làm việc cuối tháng.">
        <Select options={TASK_RECURRENCE_OPTIONS} disabled={task?.status === 'xong'} />
      </Form.Item>
    </Form>
  </Modal>;
}

export default TaskFormModal;
