import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Empty, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listEmployees } from '../services/employeeApi';
import { useRole } from '../context/AuthContext';
import EmployeeFormModal from '../components/EmployeeFormModal';

function Employees() {
  const { role } = useRole();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loginInfo, setLoginInfo] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const isAdmin = role === 'admin';

  useEffect(() => {
    let active = true;
    listEmployees()
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu nhân viên từ máy chủ không hợp lệ');
        if (active) setEmployees(data);
      })
      .catch((error) => { if (active) setLoadError(error.message || 'Không tải được danh sách nhân viên'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  function reload() {
    setLoadError('');
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  function openForm(employee = null) {
    setSelectedEmployee(employee);
    setFormOpen(true);
  }

  function handleSaved(info) {
    setFormOpen(false);
    setLoginInfo(info || null);
    messageApi.success(selectedEmployee ? 'Cập nhật nhân viên thành công' : 'Thêm nhân viên thành công');
    reload();
  }

  // API nhân viên trả kèm phòng ban; lấy gợi ý từ dữ liệu thật, không tạo danh mục giả.
  const departments = [...new Map(employees.map((employee) => [employee.department_id, {
    value: String(employee.department_id),
    label: `${employee.departments?.department_name || 'Phòng ban'} (${employee.department_id})`,
  }])).values()];
  const roleNames = { employee: 'Nhân viên', member: 'Nhân viên', manager: 'Quản lý', admin: 'Admin' };
  const columns = [
    { title: 'Mã NV', dataIndex: 'employee_id', width: 90 },
    { title: 'Họ và tên', dataIndex: 'fullname', width: 200 },
    { title: 'Phòng ban', dataIndex: ['departments', 'department_name'], width: 170 },
    { title: 'Số điện thoại', dataIndex: 'phone_number', width: 140 },
    { title: 'Email', dataIndex: 'email', width: 220 },
    { title: 'Ngày sinh', dataIndex: 'birthday', width: 130 },
    { title: 'Tài khoản', dataIndex: ['users', 'username'], width: 150 },
    { title: 'Vai trò', dataIndex: ['users', 'role'], width: 110, render: (value) => roleNames[value] || value || '—' },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 150,
      render: (value) => <Tag color={value === 'dang_lam_viec' ? 'green' : 'default'}>{value === 'dang_lam_viec' ? 'Đang làm việc' : value === 'da_nghi_viec' ? 'Đã nghỉ việc' : 'Chưa xác định'}</Tag>,
    },
    ...(isAdmin ? [{ title: 'Thao tác', width: 90, fixed: 'right', render: (_, employee) => <Button icon={<EditOutlined />} onClick={() => openForm(employee)}>Sửa</Button> }] : []),
  ];

  return (
    <div>
      {contextHolder}
      <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Danh sách nhân viên</Typography.Title>
        <Space wrap>
          <Button icon={<ReloadOutlined />} disabled={loading} onClick={reload}>Tải lại</Button>
          {isAdmin && <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Thêm nhân viên</Button>}
        </Space>
      </Space>
      {loadError ? <Alert title={loadError} type="error" showIcon action={<Button onClick={reload}>Thử lại</Button>} /> : (
        <Table rowKey="employee_id" columns={columns} dataSource={employees} loading={loading} scroll={{ x: 1450 }}
          locale={{ emptyText: <Empty description="Chưa có nhân viên" /> }} />
      )}
      {isAdmin && formOpen && <EmployeeFormModal open employee={selectedEmployee} departments={departments}
        onCancel={() => setFormOpen(false)} onSaved={handleSaved} />}
      <Modal title="Tài khoản nhân viên vừa tạo" open={Boolean(loginInfo)} onCancel={() => setLoginInfo(null)}
        footer={<Button type="primary" onClick={() => setLoginInfo(null)}>Đóng</Button>}>
        {loginInfo && <Descriptions column={1} items={[
          { key: 'username', label: 'Tài khoản', children: loginInfo.username },
          { key: 'password', label: 'Mật khẩu ban đầu', children: loginInfo.default_password },
        ]} />}
      </Modal>
    </div>
  );
}

export default Employees;
