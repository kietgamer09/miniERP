import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Descriptions, Empty, Input, Modal, Space, Table, Tooltip, Typography } from 'antd';
import { RightOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { listDepartments } from '../services/departmentApi';
import { listEmployees } from '../services/employeeApi';
import { useRole } from '../hooks/useAuth';
import ListPagination from '../components/ListPagination';
import './Employees.css';
import './Departments.css';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [params, setParams] = useSearchParams();
  const selected = departments.find(item => String(item.department_id) === params.get('department'));
  const openDepartment = department => setParams({ department: String(department.department_id) });
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
  const filtered = departments.filter(item => `${item.department_name || ''} ${item.department_id} ${item.managment || ''} ${item.category || ''}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  const visiblePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  const members = id => employees.filter(employee => employee.department_id === id);
  const columns = [
    { title: 'Tên phòng ban', dataIndex: 'department_name', key: 'name', render: (name, department) => <Space size={12}>
      <Avatar size={36} style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 12 }}>
        {String(name || 'PB').split(/\s+/).filter(part => !['phòng', 'ban'].includes(part.toLocaleLowerCase('vi'))).slice(0, 2).map(part => part[0]).join('')}
      </Avatar>
      <div><div className="list-person-name">{name || 'Chưa đặt tên'}</div><div className="list-person-code">Mã phòng: {department.department_id}</div></div>
    </Space> },
    ...(departments.some(item => item.managment) ? [{ title: 'Phụ trách', dataIndex: 'managment', key: 'manager', render: value => value || 'Chưa cập nhật' }] : []),
    { title: 'Thành viên', key: 'members', width: 160, render: (_, department) => {
      const team = members(department.department_id);
      return <div className="department-team-count"><Typography.Text strong>{team.length} người</Typography.Text>
        <Typography.Text type="secondary">{team.filter(member => member.status === 'dang_lam_viec').length} đang làm việc</Typography.Text></div>;
    } },
    { title: 'Nhân sự trong phòng', key: 'preview', render: (_, department) => {
      const team = members(department.department_id);
      return team.length ? <div className="department-member-preview"><Avatar.Group>
        {team.slice(0, 3).map(member => <Tooltip key={member.employee_id} title={member.fullname || 'Chưa cập nhật'}><Avatar size={30} className="employee-avatar">{(member.fullname || 'NV').trim().split(/\s+/).slice(-2).map(part => part[0]).join('')}</Avatar></Tooltip>)}
      </Avatar.Group><Typography.Text type="secondary">{team.slice(0, 2).map(member => member.fullname || 'Chưa cập nhật').join(', ')}{team.length > 2 ? ` và ${team.length - 2} người khác` : ''}</Typography.Text></div>
        : <Typography.Text type="secondary">Chưa có thành viên</Typography.Text>;
    } },
    ...(departments.some(item => item.category) ? [{ title: 'Phân loại', dataIndex: 'category', key: 'category', render: value => value || 'Chưa cập nhật' }] : []),
    { title: '', key: 'open', width: 40, render: () => <RightOutlined aria-hidden="true" style={{ color: 'var(--muted)', fontSize: 11 }} /> },
  ];
  return <div className="employees-page departments-page">
    <div className="employees-header list-page-header">
      <div><Space wrap size={12}><Typography.Title level={3}>Danh sách phòng ban</Typography.Title>
        <span className="list-count">{departments.length} phòng ban</span></Space>
        <Typography.Text type="secondary" className="list-page-subtitle">Xem nhân sự theo phòng ban. Bấm vào một hàng để mở chi tiết.</Typography.Text>
      </div>
      {role === 'admin' && <Tooltip title="Chức năng tạo phòng ban hiện chưa khả dụng"><span>
        <Button type="primary" icon={<PlusOutlined />} disabled>Tạo phòng ban</Button>
      </span></Tooltip>}
    </div>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }}
      action={<Button onClick={() => { setError(''); setLoading(true); setReload(value => value + 1); }}>Tải lại</Button>} />}
    <section className="list-panel" aria-label="Danh sách phòng ban">
      <div className="employees-filters list-filters">
        <div className="employees-filter-inputs"><Input aria-label="Tìm phòng ban" placeholder="Tìm tên, mã phòng ban hoặc người phụ trách..."
          prefix={<SearchOutlined />} value={query} allowClear onChange={event => { setQuery(event.target.value); setPage(1); }} /></div>
        <Typography.Text type="secondary" className="list-result-count">{filtered.length} kết quả</Typography.Text>
      </div>
      <Table rowKey="department_id" columns={columns} dataSource={filtered.slice((visiblePage - 1) * 8, visiblePage * 8)}
        onRow={department => ({ className: 'department-clickable-row', tabIndex: 0, 'aria-label': `Xem chi tiết ${department.department_name || 'phòng ban'}`,
          onClick: () => openDepartment(department), onKeyDown: event => {
            if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDepartment(department); }
          } })}
        loading={loading} pagination={false} scroll={{ x: 820 }} locale={{ emptyText: 'Chưa có phòng ban' }} />
      <ListPagination total={filtered.length} page={visiblePage} onChange={setPage} unit="phòng ban" />
    </section>
    <Modal open={Boolean(selected)} onCancel={() => setParams({}, { replace: true })} title="Chi tiết phòng ban" footer={null} width={700}>
      {selected && <>
        <Descriptions column={1} items={[{ key: 'name', label: 'Tên phòng ban', children: selected.department_name },
          { key: 'id', label: 'ID phòng ban', children: selected.department_id },
          { key: 'manager', label: 'Phụ trách', children: selected.managment || 'Chưa cập nhật' },
          { key: 'category', label: 'Phân loại', children: selected.category || 'Chưa cập nhật' },
          { key: 'count', label: 'Thành viên', children: members(selected.department_id).length }]} />
        <Typography.Title level={5}>Thành viên phòng ban</Typography.Title>
        {members(selected.department_id).length ? <Table size="small" rowKey="employee_id" pagination={{ pageSize: 5, hideOnSinglePage: true }}
          columns={[{ title: 'Nhân viên', dataIndex: 'fullname' }, { title: 'Chức vụ', dataIndex: 'position', render: value => value || 'Chưa cập nhật' }]}
          dataSource={members(selected.department_id)} /> : <Empty description="Chưa có thành viên" />}
      </>}
    </Modal>
  </div>;
}
