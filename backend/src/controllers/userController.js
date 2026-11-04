import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import prisma from '../config/prisma.js';
import { parseId } from '../utils/validators.js';

const temporaryPasswordLifetimeMs = 24 * 60 * 60 * 1000;

function createTemporaryPassword() {
  return randomBytes(24).toString('base64url');
}

function temporaryPasswordExpiry() {
  return new Date(Date.now() + temporaryPasswordLifetimeMs);
}

// Danh sách Allowlist chuẩn khớp với hệ thống Enum/Schema hiện tại
const VALID_ROLES = ['admin', 'manager', 'employee', 'ADMIN', 'MANAGER', 'EMPLOYEE'];
const VALID_STATUSES = ['dang_lam_viec', 'da_nghi_viec'];

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
    const { oldPassword, newPassword } = req.body ?? {};

    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string' || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!' });
    }
    if (newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 8 ký tự và tối đa 72 byte UTF-8.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({
        where: { user_id: Number(userId) },
        select: { password: true },
      });
      if (!user) return { status: 404, error: 'Không tìm thấy người dùng!' };
      if (typeof user.password !== 'string' || !await bcrypt.compare(oldPassword, user.password)) {
        return { status: 400, error: 'Mật khẩu hiện tại không chính xác!' };
      }
      await tx.users.update({
        where: { user_id: Number(userId) },
        data: {
          password: hashedNewPassword,
          must_change_password: false,
          temp_password_expires_at: null,
          temp_password_used_at: null,
        },
      });
      return { changed: true };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });

    return res.status(200).json({ message: 'Đổi mật khẩu thành công!', must_change_password: false });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error.code || error.name);
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
        mode: 'insensitive',
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
      birthday,
      position,
      status
    } = req.body;

    // 1. Strict Validation cơ bản
    if (!phone_number || !fullname || !department_id) {
      return res.status(400).json({
        error: 'Số điện thoại, họ tên và phòng ban là bắt buộc để hệ thống tự khởi tạo tài khoản.'
      });
    }

    // 2. Validate Allowlist cho role và status
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Role không hợp lệ trong hệ thống.' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status không hợp lệ trong hệ thống.' });
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

    const defaultPassword = createTemporaryPassword();
    const passwordExpiresAt = temporaryPasswordExpiry();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const result = await prisma.$transaction(async (prismaClient) => {
      const newUser = await prismaClient.users.create({
        data: {
          username: autoUsername,
          password: hashedPassword,
          role: role || 'employee',
          must_change_password: true,
          temp_password_expires_at: passwordExpiresAt,
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
          position: position || null, // Đã bổ sung lưu position chính xác vào bảng employees
          status: status || 'dang_lam_viec',
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
        default_password: defaultPassword,
        expires_at: passwordExpiresAt.toISOString(),
      }
    });

  } catch (error) {
    // Bắt lỗi trùng unique từ DB để trả về 409 Conflict chuẩn yêu cầu
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Tên đăng nhập hoặc dữ liệu độc nhất đã tồn tại trong hệ thống.' });
    }
    console.error('Error creating employee:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
  }
};

export const resetTemporaryPassword = async (req, res) => {
  const employeeId = parseId(req.params.id);
  if (!employeeId) {
    return res.status(400).json({ error: 'ID nhân viên phải là số nguyên dương hợp lệ.' });
  }

  try {
    const temporaryPassword = createTemporaryPassword();
    const passwordExpiresAt = temporaryPasswordExpiry();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employees.findUnique({
        where: { employee_id: employeeId },
        select: { user_id: true },
      });
      if (!employee) return { status: 404, error: 'Không tìm thấy nhân viên.' };

      const user = await tx.users.update({
        where: { user_id: employee.user_id },
        data: {
          password: hashedPassword,
          must_change_password: true,
          temp_password_expires_at: passwordExpiresAt,
          temp_password_used_at: null,
        },
        select: { username: true },
      });
      return { username: user.username };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({
      username: result.username,
      temporary_password: temporaryPassword,
      expires_at: passwordExpiresAt.toISOString(),
      must_change_password: true,
    });
  } catch (error) {
    console.error('Không thể cấp lại mật khẩu tạm:', error.code || error.name);
    return res.status(500).json({ error: 'Không cấp lại được mật khẩu tạm.' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = Number(id);
    const {
      fullname,
      email,
      phone_number,
      birthday,
      department_id,
      role,
      status,
      position
    } = req.body;

    // Validate Allowlist
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Role không hợp lệ.' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status không hợp lệ.' });
    }

    const employeeExist = await prisma.employees.findUnique({
      where: { employee_id: employeeId },
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
    if (position !== undefined) updateEmployeeData.position = position; // Đã bổ sung cập nhật position

    const updatedEmployee = await prisma.$transaction(async (prismaClient) => {
      const emp = await prismaClient.employees.update({
        where: { employee_id: employeeId },
        data: updateEmployeeData,
      });

      if (status === 'da_nghi_viec') {
        await prismaClient.departments.updateMany({
          where: { managment: String(employeeId) },
          data: { managment: null },
        });

        if (emp.user_id) {
          const userRecord = await prismaClient.users.findUnique({
            where: { user_id: emp.user_id },
          });

          if (userRecord && userRecord.role === 'manager') {
            await prismaClient.users.update({
              where: { user_id: emp.user_id },
              data: { role: 'employee' },
            });
          }
        }
      }

      if (role && emp.user_id) {
        await prismaClient.users.update({
          where: { user_id: emp.user_id },
          data: { role },
        });
      }

      return await prismaClient.employees.findUnique({
        where: { employee_id: employeeId },
        include: {
          users: { select: { username: true, role: true } },
          departments: { select: { department_name: true } }
        }
      });
    });

    return res.status(200).json(updatedEmployee);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Dữ liệu bị trùng lặpunique.' });
    }
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

    const dept = await prisma.departments.findUnique({
      where: { department_id: Number(new_department_id) }
    });
    if (!dept) {
      return res.status(404).json({ error: 'Phòng ban đích không tồn tại.' });
    }

    // Loại bỏ các ID trùng lặp trong request để xử lý sạch sẽ
    const uniqueEmpIds = [...new Set(employee_ids.map(id => Number(id)))];

    // Bọc trong transaction nguyên tử (Atomic Transaction) thay vì Promise.all ngoài transaction
    await prisma.$transaction(async (prismaClient) => {
      // 1. Kiểm tra xem tất cả các nhân viên có thực sự tồn tại trong DB không
      const existingEmployees = await prismaClient.employees.findMany({
        where: { employee_id: { in: uniqueEmpIds } },
        select: { employee_id: true }
      });

      const existingIds = existingEmployees.map(e => e.employee_id);
      const missingIds = uniqueEmpIds.filter(id => !existingIds.includes(id));

      // 2. Nếu có bất kỳ ID nào không tồn tại -> ném lỗi để rollback toàn bộ (All or Nothing)
      if (missingIds.length > 0) {
        throw new Error(`Chuyển phòng thất bại: Các nhân viên có ID [${missingIds.join(', ')}] không tồn tại trong hệ thống.`);
      }

      // 3. Thực hiện update hàng loạt an toàn
      await prismaClient.employees.updateMany({
        where: { employee_id: { in: uniqueEmpIds } },
        data: { department_id: Number(new_department_id) }
      });
    });

    return res.status(200).json({ message: 'Chuyển phòng ban cho nhân viên thành công!' });
  } catch (error) {
    console.error('Lỗi chuyển phòng ban nhân viên:', error);
    // Trả về 400 nếu vi phạm logic tồn tại ID hoặc lỗi nghiệp vụ, bảo vệ dữ liệu không bị cập nhật nửa vời
    return res.status(400).json({ error: error.message || 'Lỗi máy chủ nội bộ khi chuyển phòng.' });
  }
};
