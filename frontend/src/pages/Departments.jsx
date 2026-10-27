import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Descriptions, Empty, Input, Modal, Space, Table, Tooltip, Typography } from 'antd';
import { ArrowUpOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { listDepartments } from '../services/departmentApi';
import { listEmployees } from '../services/employeeApi';
import { useRole } from '../hooks/useAuth';
import ListPagination from '../components/ListPagination';
import './Employees.css';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const { role } = useRole();
  useEffect(() => {
    let active = true;
    Promise.all([listDepartments(), listEmployees()]).then(([departments, employees]) => {
      if (!Array.isArray(departments) || !Array.isArray(employees)) throw new Error('Dữ liệu phòng ban không hợp lệ');
      if (active) { setDepartments(departments); setEmployees(employees); }
    }).catch(error => { if (active) setError(error.message || 'Không tải được phòng ban'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const filtered = departments.filter(item => item.department_name.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  const visiblePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  const members = id => employees.filter(employee => employee.department_id === id);
  const columns = [
    { title: 'Tên phòng ban', dataIndex: 'department_name', key: 'name', render: (name, department) => <Space size={12}>
      <Avatar size={36} style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 12 }}>
        {name.split(/\s+/).filter(part => !['phòng', 'ban'].includes(part.toLocaleLowerCase('vi'))).slice(0, 2).map(part => part[0]).join('')}
      </Avatar>
      <div><div className="list-person-name">{name}</div><div className="list-person-code">ID: {department.department_id}</div></div>
    </Space> },
    { title: 'Thành viên', key: 'members', render: (_, department) => members(department.department_id).length },
    { title: 'Thao tác', key: 'actions', align: 'right', width: 180, render: (_, department) => (
      <Button className="list-detail-button" onClick={() => setSelected(department)}>Xem chi tiết <ArrowUpOutlined rotate={45} /></Button>
    ) },
  ];
  return <div className="employees-page">
    <div className="employees-header list-page-header">
      <div><Space wrap size={12}><Typography.Title level={3}>Danh sách phòng ban</Typography.Title>
        <span className="list-count">{departments.length} phòng ban</span></Space>
        <Typography.Text type="secondary" className="list-page-subtitle">Tra cứu và quản lý danh sách phòng ban trong công ty.</Typography.Text>
      </div>
      {role === 'admin' && <Tooltip title="Chức năng tạo phòng ban hiện chưa khả dụng"><span>
        <Button type="primary" icon={<PlusOutlined />} disabled>Tạo phòng ban</Button>
      </span></Tooltip>}
    </div>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }}
      action={<Button onClick={() => { setError(''); setLoading(true); setReload(value => value + 1); }}>Tải lại</Button>} />}
    <section className="list-panel" aria-label="Danh sách phòng ban">
      <div className="employees-filters list-filters">
        <div className="employees-filter-inputs"><Input aria-label="Tìm phòng ban" placeholder="Tìm kiếm theo tên phòng ban..."
          prefix={<SearchOutlined />} value={query} allowClear onChange={event => { setQuery(event.target.value); setPage(1); }} /></div>
        <Typography.Text type="secondary" className="list-result-count">{filtered.length} kết quả</Typography.Text>
      </div>
      <Table rowKey="department_id" columns={columns} dataSource={filtered.slice((visiblePage - 1) * 8, visiblePage * 8)}
        loading={loading} pagination={false} scroll={{ x: 600 }} locale={{ emptyText: 'Chưa có phòng ban' }} />
      <ListPagination total={filtered.length} page={visiblePage} onChange={setPage} unit="phòng ban" />
    </section>
    <Modal open={Boolean(selected)} onCancel={() => setSelected(null)} title="Chi tiết phòng ban" footer={null} width={700}>
      {selected && <>
        <Descriptions column={1} items={[{ key: 'name', label: 'Tên phòng ban', children: selected.department_name },
          { key: 'id', label: 'ID phòng ban', children: selected.department_id },
          { key: 'count', label: 'Thành viên', children: members(selected.department_id).length }]} />
        <Typography.Title level={5}>Thành viên phòng ban</Typography.Title>
        {members(selected.department_id).length ? <Table size="small" rowKey="employee_id" pagination={{ pageSize: 5, hideOnSinglePage: true }}
          columns={[{ title: 'Nhân viên', dataIndex: 'fullname' }, { title: 'Chức vụ', dataIndex: 'position', render: value => value || 'Chưa cập nhật' }]}
          dataSource={members(selected.department_id)} /> : <Empty description="Chưa có thành viên" />}
      </>}
    </Modal>
  </div>;
}
