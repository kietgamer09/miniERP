import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, Modal, Segmented, Space, Spin, Tooltip, Typography } from 'antd';
import { LockOutlined, MessageOutlined } from '@ant-design/icons';
import { CHAT_LOCKED, clearChatSession, getChatSecurity, getChatSession, saveChatDraft, saveChatSession, setChatPin, unlockChat } from '../services/chatApi';
import { draftKey, listDrafts, removeDraft } from '../utils/draftStorage';

async function migrateLegacyDrafts(userId) {
  for (const draft of listDrafts(userId)) {
    const match = /^chat:([1-9]\d*)$/.exec(draft.scope);
    if (!match || typeof draft.values.content !== 'string') continue;
    await saveChatDraft(Number(match[1]), draft.values.content);
    removeDraft(draftKey(userId, draft.scope));
  }
}

function UnlockForm({ hasPin, onUnlocked, onPin }) {
  const [method, setMethod] = useState(hasPin ? 'pin' : 'password');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();
  async function submit(values) {
    if (busy) return;
    setBusy(true); setError('');
    try { const result = await unlockChat({ method, credential: values.credential }); form.resetFields(); onUnlocked(result); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="chat-unlock">
    <LockOutlined className="chat-unlock-icon" />
    <Typography.Title level={4}>Mở khóa trò chuyện hôm nay</Typography.Title>
    <Typography.Paragraph type="secondary">Nhập mã cá nhân hoặc mật khẩu của tài khoản đang đăng nhập. Chat sẽ khóa lại lúc 00:00 mỗi ngày theo giờ Việt Nam.</Typography.Paragraph>
    {error && <Alert type="error" showIcon title={error} />}
    {hasPin && <Segmented block value={method} onChange={value => { setMethod(value); setError(''); form.resetFields(); }}
      options={[{ value: 'pin', label: 'Mã cá nhân' }, { value: 'password', label: 'Mật khẩu tài khoản' }]} />}
    <Form form={form} layout="vertical" onFinish={submit} disabled={busy}>
      <Form.Item name="credential" label={method === 'pin' ? 'Mã cá nhân' : 'Mật khẩu tài khoản'} rules={[{ required: true, message: 'Nhập thông tin mở khóa' }]}>
        <Input.Password autoComplete={method === 'pin' ? 'off' : 'current-password'} inputMode={method === 'pin' ? 'numeric' : undefined} maxLength={72} autoFocus />
      </Form.Item>
      <Button block type="primary" htmlType="submit" icon={<LockOutlined />} loading={busy}>Mở khóa chat</Button>
    </Form>
    <Button type="link" onClick={onPin}>{hasPin ? 'Quên mã / Đổi mã cá nhân' : 'Tạo mã cá nhân để mở chat'}</Button>
  </div>;
}

function PinModal({ hasPin, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (busy) return;
    try {
      const values = await form.validateFields();
      setBusy(true); setError('');
      const result = await setChatPin({ credential: values.password, pin: values.pin });
      form.resetFields(); onSaved(result);
    } catch (err) { if (!err.errorFields) setError(err.message); }
    finally { setBusy(false); }
  }
  return <Modal open title={hasPin ? 'Đổi mã cá nhân cho trò chuyện' : 'Tạo mã cá nhân cho trò chuyện'} okText="Lưu mã và mở chat" cancelText="Đóng"
    onOk={submit} onCancel={() => { if (!busy) onCancel(); }} confirmLoading={busy}>
    <Typography.Paragraph type="secondary">Mã gồm 6–12 chữ số, dùng riêng cho tài khoản của bạn. Xác nhận mật khẩu tài khoản để tạo hoặc đổi mã.</Typography.Paragraph>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
    <Form form={form} layout="vertical" disabled={busy}>
      <Form.Item name="password" label="Mật khẩu tài khoản" rules={[{ required: true, message: 'Nhập mật khẩu tài khoản' }]}><Input.Password autoComplete="current-password" maxLength={72} /></Form.Item>
      <Form.Item name="pin" label="Mã cá nhân mới" rules={[{ required: true, pattern: /^\d{6,12}$/, message: 'Mã gồm 6–12 chữ số' }]}><Input.Password autoComplete="new-password" inputMode="numeric" maxLength={12} /></Form.Item>
      <Form.Item name="confirm" label="Nhập lại mã" dependencies={['pin']} rules={[{ required: true, message: 'Nhập lại mã' }, ({ getFieldValue }) => ({
        validator: (_, value) => !value || getFieldValue('pin') === value ? Promise.resolve() : Promise.reject(new Error('Hai mã không trùng nhau')),
      })]}><Input.Password autoComplete="new-password" inputMode="numeric" maxLength={12} /></Form.Item>
    </Form>
  </Modal>;
}

export default function ChatAccess({ user, children }) {
  const userId = user.id ?? user.username;
  const [session, setSession] = useState(() => getChatSession(userId));
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [open, setOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const lock = useCallback(() => { clearChatSession(); setSession(null); }, []);
  useEffect(() => {
    let active = true;
    getChatSecurity().then(async info => {
      if (!active) return;
      setHasPin(info.has_pin); setError('');
      if (!info.unlocked) { clearChatSession(); setSession(null); }
      else { await migrateLegacyDrafts(userId); if (active) setSession(getChatSession(userId)); }
      if (active) setReady(true);
    }).catch(err => { if (active) { setError(err.message); setReady(true); setSession(null); } });
    return () => { active = false; };
  }, [revision, userId]);
  useEffect(() => {
    window.addEventListener(CHAT_LOCKED, lock);
    return () => window.removeEventListener(CHAT_LOCKED, lock);
  }, [lock]);
  useEffect(() => {
    if (!session) return undefined;
    const check = () => { if (Date.parse(session.expires_at) <= Date.now()) lock(); };
    const timer = setTimeout(check, Math.max(0, Date.parse(session.expires_at) - Date.now()));
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); };
  }, [session, lock]);
  async function unlocked(result) {
    const nextSession = saveChatSession(userId, result);
    setReady(false); setError(''); setOpen(true);
    try { await migrateLegacyDrafts(userId); setSession(nextSession); }
    catch (err) { setSession(null); setError(`Không chuyển được nháp chat cũ: ${err.message}`); }
    finally { setReady(true); }
  }
  return <>
    {ready && session ? children({ open, setOpen, onLock: lock, onPin: () => setPinOpen(true) }) : <>
      <Tooltip title="Mở khóa nhắn tin"><Button type="text" icon={<MessageOutlined />} aria-label="Mở khóa nhắn tin" onClick={() => setOpen(true)} /></Tooltip>
      <Drawer title={<Space><LockOutlined />Trò chuyện được khóa</Space>} open={open} onClose={() => setOpen(false)} size={480} styles={{ wrapper: { maxWidth: '100vw' } }}>
        {!ready ? <Spin /> : error ? <Alert type="error" showIcon title={error} action={<Button onClick={() => setRevision(value => value + 1)}>Thử lại</Button>} />
          : <UnlockForm key={hasPin ? 'pin' : 'password'} hasPin={hasPin} onUnlocked={unlocked} onPin={() => setPinOpen(true)} />}
      </Drawer>
    </>}
    {pinOpen && <PinModal hasPin={hasPin} onCancel={() => setPinOpen(false)} onSaved={result => { setPinOpen(false); setHasPin(true); unlocked(result); }} />}
  </>;
}
