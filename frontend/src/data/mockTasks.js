/**
 * data/mockTasks.js – Dữ liệu task mẫu.
 *
 * Hạn chót tính theo ngày hôm nay (hôm nay ± N ngày) để giao diện
 * luôn đúng bất kể chạy vào ngày nào.
 *
 * Mỗi task chỉ nằm đúng một cột (todo / doing / done).
 */
// TODO: thay bằng API

import { addDays } from '../utils/dates';

function buildMockTasks() {
  const today = new Date();

  return [
    // ---- Cột "Cần làm" ----
    // Mặc định "Theo hạn": A (+2, sắp hạn -> vàng) đứng trước C (+5, xanh lơ) - khớp ảnh
    // Khi chọn "Theo ưu tiên": C (Cao) sẽ đảo lên trước A (Trung bình)
    {
      id: 1,
      title: 'Công việc A',
      projectName: 'Dự án abc',
      dueDate: addDays(today, 2),
      priority: 'Trung bình',
      status: 'todo',
    },
    {
      id: 2,
      title: 'Công việc C',
      projectName: 'Dự án abc',
      dueDate: addDays(today, 5),
      priority: 'Cao',
      status: 'todo',
    },

    // ---- Cột "Đang làm" ----
    {
      id: 3,
      title: 'Công việc E',
      projectName: 'Dự án abc',
      dueDate: addDays(today, -6), // quá hạn → đỏ
      priority: 'Trung bình',
      status: 'doing',
    },
    {
      id: 4,
      title: 'Công việc B',
      projectName: 'Dự án def',
      dueDate: addDays(today, 1), // sắp hạn → vàng
      priority: 'Cao',
      status: 'doing',
    },
    {
      id: 5,
      title: 'Công việc G',
      projectName: 'Dự án def',
      dueDate: addDays(today, 9),
      priority: 'Thấp',
      status: 'doing',
    },

    // ---- Cột "Hoàn thành" ----
    {
      id: 6,
      title: 'Công việc F',
      projectName: 'Dự án def',
      dueDate: addDays(today, 0), // hạn là hôm nay, nhưng đã xong → không cảnh báo
      priority: 'Trung bình',
      status: 'done',
      completedAt: today,
    },
    {
      id: 7,
      title: 'Công việc D',
      projectName: 'Dự án abc',
      dueDate: addDays(today, -5), // hạn đã qua, nhưng đã xong → không cảnh báo
      priority: 'Thấp',
      status: 'done',
      completedAt: today,
    },
    {
      id: 8,
      title: 'Công việc H',
      projectName: 'Dự án abc',
      dueDate: addDays(today, -8), // hạn đã qua, nhưng đã xong → không cảnh báo
      priority: 'Thấp',
      status: 'done',
      // Chủ nhật trước tuần hiện tại để kiểm tra bộ lọc cột Hoàn thành
      completedAt: addDays(today, -((today.getDay() + 6) % 7) - 1),
    },
  ];
}

export { buildMockTasks };
