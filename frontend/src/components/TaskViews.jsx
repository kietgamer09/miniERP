import { useState } from 'react';
import { Button, Empty, Input, Modal, Segmented, Select, Space, Table, Tag, Typography } from 'antd';
import { BarsOutlined, CalendarOutlined, LeftOutlined, ProjectOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import KanbanBoard from './KanbanBoard';
import { adaptTask, adaptTasks } from '../utils/taskAdapter';
import { getDueState, sortTasks } from '../utils/taskStatus';
import { formatDateOnlyVN } from '../utils/dates';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../config/taskConstants';
import './TaskViews.css';

function TaskCalendar({ tasks, onOpen }) {
  const [anchor, setAnchor] = useState(() => dayjs().startOf('day'));
  const [range, setRange] = useState('month');
  const [selected, setSelected] = useState(null);
  const monday = date => date.subtract((date.day() + 6) % 7, 'day');
  const start = monday(range === 'month' ? anchor.startOf('month') : anchor);
  const length = range === 'week' ? 7 : Math.ceil(((anchor.startOf('month').day() + 6) % 7 + anchor.daysInMonth()) / 7) * 7;
  const byDate = new Map();
  tasks.forEach(task => {
    const key = task.due_date?.slice(0, 10);
    if (key) byDate.set(key, [...(byDate.get(key) || []), task]);
  });
  const days = Array.from({ length }, (_, i) => start.add(i, 'day'));
  const noDate = tasks.filter(task => !task.due_date);
  return <div className="task-calendar">
    <div className="task-calendar-toolbar">
      <Space wrap>
        <Button icon={<LeftOutlined />} aria-label="Khoảng thời gian trước" onClick={() => setAnchor(anchor.subtract(1, range))} />
        <Button onClick={() => setAnchor(dayjs().startOf('day'))}>Hôm nay</Button>
        <Button icon={<RightOutlined />} aria-label="Khoảng thời gian tiếp theo" onClick={() => setAnchor(anchor.add(1, range))} />
        <Typography.Text strong>{range === 'month' ? anchor.format('MM/YYYY') : `${start.format('DD/MM')} – ${start.add(6, 'day').format('DD/MM/YYYY')}`}</Typography.Text>
      </Space>
      <Segmented aria-label="Khoảng thời gian lịch" value={range} onChange={setRange} options={[{ label: 'Tháng', value: 'month' }, { label: 'Tuần', value: 'week' }]} />
    </div>
    <Typography.Text type="secondary">Lịch hiển thị theo hạn chót của công việc.</Typography.Text>
    <div className="task-calendar-scroll"><div className={`task-calendar-grid task-calendar-grid--${range}`}>
      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <div className="task-calendar-weekday" key={label}>{label}</div>)}
      {days.map(date => {
        const key = date.format('YYYY-MM-DD');
        const items = byDate.get(key) || [];
        return <div key={key} className={`task-calendar-day${date.month() !== anchor.month() && range === 'month' ? ' is-outside' : ''}${date.isSame(dayjs(), 'day') ? ' is-today' : ''}`}>
          <span className="task-calendar-date">{date.date()}</span>
          {items.slice(0, 3).map(task => <button type="button" className={`task-calendar-event task-calendar-event--${getDueState(adaptTask(task))}`} key={task.id}
            title={`${task.title} · ${task.project_name || ''}`} onClick={() => onOpen?.(task)}>{task.title}</button>)}
          {items.length > 3 && <button type="button" className="task-calendar-more" onClick={() => setSelected(key)}>+{items.length - 3} công việc</button>}
        </div>;
      })}
    </div></div>
    {noDate.length > 0 && <Button onClick={() => setSelected('undated')}>Chưa có hạn ({noDate.length})</Button>}
    {!tasks.length && <Empty description="Không có công việc phù hợp" />}
    <Modal open={Boolean(selected)} title={selected === 'undated' ? 'Công việc chưa có hạn' : `Công việc ngày ${formatDateOnlyVN(selected)}`} footer={null} onCancel={() => setSelected(null)}>
      <div className="task-calendar-day-list">{(selected === 'undated' ? noDate : byDate.get(selected) || []).map(task =>
        <Button key={task.id} block onClick={() => { setSelected(null); onOpen?.(task); }}>{task.title}</Button>)}</div>
    </Modal>
  </div>;
}

export default function TaskViews({ tasks = [], loading, sortMode = 'due', storageKey = 'miniErpTaskView', toolbarExtra, ...boardProps }) {
  const [view, setView] = useState(() => {
    try { const saved = localStorage.getItem(storageKey); return ['list', 'kanban', 'calendar'].includes(saved) ? saved : window.matchMedia('(max-width: 767px)').matches ? 'list' : 'kanban'; }
    catch { return 'kanban'; }
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [due, setDue] = useState('all');
  const filtered = tasks.filter(task => {
    const state = getDueState(adaptTask(task));
    return `${task.title} ${task.project_name || ''} ${task.assignee_name || ''}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))
      && (status === 'all' || task.status === status) && (due === 'all' || state === due);
  });
  const sorted = sortTasks(adaptTasks(filtered), sortMode).map(task => filtered.find(item => item.id === task.id));
  const columns = [
    { title: 'Công việc', key: 'title', width: 300, render: (_, task) => <div className="task-list-title"><Button type="link" onClick={() => boardProps.onOpen?.(task)}>{task.title}</Button><Typography.Text type="secondary">{task.project_name}</Typography.Text></div> },
    { title: 'Người thực hiện', dataIndex: 'assignee_name', width: 180, render: value => value || '—' },
    { title: 'Trạng thái', dataIndex: 'status', width: 140, render: value => <Tag color={value === 'xong' ? 'green' : value === 'dang_lam' ? 'blue' : 'default'}>{TASK_STATUS_LABELS[value]}</Tag> },
    { title: 'Ưu tiên', dataIndex: 'priority', width: 120, render: value => TASK_PRIORITY_LABELS[value] || value },
    { title: 'Hạn chót', dataIndex: 'due_date', width: 150, render: (value, task) => <span className={`task-due--${getDueState(adaptTask(task))}`}>{value ? formatDateOnlyVN(value) : 'Chưa có hạn'}</span> },
    { title: '', key: 'edit', width: 80, render: (_, task) => task.can_edit && !boardProps.readOnly && task.project_status !== 'hoan_thanh' && boardProps.onEdit ? <Button size="small" onClick={() => boardProps.onEdit(task)}>Sửa</Button> : null },
  ];
  return <div className="task-views">
    <div className="task-view-toolbar">
      <Typography.Text type="secondary">{filtered.length}/{tasks.length} công việc</Typography.Text>
      <Space wrap>{toolbarExtra}<Segmented className="task-view-switch" aria-label="Chế độ xem công việc" value={view} onChange={value => {
        setView(value); try { localStorage.setItem(storageKey, value); } catch { /* Lưu trong phiên hiện tại. */ }
      }} options={[{ label: 'Danh sách', value: 'list', icon: <BarsOutlined /> }, { label: 'Kanban', value: 'kanban', icon: <ProjectOutlined /> }, { label: 'Lịch', value: 'calendar', icon: <CalendarOutlined /> }]} /></Space>
    </div>
    <div className="task-view-filters">
      <Input allowClear prefix={<SearchOutlined />} aria-label="Tìm công việc" placeholder="Tìm tên công việc, dự án, người thực hiện…" value={query} onChange={event => setQuery(event.target.value)} />
      <Select aria-label="Lọc trạng thái công việc" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Mọi trạng thái' }, ...Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }))]} />
      <Select aria-label="Lọc hạn công việc" value={due} onChange={setDue} options={[{ value: 'all', label: 'Mọi hạn chót' }, { value: 'overdue', label: 'Quá hạn' }, { value: 'near-due', label: 'Sắp hạn (3 ngày)' }, { value: 'normal', label: 'Chưa đến hạn' }]} />
    </div>
    <div className="task-view-content">
      {view === 'kanban' ? <KanbanBoard {...boardProps} tasks={filtered} loading={loading} sortMode={sortMode} />
        : view === 'list' ? <Table rowKey="id" columns={columns} dataSource={sorted} loading={loading} scroll={{ x: 950 }} pagination={{ pageSize: 15, hideOnSinglePage: true }} locale={{ emptyText: boardProps.emptyText || 'Không có công việc phù hợp' }} />
          : loading ? <Typography.Text>Đang tải lịch…</Typography.Text> : <TaskCalendar tasks={sorted} onOpen={boardProps.onOpen} />}
    </div>
  </div>;
}
