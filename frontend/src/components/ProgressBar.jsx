import { Typography } from 'antd';
import './ProgressBar.css';

function ProgressSummary({ tasks_done = 0, tasks_total = 0, showBar = false }) {
  const total = Number.isFinite(tasks_total) ? Math.max(0, tasks_total) : 0;
  const done = Number.isFinite(tasks_done) ? Math.min(total, Math.max(0, tasks_done)) : 0;
  const percent = total ? Math.round(done / total * 100) : 0;
  if (showBar) return (
    <div className="project-progress-visual">
      <div className="project-progress-caption">
        <Typography.Text type="secondary">{total ? `${done}/${total} công việc hoàn thành` : 'Chưa có công việc'}</Typography.Text>
        {total > 0 && <Typography.Text strong>{percent}%</Typography.Text>}
      </div>
      <div className={`project-progress-track${total && done === total ? ' is-complete' : ''}`}
        role="progressbar" aria-label="Tiến độ hoàn thành công việc dự án"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
        aria-valuetext={total ? `${done} trên ${total} công việc hoàn thành, ${percent}%` : 'Chưa có công việc'}>
        <div className="project-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
  return (
    <div className="project-progress-summary">
      <Typography.Text type="secondary">{total ? `${done}/${total} công việc hoàn thành` : 'Chưa có công việc'}</Typography.Text>
      {total > 0 && <Typography.Text strong>· {percent}%</Typography.Text>}
    </div>
  );
}

export default ProgressSummary;
