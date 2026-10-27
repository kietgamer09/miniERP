import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Layout, Menu, Avatar, Dropdown, Button, Typography, Space, Grid, Drawer, Tooltip,
} from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, RightOutlined, MoonOutlined, SunOutlined,
} from '@ant-design/icons';
import { useAuth, useRole } from '../hooks/useAuth';
import { filterMenuByRole, fullMenuItems, findOpenKeys } from '../config/menu';
import HistoryNavigation from '../components/HistoryNavigation';
import { useTheme } from '../hooks/useTheme';
import { useMyWork } from '../hooks/useMyWork';
import NotificationInbox from '../components/NotificationInbox';
import ChangePasswordModal from '../components/ChangePasswordModal';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function MainLayout() {
  const [copyrightYear] = useState(() => new Date().getFullYear());
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
    <Layout className="app-shell" style={{ minHeight: '100vh' }}>
      <Header
        className="app-header"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 64px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 80,
          lineHeight: '80px',
        }}
      >
        <Space className="app-header-start" size={16}>
          <button type="button" className="app-brand" onClick={() => navigate('/')} aria-label="miniERP — Trang chủ">
            <span>mini</span><strong>ERP</strong>
          </button>
          <Button
            type="text"
            aria-label={isMobile ? 'Mở menu điều hướng' : 'Thu gọn menu điều hướng'}
            icon={isMobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => (isMobile ? setMobileMenuOpen(true) : setCollapsed(!collapsed))}
            style={{ fontSize: 18 }}
          />
          <HistoryNavigation />

        </Space>
        <Space size="middle" className="app-header-actions">
          <Tooltip title={mode === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}>
            <Button type="text" icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              aria-label={mode === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'} onClick={toggleTheme} />
          </Tooltip>
          <NotificationInbox />
          <Dropdown menu={avatarMenu} trigger={['click']}>
            <button type="button" className="account-trigger" aria-label="Tài khoản của tôi">
              <span className="header-user-info">
                <Text strong className="header-user-name">{profile?.fullname || user?.fullName || 'Người dùng'}</Text>
                <span className="header-user-role">{{ admin: 'Quản trị hệ thống', manager: 'Quản lý dự án', employee: 'Nhân viên' }[role]}</span>
              </span>
              <Avatar
                shape="circle"
                icon={<UserOutlined />}
                size={40}
                style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }}
              />
              <RightOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
            </button>
          </Dropdown>
        </Space>
      </Header>

      <Layout className="app-body">
        <Sider
          className="desktop-sider"
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={240}
          style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
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
        <Content className="app-content" style={{ background: 'var(--page-bg)', minWidth: 0 }}>
          <Outlet />
        </Content>
      </Layout>
      <footer className="app-footer">
        <div><span className="footer-brand">miniERP</span><span>Hệ thống quản trị doanh nghiệp</span></div>
        <small>© {copyrightYear} miniERP. Bảo lưu mọi quyền.</small>
      </footer>
      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
    </Layout>
  );
}

export default MainLayout;
