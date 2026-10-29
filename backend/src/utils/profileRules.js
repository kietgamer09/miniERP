import { isValidDate } from './validators.js';

const allowedFields = new Set(['fullname', 'email', 'phone_number', 'birthday']);
export function validateProfileUpdate(body, now = new Date()) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) return { error: 'Không có thông tin hợp lệ để cập nhật.' };
  if (Object.keys(body).some(field => !allowedFields.has(field))) return { error: 'Chỉ được sửa họ tên, email, số điện thoại và ngày sinh.' };
  const data = {};
  if (Object.hasOwn(body, 'fullname')) {
    if (typeof body.fullname !== 'string') return { error: 'Họ tên không hợp lệ.' };
    const name = body.fullname.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!name || name.length > 100 || /[\x00-\x1f\x7f]/.test(name)) return { error: 'Họ tên cần từ 1 đến 100 ký tự.' };
    data.fullname = name;
  }
  for (const field of ['email', 'phone_number', 'birthday']) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (value !== null && typeof value !== 'string') return { error: 'Email, số điện thoại và ngày sinh phải là chuỗi hoặc để trống.' };
    data[field] = value?.trim() || null;
  }
  if (data.email && (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) return { error: 'Địa chỉ email không hợp lệ.' };
  if (data.phone_number) {
    const phone = data.phone_number.replace(/[\s().-]/g, '');
    if (!/^\+?\d{7,15}$/.test(phone)) return { error: 'Số điện thoại cần từ 7 đến 15 chữ số, có thể bắt đầu bằng +.' };
    data.phone_number = phone;
  }
  if (data.birthday) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now).map(({ type, value }) => [type, value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    if (!isValidDate(data.birthday) || data.birthday > today) return { error: 'Ngày sinh không hợp lệ hoặc nằm trong tương lai.' };
    const [year, month, day] = data.birthday.split('-');
    data.birthday = `${day}/${month}/${year}`;
  }
  return { data };
}
