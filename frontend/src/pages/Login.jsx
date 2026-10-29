import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

function Login() {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(values) {
    setLoading(true);
    setLoginError('');
    try {
      await login(values.username.trim(), values.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (error) {
      setLoginError(error.status === 401
        ? 'Tài khoản hoặc mật khẩu không đúng'
        : error.status
          ? error.message || 'Máy chủ không thể xử lý yêu cầu. Vui lòng thử lại.'
          : 'Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-brand" aria-label="miniERP">
        <span>mini</span><strong>ERP</strong>
      </div>

      <Card className="login-card">
        <Title level={4} className="login-title">Đăng nhập</Title>
        <Text type="secondary" className="login-subtitle">
          Chào mừng bạn trở lại với miniERP.
        </Text>

        {loginError && (
          <Alert className="login-error" type="error" showIcon title={loginError} />
        )}

        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            label="Tài khoản"
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tài khoản' }]}
          >
            <Input autoComplete="username" placeholder="Nhập tài khoản của bạn" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password autoComplete="current-password" placeholder="Nhập mật khẩu" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Đăng nhập
          </Button>
        </Form>

      </Card>

      <footer className="login-footer">
        <span>miniERP</span>
        <span> · Hệ thống quản trị doanh nghiệp</span>
      </footer>
    </main>
  );
}

export default Login;
