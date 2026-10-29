import prisma from '../config/prisma.js';

// 1. Xem danh sách phòng ban (đã có)
export const listDepartments = async (req, res) => {
  try {
    const departments = await prisma.departments.findMany({
      include: {
        employees: {
          select: { employee_id: true, fullname: true, position: true }
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

// 2. Sửa phòng ban (Cập nhật tên, thông tin và quản lý phòng ban)
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, category, managment } = req.body; // managment ở đây là employee_id của quản lý mới

    const departmentId = Number(id);

    // Kiểm tra phòng ban tồn tại hay không
    const existingDept = await prisma.departments.findUnique({
      where: { department_id: departmentId }
    });

    if (!existingDept) {
      return res.status(404).json({ error: 'Không tìm thấy phòng ban.' });
    }

    // Chuẩn hóa giá trị managment (nếu rỗng hoặc null thì về null)
    const newManagerId = managment !== undefined && managment !== '' && managment !== null ? Number(managment) : null;
    const oldManagerId = existingDept.managment ? Number(existingDept.managment) : null;

    // Nếu có thay đổi quản lý mới
    if (newManagerId !== oldManagerId) {
      // 1. Nếu có quản lý mới, nâng quyền lên 'manager'
      if (newManagerId) {
        const employee = await prisma.employees.findUnique({
          where: { employee_id: newManagerId }
        });

        if (employee && employee.user_id) {
          await prisma.users.update({
            where: { user_id: employee.user_id },
            data: { role: 'manager' }
          });
        }
      }

      // 2. (Tùy chọn) Nếu quản lý cũ bị thay thế và không còn làm quản lý ở phòng nào khác, có thể hạ role về 'member'
      if (oldManagerId && oldManagerId !== newManagerId) {
        // Kiểm tra xem quản lý cũ có còn quản lý phòng nào khác không
        const otherDeptAsManager = await prisma.departments.findFirst({
          where: {
            managment: String(oldManagerId),
            department_id: { not: departmentId }
          }
        });

        // Nếu không còn quản lý phòng nào khác, hạ role về 'member'
        if (!otherDeptAsManager) {
          const oldEmployee = await prisma.employees.findUnique({
            where: { employee_id: oldManagerId }
          });
          if (oldEmployee && oldEmployee.user_id) {
            await prisma.users.update({
              where: { user_id: oldEmployee.user_id },
              data: { role: 'member' }
            });
          }
        }
      }
    }

    // Thực hiện cập nhật phòng ban
    const updatedDepartment = await prisma.departments.update({
      where: { department_id: departmentId },
      data: {
        department_name: department_name !== undefined ? department_name : existingDept.department_name,
        category: category !== undefined ? category : existingDept.category,
        managment: managment !== undefined ? (managment ? String(managment) : null) : existingDept.managment
      }
    });

    return res.status(200).json({
      message: 'Cập nhật phòng ban thành công!',
      department: updatedDepartment
    });
  } catch (error) {
    console.error('Lỗi cập nhật phòng ban:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi cập nhật phòng ban.' });
  }
};

// 3. Xóa phòng ban (Kiểm tra xem còn nhân viên hay không)
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = Number(id);

    // Kiểm tra phòng ban có tồn tại không
    const department = await prisma.departments.findUnique({
      where: { department_id: departmentId },
      include: {
        employees: true // Bao gồm danh sách nhân viên để kiểm tra số lượng
      }
    });

    if (!department) {
      return res.status(404).json({ error: 'Không tìm thấy phòng ban cần xóa.' });
    }

    // Kiểm tra điều kiện: Nếu phòng ban vẫn còn nhân viên thì không cho phép xóa
    if (department.employees && department.employees.length > 0) {
      return res.status(400).json({
        error: `Không thể xóa phòng ban này vì vẫn còn ${department.employees.length} nhân viên trực thuộc. Vui lòng chuyển nhân viên sang phòng ban khác trước khi xóa.`
      });
    }

    // Tiến hành xóa phòng ban nếu không còn nhân viên
    await prisma.departments.delete({
      where: { department_id: departmentId }
    });

    return res.status(200).json({ message: 'Xóa phòng ban thành công!' });
  } catch (error) {
    console.error('Lỗi xóa phòng ban:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi xóa phòng ban.' });
  }
};

// 4. Tạo phòng ban mới
export const createDepartment = async (req, res) => {
  try {
    const { department_id, department_name, category, managment } = req.body;

    if (!department_id || !department_name) {
      return res.status(400).json({ error: 'Mã phòng ban và Tên phòng ban là bắt buộc.' });
    }

    // Chuyển department_id sang kiểu số (vì trong Prisma schema khai báo là Int)
    const deptIdNumber = Number(department_id);

    // Kiểm tra xem mã phòng ban này đã tồn tại hay chưa
    const existingDept = await prisma.departments.findUnique({
      where: { department_id: deptIdNumber }
    });

    if (existingDept) {
      return res.status(400).json({ error: `Mã phòng ban "${deptIdNumber}" đã tồn tại. Vui lòng chọn mã khác.` });
    }

    // Nếu có chỉ định quản lý (managment là employee_id), tiến hành cập nhật role thành manager
    if (managment) {
      const newManagerId = Number(managment);
      const employee = await prisma.employees.findUnique({
        where: { employee_id: newManagerId }
      });

      if (employee && employee.user_id) {
        await prisma.users.update({
          where: { user_id: employee.user_id },
          data: { role: 'manager' }
        });
      }
    }

    // Tạo phòng ban mới trong database với mã phòng ban do người dùng nhập
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