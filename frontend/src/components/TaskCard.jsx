import { Card, Typography } from 'antd';
import { getDueState, getDueColor, getDueLabel } from '../utils/taskStatus';
import { formatDateVN } from '../utils/dates';

const { Text } = Typography;

function TaskCard({ task }) {
  const dueState = getDueState(task);
  const { border } = getDueColor(dueState);
  const bg = dueState === 'overdue' ? 'var(--red-bg)' : dueState === 'near-due' ? 'var(--gold-bg)'
    : dueState === 'done' ? 'var(--surface)' : 'var(--blue-bg)';
  const label = dueState === 'done' && !task.completedAt
    ? `Đã xong · Hạn ${formatDateVN(task.dueDate)}` : getDueLabel(task, dueState);

  // Màu chữ trạng thái theo loại cảnh báo
  const labelColor =
    dueState === 'overdue' ? 'var(--red-text)' :
    dueState === 'near-due' ? 'var(--gold-text)' :
    dueState === 'done' ? 'var(--muted)' :
    'var(--blue-text)';

  return (
    <Card
      size="small"
      style={{
        background: bg,
        borderColor: border,
        borderWidth: 1,
        borderStyle: 'solid',
        marginBottom: 8,
        borderRadius: 6,
        cursor: 'default',
      }}
      styles={{ body: { padding: '8px 12px' } }}
    >
      <Text strong style={{ display: 'block', fontSize: 13 }}>
        {task.title} - {task.projectName}
      </Text>
      <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
        Ưu tiên: {task.priority}
      </Text>
      <Text style={{ display: 'block', fontSize: 12, color: labelColor, fontWeight: 500 }}>
        {label}
      </Text>
    </Card>
  );
}

export default TaskCard;
