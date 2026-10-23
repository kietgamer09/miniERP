/**
 * config/menu.jsx – Cây menu dùng cho Ant Design Menu (thuộc tính items).
 * Mỗi mục có trường `roles`: mảng vai trò được phép thấy.
 * Ẩn menu chỉ là lớp giao diện (backend vẫn phải chặn quyền).
 */
import {
  UserOutlined, DollarOutlined, CalendarOutlined, ProjectOutlined,
  CheckSquareOutlined, FileTextOutlined, AuditOutlined, TeamOutlined,
  BankOutlined, FieldTimeOutlined,
} from '@ant-design/icons';

const ALL = ['employee', 'manager', 'admin'];
const MGR_ADMIN = ['manager', 'admin'];
const ADMIN_ONLY = ['admin'];

/** Cây menu đầy đủ – 2 nhóm: "Nhân viên" và "Công việc" */
const fullMenuItems = [
  {
    type: 'group', label: 'Nhân viên', key: 'grp-nhanvien', roles: ALL,
    children: [
      { key: '/thong-tin', label: 'Thông tin', icon: <UserOutlined />, roles: ALL },
      { key: '/lam-them', label: 'Làm thêm', icon: <FieldTimeOutlined />, roles: ALL },
      { key: '/tien-luong', label: 'Tiền lương', icon: <DollarOutlined />, roles: ALL },
      {
        key: 'sub-chamcong', label: 'Chấm công', icon: <CalendarOutlined />, roles: ALL,
        children: [
          { key: '/cham-cong/bang-cong', label: 'Bảng công', roles: ALL },
          { key: '/cham-cong/nghi-phep', label: 'Nghỉ phép', roles: ALL },
        ],
      },
    ],
  },
  {
    type: 'group', label: 'Công việc', key: 'grp-congviec', roles: ALL,
    children: [
      {
        key: 'sub-duan', label: 'Dự án', icon: <ProjectOutlined />, roles: ALL,
        children: [
          { key: '/du-an/cua-toi', label: 'Dự án của tôi', roles: ALL },
          { key: '/du-an/tien-do', label: 'Tiến độ', roles: ALL },
        ],
      },
      {
        key: 'sub-vieccuatoi', label: 'Việc của tôi', icon: <CheckSquareOutlined />, roles: ALL,
        children: [
          { key: '/viec-cua-toi/duoc-giao', label: 'Việc được giao', roles: ALL },
          { key: '/viec-cua-toi/giao-viec', label: 'Giao việc', roles: MGR_ADMIN },
          { key: '/viec-cua-toi/viec-khac', label: 'Việc khác (cùng dự án)', roles: ALL },
        ],
      },
      { key: '/tai-lieu', label: 'Tài liệu', icon: <FileTextOutlined />, roles: ALL },
      { key: '/phe-duyet', label: 'Phê duyệt', icon: <AuditOutlined />, roles: MGR_ADMIN },
      { key: '/quan-ly-nhan-vien', label: 'Quản lý nhân viên', icon: <TeamOutlined />, roles: ADMIN_ONLY },
      { key: '/quan-ly-phong-ban', label: 'Quản lý phòng ban', icon: <BankOutlined />, roles: ADMIN_ONLY },
    ],
  },
];

/** Lọc menu theo vai trò (đệ quy). Ẩn mục cha nếu con rỗng sau khi lọc */
function filterMenuByRole(items, role) {
  return items
    .filter((item) => item.roles?.includes(role))
    .map((item) => {
      if (!item.children) return item;
      const filteredChildren = filterMenuByRole(item.children, role);
      if (filteredChildren.length === 0) return null;
      return { ...item, children: filteredChildren };
    })
    .filter(Boolean);
}

/** Lấy danh sách tất cả key là đường dẫn (bắt đầu bằng '/') */
function getAllPaths(items) {
  const paths = [];
  for (const item of items) {
    if (item.key?.startsWith('/')) paths.push(item.key);
    if (item.children) paths.push(...getAllPaths(item.children));
  }
  return paths;
}

/** Tìm key của submenu cha chứa đường dẫn hiện tại để mở sẵn (F5) */
function findOpenKeys(items, pathname) {
  for (const item of items) {
    if (item.children) {
      for (const child of item.children) {
        if (child.key === pathname) return [item.key];
        if (child.children) {
          const found = findOpenKeys([child], pathname);
          if (found.length) return [item.key, ...found];
        }
      }
    }
  }
  return [];
}

export { fullMenuItems, filterMenuByRole, getAllPaths, findOpenKeys };
