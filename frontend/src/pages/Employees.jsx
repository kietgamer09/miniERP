import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Input, Modal, Select, Space, Table, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { listEmployees } from '../services/employeeApi';
import { listDepartments } from '../services/departmentApi';
import EmployeeFormModal from '../components/EmployeeFormModal';
import { useRole } from '../hooks/useAuth';
import './Employees.css';

const { Title, Text } = Typography;
const { Option } = Select;

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loginInfo, setLoginInfo] = useState(null);

  const [messageApi, contextHolder] = message.useMessage();
  const { role } = useRole();
  const isAdmin = role === 'admin';
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setLoadError('');
        const [empData, deptData] = await Promise.all([
          listEmployees(),
          listDepartments()
        ]);

        if (isMounted) {
          const empList = Array.isArray(empData) ? empData : (empData.data || []);
          setEmployees(empList);
          setDepartments(Array.isArray(deptData) ? deptData : (deptData.data || []));
        }
      } catch (error) {
        if (!isMounted) return;
        const errorMessage = error.message || 'Không tải được danh sách nhân viên';
        setLoadError(errorMessage);
        messageApi.error(errorMessage);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [messageApi, reloadKey]);

  function retryLoading() {
    setReloadKey((key) => key + 1);
  }

  function openCreateForm() {
    setSelectedEmployee(null);
    setFormOpen(true);
  }

  function openEditForm(employee) {
    setSelectedEmployee(employee);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setSelectedEmployee(null);
  }

  function reloadEmployees() {
    setReloadKey((key) => key + 1);
  }
  const filteredData = employees.filter((emp) => {
    const keyword = searchText.toLowerCase().trim();
    const matchSearch = !keyword || (
      (emp.fullname && emp.fullname.toLowerCase().includes(keyword)) ||
      (emp.phone_number && emp.phone_number.toLowerCase().includes(keyword)) ||
      (emp.email && emp.email.toLowerCase().includes(keyword))
    );
    const matchDept = selectedDept === 'all' || String(emp.department_id) === String(selectedDept);

    return matchSearch && matchDept;
  });

  const columns = [
    {
      title: 'Tên nhân viên',
      dataIndex: 'fullname',
      key: 'fullname',
      width: '20%',
      render: (text, record) => {
        const initials = text
          ? text.split(' ').map((n) => n[0]).slice(-2).join('').toUpperCase()
          : 'NV';

        return (
          <Space size={12}>
            <Avatar style={{ backgroundColor: 'var(--subtle-bg)', color: 'var(--muted)', fontWeight: 600 }}>
              {initials}
            </Avatar>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)' }}>{text}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>SĐT: {record.phone_number}</div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Tài khoản (tk)',
      key: 'username',
      width: '13%',
      render: (_, record) => (
        <span style={{ color: 'var(--blue-text)', fontWeight: 500 }}>
          {record.users?.username || record.phone_number || '---'}
        </span>
      ),
    },
    {
      title: 'Mật khẩu (mk)',
      key: 'password',
      width: '11%',
      render: () => (
        <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>
          ••••••••
        </span>
      ),
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      key: 'position',
      width: '15%',
      render: (pos) => <span style={{ color: 'var(--muted)' }}>{pos || 'Chưa cập nhật'}</span>,
    },
    {
      title: 'Phòng ban',
      key: 'department',
      width: '18%',
      render: (_, record) => (
        <span
          style={{
            background: 'var(--subtle-bg)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {record.departments?.department_name || 'Chưa phân ban'}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: '11%',
      render: (status) => {
        const isWorking = status !== 'da_nghi_viec';
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              background: isWorking ? 'var(--green-bg)' : 'var(--red-bg)',
              color: isWorking ? 'var(--green-text)' : 'var(--red-text)',
              border: `1px solid ${isWorking ? '#b7eb8f' : '#ffa39e'}`,
              whiteSpace: 'nowrap',
            }}
          >
            {isWorking ? 'Đang làm việc' : 'Đã nghỉ việc'}
          </span>
        );
      },
    },
    ...(isAdmin ? [{
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      width: '12%',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditForm(record)}
            style={{ height: 34, paddingInline: 12, borderRadius: 6 }}
          >
            Sửa
          </Button>
        </Space>
      ),
    }] : []),
  ];

  const pageSize = 5;
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const visiblePage = Math.min(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (visiblePage - 1) * pageSize + 1;
  const endItem = Math.min(visiblePage * pageSize, totalItems);
  const paginatedData = filteredData.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  return (
    <div className="employees-page">
      {contextHolder}
      <div className="employees-header">
        <div>
          <Space wrap align="center" size={12}>
            <Title level={3} style={{ margin: 0 }}>Quản lý nhân sự</Title>
            <span
              style={{
                backgroundColor: 'var(--blue-bg)',
                color: 'var(--blue-text)',
                padding: '2px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {employees.length} nhân viên
            </span>
          </Space>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 2, display: 'block' }}>
            Tra cứu và quản lý thông tin nhân viên trong công ty.
          </Text>
        </div>

        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateForm}
            style={{ height: 38, paddingInline: 16, borderRadius: 8, fontWeight: 500 }}
          >
            Thêm nhân viên
          </Button>
        )}
      </div>

      {loadError && (
        <Alert
          type="error"
          showIcon
          message={loadError}
          action={<Button size="small" type="link" onClick={retryLoading}>Tải lại</Button>}
          style={{ marginBottom: 12, flexShrink: 0 }}
        />
      )}
      <div className="employees-filters">
        <div className="employees-filter-inputs">
          <Input
            placeholder="Tìm theo tên, SĐT hoặc email..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf', marginRight: 8 }} />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setCurrentPage(1);
            }}
            style={{ flex: '1 1 240px', minWidth: 0, height: 38, borderRadius: 8 }}
            allowClear
          />

          <Select
            value={selectedDept}
            style={{ flex: '1 1 200px', minWidth: 0, height: 38 }}
            onChange={(value) => {
              setSelectedDept(value);
              setCurrentPage(1);
            }}
            styles={{ popup: { root: { borderRadius: 8 } } }}
          >
            <Option value="all">Tất cả phòng ban</Option>
            {departments.map((dept) => (
              <Option key={dept.department_id} value={dept.department_id}>
                {dept.department_name}
              </Option>
            ))}
          </Select>
        </div>

        <Text type="secondary" style={{ fontSize: 13 }}>
          {totalItems} kết quả
        </Text>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--surface)', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Table
            rowKey="employee_id"
            columns={columns}
            dataSource={paginatedData}
            loading={loading}
            locale={{ emptyText: 'Chưa có nhân viên nào' }}
            pagination={false}
            scroll={{ x: 1100 }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Text style={{ color: 'var(--muted)', fontSize: 13 }}>
            Hiển thị <strong style={{ color: 'var(--text)' }}>{startItem}–{endItem}</strong> trong tổng số <strong style={{ color: 'var(--text)' }}>{totalItems}</strong> nhân viên
          </Text>

          <Space size={12}>
            <Button
              disabled={visiblePage === 1}
              onClick={() => setCurrentPage(Math.max(visiblePage - 1, 1))}
              style={{ borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>Trang trước</span>
            </Button>

            <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
              Trang <strong style={{ color: 'var(--text)' }}>{visiblePage}</strong> / {totalPages}
            </span>

            <Button
              disabled={visiblePage >= totalPages}
              onClick={() => setCurrentPage(Math.min(visiblePage + 1, totalPages))}
              style={{ borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>Trang sau</span>
            </Button>
          </Space>
        </div>
      </div>
      {isAdmin && formOpen && (
        <EmployeeFormModal
          open={formOpen}
          employee={selectedEmployee}
          departments={departments}
          onCancel={closeForm}
          onSaved={(result) => {
            closeForm();
            reloadEmployees();
            if (result?.login_info?.username && result.login_info.default_password) setLoginInfo(result.login_info);
          }}
        />
      )}
      {isAdmin && loginInfo && <Modal open title="Tài khoản nhân viên vừa tạo" okText="Đã lưu thông tin"
        cancelButtonProps={{ style: { display: 'none' } }} onOk={() => setLoginInfo(null)} onCancel={() => setLoginInfo(null)}>
        <Typography.Paragraph>Thông tin đăng nhập do máy chủ trả về. Hộp thoại này chỉ hiển thị trong phiên hiện tại.</Typography.Paragraph>
        <Typography.Paragraph>Tài khoản: <Typography.Text copyable>{loginInfo.username}</Typography.Text></Typography.Paragraph>
        <Typography.Paragraph>Mật khẩu ban đầu:</Typography.Paragraph>
        <Input.Password readOnly value={loginInfo.default_password} aria-label="Mật khẩu ban đầu" autoComplete="off" />
      </Modal>}
    </div>
  );
}

export default Employees;
