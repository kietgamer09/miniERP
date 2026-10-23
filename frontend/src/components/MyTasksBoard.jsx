/**
 * MyTasksBoard – Khối "Việc của tôi" trên Trang chủ.
 *
 * Hiển thị 3 cột: Cần làm / Đang làm / Hoàn thành.
 * Mỗi cột có tiêu đề kèm số lượng, thanh cuộn dọc riêng.
 * Hỗ trợ sắp xếp "Theo hạn" hoặc "Theo ưu tiên".
 *
 * Chưa làm kéo thả (ngày sau). Chưa lọc "Công việc của bạn" (ngày sau).
 */
import { useState, useMemo } from 'react';
import { Typography, Select, Space, Row, Col } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { buildMockTasks } from '../data/mockTasks';
import { STATUS, getDueState, sortTasks } from '../utils/taskStatus';
import { isInCurrentWeek } from '../utils/dates';
import TaskCard from './TaskCard';

const { Title, Text } = Typography;

// Hằng số tên cột – đổi tên ở đây nếu cần, không phải sửa nhiều chỗ
const COLUMN_LABELS = {
  [STATUS.TODO]: 'Cần làm',
  [STATUS.DOING]: 'Đang làm',
  [STATUS.DONE]: 'Hoàn thành (trong tuần này)',
};

// Chú thích 3 ô màu
const LEGEND = [
  { color: '#ff4d4f', label: 'Quá hạn' },
  { color: '#faad14', label: 'Sắp hạn (trong 3 ngày)' },
  { color: '#91d5ff', label: 'Chưa đến hạn' },
];

function MyTasksBoard() {
  const [sortMode, setSortMode] = useState('due');

  // Dữ liệu mẫu – tính một lần khi component mount
  const allTasks = useMemo(() => buildMockTasks(), []);
  const overdueCount = allTasks.filter(
    (task) => task.status !== STATUS.DONE && getDueState(task) === 'overdue',
  ).length;

  // Chia task theo cột
  const columns = useMemo(() => {
    const today = new Date();
    return [STATUS.TODO, STATUS.DOING, STATUS.DONE].map((status) => {
      const tasks = allTasks.filter((t) => t.status === status);
      const sorted = sortTasks(tasks, sortMode, today);
      const visibleTasks = status === STATUS.DONE
        ? sorted.filter((task) => task.completedAt && isInCurrentWeek(task.completedAt, today))
        : sorted;
      return { status, label: COLUMN_LABELS[status], tasks: visibleTasks };
    });
  }, [allTasks, sortMode]);

  return (
    <div>
      {/* Dòng tiêu đề */}
      <div
        className="my-tasks-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space size="middle" wrap>
          <Space size={8}>
            <Title level={5} style={{ margin: 0 }}>Việc của tôi</Title>
            <Text style={{ color: overdueCount > 0 ? '#cf1322' : undefined }}>
              Quá hạn: {overdueCount}
            </Text>
          </Space>

          {/* Chú thích 3 ô màu */}
          {LEGEND.map((item) => (
            <Space key={item.label} size={4}>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: item.color,
                }}
              />
              <Text style={{ fontSize: 12 }}>{item.label}</Text>
            </Space>
          ))}
        </Space>

        {/* Bộ lọc sắp xếp */}
        <Select
          value={sortMode}
          onChange={setSortMode}
          style={{ width: 160 }}
          size="small"
          suffixIcon={<FilterOutlined />}
          options={[
            { value: 'due', label: 'Theo hạn' },
            { value: 'priority', label: 'Theo ưu tiên' },
          ]}
        />
      </div>

      {/* 3 cột */}
      <Row gutter={[12, 12]}>
        {columns.map((col) => (
          <Col key={col.status} xs={24} md={8}>
            {/* Tiêu đề cột + số lượng */}
            <div
              className="task-column-list"
              style={{
                background: '#fff',
                padding: '8px 12px',
                borderRadius: '6px 6px 0 0',
                border: '1px solid #e8e8e8',
                borderBottom: '2px solid #d9d9d9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text strong>{col.label}</Text>
              <Text type="secondary">-&nbsp;&nbsp;{col.tasks.length}</Text>
            </div>

            {/* Danh sách task với cuộn dọc riêng */}
            <div
              style={{
                height: 380,
                overflowY: 'auto',
                padding: '10px 8px',
                background: '#fafafa',
                border: '1px solid #e8e8e8',
                borderTop: 'none',
                borderRadius: '0 0 6px 6px',
              }}
            >
              {col.tasks.length === 0 ? (
                <Text type="secondary" style={{ padding: 12, display: 'block', textAlign: 'center' }}>
                  Không có công việc
                </Text>
              ) : (
                col.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default MyTasksBoard;
