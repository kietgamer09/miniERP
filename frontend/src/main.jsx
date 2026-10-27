/**
 * main.jsx – Điểm khởi chạy: bọc BrowserRouter và AuthProvider.
 *
 * BrowserRouter bọc ứng dụng để router cung cấp ngữ cảnh điều hướng.
 * AuthProvider quản lý người dùng và phiên đăng nhập dùng chung.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WorkProvider } from './context/WorkContext';
import { AttendanceProvider } from './context/AttendanceContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AttendanceProvider><WorkProvider><App /></WorkProvider></AttendanceProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
