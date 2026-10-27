import { useEffect, useSyncExternalStore } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Button, Space, Tooltip } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getHistory, recordNavigation, subscribeHistory } from '../utils/navigationHistory';

export default function HistoryNavigation() {
  const { user } = useAuth();
  const location = useLocation();
  const action = useNavigationType();
  const navigate = useNavigate();
  const storageKey = `miniErpNavigation:v1:${user?.id ?? user?.username ?? 'guest'}`;
  const entries = useSyncExternalStore(subscribeHistory, () => getHistory(storageKey));
  const browserState = window.history.state;
  const index = browserState?.idx;
  // history.go là bất đồng bộ: không ghép location cũ với index mới khi menu render giữa chừng.
  const matchesBrowser = (browserState?.key || 'default') === location.key;
  const path = `${location.pathname}${location.search}${location.hash}`;
  const tracked = matchesBrowser && entries.some(item => item.index === index && item.key === location.key && item.path === path);
  const canBack = tracked && entries.some(item => item.index === index - 1);
  const canForward = tracked && entries.some(item => item.index === index + 1);

  useEffect(() => {
    if (matchesBrowser && Number.isInteger(index)) recordNavigation(storageKey, { index, key: location.key, path }, action);
  }, [storageKey, index, location.key, path, action, matchesBrowser]);

  return <Space size={0} className="history-navigation" role="group" aria-label="Lịch sử điều hướng">
    <Tooltip title="Quay lại trang trước">
      <Button type="text" icon={<ArrowLeftOutlined />} aria-label="Quay lại trang trước"
        disabled={!canBack} onClick={() => { if (canBack) navigate(-1); }} />
    </Tooltip>
    <Tooltip title="Tiến lên trang vừa quay lại">
      <Button type="text" icon={<ArrowRightOutlined />} aria-label="Tiến lên trang vừa quay lại"
        disabled={!canForward} onClick={() => { if (canForward) navigate(1); }} />
    </Tooltip>
  </Space>;
}
