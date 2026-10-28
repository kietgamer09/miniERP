import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Spin, Typography } from 'antd';
import { ReloadOutlined, SendOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { addComment, listComments } from '../services/taskApi';
import { formatDateTimeVN } from '../utils/dates';

const { Text } = Typography;
const EMPTY_COMMENTS = [];

export default function TaskComments({ taskId }) {
  const { user } = useAuth();
  const [loadState, setLoadState] = useState({ key: '', comments: [], error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef(null);
  const sendingRef = useRef(false);
  const requestKey = `${taskId}:${reloadKey}`;
  const currentLoad = loadState.key === requestKey;
  const comments = currentLoad ? loadState.comments : EMPTY_COMMENTS;
  const loadError = currentLoad ? loadState.error : '';

  useEffect(() => {
    let active = true;
    listComments(taskId)
      .then((result) => {
        if (!Array.isArray(result)) throw new Error('Dữ liệu bình luận từ máy chủ không hợp lệ');
        if (active) setLoadState({ key: requestKey, comments: result, error: '' });
      })
      .catch((error) => {
        if (active) setLoadState({ key: requestKey, comments: [], error: error.message || 'Không tải được bình luận' });
      });
    return () => { active = false; };
  }, [taskId, requestKey]);

  useEffect(() => {
    if (currentLoad && comments.length && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments, currentLoad]);

  async function submitComment() {
    if (!content.trim() || content.length > 2000 || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    try {
      const comment = await addComment(taskId, content);
      setLoadState((state) => state.key === requestKey
        ? { ...state, comments: [...state.comments, comment] }
        : state);
      setContent('');
    } catch (error) {
      setSendError(error.message || 'Không gửi được bình luận');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <section aria-label="Bình luận task" style={{ marginTop: 20 }}>
      <Typography.Title level={5}>Bình luận</Typography.Title>
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
      <Input.TextArea aria-label="Nội dung bình luận" value={content}
        onChange={(event) => { setContent(event.target.value); setSendError(''); }}
        onKeyDown={(event) => {
          if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            submitComment();
          }
        }}
        autoSize={{ minRows: 2, maxRows: 5 }} maxLength={2000} showCount
        placeholder="Viết bình luận…" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <Button type="primary" icon={<SendOutlined />} loading={sending}
          disabled={!content.trim() || content.length > 2000 || sending}
          onClick={submitComment}>Gửi</Button>
      </div>
    </section>
  );
}
