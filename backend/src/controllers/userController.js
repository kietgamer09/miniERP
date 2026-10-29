import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';

function makeEmployeeUsername(fullname) {
  const nameParts = fullname.trim().split(/\s+/).filter(Boolean);
  const nameWithoutSurname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';
  const slug = nameWithoutSurname.normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, (letter) => letter === 'đ' ? 'd' : 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return slug ? `emp_${slug}` : '';
}

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
export const getUsers = async (req, res) => {
  try {
    const { search, department_id } = req.query;
    const whereCondition = {};
    if (search && search.trim()) {
      whereCondition.fullname = {
        contains: search.trim(),
        mode: 'insensitive', // Giúp tìm kiếm không phân biệt hoa thường (hoặc bỏ mode nếu dùng MySQL cũ)
      };
    }
    if (department_id) {
      whereCondition.department_id = Number(department_id);
    }

    const employees = await prisma.employees.findMany({
      where: whereCondition,
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
    if (!phone_number || !fullname || !department_id) {
      return res.status(400).json({
        error: 'Số điện thoại, họ tên và phòng ban là bắt buộc để hệ thống tự khởi tạo tài khoản.'
      });
    }
    const autoUsername = makeEmployeeUsername(fullname);
    if (!autoUsername) {
      return res.status(400).json({ error: 'Không tạo được tên đăng nhập từ họ tên nhân viên.' });
    }
    const existingUser = await prisma.users.findFirst({
      where: { username: autoUsername },
    });

    if (existingUser) {
      return res.status(409).json({ error: `Tên đăng nhập ${autoUsername} đã được sử dụng. Hãy phân biệt tên nhân viên trước khi tạo tài khoản.` });
    }
    const defaultPassword = '12345';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const result = await prisma.$transaction(async (prismaClient) => {
      const newUser = await prismaClient.users.create({
        data: {
          username: autoUsername,
          password: hashedPassword,
          role: role || 'employee',
        },
      });
      const newEmployee = await prismaClient.employees.create({
        data: {
          user_id: newUser.user_id,
          department_id: Number(department_id),
          fullname,
          email: email || null,
          phone_number: phone_number.trim(),
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

export const updateEmployeesDepartment = async (req, res) => {
  try {
    const { employee_ids, new_department_id } = req.body;

    if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({ error: 'Danh sách nhân viên không hợp lệ.' });
    }

    if (new_department_id === null || new_department_id === undefined) {
      return res.status(400).json({ error: 'Vui lòng chọn phòng ban đích cần chuyển đến.' });
    }

    // Kiểm tra phòng ban đích có tồn tại không
    const dept = await prisma.departments.findUnique({
      where: { department_id: Number(new_department_id) }
    });
    if (!dept) {
      return res.status(404).json({ error: 'Phòng ban đích không tồn tại.' });
    }

    // Thực hiện cập nhật phòng ban hàng loạt cho các nhân viên được chọn
    const updatePromises = employee_ids.map(empId => {
      return prisma.employees.update({
        where: { employee_id: Number(empId) },
        data: {
          departments: {
            connect: { department_id: Number(new_department_id) }
          }
        }
      });
    });

    await Promise.all(updatePromises);

    return res.status(200).json({ message: 'Chuyển phòng ban cho nhân viên thành công!' });
  } catch (error) {
    console.error('Lỗi chuyển phòng ban nhân viên:', error);
    return res.status(500).json({ error: error.message || 'Lỗi máy chủ nội bộ.' });
  }
};
