import { Button, Space, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

export default function ListPagination({ total, pageSize = 8, page, onChange, unit }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  return <div className="list-pagination">
    <Typography.Text type="secondary">Hiển thị <span>{start}–{Math.min(page * pageSize, total)}</span> trong tổng số <span>{total}</span> {unit}</Typography.Text>
    <Space size={20} wrap>
      <Button icon={<LeftOutlined />} disabled={page <= 1} onClick={() => onChange(page - 1)}>Trang trước</Button>
      <Typography.Text type="secondary">Trang <span>{page}</span> / {pages}</Typography.Text>
      <Button disabled={page >= pages} onClick={() => onChange(page + 1)}>Trang sau <RightOutlined /></Button>
    </Space>
  </div>;
}
