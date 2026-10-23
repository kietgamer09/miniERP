/**
 * TimesheetCard – Khu Bảng công trên Trang chủ.
 *
 * Gồm: biểu đồ vành khuyên SVG thuần, chú thích 5 loại ngày,
 * và hàng thẻ ngày nhỏ cuộn ngang.
 * Phần này của đồng nghiệp, chỉ cần khung đúng + dữ liệu mẫu.
 */
// TODO: nối API bảng công
import { useRef, useMemo } from 'react';
import { Card, Typography, Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { countWorkingDays, getWorkingDaysInMonth } from '../utils/dates';
import { buildMockTimesheet, countByStatus, STATUS_CONFIG } from '../data/mockTimesheet';

const { Text, Title } = Typography;

/** Cung tròn SVG cho biểu đồ vành khuyên */
function describeArc(cx, cy, r, startAngle, endAngle) {
  const rad = (a) => ((a - 90) * Math.PI) / 180;
  const p1 = [cx + r * Math.cos(rad(startAngle)), cy + r * Math.sin(rad(startAngle))];
  const p2 = [cx + r * Math.cos(rad(endAngle)), cy + r * Math.sin(rad(endAngle))];
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${p1[0]} ${p1[1]} A ${r} ${r} 0 ${large} 1 ${p2[0]} ${p2[1]}`;
}

function DonutChart({ counts, total }) {
  const cx = 70, cy = 70, r = 55, sw = 18;
  const segs = ['full', 'leave', 'partial', 'absent', 'pending'];
  const worked = total - counts.pending;
  let curAngle = 0;

  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={sw} />
      {segs.map((k) => {
        const count = counts[k] || 0;
        if (!count || !total) return null;
        const angle = (count / total) * 360;
        const path = describeArc(cx, cy, r, curAngle, curAngle + Math.min(angle, 359.99));
        curAngle += angle;
        const color = k === 'pending' ? '#e8e8e8' : STATUS_CONFIG[k].color;
        return <path key={k} d={path} fill="none" stroke={color} strokeWidth={sw} />;
      })}
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fill="#8c8c8c">Tổng</text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#262626">{worked}/{total} ngày</text>
      <text x={cx} y={cy + 21} textAnchor="middle" fontSize={9} fill="#8c8c8c">(Thứ 2–Thứ 6)</text>
    </svg>
  );
}

function TimesheetCard() {
  const scrollRef = useRef(null);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const totalWorkingDays = useMemo(() => countWorkingDays(year, month), [year, month]);
  const workingDays = useMemo(() => getWorkingDaysInMonth(year, month), [year, month]);
  const timesheetData = useMemo(() => buildMockTimesheet(workingDays), [workingDays]);
  const counts = useMemo(() => countByStatus(timesheetData), [timesheetData]);

  const legendKeys = ['pending', 'full', 'leave', 'partial', 'absent'];

  return (
    <Card style={{ height: '100%' }} styles={{ body: { padding: 16 } }}>
      <div className="timesheet-overview" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={5} style={{ marginBottom: 8 }}>Bảng công</Title>
          <DonutChart counts={counts} total={totalWorkingDays} />
        </div>

        <div className="timesheet-legend" style={{ flex: 1, paddingTop: 16 }}>
          {legendKeys.map((k) => {
            const cfg = STATUS_CONFIG[k];
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{
                  display: 'inline-block', width: 14, height: 14, borderRadius: 3,
                  background: cfg.color, border: cfg.borderColor ? `2px solid ${cfg.borderColor}` : '1px solid #d9d9d9',
                }} />
                <Text style={{ fontSize: 12 }}>{cfg.label}</Text>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 8 }}>
        <div ref={scrollRef} style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, paddingBottom: 4 }}>
          {timesheetData.map((d, i) => {
            const cfg = STATUS_CONFIG[d.status];
            const isDark = d.status === 'absent' || d.status === 'full';
            return (
              <div key={i} style={{
                minWidth: 64, padding: '4px 6px', borderRadius: 6, textAlign: 'center',
                fontSize: 11, fontWeight: 500, background: cfg.color,
                border: cfg.borderColor ? `1px solid ${cfg.borderColor}` : 'none',
                color: d.status === 'pending' ? '#999' : isDark ? '#fff' : '#333', flexShrink: 0,
              }}>
                {d.label}
              </div>
            );
          })}
        </div>
        <Button shape="circle" size="small" icon={<RightOutlined />} onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} />
      </div>
    </Card>
  );
}

export default TimesheetCard;
