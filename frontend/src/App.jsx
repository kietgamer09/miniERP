/**
 * App.jsx – Khai báo Route cho toàn bộ ứng dụng.
 *
 * Dùng react-router-dom v6 với layout lồng (nested route).
 * Route "/" hiện Home, mọi đường dẫn menu khác hiện Placeholder.
 * getAllPaths lấy danh sách đường dẫn từ cây menu để không phải viết thủ công.
 */
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Placeholder from './pages/Placeholder';
import { getAllPaths, fullMenuItems } from './config/menu';

// Lấy toàn bộ đường dẫn từ cây menu
const allPaths = getAllPaths(fullMenuItems);

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Trang chủ */}
        <Route path="/" element={<Home />} />

        {/* Tất cả trang menu khác → Placeholder */}
        {allPaths.map((path) => (
          <Route key={path} path={path} element={<Placeholder />} />
        ))}

        {/* Đường dẫn không tồn tại */}
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}

export default App;
