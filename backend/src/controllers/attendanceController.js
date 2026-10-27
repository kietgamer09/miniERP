import prisma from '../config/prisma.js';
import dayjs from 'dayjs';

// 1. API Vào ca (Check-in)
export const checkIn = async (req, res) => {
  try {
    const userId = req.user.user_id; // Lấy từ token đăng nhập

    // Tìm employee_id dựa vào user_id
    const employee = await prisma.employees.findUnique({
      where: { user_id: Number(userId) }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ nhân viên của tài khoản này.' });
    }

    const now = dayjs();
    const dayOfWeek = now.day(); // 0: Chủ Nhật, 6: Thứ 7

    // Kiểm tra nếu là Thứ 7 hoặc Chủ Nhật
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(400).json({ error: 'Hôm nay là cuối tuần (Thứ 7 hoặc Chủ Nhật), không cần chấm công!' });
    }

    const todayDate = now.format('YYYY-MM-DD'); // Định dạng ngày cho kiểu Date
    const currentTimeStr = now.format('HH:mm:ss'); // Lấy giờ phút giây hiện tại

    // Kiểm tra xem hôm nay đã check-in chưa
    const existingAttendance = await prisma.attendances.findFirst({
      where: {
        employee_id: employee.employee_id,
        date: new Date(todayDate),
      }
    });

    if (existingAttendance && existingAttendance.check_in) {
      return res.status(400).json({ error: 'Bạn đã thực hiện vào ca vào ngày hôm nay rồi!' });
    }

    // So sánh với mốc 08:00 sáng để xác định đi muộn hay đúng giờ
    const standardCheckIn = '08:00:00';
    const isLate = currentTimeStr > standardCheckIn;
    const messageStatus = isLate ? 'Vào ca thành công (Tính là đi muộn).' : 'Vào ca thành công đúng giờ!';

    let result;
    if (existingAttendance) {
      // Nếu đã có dòng (ví dụ phát sinh từ đâu đó) thì update
      result = await prisma.attendances.update({
        where: { attendances_id: existingAttendance.attendances_id },
        data: {
          check_in: new Date(`1970-01-01T${currentTimeStr}Z`), // Lưu vào kiểu time
        }
      });
    } else {
      // Tạo mới bản ghi chấm công ngày hôm nay
      result = await prisma.attendances.create({
        data: {
          employee_id: employee.employee_id,
          date: new Date(todayDate),
          check_in: new Date(`1970-01-01T${currentTimeStr}Z`),
        }
      });
    }

    return res.status(200).json({
      message: messageStatus,
      data: result
    });

  } catch (error) {
    console.error('Lỗi khi vào ca:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi vào ca.' });
  }
};

// 2. API Ra ca (Check-out)
export const checkOut = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const employee = await prisma.employees.findUnique({
      where: { user_id: Number(userId) }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ nhân viên.' });
    }

    const now = dayjs();
    const dayOfWeek = now.day();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(400).json({ error: 'Hôm nay là cuối tuần, không cần chấm công ra ca!' });
    }

    const todayDate = now.format('YYYY-MM-DD');
    const currentTimeStr = now.format('HH:mm:ss');

    // Tìm bản ghi chấm công trong ngày
    const attendance = await prisma.attendances.findFirst({
      where: {
        employee_id: employee.employee_id,
        date: new Date(todayDate),
      }
    });

    if (!attendance || !attendance.check_in) {
      return res.status(400).json({ error: 'Bạn chưa thực hiện vào ca ngày hôm nay, không thể ra ca!' });
    }

    if (attendance.check_out) {
      return res.status(400).json({ error: 'Bạn đã thực hiện ra ca ngày hôm nay rồi!' });
    }

    // So sánh với mốc 17:00 chiều để xác định về sớm hay đúng giờ
    const standardCheckOut = '17:00:00';
    const isEarly = currentTimeStr < standardCheckOut;
    const messageStatus = isEarly ? 'Ra ca thành công (Tính là về sớm).' : 'Ra ca thành công đúng giờ!';

    const updatedAttendance = await prisma.attendances.update({
      where: { attendances_id: attendance.attendances_id },
      data: {
        check_out: new Date(`1970-01-01T${currentTimeStr}Z`),
      }
    });

    return res.status(200).json({
      message: messageStatus,
      data: updatedAttendance
    });

  } catch (error) {
    console.error('Lỗi khi ra ca:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi ra ca.' });
  }
};