/**
 * MainLayout – Khung giao diện chính: thanh trên + menu trái + vùng nội dung.
 *
 * Dùng Ant Design Layout. Menu lọc theo vai trò tài khoản đăng nhập.
 * Tách layout riêng vì mọi trang đều dùng chung khung này (qua Outlet).
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Layout, Menu, Avatar, Dropdown, Button, Typography, Space, Grid, Drawer,
} from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, RightOutlined,
} from '@ant-design/icons';
import { useAuth, useRole } from '../context/AuthContext';
import { filterMenuByRole, fullMenuItems, findOpenKeys } from '../config/menu';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { role } = useRole();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Lọc menu theo vai trò hiện tại
  const menuItems = filterMenuByRole(fullMenuItems, role);

  // Chỉ mở một dropdown; khi chuyển route thì mở dropdown chứa route đó.
  const [openKeys, setOpenKeys] = useState(() => findOpenKeys(menuItems, location.pathname).slice(-1));

  useEffect(() => {
    setOpenKeys(findOpenKeys(menuItems, location.pathname).slice(-1));
  }, [location.pathname]);

  function handleOpenChange(nextOpenKeys) {
    const newlyOpenedKey = nextOpenKeys.find((key) => !openKeys.includes(key));
    setOpenKeys(newlyOpenedKey ? [newlyOpenedKey] : nextOpenKeys);
  }

  // Menu thả xuống của avatar
  const avatarMenu = {
    items: [
      { key: 'password', label: 'Đổi mật khẩu', onClick: () => { /* TODO */ } },
      {
        key: 'logout',
        label: 'Đăng xuất',
        onClick: () => {
          logout();
          navigate('/login', { replace: true });
        },
      },
    ],
  };

  function handleMenuClick({ key }) {
    if (key.startsWith('/')) navigate(key);
    setMobileMenuOpen(false);
  }

  function renderMenu() {
    return (
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        openKeys={openKeys}
        items={menuItems}
        onClick={handleMenuClick}
        onOpenChange={handleOpenChange}
        style={{ borderRight: 0, paddingTop: 8 }}
      />
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ===== THANH TRÊN (bám sát phac_thao_menu.png) ===== */}
      <Header
        className="app-header"
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
            aria-label={isMobile ? 'Mở menu điều hướng' : 'Thu gọn menu điều hướng'}
            icon={isMobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => (isMobile ? setMobileMenuOpen(true) : setCollapsed(!collapsed))}
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

        {/* Bên phải: thông tin người dùng */}
        <Space size="middle" className="app-header-actions">
          <Dropdown menu={avatarMenu} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                shape="square"
                icon={<UserOutlined />}
                style={{ backgroundColor: '#d9d9d9', color: '#595959', borderRadius: 4 }}
              />
              <Text className="header-user-name" style={{ color: '#262626' }}>
                {user?.fullName || 'Người dùng'}
              </Text>
              <RightOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Layout>
        {/* ===== MENU TRÁI ===== */}
        <Sider
          className="desktop-sider"
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={240}
          style={{ background: '#fff' }}
        >
          {renderMenu()}
        </Sider>

        <Drawer
          className="mobile-navigation-drawer"
          title="Điều hướng"
          placement="left"
          width={260}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          styles={{ body: { padding: 0 } }}
        >
          {renderMenu()}
        </Drawer>

        {/* ===== VÙNG NỘI DUNG ===== */}
        <Content className="app-content" style={{ padding: 16, background: '#f5f5f5', overflow: 'auto', minWidth: 0 }}>
          {/* Outlet render trang con theo Route */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
