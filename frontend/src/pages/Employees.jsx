import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Empty, Input, Modal, Select, Space, Spin, Table, Typography, message } from 'antd';
import { RightOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { listEmployees } from '../services/employeeApi';
import { listDepartments } from '../services/departmentApi';
import EmployeeFormModal from '../components/EmployeeFormModal';
import { useRole } from '../hooks/useAuth';
import ListPagination from '../components/ListPagination';
import { detailInteraction } from '../utils/detailInteraction';
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
    { title: 'Tên nhân viên', dataIndex: 'fullname', key: 'fullname', width: '27%', render: (name, employee) => (
      <Space size={12}>
        <Avatar className="employee-avatar" size={36}>{name?.trim().split(/\s+/).slice(-2).map(part => part[0]).join('') || 'NV'}</Avatar>
        <div><div className="list-person-name">{name || 'Chưa cập nhật'}</div>
          <div className="list-person-code">{employee.users?.username || employee.phone_number || '—'}</div></div>
      </Space>
    ) },
    { title: 'Chức vụ', dataIndex: 'position', key: 'position', width: '21%', render: value => value || 'Chưa cập nhật' },
    { title: 'Phòng ban', key: 'department', width: '23%', render: (_, employee) => (
      <span className="department-badge">{employee.departments?.department_name || 'Chưa phân ban'}</span>
    ) },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: '15%', render: status => (
      <span className={status === 'da_nghi_viec' ? 'employee-status employee-status--inactive' : 'employee-status'}>
        {status === 'da_nghi_viec' ? 'Đã nghỉ việc' : 'Đang làm việc'}
      </span>
    ) },
    { title: '', key: 'detail', align: 'right', width: 36, render: () => <RightOutlined aria-hidden /> },
  ];
  const pageSize = 8;
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  return <div className="employees-page">
    {contextHolder}
    <div className="employees-header list-page-header">
      <div>
        <Space wrap size={12}><Title level={3}>Danh sách nhân viên</Title>
          <span className="list-count">{employees.length} nhân viên</span></Space>
        <Text type="secondary" className="list-page-subtitle">Tra cứu và quản lý thông tin nhân viên trong công ty.</Text>
      </div>
      {isAdmin && <Button type="primary" icon={<PlusOutlined />} onClick={openCreateForm}>Thêm nhân viên</Button>}
    </div>
    {loadError && <Alert type="error" showIcon title={loadError}
      action={<Button type="link" onClick={retryLoading}>Tải lại</Button>} />}
    <section className="list-panel" aria-label="Danh sách nhân viên">
      <div className="employees-filters list-filters">
        <div className="employees-filter-inputs">
          <Input aria-label="Tìm nhân viên" placeholder="Tìm theo tên, SĐT hoặc email..." prefix={<SearchOutlined />}
            value={searchText} onChange={event => { setSearchText(event.target.value); setCurrentPage(1); }} allowClear />
          <Select value={selectedDept} aria-label="Lọc phòng ban"
            onChange={value => { setSelectedDept(value); setCurrentPage(1); }}>
            <Option value="all">Tất cả phòng ban</Option>
            {departments.map(department => <Option key={department.department_id} value={department.department_id}>{department.department_name}</Option>)}
          </Select>
        </div>
        <Text type="secondary" className="list-result-count">{totalItems} kết quả</Text>
      </div>
      <div className="employees-desktop-table">
        <Table rowKey="employee_id" columns={columns} dataSource={paginatedData} loading={loading}
          onRow={employee => ({ className: 'detail-clickable-row', ...detailInteraction(() => openEditForm(employee), `Thông tin ${employee.fullname || 'nhân viên'}`) })}
          locale={{ emptyText: 'Chưa có nhân viên nào' }} pagination={false} scroll={{ x: 850 }} />
      </div>
      <div className="employees-mobile-list">
        <Spin spinning={loading}>
          {paginatedData.length ? paginatedData.map(employee => (
            <article className="employee-mobile-card detail-clickable-card" key={employee.employee_id} role="button"
              {...detailInteraction(() => openEditForm(employee), `Thông tin ${employee.fullname || 'nhân viên'}`)}>
              <div className="employee-mobile-heading">
                <Avatar className="employee-avatar" size={40}>
                  {employee.fullname?.trim().split(/\s+/).slice(-2).map(part => part[0]).join('') || 'NV'}
                </Avatar>
                <div className="employee-mobile-identity">
                  <strong>{employee.fullname || 'Chưa cập nhật'}</strong>
                  <span className="list-person-code">{employee.users?.username || employee.phone_number || '—'}</span>
                </div>
                <span className={employee.status === 'da_nghi_viec' ? 'employee-status employee-status--inactive' : 'employee-status'}>
                  {employee.status === 'da_nghi_viec' ? 'Đã nghỉ việc' : 'Đang làm việc'}
                </span>
              </div>
              <div className="employee-mobile-meta">
                <div><span>Chức vụ</span><strong>{employee.position || 'Chưa cập nhật'}</strong></div>
                <div><span>Phòng ban</span><strong>{employee.departments?.department_name || 'Chưa phân ban'}</strong></div>
              </div>
            </article>
          )) : !loading && <Empty description="Chưa có nhân viên nào" />}
        </Spin>
      </div>
      <ListPagination total={totalItems} pageSize={pageSize} page={visiblePage} onChange={setCurrentPage} unit="nhân viên" />
    </section>
    {formOpen && <EmployeeFormModal open employee={selectedEmployee} departments={departments} readOnly={!isAdmin}
      onCancel={closeForm} onSaved={result => {
        closeForm(); reloadEmployees();
        if (result?.login_info?.username && result.login_info.default_password) setLoginInfo(result.login_info);
      }} />}
    {isAdmin && loginInfo && <Modal open title="Tài khoản nhân viên vừa tạo" okText="Đã lưu thông tin"
      cancelButtonProps={{ style: { display: 'none' } }} onOk={() => setLoginInfo(null)} onCancel={() => setLoginInfo(null)}>
      <Typography.Paragraph>Tài khoản: <Typography.Text copyable>{loginInfo.username}</Typography.Text></Typography.Paragraph>
      <Typography.Paragraph>Mật khẩu ban đầu:</Typography.Paragraph>
      <Input.Password readOnly value={loginInfo.default_password} aria-label="Mật khẩu ban đầu" autoComplete="off" />
    </Modal>}
  </div>;
}

export default Employees;
