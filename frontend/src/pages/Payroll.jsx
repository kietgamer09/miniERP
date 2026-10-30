import React from 'react';
import AdminPayroll from '../components/AdminPayroll';
import StaffPayroll from '../components/StaffPayroll';
import { useRole } from '../hooks/useAuth';

export default function Payroll() {
  const { role } = useRole();
  
  // Chỉ đúng role 'admin' mới thấy bảng toàn công ty, các role khác (như manager, hr, staff...) sẽ thấy bảng cá nhân
  const isAdmin = role?.toLowerCase() === 'admin';

  return isAdmin ? <AdminPayroll /> : <StaffPayroll />;
}