import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Drawer, Empty, Space, Spin, Switch, Tag, Typography } from 'antd';
import { MailOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMyWork } from '../hooks/useMyWork';
import { useAttendance } from '../hooks/useAttendance';
import { attendanceReminders, sortNotifications, taskDueReminders, taskNotifications } from '../utils/notifications';
import { request } from '../services/http';
import WebPushSettings from './WebPushSettings';
import { DRAFT_CHANGED, listDrafts } from '../utils/draftStorage';
import { draftNotification } from '../utils/draftNotifications';
import { OVERTIME_CHANGED, overtimeNotifications, readOvertimeNotifications } from '../services/overtimeApi';

function loadDraftNotifications(userId) {
  return listDrafts(userId).filter(draft => draft.interrupted === true).map(draftNotification).filter(Boolean);
}

function loadDraftNotifications(userId) {
  return listDrafts(userId).filter(draft => draft.interrupted === true).map(draftNotification).filter(Boolean);
}

function readSettings(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return { read: Array.isArray(saved.read) ? saved.read.filter(value => typeof value === 'string') : [], reminders: saved.reminders !== false };
  } catch { return { read: [], reminders: true }; }
}

export default function NotificationInbox() {
  const { user } = useAuth();
  return <Inbox key={user.id ?? user.username} storageKey={`miniErpInbox:${user.id ?? user.username}`} />;
}

function Inbox({ storageKey }) {
  const { user } = useAuth();
  const userId = user.id ?? user.username;
  const [draftItems, setDraftItems] = useState(() => loadDraftNotifications(userId));
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => readSettings(storageKey));
  const [now, setNow] = useState(() => new Date());
  const { tasks, loading, error, warning, reload } = useMyWork();
  const { record } = useAttendance();
  const navigate = useNavigate();
  const [commentItems, setCommentItems] = useState([]);
  const [commentError, setCommentError] = useState('');
  const [overtimeItems, setOvertimeItems] = useState([]);
  const [overtimeError, setOvertimeError] = useState('');
  const [revision, setRevision] = useState(0);
  const [marking, setMarking] = useState(false);
  useEffect(() => {
    const refresh = () => setDraftItems(loadDraftNotifications(userId));
    window.addEventListener(DRAFT_CHANGED, refresh);
    window.addEventListener('storage', refresh);
    const timer = setInterval(refresh, 30000);
    return () => { clearInterval(timer); window.removeEventListener(DRAFT_CHANGED, refresh); window.removeEventListener('storage', refresh); };
  }, [userId]);
  useEffect(() => {
    let active = true, pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const data = await request('/api/notifications/comments');
        if (!Array.isArray(data)) throw new Error('Dữ liệu thông báo không hợp lệ');
        if (active) { setCommentItems(data); setCommentError(''); }
      } catch (err) { if (active) setCommentError(err.message); }
      finally { pending = false; }
    }
    const refresh = () => { if (!document.hidden) load(); };
    load();
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('comments:changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('comments:changed', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [revision]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true, pending = false;
    async function load() {
      if (pending || document.hidden) return;
      pending = true;
      try { const data = await overtimeNotifications(); if (active) { setOvertimeItems(data); setOvertimeError(''); } }
      catch (err) { if (active) setOvertimeError(err.message); }
      finally { pending = false; }
    }
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener('focus', load); window.addEventListener(OVERTIME_CHANGED, load);
    document.addEventListener('visibilitychange', load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); window.removeEventListener(OVERTIME_CHANGED, load); document.removeEventListener('visibilitychange', load); };
  }, [revision]);
  const isRead = item => ['comment', 'overtime'].includes(item.type) ? item.read : settings.read.includes(item.id);
  const items = sortNotifications([...draftItems, ...commentItems, ...overtimeItems, ...taskNotifications(tasks), ...taskDueReminders(tasks, now), ...(settings.reminders ? attendanceReminders(now, record) : [])], isRead);
  const unread = items.filter(item => !isRead(item)).length;
  function save(next) {
    setSettings(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Giữ trạng thái trong phiên. */ }
  }
  async function markRead(ids) {
    const commentIds = ids.filter(id => id.startsWith('comment:'));
    const overtimeIds = ids.filter(id => id.startsWith('overtime:'));
    save({ ...settings, read: [...new Set([...settings.read, ...ids.filter(id => !id.startsWith('comment:') && !id.startsWith('overtime:'))])].slice(-2000) });
    if (!commentIds.length && !overtimeIds.length) return;
    setMarking(true);
    const jobs = [];
    for (let i = 0; i < commentIds.length; i += 100) {
      const batch = commentIds.slice(i, i + 100);
      jobs.push(request('/api/notifications/comments/read', { method: 'PATCH', body: { ids: batch } }).then(() => {
        setCommentItems(previous => previous.map(item => batch.includes(item.id) ? { ...item, read: true } : item));
      }).catch(err => setCommentError(err.message)));
    }
    for (let i = 0; i < overtimeIds.length; i += 100) {
      const batch = overtimeIds.slice(i, i + 100);
      jobs.push(readOvertimeNotifications(batch).then(() => {
        setOvertimeItems(previous => previous.map(item => batch.includes(item.id) ? { ...item, read: true } : item));
      }).catch(err => setOvertimeError(err.message)));
    }
    await Promise.allSettled(jobs);
    setMarking(false);
  }
  return <>
    <Badge count={unread} size="small" overflowCount={99} offset={[-7, 8]}>
      <Button type="text" icon={<MailOutlined />} aria-label={`Hòm thông báo, ${unread} chưa đọc`}
        title="Thông báo" onClick={() => { setNow(new Date()); setRevision(value => value + 1); setOpen(true); }} />
    </Badge>
    <Drawer title="Hòm thông báo" open={open} onClose={() => setOpen(false)} size={400}
      styles={{ wrapper: { maxWidth: '100vw' } }}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => { reload(); setRevision(value => value + 1); }} disabled={loading || marking}>Tải lại</Button>
        <Button disabled={!unread || marking} loading={marking} onClick={() => markRead(items.map(item => item.id))}>Đánh dấu tất cả đã đọc</Button>
      </Space>
      <Space style={{ marginBottom: 12 }}>
        <Switch checked={settings.reminders} aria-label="Nhắc chấm công theo lịch"
          onChange={reminders => save({ ...settings, reminders })} />
        <Typography.Text>Nhắc chấm công lúc 08:00 và 17:00</Typography.Text>
      </Space>
      <WebPushSettings />
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Công việc tự cập nhật mỗi phút. Trạng thái chấm công được đọc từ máy chủ, đồng bộ giữa các tab/trình duyệt;
          {' '}nhắc công việc sắp đến hạn trong 3 ngày và nhắc lại việc quá hạn hằng ngày. Lời nhắc chấm công ẩn sau khi đã vào/ra ca.
        {' '}Bình luận cập nhật mỗi 15 giây khi mở website; hiển thị 100 bình luận gần nhất. Trạng thái đọc bình luận lưu trên máy chủ.
        {' '}Chưa đọc lên trước; đơn tăng ca kế hoạch gần ngày làm được ưu tiên, sau đó đến thời gian mới nhất. Đơn bổ sung ngày cũ không đẩy desktop.
      </Typography.Paragraph>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
      {commentError && <Alert type="warning" title={commentError} showIcon style={{ marginBottom: 12 }} />}
      {overtimeError && <Alert type="warning" title={overtimeError} showIcon style={{ marginBottom: 12 }} />}
      {warning && <Alert type="warning" title={warning} showIcon style={{ marginBottom: 12 }} />}
      {loading && <Spin />}
      {!loading && !items.length && <Empty description="Chưa có thông báo" />}
      <div className="notification-list">
        {items.map(item => <button key={item.id} disabled={marking} className={`notification-item ${isRead(item) ? '' : 'is-unread'}`}
          onClick={async () => { await markRead([item.id]); setOpen(false); navigate(item.path, {
            state: { notificationId: item.id, ...(item.type === 'draft' ? { resumeDraft: item.draftScope } : {}) },
          }); }}>
          <Typography.Text strong={!isRead(item)}>{item.title}</Typography.Text>
          {item.priority_label && <Tag color="orange" style={{ width: 'fit-content' }}>{item.priority_label}</Tag>}
          <Typography.Text type="secondary">{item.description}</Typography.Text>
          {item.time && <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(item.time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
          </Typography.Text>}
        </button>)}
      </div>
    </Drawer>
  </>;
}
