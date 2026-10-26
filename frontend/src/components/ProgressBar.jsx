import { Typography } from 'antd';

function ProgressBar({ progress_percent = 0, tasks_done = 0, tasks_total = 0 }) {
  const percent = Number.isFinite(progress_percent) ? Math.min(100, Math.max(0, progress_percent)) : 0;
  const remaining = Math.round((100 - percent) * 100) / 100;
  return <div>
    <div role="progressbar" aria-label="Tiến độ dự án" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      aria-valuetext={`${percent}% đã xong, ${remaining}% còn lại`}
      style={{ position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between',
        padding: '6px 10px', margin: '8px 0 4px', border: '1px solid #c9d4cf', borderRadius: 6, background: '#f4f6f5', color: '#163525' }}>
      <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${percent}%`, background: '#95deaa' }} />
      <span style={{ position: 'relative' }}>{percent}%</span><span style={{ position: 'relative' }}>{remaining}%</span>
    </div>
    <Typography.Text type="secondary">{tasks_done}/{tasks_total} task đã xong</Typography.Text>
  </div>;
}

export default ProgressBar;
