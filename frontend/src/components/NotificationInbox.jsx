import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Drawer, Empty, Space, Spin, Switch, Typography } from 'antd';
import { MailOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyWork } from '../hooks/useMyWork';
import { useAttendance } from '../hooks/useAttendance';
import { attendanceReminders, taskNotifications } from '../utils/notifications';

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
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => readSettings(storageKey));
  const [now, setNow] = useState(() => new Date());
  const { tasks, loading, error, warning, reload } = useMyWork();
  const { record } = useAttendance();
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const items = [...taskNotifications(tasks), ...(settings.reminders ? attendanceReminders(now, record) : [])]
    .sort((a, b) => (Date.parse(b.time) || 0) - (Date.parse(a.time) || 0));
  const unread = items.filter(item => !settings.read.includes(item.id)).length;
  function save(next) {
    setSettings(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Giữ trạng thái trong phiên. */ }
  }
  function markRead(ids) { save({ ...settings, read: [...new Set([...settings.read, ...ids])].slice(-2000) }); }
  return <>
    <Badge count={unread} size="small" overflowCount={99}>
      <Button type="text" icon={<MailOutlined />} aria-label={`Hòm thông báo, ${unread} chưa đọc`}
        title="Thông báo" onClick={() => { setNow(new Date()); setOpen(true); }} />
    </Badge>
    <Drawer title="Hòm thông báo" open={open} onClose={() => setOpen(false)} size={400}
      styles={{ wrapper: { maxWidth: '100vw' } }}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
        <Button disabled={!unread} onClick={() => markRead(items.map(item => item.id))}>Đánh dấu tất cả đã đọc</Button>
      </Space>
      <Space style={{ marginBottom: 12 }}>
        <Switch checked={settings.reminders} aria-label="Nhắc chấm công theo lịch"
          onChange={reminders => save({ ...settings, reminders })} />
        <Typography.Text>Nhắc chấm công lúc 08:00 và 17:00</Typography.Text>
      </Space>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Công việc tự cập nhật mỗi phút. Trạng thái chấm công được đọc từ máy chủ, đồng bộ giữa các tab/trình duyệt;
        {' '}ẩn lời nhắc sau khi đã vào/ra ca.
      </Typography.Paragraph>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
      {warning && <Alert type="warning" title={warning} showIcon style={{ marginBottom: 12 }} />}
      {loading && <Spin />}
      {!loading && !items.length && <Empty description="Chưa có thông báo" />}
      <div className="notification-list">
        {items.map(item => <button key={item.id} className={`notification-item ${settings.read.includes(item.id) ? '' : 'is-unread'}`}
          onClick={() => { markRead([item.id]); setOpen(false); navigate(item.path); }}>
          <Typography.Text strong={!settings.read.includes(item.id)}>{item.title}</Typography.Text>
          <Typography.Text type="secondary">{item.description}</Typography.Text>
          {item.time && <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(item.time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
          </Typography.Text>}
        </button>)}
      </div>
    </Drawer>
  </>;
}
