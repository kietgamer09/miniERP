import { Tooltip } from 'antd';

export default function AttendanceDonut({ summary, month, activeGroup, onGroupChange }) {
  const { total, recorded, groups } = summary;
  const arcs = groups.map((group, index) => ({ ...group,
    length: total ? group.count / total * 100 : 0,
    offset: total ? groups.slice(0, index).reduce((sum, item) => sum + item.count, 0) / total * 100 : 0,
  })).filter(group => group.count > 0);
  return <div className="timesheet-summary">
    <figure className="timesheet-donut" role="img" aria-label={`Biểu đồ công tháng ${month}: ${recorded}/${total} ngày đã chấm. ${groups.map(group => `${group.label}: ${group.count}`).join('; ')}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="76" fill="none" stroke="var(--subtle-bg)" strokeWidth="24" />
        {arcs.map(arc => <circle key={arc.key} cx="100" cy="100" r="76" fill="none" pathLength="100"
          stroke={arc.color} strokeWidth="24" strokeDasharray={`${arc.length} ${100 - arc.length}`}
          strokeDashoffset={-arc.offset} transform="rotate(-90 100 100)">
          <title>{arc.label}: {arc.count} ngày</title>
        </circle>)}
        <circle cx="100" cy="100" r="88" fill="none" stroke="var(--border)" />
        <circle cx="100" cy="100" r="64" fill="none" stroke="var(--border)" />
      </svg>
      <Tooltip title="Số ngày có lượt chấm công được ghi nhận trên tổng số ngày Thứ 2–Thứ 6 trong tháng. Đây không phải số công được trả lương.">
        <figcaption className="timesheet-donut-center">
          <span>Đã chấm</span>
          <strong>{recorded}/{total}</strong>
          <span>ngày</span>
          <small>(Thứ 2–Thứ 6)</small>
        </figcaption>
      </Tooltip>
    </figure>
    <div className="timesheet-donut-legend" aria-label="Chú giải bảng công">
      {groups.filter(group => group.key !== 'progress' || group.count > 0).map(group => <Tooltip key={group.key} title={`${group.description} Bấm để xem các ngày tương ứng.`}>
        <button type="button" className="timesheet-legend-item" aria-pressed={activeGroup === group.key}
          onClick={() => onGroupChange(group.key)}>
          <span className="timesheet-legend-dot" style={{ background: group.color }} />
          <span>{group.label}</span>
          <strong>{group.count}</strong>
        </button>
      </Tooltip>)}
    </div>
  </div>;
}
