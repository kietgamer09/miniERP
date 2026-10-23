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
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
