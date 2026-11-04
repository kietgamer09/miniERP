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

    const existingDept = await prisma.departments.findUnique({
      where: { department_id: departmentId }
    });

    if (!existingDept) {
      return res.status(404).json({ error: 'Không tìm thấy phòng ban.' });
    }

    const hasManagementField = req.body.hasOwnProperty('managment');
    const { department_name, category, managment } = req.body;

    const updatedDepartment = await prisma.$transaction(async (tx) => {
      let newManagerId = existingDept.managment ? Number(existingDept.managment) : null;

      if (hasManagementField) {
        newManagerId = managment !== undefined && managment !== '' && managment !== null ? Number(managment) : null;
        const oldManagerId = existingDept.managment ? Number(existingDept.managment) : null;

        if (newManagerId !== oldManagerId) {
          if (newManagerId !== null) {
            const employee = await tx.employees.findUnique({
              where: { employee_id: newManagerId }
            });

            if (!employee) {
              throw { status: 400, message: 'Manager ID không tồn tại trong hệ thống.' };
            }
            if (employee.status === 'da_nghi_viec') {
              throw { status: 400, message: 'Không thể chỉ định nhân viên đã nghỉ việc làm quản lý phòng ban.' };
            }

            if (employee.user_id) {
              const userRecord = await tx.users.findUnique({
                where: { user_id: employee.user_id }
              });

              if (userRecord && userRecord.role === 'employee') {
                await tx.users.update({
                  where: { user_id: employee.user_id },
                  data: { role: 'manager' }
                });
              }
            }
          }

          if (oldManagerId && oldManagerId !== newManagerId) {
            const otherDeptAsManager = await tx.departments.findFirst({
              where: {
                managment: String(oldManagerId),
                department_id: { not: departmentId }
              }
            });

            if (!otherDeptAsManager) {
              const oldEmployee = await tx.employees.findUnique({
                where: { employee_id: oldManagerId }
              });

              if (oldEmployee && oldEmployee.user_id) {
                const oldUserRecord = await tx.users.findUnique({
                  where: { user_id: oldEmployee.user_id }
                });

                if (oldUserRecord && oldUserRecord.role === 'manager') {
                  await tx.users.update({
                    where: { user_id: oldEmployee.user_id },
                    data: { role: 'employee' }
                  });
                }
              }
            }
          }
        }
      }

      return await tx.departments.update({
        where: { department_id: departmentId },
        data: {
          department_name: department_name !== undefined ? department_name : existingDept.department_name,
          category: category !== undefined ? category : existingDept.category,
          managment: hasManagementField
            ? (managment ? String(managment) : null)
            : existingDept.managment
        }
      });
    });

    return res.status(200).json({
      message: 'Cập nhật phòng ban thành công!',
      department: updatedDepartment
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

    const { department_id, department_name, category, managment } = req.body;

    if (!department_id || !department_name) {
      return res.status(400).json({ error: 'Mã phòng ban và Tên phòng ban là bắt buộc.' });
    }

    const deptIdNumber = Number(department_id);

    const existingDept = await prisma.departments.findUnique({
      where: { department_id: deptIdNumber }
    });

    if (existingDept) {
      return res.status(400).json({ error: `Mã phòng ban "${deptIdNumber}" đã tồn tại. Vui lòng chọn mã khác.` });
    }

    if (managment) {
      const newManagerId = Number(managment);
      const employee = await prisma.employees.findUnique({
        where: { employee_id: newManagerId }
      });

      if (employee && employee.status === 'da_nghi_viec') {
        return res.status(400).json({ error: 'Không thể chỉ định nhân viên đã nghỉ việc làm quản lý phòng ban.' });
      }

      if (employee && employee.user_id) {
        await prisma.users.update({
          where: { user_id: employee.user_id },
          data: { role: 'manager' }
        });
      }
    }

    const newDepartment = await prisma.departments.create({
      data: {
        department_id: deptIdNumber,
        department_name,
        category: category || null,
        managment: managment ? String(managment) : null,
        created_at: new Date()
      }
    });

    return res.status(201).json({
      message: 'Tạo phòng ban thành công!',
      department: newDepartment
    });
  } catch (error) {
    console.error('Lỗi tạo phòng ban:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi tạo phòng ban.' });
  }
};