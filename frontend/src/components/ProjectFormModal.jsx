import { useEffect, useRef, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { createProject, updateProject } from '../services/projectApi';

dayjs.locale('vi');

function getTodayDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function ProjectFormModal({ open, project, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const submitting = useRef(false);
  const today = getTodayDate();
  const startDate = Form.useWatch('start_date', form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (project) form.setFieldsValue({
      ...project,
      start_date: dayjs(project.start_date).locale('vi'),
      end_date: dayjs(project.end_date).locale('vi'),
    });
  }, [open, project, form]);

  async function handleSave() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const values = await form.validateFields();
      setSaving(true);
      setSaveError('');
      // Giữ ngày dạng chuỗi YYYY-MM-DD để không lệch múi giờ.
      const body = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
      };
      if (project) await updateProject(project.id, body);
      else await createProject({ ...body, code: values.code.trim() });
      onSaved();
    } catch (error) {
      if (!error?.errorFields) setSaveError(error.message || 'Không lưu được dự án');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal
      title={project ? 'Sửa dự án' : 'Thêm dự án'} open={open} forceRender
      onCancel={() => { if (!submitting.current) onCancel(); }} onOk={handleSave}
      confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving}
      okText="Lưu" cancelText="Hủy"
    >
      {saveError && <Alert type="error" showIcon title={saveError} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" disabled={saving} preserve={false}>
        <Form.Item label="Mã dự án" name="code" rules={[
          { required: true, whitespace: true, message: 'Vui lòng nhập mã dự án' },
          { max: 20, message: 'Mã dự án không được quá 20 ký tự' },
        ]}>
          <Input disabled={Boolean(project) || saving} maxLength={20} placeholder="VD: DA-001" />
        </Form.Item>
        <Form.Item label="Tên dự án" name="name" rules={[
          { required: true, whitespace: true, message: 'Vui lòng nhập tên dự án' },
          { max: 200, message: 'Tên dự án không được quá 200 ký tự' },
        ]}>
          <Input maxLength={200} placeholder="Nhập tên dự án" />
        </Form.Item>
        <Form.Item label="Mô tả" name="description"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item label="Ngày bắt đầu" name="start_date" rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}>
          <DatePicker locale={viVN.DatePicker} format="DD/MM/YYYY" placeholder="Chọn ngày bắt đầu" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Ngày kết thúc" name="end_date" dependencies={['start_date']} rules={[
          { required: true, message: 'Vui lòng chọn ngày kết thúc' },
          () => ({
            validator(_, value) {
              if (!value) return Promise.resolve();
              if (startDate && value.isBefore(startDate, 'day')) {
                return Promise.reject(new Error('Ngày kết thúc không được trước ngày bắt đầu'));
              }
              if (!project && value.format('YYYY-MM-DD') < today) {
                return Promise.reject(new Error('Ngày kết thúc dự án mới không được trước ngày hiện tại'));
              }
              return Promise.resolve();
            },
          }),
        ]}>
          <DatePicker locale={viVN.DatePicker} format="DD/MM/YYYY" placeholder="Chọn ngày kết thúc" style={{ width: '100%' }}
            disabledDate={(date) => Boolean(startDate && date.isBefore(startDate, 'day'))
              || (!project && date.format('YYYY-MM-DD') < today)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default ProjectFormModal;
