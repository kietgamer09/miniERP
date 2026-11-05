import prisma from '../config/prisma.js';

const checkEmployeeActive = async (userId) => {
  if (!userId) return true;
  const employee = await prisma.employees.findFirst({
    where: { user_id: Number(userId) }
  });
  return !(employee && employee.status === 'da_nghi_viec');
};

export const listDepartments = async (req, res) => {
  try {
    if (req.user?.user_id) {
      const isActive = await checkEmployeeActive(req.user.user_id);
      if (!isActive) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã ở trạng thái đã nghỉ việc, không thể thực hiện thao tác.' });
      }
    }

    const departments = await prisma.departments.findMany({
      include: {
        employees: {
          select: { employee_id: true, fullname: true, position: true, status: true }
        }
      },
      orderBy: { department_id: 'asc' }
    });
    return res.status(200).json(departments);
  } catch (error) {
    console.error('Lỗi lấy danh sách phòng ban:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi lấy phòng ban.' });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    if (req.user?.user_id) {
      const isActive = await checkEmployeeActive(req.user.user_id);
      if (!isActive) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã ở trạng thái đã nghỉ việc, không thể thực hiện thao tác.' });
      }
    }

    const { id } = req.params;
    const departmentId = Number(id);
    if (!Number.isSafeInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({ error: 'Mã phòng ban không hợp lệ.' });
    }

    const body = req.body ?? {};
    const hasManagementField = Object.prototype.hasOwnProperty.call(body, 'manager_id');
    const { department_name, category, manager_id } = body;

    const result = await prisma.$transaction(async (tx) => {
      const existingDept = await tx.departments.findUnique({
        where: { department_id: departmentId }
      });
      if (!existingDept) return { status: 404, error: 'Không tìm thấy phòng ban.' };

      const oldManagerId = existingDept.manager_id ? Number(existingDept.manager_id) : null;
      const newManagerId = hasManagementField && manager_id !== '' && manager_id !== null && manager_id !== undefined
        ? Number(manager_id)
        : hasManagementField ? null : oldManagerId;

      if (newManagerId !== null && (!Number.isSafeInteger(newManagerId) || newManagerId <= 0)) {
        return { status: 400, error: 'Mã quản lý phòng ban không hợp lệ.' };
      }

      if (hasManagementField && newManagerId !== oldManagerId) {
        if (newManagerId !== null) {
          const employee = await tx.employees.findUnique({
            where: { employee_id: newManagerId }
          });
          if (!employee) return { status: 400, error: 'Manager ID không tồn tại trong hệ thống.' };
          if (employee.status === 'da_nghi_viec') {
            return { status: 400, error: 'Không thể chỉ định nhân viên đã nghỉ việc làm quản lý phòng ban.' };
          }

          const user = await tx.users.findUnique({ where: { user_id: employee.user_id } });
          if (user?.role === 'employee') {
            await tx.users.update({ where: { user_id: employee.user_id }, data: { role: 'manager' } });
          }
        }

        if (oldManagerId !== null) {
          const otherDeptAsManager = await tx.departments.findFirst({
            where: {
              manager_id: oldManagerId,
              department_id: { not: departmentId }
            }
          });
          if (!otherDeptAsManager) {
            const oldEmployee = await tx.employees.findUnique({ where: { employee_id: oldManagerId } });
            if (oldEmployee?.user_id) {
              const oldUser = await tx.users.findUnique({ where: { user_id: oldEmployee.user_id } });
              if (oldUser?.role === 'manager') {
                await tx.users.update({ where: { user_id: oldEmployee.user_id }, data: { role: 'employee' } });
              }
            }
          }
        }
      }

      const updatedDepartment = await tx.departments.update({
        where: { department_id: departmentId },
        data: {
          department_name: department_name !== undefined ? department_name : existingDept.department_name,
          category: category !== undefined ? category : existingDept.category,
          manager_id: hasManagementField ? newManagerId : existingDept.manager_id
        }
      });
      return { department: updatedDepartment };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({
      message: 'Cập nhật phòng ban thành công!',
      department: result.department
    });
  } catch (error) {
    console.error('Lỗi cập nhật phòng ban:', error);
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi cập nhật phòng ban.' });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    if (req.user?.user_id) {
      const isActive = await checkEmployeeActive(req.user.user_id);
      if (!isActive) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã ở trạng thái đã nghỉ việc, không thể thực hiện thao tác.' });
      }
    }

    const { id } = req.params;
    const departmentId = Number(id);

    const department = await prisma.departments.findUnique({
      where: { department_id: departmentId },
      include: {
        employees: true
      }
    });

    if (!department) {
      return res.status(404).json({ error: 'Không tìm thấy phòng ban cần xóa.' });
    }

    if (department.employees && department.employees.length > 0) {
      return res.status(400).json({
        error: `Không thể xóa phòng ban này vì vẫn còn ${department.employees.length} nhân viên trực thuộc. Vui lòng chuyển nhân viên sang phòng ban khác trước khi xóa.`
      });
    }

    await prisma.departments.delete({
      where: { department_id: departmentId }
    });

    return res.status(200).json({ message: 'Xóa phòng ban thành công!' });
  } catch (error) {
    console.error('Lỗi xóa phòng ban:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi xóa phòng ban.' });
  }
};

export const createDepartment = async (req, res) => {
  try {
    if (req.user?.user_id) {
      const isActive = await checkEmployeeActive(req.user.user_id);
      if (!isActive) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã ở trạng thái đã nghỉ việc, không thể thực hiện thao tác.' });
      }
    }

    const { department_id, department_name, category, manager_id } = req.body;

    if (!department_id || !department_name) {
      return res.status(400).json({ error: 'Mã phòng ban và Tên phòng ban là bắt buộc.' });
    }

    const deptIdNumber = Number(department_id);
    const newManagerId = manager_id !== '' && manager_id !== null && manager_id !== undefined ? Number(manager_id) : null;

    if (newManagerId !== null && (!Number.isSafeInteger(newManagerId) || newManagerId <= 0)) {
      return res.status(400).json({ error: 'Mã quản lý phòng ban không hợp lệ.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingDept = await tx.departments.findUnique({
        where: { department_id: deptIdNumber }
      });

      if (existingDept) {
        return { status: 400, error: `Mã phòng ban "${deptIdNumber}" đã tồn tại. Vui lòng chọn mã khác.` };
      }

      if (newManagerId !== null) {
        const employee = await tx.employees.findUnique({
          where: { employee_id: newManagerId }
        });

        if (!employee) {
          return { status: 400, error: `Không thể chỉ định quản lý: Nhân viên với ID [${newManagerId}] không tồn tại trong hệ thống.` };
        }
        if (employee.status === 'da_nghi_viec') {
          return { status: 400, error: 'Không thể chỉ định nhân viên đã nghỉ việc làm quản lý phòng ban.' };
        }

        if (employee.user_id) {
          const user = await tx.users.findUnique({ where: { user_id: employee.user_id } });
          if (user?.role === 'employee') {
            await tx.users.update({
              where: { user_id: employee.user_id },
              data: { role: 'manager' }
            });
          }
        }
      }

      const newDepartment = await tx.departments.create({
        data: {
          department_id: deptIdNumber,
          department_name,
          category: category || null,
          manager_id: newManagerId,
          created_at: new Date()
        }
      });

      return { department: newDepartment };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(201).json({
      message: 'Tạo phòng ban thành công!',
      department: result.department
    });
  } catch (error) {
    console.error('Lỗi tạo phòng ban:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi tạo phòng ban.' });
  }
};