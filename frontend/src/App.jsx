/**
 * App.jsx – Khai báo Route cho toàn bộ ứng dụng.
 *
 * Dùng react-router-dom v7 với layout lồng (nested route).
 * Route "/" hiện Home, mọi đường dẫn menu khác hiện Placeholder.
 * getAllPaths lấy danh sách đường dẫn từ cây menu để không phải viết thủ công.
 */
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import RequireAuth from './components/RequireAuth';
import RequireRole from './components/RequireRole';
import Home from './pages/Home';
import Login from './pages/Login';
import Placeholder from './pages/Placeholder';
import { getAllPaths, fullMenuItems } from './config/menu';

// Lấy toàn bộ đường dẫn từ cây menu
const allPaths = getAllPaths(fullMenuItems);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          {/* Trang chủ */}
          <Route path="/" element={<Home />} />

          {/* Mỗi route menu dùng quyền khai báo ngay trong menu.jsx */}
          {allPaths.map((path) => (
            <Route
              key={path}
              path={path}
              element={<RequireRole path={path}><Placeholder /></RequireRole>}
            />
          ))}

          {/* Đường dẫn không tồn tại */}
          <Route path="*" element={<Placeholder />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
