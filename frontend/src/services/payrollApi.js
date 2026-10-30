import { request } from './http';

// 1. Admin xem bảng lương toàn công ty theo tháng
export const fetchCompanyPayrollsApi = async (month) => {
  return await request(`/api/payrolls/company-payrolls?month=${month}`, {
    method: 'GET'
  });
};

// 2. Admin kích hoạt tính toán và chốt lương toàn công ty
export const calculateCompanyPayrollApi = async (month) => {
  return await request(`/api/payrolls/company-payrolls/calculate`, {
    method: 'POST',
    body: { month } // Tùy thuộc vào helper request của bạn có tự JSON.stringify() hay không, nếu helper đã tự làm thì chỉ cần truyền object
  });
};

// 3. Nhân viên xem bảng lương cá nhân theo tháng
export const fetchSelfPayrollApi = async (month) => {
  return await request(`/api/payrolls/self-payroll?month=${month}`, {
    method: 'GET'
  });
};