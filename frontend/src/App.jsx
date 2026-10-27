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
import ProjectDetail from './pages/ProjectDetail';
import ProjectProgress from './pages/ProjectProgress';
import MyTasks from './pages/MyTasks';
import MyProfile from './pages/MyProfile';
import Placeholder from './pages/Placeholder';
import Attendance from './pages/Attendance';
import AttendanceApprovals from './pages/AttendanceApprovals';
import CompanyAttendance from './components/CompanyAttendance';
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
  '/viec-cua-toi': MyTasks,
  '/viec-cua-toi/duoc-giao': MyTasks,
  '/quan-ly-phong-ban': Departments,
  '/cham-cong/bang-cong-cong-ty': CompanyAttendance,
};

function App() {
  return (
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
  );
}

export default App;
