/**
 * TaskCard – Thẻ task hiển thị 3 dòng thông tin.
 *
 * Tách riêng vì component này sẽ được dùng lại ở:
 * 1. Trang chủ (khối "Việc của tôi")
 * 2. Bảng Kanban dự án (ngày sau)
 *
 * 3 dòng:
 * 1. Tên task - Tên dự án
 * 2. Ưu tiên: Cao / Trung bình / Thấp
 * 3. Trạng thái hạn (quá hạn / sắp hạn / hạn / xong) + ngày
 */
import { Card, Typography } from 'antd';
import { getDueState, getDueColor, getDueLabel } from '../utils/taskStatus';

const { Text } = Typography;

function TaskCard({ task }) {
  const dueState = getDueState(task);
  const { bg, border } = getDueColor(dueState);
  const label = getDueLabel(task, dueState);

  // Màu chữ trạng thái theo loại cảnh báo
  const labelColor =
    dueState === 'overdue' ? '#cf1322' :
    dueState === 'near-due' ? '#d48806' :
    dueState === 'done' ? '#8c8c8c' :
    '#096dd9';

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
      {/* Dòng 1: tên task - tên dự án */}
      <Text strong style={{ display: 'block', fontSize: 13 }}>
        {task.title} - {task.projectName}
      </Text>

      {/* Dòng 2: mức ưu tiên */}
      <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
        Ưu tiên: {task.priority}
      </Text>

      {/* Dòng 3: trạng thái hạn */}
      <Text style={{ display: 'block', fontSize: 12, color: labelColor, fontWeight: 500 }}>
        {label}
      </Text>
    </Card>
  );
}

export default TaskCard;
