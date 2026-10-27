/**
 * MainLayout – Khung giao diện chính: thanh trên + menu trái + vùng nội dung.
 *
 * Dùng Ant Design Layout. Menu lọc theo vai trò tài khoản đăng nhập.
 * Tách layout riêng vì mọi trang đều dùng chung khung này (qua Outlet).
 */
import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Layout, Menu, Avatar, Dropdown, Button, Typography, Space, Grid, Drawer, Tooltip,
} from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, RightOutlined, MoonOutlined, SunOutlined,
} from '@ant-design/icons';
import { useAuth, useRole } from '../context/AuthContext';
import { filterMenuByRole, fullMenuItems, findOpenKeys } from '../config/menu';
import { useTheme } from '../hooks/useTheme';
import { useMyWork } from '../hooks/useMyWork';
import NotificationInbox from '../components/NotificationInbox';
import ChangePasswordModal from '../components/ChangePasswordModal';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { mode, toggleTheme } = useTheme();
  const { profile } = useMyWork();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { role } = useRole();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuPath = /^\/du-an\/\d+$/.test(location.pathname) ? '/du-an/cua-toi' : location.pathname;

  // Lọc menu theo vai trò hiện tại
  const menuItems = filterMenuByRole(fullMenuItems, role).map((group) => ({
    ...group,
    children: group.children?.map((item) => item.children ? {
      ...item,
      onTitleClick: ({ key }) => {
        if (key === '/du-an' || key === '/viec-cua-toi') {
          navigate(key);
          setMobileMenuOpen(false);
        }
      },
    } : item),
  }));

  // Chỉ mở một dropdown; khi chuyển route thì mở dropdown chứa route đó.
  const [menuState, setMenuState] = useState(() => ({
    path: menuPath, keys: findOpenKeys(menuItems, menuPath).slice(-1),
  }));
  const openKeys = menuState.path === menuPath
    ? menuState.keys : findOpenKeys(menuItems, menuPath).slice(-1);

  function handleOpenChange(nextOpenKeys) {
    const newlyOpenedKey = nextOpenKeys.find((key) => !openKeys.includes(key));
    setMenuState({ path: menuPath, keys: newlyOpenedKey ? [newlyOpenedKey] : nextOpenKeys });
  }

  // Menu thả xuống của avatar
  const avatarMenu = {
    items: [
      { key: 'password', label: 'Đổi mật khẩu', onClick: () => setPasswordOpen(true) },
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
        selectedKeys={[menuPath]}
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
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
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
            style={{ fontSize: 16, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            Hệ thống miniERP
          </Text>
        </Space>

        {/* Bên phải: thông tin người dùng */}
        <Space size="middle" className="app-header-actions">
          <Tooltip title={mode === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}>
            <Button type="text" icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              aria-label={mode === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'} onClick={toggleTheme} />
          </Tooltip>
          <NotificationInbox />
          <Dropdown menu={avatarMenu} trigger={['click']}>
            <button type="button" className="account-trigger" aria-label="Tài khoản của tôi">
              <Avatar
                shape="square"
                icon={<UserOutlined />}
                style={{ backgroundColor: '#d9d9d9', color: '#595959', borderRadius: 4 }}
              />
              <Text className="header-user-name">
                {profile?.fullname || user?.fullName || 'Người dùng'}
              </Text>
              <RightOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
            </button>
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
          style={{ background: 'var(--surface)' }}
        >
          {renderMenu()}
        </Sider>

        <Drawer
          className="mobile-navigation-drawer"
          title="Điều hướng"
          placement="left"
          size={260}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          styles={{ body: { padding: 0 } }}
        >
          {renderMenu()}
        </Drawer>

        {/* ===== VÙNG NỘI DUNG ===== */}
        <Content className="app-content" style={{ padding: 16, background: 'var(--page-bg)', overflow: 'auto', minWidth: 0 }}>
          {/* Outlet render trang con theo Route */}
          <Outlet />
        </Content>
      </Layout>
      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
    </Layout>
  );
}

export default MainLayout;
