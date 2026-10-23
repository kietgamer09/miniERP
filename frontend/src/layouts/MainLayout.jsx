/**
 * MainLayout – Khung giao diện chính: thanh trên + menu trái + vùng nội dung.
 *
 * Dùng Ant Design Layout. Menu lọc theo vai trò từ RoleContext.
 * Tách layout riêng vì mọi trang đều dùng chung khung này (qua Outlet).
 */
import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Layout, Menu, Select, Avatar, Dropdown, Button, Typography, Space,
} from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, RightOutlined,
} from '@ant-design/icons';
import { useRole, ROLES } from '../context/RoleContext';
import { filterMenuByRole, fullMenuItems, findOpenKeys } from '../config/menu';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// DEV: bộ chọn vai trò tạm – xóa khi có đăng nhập
const ROLE_OPTIONS = [
  { value: ROLES.EMPLOYEE, label: 'Nhân viên bình thường' },
  { value: ROLES.MANAGER, label: 'Quản lý dự án' },
  { value: ROLES.ADMIN, label: 'Admin/HR' },
];

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Lọc menu theo vai trò hiện tại
  const menuItems = filterMenuByRole(fullMenuItems, role);

  // Tìm submenu cần mở sẵn (giữ đúng khi F5)
  const openKeys = findOpenKeys(menuItems, location.pathname);

  // Menu thả xuống của avatar
  const avatarMenu = {
    items: [
      { key: 'password', label: 'Đổi mật khẩu', onClick: () => { /* TODO */ } },
      { key: 'logout', label: 'Đăng xuất', onClick: () => { /* TODO */ } },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ===== THANH TRÊN (bám sát phac_thao_menu.png) ===== */}
      <Header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 52,
          lineHeight: '52px',
        }}
      >
        {/* Bên trái: nút thu gọn + tên hệ thống */}
        <Space>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18 }}
          />
          <Text
            strong
            style={{ fontSize: 16, cursor: 'pointer', color: '#1f1f1f' }}
            onClick={() => navigate('/')}
          >
            Hệ thống miniERP
          </Text>
        </Space>

        {/* Bên phải: bộ chọn vai trò + avatar */}
        <Space size="middle">
          {/* DEV: xóa khi có đăng nhập */}
          <Select
            value={role}
            onChange={setRole}
            options={ROLE_OPTIONS}
            style={{ width: 190 }}
            size="small"
          />

          <Dropdown menu={avatarMenu} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                shape="square"
                icon={<UserOutlined />}
                style={{ backgroundColor: '#d9d9d9', color: '#595959', borderRadius: 4 }}
              />
              <Text style={{ color: '#262626' }}>Tên người dùng</Text>
              <RightOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Layout>
        {/* ===== MENU TRÁI ===== */}
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={240}
          style={{ background: '#fff' }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            defaultOpenKeys={openKeys}
            items={menuItems}
            onClick={({ key }) => {
              // Chỉ điều hướng nếu key là đường dẫn (bắt đầu bằng '/')
              if (key.startsWith('/')) navigate(key);
            }}
            style={{ borderRight: 0, paddingTop: 8 }}
          />
        </Sider>

        {/* ===== VÙNG NỘI DUNG ===== */}
        <Content style={{ padding: 16, background: '#f5f5f5', overflow: 'auto' }}>
          {/* Outlet render trang con theo Route */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
