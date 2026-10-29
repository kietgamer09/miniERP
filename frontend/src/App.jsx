import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RequireAuth from './components/RequireAuth';
import RequireRole from './components/RequireRole';
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Departments = lazy(() => import('./pages/Departments'));
const Employees = lazy(() => import('./pages/Employees'));
const ProjectOverview = lazy(() => import('./pages/ProjectOverview'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const ProjectProgress = lazy(() => import('./pages/ProjectProgress'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const WorkProjects = lazy(() => import('./pages/WorkProjects'));
const AssignTasks = lazy(() => import('./pages/AssignTasks'));
const OtherProjectTasks = lazy(() => import('./pages/OtherProjectTasks'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const Placeholder = lazy(() => import('./pages/Placeholder'));
const Attendance = lazy(() => import('./pages/Attendance'));
const AttendanceApprovals = lazy(() => import('./pages/AttendanceApprovals'));
const CompanyAttendance = lazy(() => import('./components/CompanyAttendance'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const CompanyDocuments = lazy(() => import('./pages/CompanyDocuments'));
import { getAllPaths, fullMenuItems } from './config/menu';

// Lấy toàn bộ đường dẫn từ cây menu
const allPaths = getAllPaths(fullMenuItems);
const pages = {
  '/phe-duyet': AttendanceApprovals,
  '/cham-cong/bang-cong': Attendance,
  '/thong-tin': MyProfile,
  '/du-an': ProjectOverview,
  '/du-an/cua-toi': Projects,
  '/du-an/tien-do': ProjectProgress,
  '/quan-ly-nhan-vien': Employees,
  '/viec-cua-toi': WorkProjects,
  '/viec-cua-toi/duoc-giao': MyTasks,
  '/viec-cua-toi/giao-viec': AssignTasks,
  '/viec-cua-toi/viec-khac': OtherProjectTasks,
  '/quan-ly-phong-ban': Departments,
  '/cham-cong/bang-cong-cong-ty': CompanyAttendance,
  '/cham-cong/nghi-phep': LeaveManagement,
  '/tai-lieu': CompanyDocuments,
};

function App() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Đang tải trang...</div>}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/du-an/:id" element={<ProjectDetail />} />
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
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  );
}

export default App;
