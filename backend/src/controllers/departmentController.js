import prisma from '../config/prisma.js';

// Lấy danh sách toàn bộ phòng ban
export const listDepartments = async (req, res) => {
  try {
    const departments = await prisma.departments.findMany({
      orderBy: { department_id: 'asc' }
    });
    return res.status(200).json(departments);
  } catch (error) {
    console.error('Lỗi lấy danh sách phòng ban:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi lấy phòng ban.' });
  }
};