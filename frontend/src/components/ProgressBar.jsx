import { Typography } from 'antd';
import './ProgressBar.css';

function ProgressBar({ progress_percent = 0, tasks_done = 0, tasks_total = 0 }) {
  const percent = Number.isFinite(progress_percent) ? Math.min(100, Math.max(0, progress_percent)) : 0;
  const remaining = Math.round((100 - percent) * 100) / 100;
  return (
    <div>
      <div className="project-progress-bar" role="progressbar" aria-label="Tiến độ dự án"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
        aria-valuetext={`${percent}% đã xong, ${remaining}% còn lại`}>
        <div className="project-progress-fill" style={{ width: `${percent}%` }} />
        <span>{percent}%</span><span>{remaining}%</span>
      </div>
      <Typography.Text type="secondary">{tasks_done}/{tasks_total} task đã xong</Typography.Text>
    </div>
  );
}

export default ProgressBar;
