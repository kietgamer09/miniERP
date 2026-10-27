import prisma from '../src/config/prisma.js';
import { toDateOnly } from '../src/utils/validators.js';

class SeedError extends Error {}

const priorities = ['thap', 'trung_binh', 'cao'];
const statuses = ['can_lam', 'dang_lam', 'xong'];
const activeTaskPlan = [
  [-8, 'can_lam', 'thap'], [-3, 'dang_lam', 'cao'],
  [0, 'can_lam', 'trung_binh'], [3, 'dang_lam', 'thap'],
  [10, 'can_lam', 'cao'], [14, 'dang_lam', 'trung_binh'],
  [-4, 'xong', 'cao'], [1, 'xong', 'trung_binh'],
  [20, 'can_lam', 'thap'], [30, 'dang_lam', 'cao'],
  [40, 'xong', 'trung_binh'], [45, 'can_lam', 'thap'],
];
const maintenanceTitles = [
  'Kiểm tra cảm biến nhiệt', 'Kiểm tra bơm tuần hoàn dung dịch',
  'Lập danh sách vật tư bảo trì', 'Vệ sinh bể xử lý bề mặt',
  'Thay bộ lọc dung dịch mạ', 'Vẽ sơ đồ tủ điện dây chuyền',
  'Kiểm tra thiết bị bảo hộ', 'Đo độ dày lớp mạ thử nghiệm',
  'Hiệu chuẩn thiết bị đo nhiệt độ', 'Bảo dưỡng động cơ băng tải',
  'Nghiệm thu hệ thống thông gió', 'Tổng hợp báo cáo bảo trì',
];
const websiteTitles = [
  'Khảo sát nội dung website công ty', 'Thiết kế giao diện trang chủ',
  'Xây dựng trang giới thiệu công ty', 'Hoàn thiện danh mục sản phẩm',
  'Kiểm tra giao diện trên điện thoại', 'Bàn giao website cho bộ phận kinh doanh',
];
const trainingTitles = [
  'Rà soát quy trình an toàn lao động', 'Khảo sát nhu cầu đào tạo của các tổ',
  'Lập danh sách nhân viên tham gia', 'Chuẩn bị tài liệu sơ cứu',
  'Biên soạn hướng dẫn sử dụng hóa chất', 'Chuẩn bị bài thực hành phòng cháy',
  'Kiểm tra thiết bị trình chiếu', 'Xác nhận lịch với giảng viên',
  'Tổ chức buổi đào tạo tại xưởng', 'Chấm bài kiểm tra kiến thức',
  'Thu thập ý kiến sau đào tạo', 'Tổng hợp báo cáo kết quả đào tạo',
];

function getTodayDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function relativeDate(today, offset) {
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

function startOfLocalDate(date) {
  const [year, month, day] = toDateOnly(date).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateInVietnam(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daysSinceMonday(dateOnly) {
  const weekday = new Date(`${dateOnly}T00:00:00.000Z`).getUTCDay();
  return (weekday + 6) % 7;
}

function buildProjects(employees, today) {
  const manager = employees.find((employee) => employee.users.role === 'manager');
  if (employees.length < 8 || !manager) {
    throw new SeedError('Cần ít nhất 8 nhân viên đang làm việc và một tài khoản manager. Hãy chạy dữ liệu mẫu nhân sự trước.');
  }
  // Chọn theo ID đã sắp tăng dần; quản lý MAU-02 ưu tiên một manager khác.
  const otherManager = employees.find((employee) => employee.employee_id !== manager.employee_id && employee.users.role === 'manager')
    || employees.find((employee) => employee.employee_id !== manager.employee_id);
  const selected = [manager, otherManager, ...employees.filter((employee) =>
    employee.employee_id !== manager.employee_id && employee.employee_id !== otherManager.employee_id)].slice(0, 8);
  const definitions = [
    { code: 'MAU-01', name: 'Bảo trì dây chuyền mạ kẽm', manager,
      members: selected, titles: maintenanceTitles, completed: false },
    { code: 'MAU-02', name: 'Làm website công ty', manager: otherManager,
      members: [otherManager, ...selected.filter((employee) => employee.employee_id !== otherManager.employee_id).slice(0, 5)],
      titles: websiteTitles, completed: true },
    { code: 'MAU-03', name: 'Đào tạo an toàn lao động', manager,
      members: [manager, ...selected.slice(2, 7)], titles: trainingTitles, completed: false },
  ];
  let activeCompletedIndex = 0;
  return definitions.map((definition) => {
    const managerId = definition.manager.employee_id;
    return {
      data: {
        code: definition.code, name: definition.name, description: 'Dữ liệu mẫu phần Công việc',
        manager_id: managerId, start_date: relativeDate(today, -25),
        end_date: relativeDate(today, definition.completed ? -2 : 45),
        status: definition.completed ? 'hoan_thanh' : 'dang_thuc_hien',
      },
      members: definition.members.map((employee) => employee.employee_id),
      tasks: definition.titles.map((title, index) => {
        const [offset, status, priority] = definition.completed
          ? [[-20, -17, -14, -10, -6, -2][index], 'xong', priorities[index % priorities.length]]
          : activeTaskPlan[index];
        let completedAt = null;
        if (status === 'xong') {
          let completedOffset;
          if (definition.completed) {
            completedOffset = [-3, -4, -5, -6, -8, -10][index];
          } else {
            const sequence = activeCompletedIndex++;
            if (sequence < 3) {
              const sinceMonday = daysSinceMonday(today);
              completedOffset = -sinceMonday + Math.min(sequence, sinceMonday);
            } else {
              completedOffset = [-8, -11, -14][sequence - 3];
            }
          }
          completedAt = startOfLocalDate(relativeDate(today, completedOffset));
        }
        return {
          title, description: 'Công việc phục vụ buổi demo',
          assignee_id: definition.members[index % definition.members.length].employee_id,
          created_by: managerId, due_date: relativeDate(today, offset), priority, status, completed_at: completedAt,
        };
      }),
    };
  });
}

function summarize(project, today) {
  const counts = { can_lam: 0, dang_lam: 0, xong: 0, overdue: 0, near_due: 0 };
  const nearDueEnd = toDateOnly(relativeDate(today, 3));
  for (const task of project.tasks) {
    counts[task.status]++;
    if (task.status === 'xong') continue;
    const dueDate = toDateOnly(task.due_date);
    if (dueDate < today) counts.overdue++;
    else if (dueDate <= nearDueEnd) counts.near_due++;
  }
  return { code: project.data.code, members: project.members.length, tasks: project.tasks.length, ...counts };
}

function validateProjects(projects, employees, today) {
  const requireValid = (condition, message) => {
    if (!condition) throw new SeedError(`Dữ liệu mẫu không hợp lệ: ${message}`);
  };
  const activeIds = new Set(employees.filter((employee) => employee.status === 'dang_lam_viec').map((employee) => employee.employee_id));
  requireValid(projects.length === 3 && projects.map((project) => project.data.code).join(',') === 'MAU-01,MAU-02,MAU-03', 'phải có đúng ba mã dự án');
  for (const project of projects) {
    const { data, members, tasks } = project;
    const completed = data.code === 'MAU-02';
    requireValid(data.status === (completed ? 'hoan_thanh' : 'dang_thuc_hien'), `${data.code}: sai trạng thái dự án`);
    requireValid(tasks.length === (completed ? 6 : 12), `${data.code}: sai số task`);
    requireValid(new Set(members).size === members.length && members.every((id) => activeIds.has(id)), `${data.code}: thành viên trùng hoặc đã nghỉ việc`);
    requireValid(members.length >= (data.code === 'MAU-01' ? 6 : 5) && members.length <= (data.code === 'MAU-01' ? 8 : 6), `${data.code}: sai số thành viên`);
    requireValid(members.includes(data.manager_id), `${data.code}: quản lý phải là thành viên`);
    requireValid(toDateOnly(data.start_date) === toDateOnly(relativeDate(today, -25))
      && toDateOnly(data.end_date) === toDateOnly(relativeDate(today, completed ? -2 : 45)), `${data.code}: sai ngày dự án`);
    for (const task of tasks) {
      requireValid(members.includes(task.assignee_id) && activeIds.has(task.assignee_id), `${data.code}: người làm không thuộc dự án hoặc đã nghỉ việc`);
      requireValid(task.created_by === data.manager_id, `${data.code}: sai người tạo task`);
      requireValid(toDateOnly(task.due_date) <= toDateOnly(data.end_date), `${data.code}: hạn chót vượt ngày kết thúc`);
      requireValid(statuses.includes(task.status) && priorities.includes(task.priority), `${data.code}: sai trạng thái hoặc ưu tiên`);
      requireValid(task.title.trim().length > 0 && task.title.length <= 200, `${data.code}: tiêu đề không hợp lệ`);
      if (task.status === 'xong') {
        requireValid(task.completed_at instanceof Date && !Number.isNaN(task.completed_at.getTime()), `${data.code}: task xong thiếu completed_at`);
        const completedDate = dateInVietnam(task.completed_at);
        if (completed) {
          const age = Math.round((new Date(`${today}T00:00:00.000Z`) - new Date(`${completedDate}T00:00:00.000Z`)) / 86400000);
          requireValid(age >= 3 && age <= 10 && completedDate <= toDateOnly(data.end_date), `${data.code}: completed_at phải cách 3–10 ngày và không sau ngày kết thúc`);
        } else {
          const age = Math.round((new Date(`${today}T00:00:00.000Z`) - new Date(`${completedDate}T00:00:00.000Z`)) / 86400000);
          const monday = toDateOnly(relativeDate(today, -daysSinceMonday(today)));
          requireValid((completedDate >= monday && completedDate <= today) || (age >= 8 && age <= 14), `${data.code}: completed_at phải trong tuần này hoặc cách 8–14 ngày`);
        }
      } else requireValid(task.completed_at === null, `${data.code}: task chưa xong phải có completed_at = null`);
      if (completed) requireValid(task.status === 'xong', `${data.code}: còn task chưa xong`);
    }
    if (!completed) requireValid(statuses.every((status) => tasks.some((task) => task.status === status)), `${data.code}: thiếu trạng thái task`);
  }
  requireValid(projects[0].data.manager_id === projects[2].data.manager_id
    && projects[0].data.manager_id !== projects[1].data.manager_id, 'phân công quản lý không đúng yêu cầu');
  const firstManager = employees.find((employee) => employee.employee_id === projects[0].data.manager_id);
  requireValid(firstManager?.users.role === 'manager', 'MAU-01 phải do tài khoản manager quản lý');
  const summaries = projects.map((project) => summarize(project, today));
  requireValid(summaries.reduce((total, summary) => total + summary.tasks, 0) === 30, 'tổng task phải bằng 30');
  const activeProjects = projects.filter((project) => project.data.status === 'dang_thuc_hien');
  const activeSummaries = activeProjects.map((project) => summarize(project, today));
  requireValid(activeSummaries.reduce((total, summary) => total + summary.overdue, 0) >= 4, 'cần ít nhất 4 task quá hạn chưa xong');
  requireValid(activeSummaries.reduce((total, summary) => total + summary.near_due, 0) >= 4, 'cần ít nhất 4 task sắp hạn chưa xong');
  const activeTasks = activeProjects.flatMap((project) => project.tasks);
  requireValid(priorities.every((priority) => activeTasks.some((task) => task.priority === priority)), 'thiếu mức ưu tiên');
  requireValid(activeTasks.some((task) => task.status === 'xong' && toDateOnly(task.due_date) < today), 'thiếu task xong có hạn đã qua');
  requireValid(activeTasks.some((task) => task.status !== 'xong' && toDateOnly(task.due_date) > toDateOnly(relativeDate(today, 3))), 'thiếu task còn hạn xa');
  const activeDoneTasks = activeTasks.filter((task) => task.status === 'xong');
  const monday = toDateOnly(relativeDate(today, -daysSinceMonday(today)));
  const completedThisWeek = activeDoneTasks.filter((task) => {
    const date = dateInVietnam(task.completed_at);
    return date >= monday && date <= today;
  }).length;
  requireValid(completedThisWeek === Math.ceil(activeDoneTasks.length / 2), 'khoảng một nửa task xong của dự án đang thực hiện phải hoàn thành trong tuần này');
  return summaries;
}

async function seed() {
  if (process.env.NODE_ENV === 'production') throw new SeedError('Từ chối tạo dữ liệu mẫu khi NODE_ENV=production.');
  const today = getTodayDate();
  const summaries = await prisma.$transaction(async (tx) => {
    const employees = await tx.employees.findMany({
      where: { status: 'dang_lam_viec' },
      select: { employee_id: true, status: true, users: { select: { role: true } } },
      orderBy: { employee_id: 'asc' },
    });
    const projects = buildProjects(employees, today);
    // Kiểm tra toàn bộ dữ liệu trước khi xóa bản mẫu cũ.
    const result = validateProjects(projects, employees, today);
    const oldProjects = await tx.projects.findMany({ where: { code: { startsWith: 'MAU-' } }, select: { id: true } });
    const oldIds = oldProjects.map((project) => project.id);
    if (oldIds.length) {
      await tx.task_comments.deleteMany({ where: { tasks: { project_id: { in: oldIds } } } });
      await tx.tasks.deleteMany({ where: { project_id: { in: oldIds } } });
      await tx.project_members.deleteMany({ where: { project_id: { in: oldIds } } });
      await tx.projects.deleteMany({ where: { id: { in: oldIds } } });
    }
    for (const project of projects) {
      const created = await tx.projects.create({ data: project.data });
      const memberResult = await tx.project_members.createMany({ data: project.members.map((employeeId) => ({ project_id: created.id, employee_id: employeeId })) });
      const taskResult = await tx.tasks.createMany({ data: project.tasks.map((task) => ({ ...task, project_id: created.id })) });
      if (memberResult.count !== project.members.length || taskResult.count !== project.tasks.length) {
        throw new SeedError(`Không ghi đủ thành viên hoặc task của ${project.data.code}.`);
      }
    }
    return result;
  }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 30000 });

  console.log(`Dữ liệu mẫu phần Công việc — ngày ${today} (Asia/Ho_Chi_Minh)`);
  console.table(summaries.map((summary) => ({
    'Dự án': summary.code, 'Thành viên': summary.members, 'Cần làm': summary.can_lam,
    'Đang làm': summary.dang_lam, 'Xong': summary.xong, 'Tổng task': summary.tasks,
    'Quá hạn': summary.overdue, 'Sắp hạn': summary.near_due,
  })));
  const total = (field) => summaries.reduce((sum, summary) => sum + summary[field], 0);
  console.log(`Tổng: ${total('tasks')} task; ${total('overdue')} quá hạn; ${total('near_due')} sắp hạn (không tính task xong).`);
  const monday = toDateOnly(relativeDate(today, -daysSinceMonday(today)));
  const completedThisWeek = await prisma.tasks.count({
    where: {
      status: 'xong',
      completed_at: { gte: startOfLocalDate(new Date(`${monday}T00:00:00.000Z`)), lte: new Date() },
      projects: { code: { startsWith: 'MAU-' } },
    },
  });
  console.log(`Task xong trong tuần này: ${completedThisWeek}.`);
  console.log('Đã tạo dữ liệu mẫu, chạy lại an toàn. Chỉ thay thế các dự án có mã bắt đầu bằng MAU- và dữ liệu phụ thuộc.');
}

let exitCode = 0;
try {
  await seed();
} catch (error) {
  exitCode = 1;
  if (error instanceof SeedError) console.error(error.message);
  else console.error('Tạo dữ liệu mẫu thất bại; toàn bộ giao dịch đã được hủy:', error);
} finally {
  try {
    await prisma.$disconnect();
  } catch (error) {
    exitCode = 1;
    console.error('Không thể đóng kết nối Prisma:', error);
  }
  // Pool pg dùng chung có thể còn kết nối nhàn rỗi sau khi Prisma đóng.
  process.exit(exitCode);
}
