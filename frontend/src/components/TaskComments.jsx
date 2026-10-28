import { useEffect, useId, useRef, useState } from 'react';
import { Alert, Button, Input, Spin, Typography } from 'antd';
import { ReloadOutlined, SendOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { addComment, listComments } from '../services/taskApi';
import { formatDateTimeVN } from '../utils/dates';
import { request } from '../services/http';

const { Text } = Typography;
const EMPTY_COMMENTS = [];

export default function TaskComments({ taskId, projectId }) {
  const countId = useId();
  const { user } = useAuth();
  const [loadState, setLoadState] = useState({ key: '', comments: [], error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef(null);
  const sendingRef = useRef(false);
  const scrollToLatest = useRef(true);
  const requestKey = `${projectId ? `project-${projectId}` : `task-${taskId}`}:${reloadKey}`;
  const currentLoad = loadState.key === requestKey;
  const comments = currentLoad ? loadState.comments : EMPTY_COMMENTS;
  const loadError = currentLoad ? loadState.error : '';

  useEffect(() => {
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending || sendingRef.current) return;
      pending = true;
      const list = listRef.current;
      scrollToLatest.current = !list || list.scrollHeight - list.clientHeight - list.scrollTop < 48;
      return (projectId ? request(`/api/projects/${projectId}/comments`) : listComments(taskId))
      .then((result) => {
        if (!Array.isArray(result)) throw new Error('Dữ liệu bình luận từ máy chủ không hợp lệ');
        if (active) setLoadState({ key: requestKey, comments: result, error: '' });
      })
      .catch((error) => {
        if (active) setLoadState({ key: requestKey, comments: [], error: error.message || 'Không tải được bình luận' });
      }).finally(() => { pending = false; });
    };
    load();
    const refresh = () => { if (!document.hidden) load(); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [taskId, projectId, requestKey]);

  useEffect(() => {
    if (currentLoad && comments.length && listRef.current && scrollToLatest.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments, currentLoad]);

  async function submitComment() {
    if (!content.trim() || content.length > 2000 || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    try {
      const comment = projectId ? await request(`/api/projects/${projectId}/comments`, { method: 'POST', body: { content } }) : await addComment(taskId, content);
      setLoadState((state) => state.key === requestKey
        ? { ...state, comments: [...state.comments, comment] }
        : state);
      setContent('');
      scrollToLatest.current = true;
      setReloadKey(value => value + 1);
      window.dispatchEvent(new Event('comments:changed'));
    } catch (error) {
      setSendError(error.message || 'Không gửi được bình luận');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <section id={projectId ? 'project-discussion' : undefined} aria-label={projectId ? 'Thảo luận dự án' : 'Bình luận task'} style={{ marginTop: 20 }}>
      <Typography.Title level={5}>{projectId ? 'Thảo luận dự án' : 'Bình luận'}</Typography.Title>
      {!currentLoad ? <div style={{ display: 'grid', minHeight: 100, placeItems: 'center' }}><Spin tip="Đang tải bình luận…" /></div>
        : loadError ? <Alert type="error" showIcon title={loadError}
          action={<Button icon={<ReloadOutlined />} onClick={() => setReloadKey((key) => key + 1)}>Tải lại</Button>} />
          : comments.length === 0 ? <Text type="secondary">Chưa có bình luận</Text>
            : <div ref={listRef} style={{ display: 'grid', gap: 10, maxHeight: 260, overflowY: 'auto', padding: '4px 2px' }}>
              {comments.map((comment) => {
                const isMine = Number(comment.author_id) === Number(user?.employee_id);
                return <article key={comment.id} style={{
                  justifySelf: isMine ? 'end' : 'start', width: 'min(90%, 440px)',
                  padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: isMine ? 'var(--blue-bg)' : 'var(--subtle-bg)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                    <Text strong>{comment.author_name || 'Nhân viên'}</Text>
                    <Text type="secondary" style={{ flexShrink: 0 }}>{formatDateTimeVN(comment.created_at)}</Text>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.content}</div>
                </article>;
              })}
            </div>}
      <Text type="secondary" style={{ display: 'block', margin: '8px 0' }}>Bình luận không thể sửa hoặc xóa.</Text>
      {sendError && <Alert type="error" showIcon title={sendError} style={{ marginBottom: 8 }} />}
      <Input.TextArea aria-label="Nội dung bình luận" aria-describedby={countId} value={content}
        onChange={(event) => { setContent(event.target.value); setSendError(''); }}
        onKeyDown={(event) => {
          if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            submitComment();
          }
        }}
        autoSize={{ minRows: 2, maxRows: 5 }} maxLength={2000}
        placeholder="Viết bình luận…" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <Text id={countId} type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{content.length}/2000</Text>
        <Button type="primary" icon={<SendOutlined />} loading={sending}
          disabled={!content.trim() || content.length > 2000 || sending}
          onClick={submitComment}>Gửi</Button>
      </div>
    </section>
  );
}
