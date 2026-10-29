import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Card, DatePicker, Descriptions, Modal, Popconfirm, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { LeftOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAttendance } from '../hooks/useAttendance';
import { getMyAttendances, cancelAttendanceExplanation } from '../services/attendanceApi';
import { attendanceDay, explanationLabels, isAttendanceWeekend } from '../utils/attendance';
import { formatDateOnlyVN } from '../utils/dates';
import AttendanceExplanationModal from './AttendanceExplanationModal';
import AttendanceDonut from './AttendanceDonut';
import { attendanceGroup, summarizeAttendance } from '../utils/attendanceSummary';
import { getDayName, parseDateOnly } from '../utils/dates';
import { detailInteraction } from '../utils/detailInteraction';
import './TimesheetCard.css';

export default function TimesheetCard({ compact = false }) {
  const { revision, refresh } = useAttendance();
  const [params] = useSearchParams();
  const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : null;
  const [month, setMonth] = useState(() => (requestedDate || attendanceDay()).slice(0, 7));
  const [selected, setSelected] = useState(requestedDate);
  const [explaining, setExplaining] = useState(false);
  const [canceling, setCanceling] = useState(false);
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

  const getExplanation = (item) => {
    return item?.explanation || item?.attendance_explanations || item?.explanations || null;
  };

  const stripDays = (data?.days || []).filter(item => {
    const expl = getExplanation(item);
    const isApproved = expl?.status === 'approved';
    const isPending = expl?.status === 'pending';
    const isRejected = expl?.status === 'rejected';

    if (isApproved) {
      return activeGroup === 'leave'; 
    }
    if (isPending || isRejected) {
      return activeGroup === 'attention';
    }
    return !isAttendanceWeekend(item.date) 
      && (activeGroup === 'attention' ? ['red', 'gold'].includes(item.color) : attendanceGroup(item) === activeGroup);
  });

  const stripLabel = activeGroup === 'attention' ? 'Ngày cần chú ý' : summary.groups.find(group => group.key === activeGroup)?.label;

  function changeGroup(group) { setActiveGroup(group); strip.current?.scrollTo({ left: 0 }); }
  
  function saved() {
    setExplaining(false); 
    setReload(value => value + 1); 
    refresh();
    message.success('Đã gửi lại giải trình thành công');
  }

  async function handleCancelExplanation(explanationId) {
    try {
      setCanceling(true);
      await cancelAttendanceExplanation(explanationId);
      message.success('Đã hủy đơn giải trình');
      setSelected(null);
      setReload(v => v + 1);
      refresh();
    } catch (err) {
      message.error(err.message || 'Không thể hủy đơn giải trình');
    } finally {
      setCanceling(false);
    }
  }

  return <Card title="Bảng công" className={`timesheet-card${compact ? ' timesheet-card--compact' : ''}${data ? ' detail-clickable-card' : ''}`}
    {...(data ? detailInteraction(() => setShowCalendar(true), 'Mở bảng công chi tiết tháng') : {})}
    style={{ height: '100%' }} extra={<Space size={6}>
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
        {stripDays.map(item => {
          const expl = getExplanation(item);
          const isApproved = expl?.status === 'approved';
          const isPending = expl?.status === 'pending';
          const isRejected = expl?.status === 'rejected';
          
          let chipColor = item.color;
          let chipLabel = item.label;
          let customStyle = {};

          if (isApproved) {
            chipColor = 'blue';
            chipLabel = 'Đã duyệt giải trình';
            customStyle = { borderColor: '#1890ff', backgroundColor: 'rgba(24, 144, 255, 0.15)', color: '#69c0ff' };
          } else if (isPending) {
            chipColor = 'gold';
            chipLabel = 'Chờ duyệt giải trình';
            customStyle = { borderColor: '#faad14', backgroundColor: 'rgba(250, 173, 20, 0.15)', color: '#ffd666' };
          } else if (isRejected) {
            chipColor = 'rejected-custom';
            chipLabel = 'Giải trình bị từ chối';
            customStyle = { borderColor: '#ff4d4f', backgroundColor: 'rgba(255, 77, 79, 0.2)', color: '#ff7875' };
          }

          return <li key={item.date}>
            <Tooltip title={`${formatDateOnlyVN(item.date)}: ${chipLabel}`}>
              <button className={`attendance-day timesheet-day-chip attendance-day--${chipColor}`}
                onClick={() => setSelected(item.date)} style={customStyle} aria-label={`Ngày ${formatDateOnlyVN(item.date)}, ${chipLabel}`}>
                <strong>{getDayName(parseDateOnly(item.date))}</strong>
                <span>{item.date.slice(8)}/{item.date.slice(5, 7)}</span>
              </button>
            </Tooltip>
          </li>;
        })}
      </ul> : <Typography.Paragraph type="secondary" className="timesheet-strip-empty">Không có ngày trong nhóm này.</Typography.Paragraph>}
      <div className="timesheet-summary-footer">
        {activeGroup !== 'attention' && <Button type="link" size="small" onClick={() => changeGroup('attention')}>Ngày cần chú ý</Button>}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Bấm vào khung để xem bảng công tháng</Typography.Text>
      </div>
    </>}

    {/* Modal lịch tháng chi tiết */}
    {data && showCalendar && <Modal open title={`Chi tiết bảng công tháng ${dayjs(`${month}-01`).format('MM/YYYY')}`}
      footer={null} onCancel={() => setShowCalendar(false)} width={620}>
      <Typography.Paragraph type="secondary">{summary.total} ngày làm việc (Thứ 2–Thứ 6). Mốc ca: 08:00–17:00, giờ Việt Nam.</Typography.Paragraph>
      <div className="attendance-calendar">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <div className="attendance-weekday" key={label}>{label}</div>)}
        {Array.from({ length: offset }, (_, i) => <div key={`empty-${i}`} />)}
        {data.days.map(item => {
          const expl = getExplanation(item);
          const isApproved = expl?.status === 'approved';
          const isPending = expl?.status === 'pending';
          const isRejected = expl?.status === 'rejected';

          let dayColor = item.color;
          let dayLabel = item.label;
          let customStyle = {};

          if (isApproved) {
            dayColor = 'blue';
            dayLabel = 'Đã duyệt giải trình';
            customStyle = { borderColor: '#1890ff', backgroundColor: 'rgba(24, 144, 255, 0.15)', color: '#69c0ff' };
          } else if (isPending) {
            dayColor = 'gold';
            dayLabel = 'Chờ duyệt giải trình';
            customStyle = { borderColor: '#faad14', backgroundColor: 'rgba(250, 173, 20, 0.15)', color: '#ffd666' };
          } else if (isRejected) {
            dayColor = 'rejected-custom';
            dayLabel = 'Giải trình bị từ chối';
            customStyle = { borderColor: '#ff4d4f', backgroundColor: 'rgba(255, 77, 79, 0.2)', color: '#ff7875' };
          }

          return (
            <Tooltip key={item.date} title={`${formatDateOnlyVN(item.date)}: ${dayLabel}${expl ? ` · ${explanationLabels[expl.status]}` : ''}`}>
              <button className={`attendance-day attendance-day--${dayColor}`} onClick={() => setSelected(item.date)}
                style={customStyle} aria-label={`Ngày ${formatDateOnlyVN(item.date)}, ${dayLabel}`}>
                <strong>{Number(item.date.slice(-2))}</strong>
                <span className="attendance-day-label">{dayLabel}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
        Bấm ngày để xem giờ công và gửi giải trình. Ngày chưa kết thúc, ngày tương lai và cuối tuần không tính nghỉ cả ngày.
      </Typography.Paragraph>
    </Modal>}

    {/* Modal xem chi tiết ngày, trạng thái từ chối và cho phép gửi lại */}
    {selectedDay && <Modal open title={`Công ngày ${formatDateOnlyVN(selectedDay.date)}`} footer={null} onCancel={() => setSelected(null)}>
      {(() => {
        const expl = getExplanation(selectedDay);
        const isApproved = expl?.status === 'approved';
        const isPending = expl?.status === 'pending';
        const isRejected = expl?.status === 'rejected';

        let tagColor = selectedDay.color;
        let tagText = selectedDay.label;

        if (isApproved) {
          tagColor = 'blue';
          tagText = 'Đã duyệt giải trình / Chấm bù';
        } else if (isPending) {
          tagColor = 'gold';
          tagText = 'Chờ duyệt giải trình';
        } else if (isRejected) {
          tagColor = 'error';
          tagText = 'Đơn giải trình bị từ chối';
        }

        return (
          <>
            <Tag color={tagColor}>
              {tagText}
            </Tag>
            <Descriptions column={1} style={{ marginTop: 12 }} items={[
              { key: 'in', label: 'Giờ vào', children: selectedDay.check_in || '—' },
              { key: 'out', label: 'Giờ ra', children: selectedDay.check_out || '—' },
            ]} />
            
            {expl ? <>
              <div style={{ marginTop: 12 }}>
                <Tag color={isApproved ? 'blue' : isPending ? 'gold' : 'error'}>
                  {isApproved ? 'Đã duyệt chấm bù' : isPending ? 'Chờ duyệt' : 'Bị từ chối'}
                </Tag>
              </div>

              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 8 }}>
                <strong>Lý do đã gửi:</strong> {expl.reason}
              </Typography.Paragraph>

              {expl.makeup_date && <Typography.Paragraph>Ngày đề nghị chấm bù: {formatDateOnlyVN(expl.makeup_date)}</Typography.Paragraph>}

              {expl.status === 'rejected' && expl.review_note && (
                <Alert 
                  type="error" 
                  showIcon 
                  title="Lý do từ chối từ quản lý:" 
                  description={expl.review_note} 
                  style={{ marginTop: 12 }} 
                />
              )}

              {isRejected && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography.Text type="danger">Bạn có thể chỉnh sửa và gửi lại giải trình mới.</Typography.Text>
                  <Button type="primary" onClick={() => setExplaining(true)}>
                    Gửi lại giải trình
                  </Button>
                </div>
              )}

              {isPending && (
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Popconfirm
                    title="Hủy đơn giải trình"
                    description="Bạn có chắc chắn muốn hủy đơn giải trình này không?"
                    onConfirm={() => handleCancelExplanation(expl.id)}
                    okText="Hủy đơn"
                    cancelText="Bỏ qua"
                    okButtonProps={{ danger: true, loading: canceling }}
                  >
                    <Button danger size="small" type="dashed">
                      Hủy đơn giải trình
                    </Button>
                  </Popconfirm>
                </div>
              )}

            </> : selectedDay.can_explain && (
              <Alert 
                type="warning" 
                showIcon
                style={{ marginTop: 16 }}
                title="Bạn có thể gửi yêu cầu giải trình và đề nghị chấm bù." 
                action={<Button type="primary" onClick={() => setExplaining(true)}>Gửi giải trình</Button>} 
              />
            )}
          </>
        );
      })()}
    </Modal>}

    {selectedDay && explaining && <AttendanceExplanationModal day={selectedDay} onCancel={() => setExplaining(false)} onSaved={saved} />}
  </Card>;
}