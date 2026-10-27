import prisma from '../config/prisma.js';
import dayjs from 'dayjs';

// 1. API Vào ca (Check-in)
export const checkIn = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const employee = await prisma.employees.findUnique({
      where: { user_id: Number(userId) }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ nhân viên của tài khoản này.' });
    }

    let now = dayjs();
    if (req.body && req.body.mockDate) {
      const [year, month, day] = req.body.mockDate.split('-');
      now = now.year(Number(year)).month(Number(month) - 1).date(Number(day));
    }
    if (req.body && req.body.mockTime) {
      const [hour, minute, second] = req.body.mockTime.split(':');
      now = now.hour(Number(hour)).minute(Number(minute)).second(Number(second || 0));
    }

    const dayOfWeek = now.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(400).json({ error: 'Hôm nay là cuối tuần (Thứ 7 hoặc Chủ Nhật), không cần chấm công!' });
    }

    const todayDate = now.format('YYYY-MM-DD');
    const currentTimeStr = now.format('HH:mm:ss');

    const existingAttendance = await prisma.attendances.findFirst({
      where: {
        employee_id: employee.employee_id,
        date: new Date(todayDate),
      }
    });

    if (existingAttendance && existingAttendance.check_in) {
      return res.status(400).json({ error: 'Bạn đã thực hiện vào ca vào ngày hôm nay rồi!' });
    }

    const standardCheckIn = '08:00:00';
    const isLate = currentTimeStr > standardCheckIn;
    const messageStatus = isLate ? 'Vào ca thành công (Tính là đi muộn).' : 'Vào ca thành công đúng giờ!';

    let result;
    const timeToSave = new Date(`1970-01-01T${currentTimeStr}Z`);

    if (existingAttendance) {
      result = await prisma.attendances.update({
        where: { attendances_id: existingAttendance.attendances_id },
        data: { check_in: timeToSave }
      });
    } else {
      result = await prisma.attendances.create({
        data: {
          employee_id: employee.employee_id,
          date: new Date(todayDate),
          check_in: timeToSave,
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

    let now = dayjs();
    if (req.body && req.body.mockDate) {
      const [year, month, day] = req.body.mockDate.split('-');
      now = now.year(Number(year)).month(Number(month) - 1).date(Number(day));
    }
    if (req.body && req.body.mockTime) {
      const [hour, minute, second] = req.body.mockTime.split(':');
      now = now.hour(Number(hour)).minute(Number(minute)).second(Number(second || 0));
    }

    const dayOfWeek = now.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(400).json({ error: 'Hôm nay là cuối tuần, không cần chấm công ra ca!' });
    }

    const todayDate = now.format('YYYY-MM-DD');
    const currentTimeStr = now.format('HH:mm:ss');

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

    const standardCheckOut = '17:00:00';
    const isEarly = currentTimeStr < standardCheckOut;

    // Kiểm tra nếu ra ca sớm và chưa xác nhận
    const confirmedEarly = req.body && req.body.confirmedEarly === true;
    if (isEarly && !confirmedEarly) {
      return res.status(200).json({
        requireConfirmation: true,
        message: `Hiện tại là ${currentTimeStr} (Trước 17:00). Bạn có chắc chắn muốn ra ca sớm không?`
      });
    }

    const messageStatus = isEarly ? 'Ra ca thành công (Tính là về sớm).' : 'Ra ca thành công đúng giờ!';
    const timeToSave = new Date(`1970-01-01T${currentTimeStr}Z`);

    const updatedAttendance = await prisma.attendances.update({
      where: { attendances_id: attendance.attendances_id },
      data: { check_out: timeToSave }
    });

    return res.status(200).json({
      requireConfirmation: false,
      message: messageStatus,
      data: updatedAttendance
    });

  } catch (error) {
    console.error('Lỗi khi ra ca:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi ra ca.' });
  }
};

// 3. API Lấy thông tin chấm công ngày hôm nay (Đã fix chuẩn UTC chống lệch giờ)
export const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const employee = await prisma.employees.findUnique({
      where: { user_id: Number(userId) }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ nhân viên.' });
    }

    const now = dayjs();
    const todayDate = now.format('YYYY-MM-DD');

    const attendance = await prisma.attendances.findFirst({
      where: {
        employee_id: employee.employee_id,
        date: new Date(todayDate),
      }
    });

    if (!attendance) {
      return res.status(200).json({ data: null });
    }

    // Đọc giờ chuẩn xác bằng UTC getters để loại bỏ hoàn toàn lỗi lệch múi giờ
    const formatTimeUTC = (dbDate) => {
      if (!dbDate) return null;
      const d = new Date(dbDate);
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    };

    return res.status(200).json({
      data: {
        check_in: formatTimeUTC(attendance.check_in),
        check_out: formatTimeUTC(attendance.check_out),
      }
    });

  } catch (error) {
    console.error('Lỗi khi lấy thông tin chấm công hôm nay:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
  }
};