import { Typography } from 'antd';
import './ProgressBar.css';

function ProgressSummary({ tasks_done = 0, tasks_total = 0 }) {
  const total = Number.isFinite(tasks_total) ? Math.max(0, tasks_total) : 0;
  const done = Number.isFinite(tasks_done) ? Math.min(total, Math.max(0, tasks_done)) : 0;
  const percent = total ? Math.round(done / total * 100) : 0;
  return (
    <div className="project-progress-summary">
      <Typography.Text type="secondary">{total ? `${done}/${total} công việc hoàn thành` : 'Chưa có công việc'}</Typography.Text>
      {total > 0 && <Typography.Text strong>· {percent}%</Typography.Text>}
    </div>
  );
}

export default ProgressSummary;
