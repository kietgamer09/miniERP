/** Trang quản lý danh sách nhân viên, chuẩn hóa theo mẫu Departments.jsx */
import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Input, Select, Space, Table, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { listEmployees } from '../services/employeeApi';
import { listDepartments } from '../services/departmentApi';
import { request } from '../services/http';
import EmployeeFormModal from '../components/EmployeeFormModal';
import { useRole } from '../context/AuthContext';

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

  const [messageApi, contextHolder] = message.useMessage();
  const { role } = useRole();
  const isAdmin = role === 'admin';

  // Gọi API lấy danh sách nhân viên ban đầu và danh sách phòng ban
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      try {
        setLoading(true);
        setLoadError('');

        // Không truyền params tĩnh ở đây để lấy toàn bộ dữ liệu về thực hiện lọc mượt mà ở Client hoặc tùy chỉnh linh hoạt
        const [empData, deptData] = await Promise.all([
          listEmployees(), 
          listDepartments() // Sử dụng service vừa tạo thay vì request thô
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

  // Lọc dữ liệu theo Tên nhân viên, SĐT hoặc Email và theo Phòng ban
  const filteredData = employees.filter((emp) => {
    const keyword = searchText.toLowerCase().trim();
    
    // Kiểm tra khớp từ khóa tìm kiếm (Tên, SĐT, Email)
    const matchSearch = !keyword || (
      (emp.fullname && emp.fullname.toLowerCase().includes(keyword)) ||
      (emp.phone_number && emp.phone_number.toLowerCase().includes(keyword)) ||
      (emp.email && emp.email.toLowerCase().includes(keyword))
    );

    // Kiểm tra khớp phòng ban
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
            <Avatar style={{ backgroundColor: '#f0f0f0', color: '#595959', fontWeight: 600 }}>
              {initials}
            </Avatar>
            <div>
              <div style={{ fontWeight: 500, color: '#1f1f1f' }}>{text}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>SĐT: {record.phone_number}</div>
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
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {record.users?.username || record.phone_number || '---'}
        </span>
      ),
    },
    {
      title: 'Mật khẩu (mk)',
      key: 'password',
      width: '11%',
      render: () => (
        <span style={{ color: '#595959', fontFamily: 'monospace' }}>
          ••••••••
        </span>
      ),
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      key: 'position',
      width: '15%',
      render: (pos) => <span style={{ color: '#595959' }}>{pos || 'Chưa cập nhật'}</span>,
    },
    {
      title: 'Phòng ban',
      key: 'department',
      width: '18%',
      render: (_, record) => (
        <span
          style={{
            background: '#f5f5f5',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 13,
            color: '#595959',
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
              background: isWorking ? '#f6ffed' : '#fff1f0',
              color: isWorking ? '#52c41a' : '#ff4d4f',
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
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ height: 'calc(100vh - 84px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {contextHolder}
      
      {/* Header tiêu đề */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <Space align="center" size={12}>
            <Title level={3} style={{ margin: 0 }}>Quản lý nhân sự</Title>
            <span
              style={{
                backgroundColor: '#e6f7ff',
                color: '#1890ff',
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

      {/* Thanh tìm kiếm và bộ lọc phòng ban */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 16, flexShrink: 0 }}>
        <Space size={12}>
          <Input
            placeholder="Tìm theo tên, SĐT hoặc email..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf', marginRight: 8 }} />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: 300, height: 38, borderRadius: 8 }}
            allowClear
          />

          <Select
            value={selectedDept}
            style={{ width: 200, height: 38 }}
            onChange={(value) => {
              setSelectedDept(value);
              setCurrentPage(1);
            }}
            dropdownStyle={{ borderRadius: 8 }}
          >
            <Option value="all">Tất cả phòng ban</Option>
            {departments.map((dept) => (
              <Option key={dept.department_id} value={dept.department_id}>
                {dept.department_name}
              </Option>
            ))}
          </Select>
        </Space>

        <Text type="secondary" style={{ fontSize: 13 }}>
          {totalItems} kết quả
        </Text>
      </div>

      {/* Bảng hiển thị dữ liệu */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Table
            rowKey="employee_id"
            columns={columns}
            dataSource={paginatedData}
            loading={loading}
            locale={{ emptyText: 'Chưa có nhân viên nào' }}
            pagination={false}
          />
        </div>

        {/* Thanh phân trang tùy chỉnh ở đáy bảng */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderTop: '1px solid #f0f0f0',
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <Text style={{ color: '#595959', fontSize: 13 }}>
            Hiển thị <strong style={{ color: '#1f1f1f' }}>{startItem}–{endItem}</strong> trong tổng số <strong style={{ color: '#1f1f1f' }}>{totalItems}</strong> nhân viên
          </Text>

          <Space size={12}>
            <Button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              style={{ borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>Trang trước</span>
            </Button>

            <span style={{ color: '#595959', fontSize: 13, fontWeight: 500 }}>
              Trang <strong style={{ color: '#1f1f1f' }}>{currentPage}</strong> / {totalPages}
            </span>

            <Button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              style={{ borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>Trang sau</span>
            </Button>
          </Space>
        </div>
      </div>

      {/* Modal Thêm / Sửa Nhân viên */}
      {isAdmin && (
        <EmployeeFormModal
          open={formOpen}
          employee={selectedEmployee}
          departments={departments}
          onCancel={closeForm}
          onSaved={() => {
            closeForm();
            reloadEmployees();
          }}
        />
      )}
    </div>
  );
}

export default Employees;