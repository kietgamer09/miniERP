/**
 * RoleContext – Quản lý vai trò hiện tại (tạm thời, thay bằng đăng nhập sau).
 *
 * Dùng React Context để mọi component đọc/đổi vai trò mà không cần prop drilling.
 * Có 3 giá trị: 'employee', 'manager', 'admin' (cộng dồn quyền).
 */
import { createContext, useContext, useState } from 'react';

// DEV: xóa khi có đăng nhập – vai trò sẽ lấy từ API
const ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

const RoleContext = createContext();

function RoleProvider({ children }) {
  const [role, setRole] = useState(ROLES.EMPLOYEE);
  return (
    <RoleContext.Provider value={{ role, setRole, ROLES }}>
      {children}
    </RoleContext.Provider>
  );
}

/** Hook tiện ích – gọi useRole() thay vì useContext(RoleContext) */
function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole phải nằm trong RoleProvider');
  return ctx;
}

export { RoleProvider, useRole, ROLES };
