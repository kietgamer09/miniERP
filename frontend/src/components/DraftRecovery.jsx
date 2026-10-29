import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Input, Modal, Spin, Typography } from 'antd';
import { DraftResumeContext } from '../context/draftResumeContext';
import { useAuth } from '../hooks/useAuth';
import { useMyWork } from '../hooks/useMyWork';
import { useAttendance } from '../hooks/useAttendance';
import { draftKey, readDraft, removeDraft } from '../utils/draftStorage';
import { getProject } from '../services/projectApi';
import { getTask } from '../services/taskApi';
import { getMyProfile, listEmployees } from '../services/employeeApi';
import { listDepartments } from '../services/departmentApi';
import { getMyAttendances } from '../services/attendanceApi';

const ProjectFormModal = lazy(() => import('./ProjectFormModal'));
const TaskFormModal = lazy(() => import('./TaskFormModal'));
const AddMembersModal = lazy(() => import('./AddMembersModal'));
const EmployeeFormModal = lazy(() => import('./EmployeeFormModal'));
const DepartmentFormModal = lazy(() => import('./DepartmentFormModal'));
const AttendanceExplanationModal = lazy(() => import('./AttendanceExplanationModal'));
const TaskComments = lazy(() => import('./TaskComments'));
const OvertimeFormModal = lazy(() => import('./OvertimeFormModal'));
const ProfileFormModal = lazy(() => import('./ProfileFormModal'));

function requirePermission(allowed) {
  if (!allowed) throw new Error('Bạn không còn quyền tiếp tục nội dung này. Bản nháp vẫn được giữ lại.');
}

async function loadDraft(scope, user) {
  if (!readDraft(draftKey(user.id ?? user.username, scope))) throw new Error('Bản nháp đã được gửi, bị xóa hoặc hết hạn.');
  let match;
  if (scope === 'profile:me') return { kind: 'profile', profile: await getMyProfile() };
  if (scope === 'overtime:new') return { kind: 'overtime' };
  if ((match = /^project:(new|\d+)$/.exec(scope))) {
    if (match[1] === 'new') { requirePermission(['admin', 'manager'].includes(user.role)); return { kind: 'project' }; }
    const project = await getProject(match[1]);
    requirePermission(project.can_manage && project.status !== 'hoan_thanh');
    return { kind: 'project', project };
  }
  if ((match = /^task:(\d+):(new|\d+)$/.exec(scope))) {
    const project = await getProject(match[1]);
    const task = match[2] === 'new' ? null : await getTask(match[2]);
    requirePermission(project.status !== 'hoan_thanh' && (task ? task.can_edit && Number(task.project_id) === Number(project.id) : project.can_manage));
    return { kind: 'task', project, task };
  }
  if ((match = /^project-members:(\d+)$/.exec(scope))) {
    const project = await getProject(match[1]);
    requirePermission(project.can_manage && project.status !== 'hoan_thanh');
    return { kind: 'members', project };
  }
  if ((match = /^comment:(project|task)-(\d+)$/.exec(scope))) {
    const target = match[1] === 'project' ? await getProject(match[2]) : await getTask(match[2]);
    return { kind: 'comment', target, projectId: match[1] === 'project' ? target.id : undefined,
      taskId: match[1] === 'task' ? target.id : undefined };
  }
  if ((match = /^(employee|department):(new|\d+)$/.exec(scope))) {
    requirePermission(user.role === 'admin');
    const [employeeResult, departmentResult] = await Promise.all([listEmployees(), listDepartments()]);
    const employees = Array.isArray(employeeResult) ? employeeResult : employeeResult?.data || [];
    const departments = Array.isArray(departmentResult) ? departmentResult : departmentResult?.data || [];
    const target = match[2] === 'new' ? null : (match[1] === 'employee' ? employees : departments)
      .find(item => String(item[match[1] === 'employee' ? 'employee_id' : 'department_id']) === match[2]);
    if (match[2] !== 'new' && !target) throw new Error('Không tìm thấy mục cần sửa. Bản nháp vẫn được giữ lại.');
    return { kind: match[1], target, departments };
  }
  if ((match = /^attendance-explanation:(\d{4}-\d{2}-\d{2})$/.exec(scope))) {
    const data = await getMyAttendances(match[1].slice(0, 7));
    const day = data.days?.find(item => item.date === match[1]);
    if (!day?.can_explain || day.explanation) throw new Error('Ngày này đã có giải trình hoặc không còn được gửi giải trình. Bản nháp vẫn được giữ lại.');
    return { kind: 'explanation', day };
  }
  throw new Error('Không mở được loại bản nháp này.');
}

function ResumeOverlay({ scope, onClose, onSaved }) {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  useEffect(() => {
    let active = true;
    loadDraft(scope, user).then(data => { if (active) setResult({ data }); })
      .catch(error => { if (active) setResult({ error: error.message || 'Không mở được bản nháp.' }); });
    return () => { active = false; };
  }, [scope, user]);
  const loading = <Modal open title="Đang mở việc đang dở" footer={null} onCancel={onClose}><Spin /></Modal>;
  if (!result) return loading;
  if (result.error) return <Modal open title="Việc đang dở" onCancel={onClose} footer={<>
    <Button onClick={() => { removeDraft(draftKey(user.id ?? user.username, scope)); onClose(); }}>Bỏ nháp</Button>
    <Button type="primary" onClick={onClose}>Đóng</Button>
  </>}><Alert type="warning" showIcon title={result.error} /></Modal>;
  const data = result.data;
  const props = { onCancel: onClose, onSaved };
  return <DraftResumeContext.Provider value={scope}><Suspense fallback={loading}>
    {data.kind === 'project' && <ProjectFormModal open project={data.project} {...props} />}
    {data.kind === 'task' && <TaskFormModal project={data.project} task={data.task} {...props} />}
    {data.kind === 'members' && <AddMembersModal projectId={data.project.id} {...props} />}
    {data.kind === 'employee' && <EmployeeFormModal open employee={data.target} departments={data.departments} {...props} />}
    {data.kind === 'department' && <DepartmentFormModal open department={data.target} {...props} />}
    {data.kind === 'explanation' && <AttendanceExplanationModal day={data.day} {...props} />}
    {data.kind === 'overtime' && <OvertimeFormModal {...props} />}
    {data.kind === 'profile' && <ProfileFormModal profile={data.profile} {...props} />}
    {data.kind === 'comment' && <Modal open title={`Tiếp tục ${data.projectId ? 'thảo luận' : 'bình luận'} · ${data.target.name || data.target.title}`}
      footer={null} onCancel={onClose} width={620}>
      <TaskComments projectId={data.projectId} taskId={data.taskId} onSubmitted={onSaved} />
    </Modal>}
  </Suspense></DraftResumeContext.Provider>;
}

export default function DraftRecovery({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { reload } = useMyWork();
  const { refresh } = useAttendance();
  const { message } = App.useApp();
  const [loginInfo, setLoginInfo] = useState(null);
  const scope = typeof location.state?.resumeDraft === 'string' ? location.state.resumeDraft : null;
  const close = () => navigate(`${location.pathname}${location.search}${location.hash}`, {
    replace: true, state: { ...location.state, resumeDraft: null },
  });
  function saved(result) {
    if (result?.login_info?.username && result.login_info.default_password) setLoginInfo(result.login_info);
    reload(); refresh();
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true, state: { ...location.state, resumeDraft: null, draftSavedAt: Date.now() },
    });
    message.success('Đã gửi/lưu nội dung đang dở');
  }
  return <>
    <DraftResumeContext.Provider key={location.state?.draftSavedAt || 'page'} value={scope === 'leave:new' ? scope : null}>
      {children}
    </DraftResumeContext.Provider>
    {scope && scope !== 'leave:new' && <ResumeOverlay key={`${location.key}:${scope}`} scope={scope} onClose={close} onSaved={saved} />}
    {loginInfo && <Modal open title="Tài khoản nhân viên vừa tạo" onCancel={() => setLoginInfo(null)}
      footer={<Button type="primary" onClick={() => setLoginInfo(null)}>Đã lưu thông tin</Button>}>
      <Typography.Paragraph>Tài khoản: <Typography.Text copyable>{loginInfo.username}</Typography.Text></Typography.Paragraph>
      <Typography.Paragraph>Mật khẩu ban đầu:</Typography.Paragraph>
      <Input.Password readOnly value={loginInfo.default_password} aria-label="Mật khẩu ban đầu" autoComplete="off" />
    </Modal>}
  </>;
}
