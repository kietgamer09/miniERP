import { useEffect, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { browserPushSubscription, disablePush, enablePush, pushSupported, testPush } from '../services/pushApi';

export default function WebPushSettings() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const supported = pushSupported();
  useEffect(() => {
    let active = true;
    browserPushSubscription().then(value => { if (active) setEnabled(Boolean(value)); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
    <Space wrap>
      <Button icon={<BellOutlined />} disabled={!supported || busy} loading={busy} onClick={async () => {
        setBusy(true); setError('');
        try { if (enabled) await disablePush(); else await enablePush(); setEnabled(!enabled); }
        catch (err) { setError(err.message); setEnabled(Boolean(await browserPushSubscription().catch(() => null))); }
        finally { setBusy(false); }
      }}>{enabled ? 'Tắt thông báo desktop' : 'Bật thông báo desktop'}</Button>
      {enabled && <Button disabled={busy} onClick={async () => {
        setBusy(true); setError(''); setSent(false);
        try { await testPush(); setSent(true); } catch (err) { setError(err.message); }
        finally { setBusy(false); }
      }}>Gửi thử thông báo</Button>}
      <Typography.Text type="secondary">{enabled ? 'Đã bật trên trình duyệt này' : 'Nhận bình luận mới kể cả khi đóng tab'}</Typography.Text>
    </Space>
    {!supported && <Typography.Text type="secondary">Cần trình duyệt hỗ trợ Push và HTTPS (localhost dùng được).</Typography.Text>}
    {error && <Alert type="warning" showIcon title={error} />}
    {sent && <Typography.Text type="secondary">Đã chuyển thông báo thử tới dịch vụ push. Kiểm tra thông báo của hệ điều hành.</Typography.Text>}
  </div>;
}
