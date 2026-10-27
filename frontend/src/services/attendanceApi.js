import { request } from './http';

export async function checkInApi() {
  return await request('/api/attendances/check-in', {
    method: 'POST',
  });
}

export async function checkOutApi(confirmedEarly = false) {
  return await request('/api/attendances/check-out', {
    method: 'POST',
    body: { confirmedEarly }, // Truyền object trực tiếp, không dùng JSON.stringify ở đây nữa vì hàm request tự lo việc đó
    data: { confirmedEarly }  // Dự phòng nếu hàm request của dự án dùng axios
  });
}
export async function getTodayAttendanceApi() {
  return await request('/api/attendances/today', {
    method: 'GET',
  });
}
