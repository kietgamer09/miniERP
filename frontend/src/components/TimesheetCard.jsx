import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Card, DatePicker, Descriptions, Modal, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { LeftOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAttendance } from '../hooks/useAttendance';
import { getMyAttendances } from '../services/attendanceApi';
import { attendanceDay, explanationLabels, isAttendanceWeekend } from '../utils/attendance';
import { formatDateOnlyVN } from '../utils/dates';
import AttendanceExplanationModal from './AttendanceExplanationModal';
import AttendanceDonut from './AttendanceDonut';
import { attendanceGroup, summarizeAttendance } from '../utils/attendanceSummary';
import { getDayName, parseDateOnly } from '../utils/dates';
import './TimesheetCard.css';

export default function TimesheetCard({ compact = false }) {
  const { revision, refresh } = useAttendance();
  const [params] = useSearchParams();
  const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : null;
  const [month, setMonth] = useState(() => (requestedDate || attendanceDay()).slice(0, 7));
  const [selected, setSelected] = useState(requestedDate);
  const [explaining, setExplaining] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeGroup, setActiveGroup] = useState('attention');
  const strip = useRef(null);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ month: '', data: null, error: '' });
  const { message } = App.useApp();
  useEffect(() => {
    let active = true;
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const data = await getMyAttendances(month);
        if (!Array.isArray(data?.days)) throw new Error('Dữ liệu bảng công không hợp lệ');
        if (active) setResult({ month, data, error: '' });
      } catch (error) { if (active) setResult({ month, data: null, error: error.message || 'Không tải được bảng công' }); }
      finally { pending = false; }
    }
    load();
    const visible = () => { if (!document.hidden) load(); };
    const timer = setInterval(visible, 15000);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [month, reload, revision]);
  const data = result.month === month ? result.data : null;
  const selectedDay = data?.days.find(item => item.date === selected);
  const offset = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const summary = summarizeAttendance(data?.days || []);
  const stripDays = (data?.days || []).filter(item => !isAttendanceWeekend(item.date)
    && (activeGroup === 'attention' ? ['red', 'gold'].includes(item.color) : attendanceGroup(item) === activeGroup));
  const stripLabel = activeGroup === 'attention' ? 'Ngày cần chú ý' : summary.groups.find(group => group.key === activeGroup)?.label;
  function changeGroup(group) { setActiveGroup(group); strip.current?.scrollTo({ left: 0 }); }
  function saved() {
    setExplaining(false); setReload(value => value + 1); refresh();
    message.success('Đã gửi giải trình, chờ Admin duyệt');
  }
  return <Card title="Bảng công" className={`timesheet-card${compact ? ' timesheet-card--compact' : ''}`} style={{ height: '100%' }} extra={<Space size={6}>
    <DatePicker picker="month" allowClear={false} format="MM/YYYY" value={dayjs(`${month}-01`)} size="small"
      aria-label="Tháng xem bảng công" onChange={value => { if (value) {
        setMonth(value.format('YYYY-MM')); setSelected(null); changeGroup('attention');
      } }} style={{ width: 104 }} />
    <Button size="small" icon={<ReloadOutlined />} aria-label="Tải lại bảng công" onClick={() => setReload(value => value + 1)} />
  </Space>}>
    {result.month === month && result.error ? <Alert type="error" title={result.error} showIcon /> : !data ? <Spin /> : <>
      <AttendanceDonut summary={summary} month={dayjs(`${month}-01`).format('MM/YYYY')}
        activeGroup={activeGroup} onGroupChange={changeGroup} />
      <div className="timesheet-strip-heading">
        <Typography.Text strong>{stripLabel} <Typography.Text type="secondary">({stripDays.length})</Typography.Text></Typography.Text>
        <Space size={0}>
          <Button type="text" size="small" icon={<LeftOutlined />} aria-label="Xem các ngày phía trước"
            disabled={!stripDays.length} onClick={() => strip.current?.scrollBy({ left: -180, behavior: 'smooth' })} />
          <Button type="text" size="small" icon={<RightOutlined />} aria-label="Xem các ngày tiếp theo"
            disabled={!stripDays.length} onClick={() => strip.current?.scrollBy({ left: 180, behavior: 'smooth' })} />
        </Space>
      </div>
      {stripDays.length ? <ul ref={strip} className="timesheet-days-strip" aria-label={stripLabel}>
        {stripDays.map(item => <li key={item.date}>
          <Tooltip title={`${formatDateOnlyVN(item.date)}: ${item.label}`}>
            <button className={`attendance-day timesheet-day-chip attendance-day--${item.color}`}
              onClick={() => setSelected(item.date)} aria-label={`Ngày ${formatDateOnlyVN(item.date)}, ${item.label}`}>
              <strong>{getDayName(parseDateOnly(item.date))}</strong>
              <span>{item.date.slice(8)}/{item.date.slice(5, 7)}</span>
              {item.explanation && <span className="timesheet-request-dot" aria-label={explanationLabels[item.explanation.status]}>●</span>}
            </button>
          </Tooltip>
        </li>)}
      </ul> : <Typography.Paragraph type="secondary" className="timesheet-strip-empty">Không có ngày trong nhóm này.</Typography.Paragraph>}
      <div className="timesheet-summary-footer">
        {activeGroup !== 'attention' && <Button type="link" size="small" onClick={() => changeGroup('attention')}>Ngày cần chú ý</Button>}
        <Button type="link" size="small" onClick={() => setShowCalendar(true)}>Xem chi tiết tháng</Button>
      </div>
    </>}
    {data && showCalendar && <Modal open title={`Chi tiết bảng công tháng ${dayjs(`${month}-01`).format('MM/YYYY')}`}
      footer={null} onCancel={() => setShowCalendar(false)} width={620}>
      <Typography.Paragraph type="secondary">{summary.total} ngày làm việc (Thứ 2–Thứ 6). Mốc ca: 08:00–17:00, giờ Việt Nam.</Typography.Paragraph>
      <div className="attendance-calendar">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <div className="attendance-weekday" key={label}>{label}</div>)}
        {Array.from({ length: offset }, (_, i) => <div key={`empty-${i}`} />)}
        {data.days.map(item => <Tooltip key={item.date} title={`${formatDateOnlyVN(item.date)}: ${item.label}${item.explanation ? ` · ${explanationLabels[item.explanation.status]}` : ''}`}>
          <button className={`attendance-day attendance-day--${item.color}`} onClick={() => setSelected(item.date)}
            aria-label={`Ngày ${formatDateOnlyVN(item.date)}, ${item.label}`}>
            <strong>{Number(item.date.slice(-2))}</strong>
            <span className="attendance-day-label">{item.label}</span>
            {item.explanation && <span aria-label={explanationLabels[item.explanation.status]}>●</span>}
          </button>
        </Tooltip>)}
      </div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
        Bấm ngày để xem giờ công và gửi giải trình. Ngày chưa kết thúc, ngày tương lai và cuối tuần không tính nghỉ cả ngày.
        {' '}Duyệt chấm bù không thay đổi màu hoặc giờ công gốc.
      </Typography.Paragraph>
      {!data.start_date && <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Hồ sơ chưa có ngày bắt đầu làm việc; ngày trống sau ca được ghi nhận là chưa có công/nghỉ phép duyệt.
      </Typography.Paragraph>}
    </Modal>}
    {selectedDay && <Modal open title={`Công ngày ${formatDateOnlyVN(selectedDay.date)}`} footer={null} onCancel={() => setSelected(null)}>
      <Tag color={selectedDay.color}>{selectedDay.label}</Tag>
      <Descriptions column={1} style={{ marginTop: 12 }} items={[
        { key: 'in', label: 'Giờ vào', children: selectedDay.check_in || '—' },
        { key: 'out', label: 'Giờ ra', children: selectedDay.check_out || '—' },
      ]} />
      {selectedDay.explanation ? <>
        <Tag color={selectedDay.explanation.status === 'approved' ? 'blue' : undefined}>{explanationLabels[selectedDay.explanation.status]}</Tag>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 12 }}>{selectedDay.explanation.reason}</Typography.Paragraph>
        {selectedDay.explanation.makeup_date && <Typography.Paragraph>Ngày đề nghị chấm bù: {formatDateOnlyVN(selectedDay.explanation.makeup_date)}</Typography.Paragraph>}
        {selectedDay.explanation.review_note && <Alert type="info" title={selectedDay.explanation.review_note} />}
        <Typography.Text type="secondary">Giữ nguyên màu theo giờ chấm công thực tế.</Typography.Text>
      </> : selectedDay.can_explain && <Alert type={selectedDay.color === 'red' ? 'error' : 'warning'} showIcon
        title="Bạn có thể gửi yêu cầu giải trình và đề nghị chấm bù." action={<Button onClick={() => setExplaining(true)}>Gửi giải trình</Button>} />}
    </Modal>}
    {selectedDay && explaining && <AttendanceExplanationModal day={selectedDay} onCancel={() => setExplaining(false)} onSaved={saved} />}
  </Card>;
}
