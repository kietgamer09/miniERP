/**
 * main.jsx – Điểm khởi chạy: bọc BrowserRouter và RoleProvider.
 *
 * BrowserRouter cần bọc ngoài cùng vì react-router dùng Context.
 * RoleProvider bọc để mọi component đọc được vai trò hiện tại.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RoleProvider>
        <App />
      </RoleProvider>
    </BrowserRouter>
  </StrictMode>,
);
