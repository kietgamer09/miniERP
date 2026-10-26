import { Progress, Typography } from 'antd';

function ProgressBar({ progress_percent = 0, tasks_done = 0, tasks_total = 0 }) {
  const percent = Number.isFinite(progress_percent) ? Math.min(100, Math.max(0, progress_percent)) : 0;
  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{percent}%</span><span>{Math.round((100 - percent) * 100) / 100}%</span>
    </div>
    <Progress percent={percent} strokeColor="#52c41a" showInfo={false} />
    <Typography.Text type="secondary">{tasks_done}/{tasks_total} task đã xong</Typography.Text>
  </div>;
}

export default ProgressBar;
