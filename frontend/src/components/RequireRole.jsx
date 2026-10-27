/**
 * Chặn trang theo vai trò để điều hướng giao diện nhất quán với menu.
 * Đây chỉ là lớp bảo vệ frontend; backend phải kiểm tra quyền ở từng API.
 */
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../hooks/useAuth';
import { getRolesForPath } from '../config/menu';

function RequireRole({ path, children }) {
  const { role } = useRole();
  const navigate = useNavigate();
  const allowedRoles = getRolesForPath(path);

  if (!allowedRoles.includes(role)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập trang này"
        extra={(
          <Button type="primary" onClick={() => navigate('/')}>
            Về trang chủ
          </Button>
        )}
      />
    );
  }

  return children;
}

export default RequireRole;
