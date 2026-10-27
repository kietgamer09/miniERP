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
import ProjectDetail from './pages/ProjectDetail';
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
  '/viec-cua-toi/duoc-giao': MyTasksPage,
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

          {/* Backend kiểm tra thành viên; route động không nằm trong cây menu. */}
          <Route path="/du-an/:id" element={<ProjectDetail />} />

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
