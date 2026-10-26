# Bàn giao tuần 4 — lượt 2: danh sách dự án và form

Đã gắn /du-an/cua-toi với Projects. Khung phòng ban giữ chỗ theo prompt. Link dự án trỏ đến /du-an/:id; trang chi tiết được triển khai trong lượt 3 nên hiện chưa có nội dung chi tiết. Form tạo/sửa dùng DatePicker, chặn ngày kết thúc trước ngày bắt đầu; khi tạo còn chặn ngày kết thúc trong quá khứ theo yêu cầu trước đó. Không thêm thư viện.

File mới: Projects.jsx, ProgressBar.jsx, ProgressBar.css. File sửa: dates.js, projectApi.js, ProjectFormModal.jsx, App.jsx. Các file dùng chung: dates.js, projectApi.js, ProjectFormModal.jsx và App.jsx. Đây là ảnh chụp code tại thời điểm bàn giao, nguồn chạy ứng dụng vẫn ở frontend/src.

## frontend/src/utils/dates.js

Thêm parseDateOnly theo giờ địa phương và formatDateOnlyVN bằng cắt chuỗi, không thay các hàm ngày đang được dùng.

````javascript
/**
 * utils/dates.js – Hàm tiện ích xử lý ngày tháng kiểu Việt.
 *
 * Tách riêng vì nhiều component cần dùng chung (Chấm công, Bảng công, TaskCard).
 * Tất cả là hàm thuần (pure function), dễ test và tái sử dụng.
 */

const DAY_NAMES = [
  'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7',
];

/** Tạo ngày theo giờ địa phương, tránh việc chuỗi YYYY-MM-DD bị hiểu là UTC. */
function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return null;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date : null;
}

function formatDateOnlyVN(value) {
  if (!parseDateOnly(value)) return '—';
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

/** "22/10/2026" */
function formatDateVN(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** "Thứ 5" */
function getDayName(date) {
  return DAY_NAMES[new Date(date).getDay()];
}

/** "Thứ 5, ngày 22/10/2026" */
function formatFullDateVN(date) {
  return `${getDayName(date)}, ngày ${formatDateVN(date)}`;
}

/** Cộng n ngày vào date, trả Date mới */
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Chỉ lấy phần ngày (00:00:00) để so sánh chính xác */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Kiểm tra date có nằm trong tuần hiện tại (Thứ 2 đến Chủ nhật) không. */
function isInCurrentWeek(date, today = new Date()) {
  const weekStart = startOfDay(today);
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  const dateStart = startOfDay(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return dateStart >= weekStart && dateStart < weekEnd;
}

/** Ngày làm việc là Thứ 2 đến Thứ 6. */
function isWorkingDay(date) {
  const dow = new Date(date).getDay();
  return dow !== 0 && dow !== 6;
}

/**
 * Đếm số ngày làm việc từ Thứ 2 đến Thứ 6 trong tháng.
 * @param {number} year
 * @param {number} month 0-indexed (0=tháng 1)
 */
function countWorkingDays(year, month) {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** Tạo danh sách ngày làm việc từ Thứ 2 đến Thứ 6 trong tháng. */
function getWorkingDaysInMonth(year, month) {
  const days = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push({
        date,
        label: `${DAY_NAMES[dow]} ${day}/${month + 1}`,
        dayOfMonth: day,
      });
    }
  }
  return days;
}

export {
  parseDateOnly,
  formatDateOnlyVN,
  DAY_NAMES,
  formatDateVN,
  getDayName,
  formatFullDateVN,
  addDays,
  startOfDay,
  isWorkingDay,
  isInCurrentWeek,
  countWorkingDays,
  getWorkingDaysInMonth,
};
````

## frontend/src/services/projectApi.js

Mỗi API một hàm gọi request dùng chung, gồm API chi tiết, trạng thái và thành viên để sử dụng ở lượt 3. Giữ API xóa dự án đã có.

````javascript
import { request } from './http';

export const listProjects = () => request('/api/projects');
export const getProject = (id) => request(`/api/projects/${id}`);
export const createProject = (data) => request('/api/projects', { method: 'POST', body: data });
export const updateProject = (id, data) => request(`/api/projects/${id}`, { method: 'PUT', body: data });
export const deleteProject = (id) => request(`/api/projects/${id}`, { method: 'DELETE' });
export const completeProject = (id) => request(`/api/projects/${id}/complete`, { method: 'POST' });
export const reopenProject = (id) => request(`/api/projects/${id}/reopen`, { method: 'POST' });
export const listAvailableEmployees = (id) => request(`/api/projects/${id}/available-employees`);
export const addMembers = (id, employeeIds) => request(`/api/projects/${id}/members`, { method: 'POST', body: { employee_ids: employeeIds } });
export const removeMember = (id, employeeId) => request(`/api/projects/${id}/members/${employeeId}`, { method: 'DELETE' });
````

## frontend/src/components/ProgressBar.jsx

Thanh tiến độ tái sử dụng với phần xanh lá, phần trăm hoàn thành/còn lại và số task xong. Có thông tin đọc cho trình đọc màn hình.

````jsx
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
````

## frontend/src/components/ProgressBar.css

Giao diện thanh tiến độ theo phác thảo, tách CSS khỏi component.

````css
.project-progress-bar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
  padding: 4px 10px;
  margin: 8px 0 4px;
  overflow: hidden;
  border: 1px solid #c9d4cf;
  border-radius: 6px;
  background: #f4f6f5;
  color: #163525;
}

.project-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: #95deaa;
}

.project-progress-bar > span {
  position: relative;
  z-index: 1;
}
````

## frontend/src/components/ProjectFormModal.jsx

Dùng Form trong Modal có forceRender như khuôn phòng ban. Chuyển DatePicker sang YYYY-MM-DD trước khi gửi, khóa mã khi sửa và hiển thị nguyên lỗi API.

````jsx
import { useEffect, useRef, useState } from 'react';
import { Alert, DatePicker, Form, Input, Modal } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { createProject, updateProject } from '../services/projectApi';

dayjs.locale('vi');

function getTodayDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function ProjectFormModal({ open, project, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const submitting = useRef(false);
  const today = getTodayDate();
  const startDate = Form.useWatch('start_date', form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (project) form.setFieldsValue({
      ...project,
      start_date: dayjs(project.start_date).locale('vi'),
      end_date: dayjs(project.end_date).locale('vi'),
    });
  }, [open, project, form]);

  async function handleSave() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const values = await form.validateFields();
      setSaving(true);
      setSaveError('');
      // Giữ ngày dạng chuỗi YYYY-MM-DD để không lệch múi giờ.
      const body = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
      };
      if (project) await updateProject(project.id, body);
      else await createProject({ ...body, code: values.code.trim() });
      onSaved();
    } catch (error) {
      if (!error?.errorFields) setSaveError(error.message || 'Không lưu được dự án');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal
      title={project ? 'Sửa dự án' : 'Thêm dự án'} open={open} forceRender
      onCancel={() => { if (!submitting.current) onCancel(); }} onOk={handleSave}
      confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving}
      okText="Lưu" cancelText="Hủy"
    >
      {saveError && <Alert type="error" showIcon title={saveError} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" disabled={saving} preserve={false}>
        <Form.Item label="Mã dự án" name="code" rules={[
          { required: true, whitespace: true, message: 'Vui lòng nhập mã dự án' },
          { max: 20, message: 'Mã dự án không được quá 20 ký tự' },
        ]}>
          <Input disabled={Boolean(project) || saving} maxLength={20} placeholder="VD: DA-001" />
        </Form.Item>
        <Form.Item label="Tên dự án" name="name" rules={[
          { required: true, whitespace: true, message: 'Vui lòng nhập tên dự án' },
          { max: 200, message: 'Tên dự án không được quá 200 ký tự' },
        ]}>
          <Input maxLength={200} placeholder="Nhập tên dự án" />
        </Form.Item>
        <Form.Item label="Mô tả" name="description"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item label="Ngày bắt đầu" name="start_date" rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}>
          <DatePicker locale={viVN.DatePicker} format="DD/MM/YYYY" placeholder="Chọn ngày bắt đầu" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Ngày kết thúc" name="end_date" dependencies={['start_date']} rules={[
          { required: true, message: 'Vui lòng chọn ngày kết thúc' },
          () => ({
            validator(_, value) {
              if (!value) return Promise.resolve();
              if (startDate && value.isBefore(startDate, 'day')) {
                return Promise.reject(new Error('Ngày kết thúc không được trước ngày bắt đầu'));
              }
              if (!project && value.format('YYYY-MM-DD') < today) {
                return Promise.reject(new Error('Ngày kết thúc dự án mới không được trước ngày hiện tại'));
              }
              return Promise.resolve();
            },
          }),
        ]}>
          <DatePicker locale={viVN.DatePicker} format="DD/MM/YYYY" placeholder="Chọn ngày kết thúc" style={{ width: '100%' }}
            disabledDate={(date) => (startDate && date.isBefore(startDate, 'day'))
              || (!project && date.format('YYYY-MM-DD') < today)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default ProjectFormModal;
````

## frontend/src/pages/Projects.jsx

Dùng hook useProjects hiện có; bố cục hai khung trên và tiến độ dưới, các trạng thái tải/rỗng/lỗi. Nút tạo theo vai trò, nút sửa theo can_manage.

````jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useRole } from '../context/AuthContext';
import useProjects from '../hooks/useProjects';
import ProjectFormModal from '../components/ProjectFormModal';
import ProgressBar from '../components/ProgressBar';
import { formatDateOnlyVN } from '../utils/dates';

const { Title, Text } = Typography;

function Projects() {
  const { role } = useRole();
  const { projects, loading, error, reload } = useProjects();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const isAdmin = role === 'admin';

  function openForm(project = null) {
    setSelectedProject(project);
    setFormOpen(true);
  }

  function handleSaved() {
    setFormOpen(false);
    messageApi.success(selectedProject ? 'Cập nhật dự án thành công' : 'Tạo dự án thành công');
    reload();
  }

  function renderProjects(progress = false) {
    if (error) return <Alert type="error" showIcon title={error} action={<Button onClick={reload}>Thử lại</Button>} />;
    if (loading) return <div className="project-panel-loading"><Spin /></div>;
    if (!projects.length) return <Empty description="Bạn chưa tham gia dự án nào" />;
    return <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      {projects.map((project) => <Card key={project.id} size="small" className="project-summary-card">
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Link to={`/du-an/${project.id}`} style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{project.name}</Link>
          <Tag color={project.status === 'hoan_thanh' ? 'green' : 'blue'}>
            {project.status === 'hoan_thanh' ? 'Hoàn thành' : 'Đang thực hiện'}
          </Tag>
        </Space>
        <div className="project-summary-details">
          {!progress && <Text type="secondary">Mã dự án: {project.code}</Text>}
          <Text>Thời hạn: {formatDateOnlyVN(project.start_date)} – {formatDateOnlyVN(project.end_date)}</Text>
          {!progress && <>
            <Text>Thành viên: {project.members_count ?? 0}</Text>
            <Text>Quản lý dự án: {project.manager_name || 'Chưa phân công'}</Text>
          </>}
        </div>
        {progress ? <ProgressBar {...project} /> : <Space wrap>
          <Link to={`/du-an/${project.id}`}>Xem chi tiết</Link>
          {project.can_manage && <Button size="small" icon={<EditOutlined />} onClick={() => openForm(project)}>Sửa dự án</Button>}
        </Space>}
      </Card>)}
    </Space>;
  }

  return (
    <div className="project-overview">
      {contextHolder}
      <Space wrap className="project-page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>{isAdmin ? 'Dự án công ty' : 'Dự án của tôi'}</Title>
          <Text type="secondary">{isAdmin ? 'Danh sách dự án và tiến độ toàn công ty' : 'Các dự án bạn đang tham gia'}</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading}>Tải lại</Button>
          {['manager', 'admin'].includes(role) && <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Tạo dự án</Button>}
        </Space>
      </Space>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Danh sách các ban nhóm công ty" className="project-overview-panel">
            {/* TODO: Nối API phòng ban trong lượt được giao sau. */}
            <Empty description="Sẽ nối API phòng ban sau" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={isAdmin ? 'Danh sách dự án công ty' : 'Danh sách dự án của bạn'} className="project-overview-panel">
            {renderProjects()}
          </Card>
        </Col>
      </Row>
      <Card title="Tiến độ dự án hiện tại">{renderProjects(true)}</Card>
      {formOpen && <ProjectFormModal open project={selectedProject} onCancel={() => setFormOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}

export default Projects;
````

## frontend/src/App.jsx

Đổi ánh xạ /du-an/cua-toi sang Projects. Route chi tiết sẽ nối trong lượt 3.

````jsx
/**
 * App.jsx – Khai báo Route cho toàn bộ ứng dụng.
 *
 * Dùng react-router-dom v7 với layout lồng (nested route).
 * Route "/" hiện Home; bảng pages nối menu với các màn hình đã hoàn thành.
 * getAllPaths lấy danh sách đường dẫn từ cây menu để không phải viết thủ công.
 */
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RequireAuth from './components/RequireAuth';
import RequireRole from './components/RequireRole';
import Home from './pages/Home';
import Login from './pages/Login';
import Departments from './pages/Departments';
import Employees from './pages/Employees';
import ProjectOverview from './pages/ProjectOverview';
import Projects from './pages/Projects';
import ProjectProgress from './pages/ProjectProgress';
import MyTasksPage from './pages/MyTasksPage';
import MyProfile from './pages/MyProfile';
import Placeholder from './pages/Placeholder';
import { getAllPaths, fullMenuItems } from './config/menu';

// Lấy toàn bộ đường dẫn từ cây menu
const allPaths = getAllPaths(fullMenuItems);
const pages = {
  '/thong-tin': MyProfile,
  '/du-an': ProjectOverview,
  '/du-an/cua-toi': Projects,
  '/du-an/tien-do': ProjectProgress,
  '/quan-ly-nhan-vien': Employees,
  '/viec-cua-toi': MyTasksPage,
  '/quan-ly-phong-ban': Departments,
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          {/* Trang chủ */}
          <Route path="/" element={<Home />} />

          {/* Mỗi route menu dùng quyền khai báo ngay trong menu.jsx */}
          {allPaths.map((path) => {
            const Page = pages[path] ?? Placeholder;
            return (
              <Route
                key={path}
                path={path}
                element={<RequireRole path={path}><Page /></RequireRole>}
              />
            );
          })}

          {/* Đường dẫn không tồn tại */}
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
````

## Kiểm tra và commit gợi ý

- npm run build thành công; có cảnh báo bundle lớn. npm run lint không báo lỗi, còn cảnh báo sẵn có tại AttendanceCard, MainLayout, AuthContext và EmployeeFormModal. Chưa chạy thử thao tác trình duyệt với database.
- Tự kiểm tra: vào Dự án của tôi bằng ba vai trò; admin thấy tiêu đề công ty, employee không có nút tạo; chỉ can_manage có nút sửa. Thử tạo/sửa, nhập thiếu trường, mã trùng, chọn ngày kết thúc trước ngày bắt đầu, mã bị khóa khi sửa; tạo thành công phải tải lại dữ liệu.
- Commit 1: bổ sung hàm ngày và các hàm gọi API dự án (hai file dùng chung).
- Commit 2: chuyển form dự án sang DatePicker và kiểm tra ngày (component dùng chung).
- Commit 3: thêm danh sách và thanh tiến độ dự án.
- Commit 4: gắn route danh sách dự án (App.jsx, file dùng chung).
- Dừng sau lượt 2 theo prompt; tiếp lượt 3 để làm chi tiết dự án và quản lý thành viên.

