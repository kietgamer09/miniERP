import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';

// 1. Đổi mật khẩu cá nhân
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!' });
    }

    const user = await prisma.users.findUnique({
      where: { user_id: Number(userId) },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Mật khẩu cũ không chính xác!' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { user_id: Number(userId) },
      data: { password: hashedNewPassword }
    });

    return res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    return res.status(500).json({ error: 'Lỗi server khi đổi mật khẩu!' });
  }
};

// 2. GET /api/users/employee-list - Lấy danh sách nhân viên kèm thông tin cơ bản
export const getUsers = async (req, res) => {
  try {
    const employees = await prisma.employees.findMany({
      include: {
        users: {
          select: {
            username: true,
            role: true,
          }
        },
        departments: {
          select: {
            department_name: true,
          }
        }
      },
      orderBy: {
        employee_id: 'desc',
      },
    });

    return res.status(200).json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
  }
};

// Hồ sơ của tài khoản đang đăng nhập; không trả danh sách nhân viên khác.
export const getMyProfile = async (req, res) => {
  try {
    const employee = await prisma.employees.findUnique({
      where: { user_id: Number(req.user.user_id) },
      include: {
        users: { select: { username: true, role: true } },
        departments: { select: { department_name: true } },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Tài khoản chưa có hồ sơ nhân viên.' });
    }

    return res.status(200).json(employee);
  } catch (error) {
    console.error('Error fetching current employee profile:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
  }
};

export const createUser = async (req, res) => {
  try {
    const {
      role,
      department_id,
      fullname,
      email,
      phone_number,
      birthday
    } = req.body;

    // 1. Kiểm tra các trường bắt buộc (bắt buộc phải có sđt để làm username)
    if (!phone_number || !fullname || !department_id) {
      return res.status(400).json({
        error: 'Số điện thoại, họ tên và phòng ban là bắt buộc để hệ thống tự khởi tạo tài khoản.'
      });
    }

    // 2. Tự động lấy số điện thoại làm username ban đầu
    const autoUsername = phone_number.trim();

    // 3. Kiểm tra xem số điện thoại (username) này đã tồn tại trong hệ thống chưa
    const existingUser = await prisma.users.findFirst({
      where: { username: autoUsername },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Số điện thoại này đã được sử dụng làm tài khoản trong hệ thống.' });
    }

    // 4. Cố định mật khẩu mặc định là '12345' và mã hóa nó
    const defaultPassword = '12345';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 5. Sử dụng Transaction để tạo tài khoản và thông tin nhân viên cùng lúc
    const result = await prisma.$transaction(async (prismaClient) => {
      // Tạo tài khoản user với username là SĐT và password mặc định '12345'
      const newUser = await prismaClient.users.create({
        data: {
          username: autoUsername,
          password: hashedPassword,
          role: role || 'employee',
        },
      });

      // Tạo thông tin nhân viên liên kết
      const newEmployee = await prismaClient.employees.create({
        data: {
          user_id: newUser.user_id,
          department_id: Number(department_id),
          fullname,
          email: email || null,
          phone_number: autoUsername,
          birthday: birthday || null,
        },
        include: {
          users: {
            select: {
              username: true,
              role: true,
            }
          },
          departments: {
            select: {
              department_name: true,
            }
          }
        }
      });

      return newEmployee;
    });

    return res.status(201).json({
      message: 'Tạo nhân viên và khởi tạo tài khoản thành công!',
      data: result,
      login_info: {
        username: autoUsername,
        default_password: '12345'
      }
    });

  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
  }
};

// 4. PUT /api/users/employee-update/:id - Cập nhật thông tin cơ bản nhân viên
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullname,
      email,
      phone_number,
      birthday,
      department_id,
      role,
      status
    } = req.body;

    const employeeExist = await prisma.employees.findUnique({
      where: { employee_id: Number(id) },
    });

    if (!employeeExist) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin nhân viên cần cập nhật.' });
    }

    const updateEmployeeData = {};
    if (fullname !== undefined) updateEmployeeData.fullname = fullname;
    if (email !== undefined) updateEmployeeData.email = email;
    if (phone_number !== undefined) updateEmployeeData.phone_number = phone_number;
    if (birthday !== undefined) updateEmployeeData.birthday = birthday;
    if (department_id !== undefined) updateEmployeeData.department_id = Number(department_id);
    if (status !== undefined) updateEmployeeData.status = status;

    const updatedEmployee = await prisma.$transaction(async (prismaClient) => {
      const emp = await prismaClient.employees.update({
        where: { employee_id: Number(id) },
        data: updateEmployeeData,
      });

      if (role && emp.user_id) {
        await prismaClient.users.update({
          where: { user_id: emp.user_id },
          data: { role },
        });
      }

      return await prismaClient.employees.findUnique({
        where: { employee_id: Number(id) },
        include: {
          users: { select: { username: true, role: true } },
          departments: { select: { department_name: true } }
        }
      });
    });

    return res.status(200).json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
  }
};
