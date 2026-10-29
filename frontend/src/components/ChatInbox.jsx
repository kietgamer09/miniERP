import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Avatar, Badge, Button, Drawer, Empty, Form, Image, Input, Modal, Segmented, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, FileImageOutlined, FileOutlined, LockOutlined, MessageOutlined, PaperClipOutlined, PlusOutlined, SafetyOutlined, SendOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { addChatMembers, createChat, downloadChatFile, getChatDraft, listChatPeople, listChats, listMessages, readChat, saveChatDraft, sendChatFile, sendMessage } from '../services/chatApi';
import './ChatInbox.css';
import ChatAccess from './ChatAccess';

const accept = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.txt,.csv,.zip';
const isImage = name => /\.(png|jpe?g|webp)$/i.test(name || '');
const initials = name => (name || 'NV').trim().split(/\s+/).slice(-2).map(part => part[0]).join('');
const timeLabel = value => new Date(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function PeopleModal({ chat, onCancel, onSaved }) {
  const [people, setPeople] = useState([]);
  const [kind, setKind] = useState('direct');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    listChatPeople().then(rows => { if (active) setPeople(rows); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function submit() {
    if (pending.current) return;
    try {
      const values = await form.validateFields();
      pending.current = true; setBusy(true); setError('');
      if (chat) {
        await addChatMembers(chat.id, values.employee_ids);
        onSaved(chat.id);
      } else {
        const result = await createChat({ kind, name: values.name, employee_ids: kind === 'direct' ? [values.person] : values.employee_ids });
        onSaved(result.id);
      }
    } catch (err) { if (!err.errorFields) setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  }
  const options = people.filter(person => !chat?.members.some(member => member.employee_id === person.employee_id))
    .map(person => ({ value: person.employee_id, label: `${person.fullname || 'Nhân viên'} · ${person.department_name || 'Chưa có phòng ban'}` }));
  return <Modal open title={chat ? `Thành viên · ${chat.name}` : 'Cuộc trò chuyện mới'} width={560}
    onCancel={() => { if (!pending.current) onCancel(); }} onOk={submit} confirmLoading={busy}
    okText={chat ? 'Thêm thành viên' : kind === 'group' ? 'Tạo nhóm' : 'Mở trò chuyện'} cancelText="Đóng" okButtonProps={{ disabled: loading || (chat && !options.length) }}>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
    {chat && <><Space wrap style={{ marginBottom: 16 }}>{chat.members.map(person => <Tag key={person.employee_id}>{person.fullname || 'Nhân viên'}</Tag>)}</Space>
      <Typography.Paragraph type="secondary">Thành viên mới có thể xem lịch sử tin nhắn và tệp trong nhóm.</Typography.Paragraph></>}
    {!chat && <Segmented block value={kind} onChange={value => { setKind(value); form.resetFields(); }}
      options={[{ value: 'direct', label: 'Chat riêng' }, { value: 'group', label: 'Nhóm công việc' }]} style={{ marginBottom: 16 }} />}
    <Form form={form} layout="vertical" disabled={busy}>
      {!chat && kind === 'group' && <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, whitespace: true, message: 'Nhập tên nhóm' }, { max: 100 }]}>
        <Input maxLength={100} placeholder="Ví dụ: Nhóm triển khai website" /></Form.Item>}
      {!chat && kind === 'direct' ? <Form.Item name="person" label="Người nhận" rules={[{ required: true, message: 'Chọn người trò chuyện' }]}>
        <Select showSearch optionFilterProp="label" loading={loading} options={options} placeholder="Tìm đồng nghiệp…" /></Form.Item>
        : <Form.Item name="employee_ids" label={chat ? 'Thêm người vào nhóm' : 'Thành viên'} rules={[{ required: true, type: 'array', min: 1, message: 'Chọn ít nhất một người' }]}>
          <Select mode="multiple" maxCount={49} maxTagCount="responsive" showSearch optionFilterProp="label" loading={loading} options={options} placeholder="Chọn đồng nghiệp…" /></Form.Item>}
    </Form>
  </Modal>;
}

function ChatThread({ chat, self, onBack, onMembers, onUpdated }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [olderBusy, setOlderBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileBusy, setFileBusy] = useState(null);
  const [preview, setPreview] = useState(null);
  const latest = useRef(0);
  const readUntil = useRef(0);
  const readBusy = useRef(false);
  const sendBusy = useRef(false);
  const scroll = useRef(null);
  const input = useRef(null);
  const refresh = useRef(() => {});
  const scrollPlan = useRef(null);
  const imageUrl = useRef(null);
  const alive = useRef(true);
  const edited = useRef(false);
  const draftTimer = useRef(null);
  const draftQueue = useRef(Promise.resolve());
  const draftText = useRef('');
  const persistDraft = useCallback(value => {
    const job = draftQueue.current.catch(() => {}).then(() => saveChatDraft(chat.id, value));
    draftQueue.current = job;
    job.catch(err => { if (alive.current) setError(`Không lưu được nháp: ${err.message}`); });
    return job;
  }, [chat.id]);
  useEffect(() => {
    let active = true;
    getChatDraft(chat.id).then(draft => {
      if (active && !edited.current) { setText(draft.content); draftText.current = draft.content; }
    }).catch(err => { if (active) setError(err.message); });
    return () => {
      active = false;
      if (draftTimer.current) { clearTimeout(draftTimer.current); draftTimer.current = null; persistDraft(draftText.current); }
    };
  }, [chat.id, persistDraft]);
  const atBottom = () => !scroll.current || scroll.current.scrollHeight - scroll.current.scrollTop - scroll.current.clientHeight < 70;
  const markRead = useCallback(async () => {
    if (document.hidden || readBusy.current || !latest.current || latest.current <= readUntil.current) return;
    readBusy.current = true;
    const id = latest.current;
    try { await readChat(chat.id, id); readUntil.current = id; if (alive.current) onUpdated(); }
    catch (err) { if (alive.current) setError(err.message); }
    finally { readBusy.current = false; }
  }, [chat.id, onUpdated]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); };
  }, []);
  useLayoutEffect(() => {
    if (!scroll.current || !scrollPlan.current) return;
    const plan = scrollPlan.current;
    scroll.current.scrollTop = plan === 'bottom' ? scroll.current.scrollHeight : plan.top + scroll.current.scrollHeight - plan.height;
    scrollPlan.current = null;
  }, [messages]);
  useEffect(() => {
    let active = true, running = false;
    async function load() {
      if (running || document.hidden) return;
      running = true;
      try {
        const after = latest.current;
        const result = await listMessages(chat.id, after ? { after } : {});
        if (!active) return;
        const bottom = !after || atBottom();
        if (!after) setHasOlder(result.has_more);
        if (result.messages.length) {
          latest.current = result.messages.at(-1).id;
          if (bottom) scrollPlan.current = 'bottom';
          setMessages(previous => [...new Map([...previous, ...result.messages].map(message => [message.id, message])).values()].sort((a, b) => a.id - b.id));
        }
        setLoaded(true); setError('');
        if (bottom) await markRead();
      } catch (err) { if (active) { setError(err.message); setLoaded(true); } }
      finally { running = false; }
    }
    refresh.current = load;
    load();
    const timer = setInterval(load, 4000);
    const visible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [chat.id, markRead]);

  async function older() {
    if (olderBusy || !messages.length) return;
    setOlderBusy(true);
    const position = { height: scroll.current?.scrollHeight || 0, top: scroll.current?.scrollTop || 0 };
    try {
      const result = await listMessages(chat.id, { before: messages[0].id });
      if (!alive.current) return;
      scrollPlan.current = position;
      setMessages(previous => [...new Map([...result.messages, ...previous].map(message => [message.id, message])).values()].sort((a, b) => a.id - b.id));
      setHasOlder(result.has_more);
    } catch (err) { if (alive.current) setError(err.message); }
    finally { if (alive.current) setOlderBusy(false); }
  }
  async function send(file) {
    if (sendBusy.current || (!file && !text.trim())) return;
    sendBusy.current = true; setBusy(true); setError('');
    try {
      if (file) {
        const extension = `.${file.name.split('.').pop().toLowerCase()}`;
        if (!accept.split(',').includes(extension) || !file.size || file.size > 10485760) throw new Error('Chọn tệp được hỗ trợ, từ 1 byte đến 10 MB.');
        await sendChatFile(chat.id, file);
      } else {
        if (draftTimer.current) { clearTimeout(draftTimer.current); draftTimer.current = null; }
        await draftQueue.current.catch(() => {});
        await sendMessage(chat.id, text);
        if (alive.current) setText('');
        draftText.current = '';
      }
      if (alive.current) { scrollPlan.current = 'bottom'; await refresh.current(); onUpdated(); }
    } catch (err) { if (alive.current) setError(err.message); }
    finally { sendBusy.current = false; if (alive.current) { setBusy(false); if (input.current) input.current.value = ''; } }
  }
  async function openFile(message, showImage) {
    if (fileBusy) return;
    setFileBusy(message.id); setError('');
    try {
      const blob = await downloadChatFile(chat.id, message.id);
      if (!alive.current) return;
      if (showImage) {
        if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
        const extension = message.file_name.split('.').pop().toLowerCase();
        const type = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`;
        imageUrl.current = URL.createObjectURL(new Blob([blob], { type }));
        setPreview({ url: imageUrl.current, name: message.file_name });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = message.file_name;
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) { if (alive.current) setError(err.message); }
    finally { if (alive.current) setFileBusy(null); }
  }
  return <section className="chat-thread" aria-label={`Trò chuyện ${chat.name}`}>
    <header className="chat-thread-header">
      <Button type="text" icon={<ArrowLeftOutlined />} aria-label="Quay về danh sách trò chuyện" onClick={onBack} />
      <Avatar className="chat-avatar" icon={chat.kind === 'group' ? <TeamOutlined /> : null}>{chat.kind === 'direct' ? initials(chat.name) : null}</Avatar>
      <div className="chat-thread-title"><Typography.Text strong>{chat.name}</Typography.Text><Typography.Text type="secondary">{chat.kind === 'group' ? `${chat.members.length} thành viên` : 'Trò chuyện riêng'}</Typography.Text></div>
      {chat.kind === 'group' && chat.owner_id === self && <Tooltip title="Thành viên nhóm"><Button type="text" icon={<TeamOutlined />} aria-label="Thành viên nhóm" onClick={onMembers} /></Tooltip>}
    </header>
    {error && <Alert type="error" showIcon title={error} closable onClose={() => setError('')} />}
    <div className="chat-messages" ref={scroll} onScroll={() => { if (atBottom()) markRead(); }}>
      {!loaded && <Spin />}
      {hasOlder && <Button block type="text" loading={olderBusy} onClick={older}>Xem tin nhắn trước</Button>}
      {loaded && !messages.length && !error && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bắt đầu cuộc trò chuyện" />}
      {messages.map(message => <article key={message.id} className={`chat-message${message.author_id === self ? ' is-mine' : ''}`}>
        <div className="chat-message-bubble">
          {chat.kind === 'group' && message.author_id !== self && <span className="chat-author">{message.author_name || 'Nhân viên'}</span>}
          {message.content && <div className="chat-message-text">{message.content}</div>}
          {message.file_name && <div className="chat-file">
            <div>{isImage(message.file_name) ? <FileImageOutlined /> : <FileOutlined />} <strong>{message.file_name}</strong></div>
            <span>{Math.max(1, Math.ceil(message.file_size / 1024))} KB</span>
            <Space wrap>
              {isImage(message.file_name) && <Button size="small" loading={fileBusy === message.id} disabled={Boolean(fileBusy)} onClick={() => openFile(message, true)}>Xem ảnh</Button>}
              <Button size="small" icon={<DownloadOutlined />} disabled={Boolean(fileBusy)} onClick={() => openFile(message, false)}>Tải xuống</Button>
            </Space>
          </div>}
          <time dateTime={message.created_at}>{timeLabel(message.created_at)}</time>
        </div>
      </article>)}
    </div>
    <div className="chat-composer">
      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={4000} value={text} disabled={busy} aria-label="Nội dung tin nhắn" placeholder="Nhắn tin…"
        onChange={event => {
          setText(event.target.value);
          edited.current = true; draftText.current = event.target.value;
          clearTimeout(draftTimer.current);
          draftTimer.current = setTimeout(() => { draftTimer.current = null; persistDraft(draftText.current); }, 500);
        }} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); }
        }} />
      <div className="chat-compose-actions">
        <input ref={input} hidden type="file" accept={accept} onChange={event => send(event.target.files?.[0])} />
        <Tooltip title="Ảnh, PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP · tối đa 10 MB">
          <Button icon={<PaperClipOutlined />} disabled={busy} onClick={() => input.current?.click()}>Ảnh / Tệp</Button>
        </Tooltip>
        <Typography.Text type="secondary">Enter để gửi · Shift + Enter xuống dòng</Typography.Text>
        <Button type="primary" icon={<SendOutlined />} loading={busy} disabled={!text.trim()} onClick={() => send()}>Gửi</Button>
      </div>
    </div>
    <Modal open={Boolean(preview)} title={preview?.name} footer={null} onCancel={() => { setPreview(null); if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); imageUrl.current = null; }}>
      {preview && <Image src={preview.url} alt={preview.name} preview={false} style={{ width: '100%' }} />}
    </Modal>
  </section>;
}

export default function ChatInbox() {
  const { user } = useAuth();
  return <ChatAccess key={user.id ?? user.username} user={user}>{access => <ChatPanel user={user} {...access} />}</ChatAccess>;
}

function ChatPanel({ user, open, setOpen, onLock, onPin }) {
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const fetching = useRef(false);
  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try { const result = await listChats(); if (mounted.current) { setChats(result); setError(''); } }
    catch (err) { if (mounted.current) setError(err.message); }
    finally { fetching.current = false; if (mounted.current) setLoading(false); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const initial = setTimeout(refresh, 0);
    const load = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(load, 10000);
    document.addEventListener('visibilitychange', load);
    return () => { mounted.current = false; clearTimeout(initial); clearInterval(timer); document.removeEventListener('visibilitychange', load); };
  }, [refresh]);
  const activeChat = chats.find(chat => chat.id === selected);
  const unread = chats.reduce((total, chat) => total + chat.unread, 0);
  const filtered = chats.filter(chat => `${chat.name} ${chat.members.map(person => person.fullname || '').join(' ')}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  async function created(id) {
    setCreating(false); setMembersOpen(false); await refresh(); setSelected(id);
  }
  return <>
    <Badge count={unread} size="small" overflowCount={99} offset={[-7, 8]}>
      <Tooltip title="Nhắn tin"><Button type="text" icon={<MessageOutlined />} aria-label={`Nhắn tin, ${unread} tin chưa đọc`} onClick={() => { setOpen(true); refresh(); }} /></Tooltip>
    </Badge>
    <Drawer title="Nhắn tin" open={open} onClose={() => setOpen(false)} size={960} extra={<Space>
      <Tooltip title="Tạo / đổi mã cá nhân"><Button type="text" icon={<SafetyOutlined />} aria-label="Tạo hoặc đổi mã cá nhân" onClick={onPin} /></Tooltip>
      <Tooltip title="Khóa chat ngay"><Button type="text" icon={<LockOutlined />} aria-label="Khóa chat ngay" onClick={onLock} /></Tooltip>
    </Space>} styles={{ wrapper: { maxWidth: '100vw' }, body: { padding: 0, overflow: 'hidden' } }}>
      <div className={`chat-shell${activeChat ? ' has-selection' : ''}`}>
        <aside className="chat-sidebar">
          <div className="chat-sidebar-toolbar"><Input allowClear aria-label="Tìm cuộc trò chuyện" placeholder="Tìm cuộc trò chuyện…" value={query} onChange={event => setQuery(event.target.value)} />
            <Button icon={<PlusOutlined />} type="primary" aria-label="Cuộc trò chuyện mới" onClick={() => setCreating(true)} /></div>
          {error && <Alert type="error" showIcon title={error} action={<Button size="small" onClick={refresh}>Thử lại</Button>} />}
          <div className="chat-conversations">
            {loading && <Spin />}
            {!loading && !filtered.length && !error && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={query ? 'Không tìm thấy trò chuyện' : 'Chưa có cuộc trò chuyện'} />}
            {filtered.map(chat => <button type="button" key={chat.id} className={`chat-conversation${selected === chat.id ? ' is-selected' : ''}`} onClick={() => setSelected(chat.id)}>
              <Avatar className="chat-avatar" icon={chat.kind === 'group' ? <TeamOutlined /> : null}>{chat.kind === 'direct' ? initials(chat.name) : null}</Avatar>
              <div className="chat-conversation-info"><strong>{chat.name}</strong><span>{chat.last_file_name ? `📎 ${chat.last_file_name}` : chat.last_content || 'Chưa có tin nhắn'}</span></div>
              {chat.unread > 0 && <Badge count={chat.unread} size="small" overflowCount={99} />}
            </button>)}
          </div>
        </aside>
        <div className="chat-main">
          {open && activeChat ? <ChatThread key={activeChat.id} chat={activeChat} self={user.employee_id}
            onBack={() => setSelected(null)} onMembers={() => setMembersOpen(true)} onUpdated={refresh} />
            : <div className="chat-start"><MessageOutlined /><Typography.Title level={4}>Trao đổi cùng đồng nghiệp</Typography.Title>
              <Typography.Text type="secondary">Chọn cuộc trò chuyện hoặc tạo nhóm công việc để bắt đầu.</Typography.Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>Cuộc trò chuyện mới</Button></div>}
        </div>
      </div>
    </Drawer>
    {creating && <PeopleModal onCancel={() => setCreating(false)} onSaved={created} />}
    {membersOpen && activeChat && <PeopleModal chat={activeChat} onCancel={() => setMembersOpen(false)} onSaved={created} />}
  </>;
}
