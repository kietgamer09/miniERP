import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, Modal, Tooltip, Typography } from 'antd';
import ProjectTaskTable from './ProjectTaskTable';
import './ProjectPerformanceChart.css';

const states = [
  { key: 'tasks_done', label: 'Hoàn thành', className: 'done' },
  { key: 'tasks_doing', label: 'Đang làm', className: 'doing' },
  { key: 'tasks_todo', label: 'Cần làm', className: 'todo' },
];
const count = value => Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
const percentage = value => Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;

export default function ProjectPerformanceChart({ projects = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const [availableWidth, setAvailableWidth] = useState(640);
  const container = useRef(null);
  const selected = projects.find(project => project.id === selectedId);
  useEffect(() => {
    const node = container.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(entries => setAvailableWidth(Math.round(entries[0].contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [projects.length]);
  if (!projects.length) return <Empty description="Chưa có dự án để hiển thị" />;

  const width = Math.max(availableWidth, 560, projects.length * 140 + 104);
  const left = 52, right = width - 52, top = 24, bottom = 178, plotHeight = bottom - top;
  const slot = (right - left) / projects.length;
  const barWidth = Math.min(76, slot * .52);
  const maxCount = Math.max(4, Math.ceil(Math.max(...projects.map(project => count(project.tasks_total))) / 4) * 4);
  const points = projects.map((project, i) => {
    const value = percentage(project.performance?.on_time_percent);
    return value === null ? null : { x: left + slot * (i + .5), y: bottom - value / 100 * plotHeight, value, project };
  });
  let path = '';
  points.forEach((point, i) => { if (point) path += `${i && points[i - 1] ? 'L' : 'M'}${point.x},${point.y} `; });
  const totals = projects.reduce((sum, project) => ({
    total: sum.total + count(project.tasks_total), done: sum.done + count(project.tasks_done),
    known: sum.known + count(project.performance?.completed_with_date),
    onTime: sum.onTime + count(project.performance?.completed_on_time),
    overdue: sum.overdue + count(project.performance?.active_overdue),
    missing: sum.missing + count(project.performance?.missing_completion_date),
  }), { total: 0, done: 0, known: 0, onTime: 0, overdue: 0, missing: 0 });
  const hasPerformance = projects.every(project => project.performance);
  const keyboardOpen = (event, id) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(id); }
  };
  function details(project) {
    const metrics = project.performance;
    return <div className="project-performance-tooltip">
      <strong>{project.name}</strong>
      {states.map(state => <span key={state.key}>{state.label}: {count(project[state.key])} việc</span>)}
      <span>Tiến độ: {count(project.tasks_done)}/{count(project.tasks_total)} việc</span>
      <span>Đúng hạn: {percentage(metrics?.on_time_percent) === null ? 'Chưa có dữ liệu đánh giá' : `${metrics.completed_on_time}/${metrics.completed_with_date} việc đã xong (${metrics.on_time_percent}%)`}</span>
      {metrics && <span>Đang quá hạn: {metrics.active_overdue} · Xong trễ: {metrics.completed_late}</span>}
      {metrics?.missing_completion_date > 0 && <span>Thiếu ngày hoàn thành: {metrics.missing_completion_date} việc</span>}
      <small>Bấm để xem công việc</small>
    </div>;
  }
  return <section className="project-performance" aria-label="Biểu đồ kết hợp tiến độ và tỷ lệ hoàn thành đúng hạn">
    <div className="project-performance-summary">
      <span>Hoàn thành <strong>{totals.done}/{totals.total}</strong> việc</span>
      <Tooltip title="Tỷ lệ tổng số việc xong đúng hạn trên tổng số việc đã xong có ngày hoàn thành; không lấy trung bình tỷ lệ của các dự án."><span>Đúng hạn <strong>{totals.known ? `${Math.round(totals.onTime / totals.known * 100)}%` : '—'}</strong></span></Tooltip>
      <span>Đang quá hạn <strong className={totals.overdue ? 'project-performance-overdue' : ''}>{hasPerformance ? totals.overdue : '—'}</strong></span>
    </div>
    <div className="project-performance-legend">
      {states.map(state => <span key={state.key}><i className={`performance-dot performance-${state.className}`} />{state.label}</span>)}
      <span><i className="performance-line-sample" />Hoàn thành đúng hạn</span>
    </div>
    <div className="project-performance-scroll" ref={container}>
      <div style={{ width }}>
        <svg width={width} height={208} role="group" aria-label="Cột: số công việc theo trạng thái, trục trái. Đường: phần trăm hoàn thành đúng hạn, trục phải.">
          <text x={left} y={12} className="performance-axis-title">Số công việc</text>
          <text x={right} y={12} textAnchor="end" className="performance-axis-title">Đúng hạn (%)</text>
          {[0, 1, 2, 3, 4].map(tick => {
            const y = bottom - tick / 4 * plotHeight;
            return <g key={tick} aria-hidden="true"><line x1={left} x2={right} y1={y} y2={y} className="performance-gridline" />
              <text x={left - 10} y={y + 4} textAnchor="end" className="performance-tick">{maxCount * tick / 4}</text>
              <text x={right + 10} y={y + 4} className="performance-tick">{tick * 25}%</text></g>;
          })}
          {projects.map((project, i) => {
            const x = left + slot * (i + .5);
            let accumulated = 0;
            const breakdown = states.every(state => Number.isFinite(project[state.key]));
            return <Tooltip key={project.id} title={details(project)}><g className="performance-project" role="button" tabIndex={0}
              aria-label={`${project.name}: ${count(project.tasks_done)}/${count(project.tasks_total)} việc hoàn thành. Đúng hạn ${percentage(project.performance?.on_time_percent) === null ? 'chưa có dữ liệu' : `${project.performance.on_time_percent}%`}. Xem công việc.`}
              onClick={() => setSelectedId(project.id)} onKeyDown={event => keyboardOpen(event, project.id)}>
              <rect x={x - slot / 2 + 4} y={top} width={slot - 8} height={bottom - top} rx={6} fill="transparent" className="performance-hit" />
              {breakdown && states.map(state => {
                const value = count(project[state.key]);
                const height = value / maxCount * plotHeight;
                const y = bottom - (accumulated + value) / maxCount * plotHeight;
                accumulated += value;
                return value > 0 ? <g key={state.key}><rect x={x - barWidth / 2} y={y} width={barWidth} height={height} className={`performance-fill-${state.className}`} />
                  {height >= 18 && <text x={x} y={y + height / 2 + 4} textAnchor="middle" className="performance-segment-label">{value}</text>}</g> : null;
              })}
              {!count(project.tasks_total) && <text x={x} y={bottom - 10} textAnchor="middle" className="performance-tick">Chưa có việc</text>}
              {!breakdown && count(project.tasks_total) > 0 && <text x={x} y={bottom - 10} textAnchor="middle" className="performance-tick">Chưa có phân loại</text>}
              <text x={x} y={200} textAnchor="middle" className="performance-tick">{project.code}</text>
            </g></Tooltip>;
          })}
          <path d={path} className="performance-trend" aria-hidden="true" />
          {points.map(point => point && <Tooltip key={point.project.id} title={details(point.project)}><g role="button" tabIndex={0} className="performance-point"
            aria-label={`${point.project.name}: ${point.value}% hoàn thành đúng hạn. Xem công việc.`}
            onClick={() => setSelectedId(point.project.id)} onKeyDown={event => keyboardOpen(event, point.project.id)}>
            <circle cx={point.x} cy={point.y} r={12} fill="transparent" />
            <circle cx={point.x} cy={point.y} r={4.5} className="performance-point-dot" />
            <text x={Math.min(point.x + barWidth / 2 + 8, right - 44)} y={point.value <= 12 ? point.y - 10 : point.y + 15} className="performance-point-label">{point.value}%</text>
          </g></Tooltip>)}
        </svg>
        <div className="performance-project-labels" style={{ gridTemplateColumns: `repeat(${projects.length}, minmax(0, 1fr))` }}>
          {projects.map(project => <button type="button" key={project.id} title={project.name} onClick={() => setSelectedId(project.id)}>{project.name}</button>)}
        </div>
      </div>
    </div>
    {availableWidth < width && <Typography.Text type="secondary" className="project-performance-note">Vuốt ngang biểu đồ để xem đủ các dự án.</Typography.Text>}
    <Modal open={Boolean(selected)} title={selected ? `Công việc · ${selected.name}` : 'Công việc dự án'} width={1040}
      onCancel={() => setSelectedId(null)} footer={selected ? <Link to={`/du-an/${selected.id}`}>Mở chi tiết dự án →</Link> : null}>
      {selected && <ProjectTaskTable key={selected.id} projectId={selected.id} embedded />}
    </Modal>
  </section>;
}
