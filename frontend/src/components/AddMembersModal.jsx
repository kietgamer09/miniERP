import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal, Select } from 'antd';
import { addMembers, listAvailableEmployees } from '../services/projectApi';
import './ProjectFormModal.css';
import { useFormDraft } from '../hooks/useDraft';

function AddMembersModal({ projectId, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const submitting = useRef(false);
  const draft = useFormDraft(form, `project-members:${projectId}`, { fields: ['employee_ids'] });

  useEffect(() => {
    let active = true;
    listAvailableEmployees(projectId)
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu nhân viên từ máy chủ không hợp lệ');
        if (active) setEmployees(data);
      })
      .catch((error) => { if (active) setLoadError(error.message || 'Không tải được nhân viên'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, reloadKey]);

  function reload() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  async function handleSave() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const values = await form.validateFields();
      setSaving(true);
      setSaveError('');
      await addMembers(projectId, values.employee_ids);
      draft.clear();
      onSaved();
    } catch (error) {
      if (!error?.errorFields) setSaveError(error.message || 'Không thêm được thành viên');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return <Modal open title="Thêm thành viên dự án" className="project-editor-modal" centered forceRender onOk={handleSave}
    onCancel={() => { if (!submitting.current) onCancel(); }} okText="Thêm thành viên" cancelText="Hủy"
    confirmLoading={saving} closable={!saving} cancelButtonProps={{ disabled: saving }}
    okButtonProps={{ disabled: loading || Boolean(loadError) || !employees.length }}>
    {loadError && <Alert type="error" title={loadError} showIcon style={{ marginBottom: 16 }}
      action={<Button size="small" onClick={reload}>Thử lại</Button>} />}
    {saveError && <Alert type="error" title={saveError} showIcon style={{ marginBottom: 16 }} />}
    {draft.notice}
    <Form form={form} layout="vertical" disabled={saving || loading || Boolean(loadError)} onValuesChange={draft.onValuesChange}>
      <Form.Item name="employee_ids" label="Nhân viên" rules={[{ required: true, type: 'array', min: 1, message: 'Vui lòng chọn ít nhất một nhân viên' }]}>
        <Select mode="multiple" showSearch optionFilterProp="label" loading={loading}
          maxTagCount="responsive" maxTagTextLength={24}
          maxTagPlaceholder={(omitted) => `+${omitted.length} người`}
          placeholder="Tìm và chọn nhân viên" notFoundContent={loading ? 'Đang tải…' : 'Không có nhân viên phù hợp'}
          options={employees.map((employee) => ({ value: employee.employee_id,
            label: `${employee.fullname || `Nhân viên ${employee.employee_id}`}${employee.position ? ` · ${employee.position}` : ''}` }))} />
      </Form.Item>
    </Form>
  </Modal>;
}

export default AddMembersModal;
