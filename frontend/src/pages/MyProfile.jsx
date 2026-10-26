import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, Descriptions, Space, Spin, Tag, Typography } from 'antd';
import { ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { getMyProfile } from '../services/employeeApi';

const roleLabels = { employee: 'Nhân viên', manager: 'Quản lý', admin: 'Quản trị viên' };
const statusLabels = { dang_lam_viec: 'Đang làm việc', da_nghi_viec: 'Đã nghỉ việc' };

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('vi-VN').format(date);
}

function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadProfile() {
    setLoading(true);
    setError('');
    try {
      setProfile(await getMyProfile());
    } catch (loadError) {
      setError(loadError.message || 'Không tải được thông tin cá nhân.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((data) => { if (active) setProfile(data); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Không tải được thông tin cá nhân.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const fullName = profile?.fullname || 'Chưa cập nhật họ tên';
  const initials = profile?.fullname?.trim()?.split(/\s+/).slice(-2).map((part) => part[0]).join('').toLocaleUpperCase('vi') || '';
  const items = [
    { key: 'employee_id', label: 'Mã nhân viên', children: profile?.employee_id ?? '—' },
    { key: 'username', label: 'Tên đăng nhập', children: profile?.users?.username || '—' },
    { key: 'role', label: 'Vai trò', children: roleLabels[profile?.users?.role] || profile?.users?.role || '—' },
    { key: 'department', label: 'Phòng ban', children: profile?.departments?.department_name || '—' },
    { key: 'position', label: 'Chức vụ', children: profile?.position || '—' },
    { key: 'email', label: 'Email', children: profile?.email || '—' },
    { key: 'phone', label: 'Số điện thoại', children: profile?.phone_number || '—' },
    { key: 'birthday', label: 'Ngày sinh', children: formatDate(profile?.birthday) },
    { key: 'start_date', label: 'Ngày bắt đầu làm việc', children: formatDate(profile?.start_date) },
    { key: 'status', label: 'Trạng thái', children: profile?.status
      ? <Tag color={profile.status === 'dang_lam_viec' ? 'green' : 'default'}>{statusLabels[profile.status] || profile.status}</Tag>
      : '—' },
  ];

  return (
    <Space direction="vertical" size={20} style={{ display: 'flex' }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Thông tin cá nhân</Typography.Title>
          <Typography.Text type="secondary">Hồ sơ của tài khoản đang đăng nhập</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadProfile} loading={loading}>Tải lại</Button>
      </Space>

      {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={loadProfile}>Thử lại</Button>} />}

      <Spin spinning={loading}>
        {profile && <Card>
          <Space align="center" size={16} style={{ marginBottom: 24 }}>
            <Avatar size={64} style={{ backgroundColor: '#1677ff', flexShrink: 0 }} icon={initials ? undefined : <UserOutlined />}>
              {initials}
            </Avatar>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{fullName}</Typography.Title>
              <Typography.Text type="secondary">{profile.users?.username || '—'}</Typography.Text>
            </div>
          </Space>
          <Descriptions bordered column={{ xs: 1, sm: 2, lg: 2 }} items={items} />
        </Card>}
      </Spin>
    </Space>
  );
}

export default MyProfile;
