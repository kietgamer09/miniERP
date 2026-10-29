import { useContext, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from './useAuth';
import { draftKey, readDraft, removeDraft, writeDraft } from '../utils/draftStorage';
import { DraftResumeContext } from '../context/draftResumeContext';

export default function useDraft(scope, { fields, dateFields = [], enabled = true, onRestore }) {
  const { user } = useAuth();
  const resumeScope = useContext(DraftResumeContext);
  const key = enabled ? draftKey(user?.id ?? user?.username, scope) : null;
  const snapshot = useMemo(() => ({ record: readDraft(key) }), [key]);
  const [state, setState] = useState(null);
  const current = state?.snapshot === snapshot ? state : null;
  const pending = !current?.handled && snapshot.record;
  const pick = values => Object.fromEntries(fields.map(field => [field,
    dateFields.includes(field) && values[field] ? dayjs(values[field]).format('YYYY-MM-DD') : (values[field] ?? null),
  ]));

  function clear() {
    try {
      removeDraft(key);
      setState({ snapshot, handled: true });
    } catch { setState({ snapshot, handled: true, error: 'Không xóa được bản nháp trên máy này.' }); }
  }

  function save(values) {
    if (!key) return;
    try {
      writeDraft(key, pick(values));
      setState({ snapshot, handled: true, saved: Boolean(readDraft(key)) });
    } catch { setState({ snapshot, handled: true, error: 'Không lưu được bản nháp. Hãy kiểm tra dung lượng hoặc quyền lưu trữ của trình duyệt.' }); }
  }

  function restore() {
    const record = readDraft(key);
    if (!record) { clear(); return; }
    const values = pick(record.values);
    for (const field of dateFields) {
      if (values[field]) values[field] = dayjs(values[field]).isValid() ? dayjs(values[field]) : null;
    }
    onRestore(values);
    setState({ snapshot, handled: true, saved: true });
  }

  const resume = useEffectEvent(restore);
  useEffect(() => {
    if (!key || resumeScope !== scope) return;
    const timer = setTimeout(() => resume(), 0);
    return () => clearTimeout(timer);
  }, [key, scope, resumeScope]);

  const notice = !key ? null : current?.error ? <Alert type="warning" showIcon title={current.error} style={{ marginBottom: 12 }} />
    : pending ? <Alert type="info" showIcon title="Có bản nháp chưa gửi trên máy này"
      description={<><div>Khôi phục để tiếp tục soạn. Bản nháp tự hết hạn sau 7 ngày.</div>
        <Space wrap style={{ marginTop: 8 }}><Button size="small" onClick={restore}>Khôi phục</Button><Button size="small" onClick={clear}>Bỏ bản nháp</Button></Space></>}
      style={{ marginBottom: 12 }} />
      : current?.saved ? <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }} role="status">Đã lưu bản nháp trên máy này</Typography.Text>
        <Button type="link" size="small" onClick={clear}>Xóa nháp</Button>
      </div> : null;
  return { save, clear, notice };
}

export function useFormDraft(form, scope, options) {
  const draft = useDraft(scope, { ...options, onRestore: values => {
    form.setFieldsValue(values);
    options.onRestore?.(values);
  } });
  return { ...draft, onValuesChange: (_, values) => draft.save(values) };
}
