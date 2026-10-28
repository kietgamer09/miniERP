import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Popconfirm, Space, Typography } from 'antd';
import { DeleteOutlined, DownloadOutlined, PaperClipOutlined, ReloadOutlined } from '@ant-design/icons';
import { request } from '../services/http';

const accept = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.txt,.csv';
export default function Attachments({ type, targetId, readOnly = false }) {
  const endpoint = `/api/attachments/${type}/${targetId}`;
  const [result, setResult] = useState({ endpoint: '', files: [], can_upload: false });
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    request(endpoint).then(data => { if (active) setResult({ ...data, endpoint }); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [endpoint, revision]);
  const current = result.endpoint === endpoint;
  async function act(action) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError('');
    try { await action(); } catch (err) { setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  }
  async function upload(file) {
    if (!file) return;
    await act(async () => {
      const extension = `.${file.name.split('.').pop().toLowerCase()}`;
      if (!accept.split(',').includes(extension)) throw new Error('Định dạng tệp chưa được hỗ trợ');
      if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Chọn tệp từ 1 byte đến 10 MB');
      await request(endpoint, { method: 'POST', file });
      setRevision(value => value + 1);
    });
    if (input.current) input.current.value = '';
  }
  return <section className="attachments" aria-label="Tệp đính kèm">
    <div className="attachments-heading">
      <Typography.Text strong><PaperClipOutlined /> Tệp đính kèm {current ? `(${result.files.length})` : ''}</Typography.Text>
      <Space size={4}>
        <Button size="small" type="text" icon={<ReloadOutlined />} aria-label="Tải lại danh sách tệp" disabled={busy}
          onClick={() => { setError(''); setRevision(value => value + 1); }} />
        {current && result.can_upload && !readOnly && <Button size="small" icon={<PaperClipOutlined />} loading={busy} onClick={() => input.current?.click()}>Đính kèm</Button>}
      </Space>
    </div>
    <input ref={input} type="file" accept={accept} hidden onChange={event => upload(event.target.files?.[0])} />
    {error && <Alert type="error" showIcon title={error} />}
    {current && result.can_upload && !readOnly && <Typography.Text type="secondary" className="attachments-hint">PDF, ảnh, Word/Excel/PowerPoint, TXT/CSV · tối đa 10 MB/file, 30 file/mục.</Typography.Text>}
    {!current && !error && <Typography.Text type="secondary">Đang tải tệp…</Typography.Text>}
    {current && !result.files.length && <Typography.Text type="secondary">Chưa có tệp đính kèm.</Typography.Text>}
    {current && result.files.map(file => <div className="attachment-row" key={file.id}>
      <div className="attachment-info"><Typography.Text>{file.name}</Typography.Text><Typography.Text type="secondary">{Math.max(1, Math.ceil(file.size / 1024))} KB</Typography.Text></div>
      <Space size={0}>
        <Button type="text" icon={<DownloadOutlined />} disabled={busy} aria-label={`Tải xuống ${file.name}`} onClick={() => act(async () => {
          const blob = await request(`${endpoint}/${file.id}`, { download: true });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name;
          document.body.appendChild(anchor); anchor.click(); anchor.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        })} />
        {file.can_delete && !readOnly && <Popconfirm title="Xóa tệp đính kèm này?" okText="Xóa" cancelText="Hủy" onConfirm={() => act(async () => {
          await request(`${endpoint}/${file.id}`, { method: 'DELETE' }); setRevision(value => value + 1);
        })}><Button type="text" danger icon={<DeleteOutlined />} disabled={busy} aria-label={`Xóa ${file.name}`} /></Popconfirm>}
      </Space>
    </div>)}
  </section>;
}
