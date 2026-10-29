import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Descriptions, Empty, Input, Modal, Space, Table, Tooltip, Typography, Select, message } from 'antd';
import { RightOutlined, PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { listDepartments, deleteDepartment } from '../services/departmentApi';
import { listEmployees } from '../services/employeeApi';
import { updateEmployeesDepartment } from '../services/employeeApi';
import { useRole } from '../hooks/useAuth';
import ListPagination from '../components/ListPagination';
import CreateDepartmentModal from '../components/CreateDepartmentModal';
import EditDepartmentModal from '../components/EditDepartmentModal';
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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const [selectedMemberKeys, setSelectedMemberKeys] = useState([]);
  const [targetDeptId, setTargetDeptId] = useState(undefined);
  const [actionLoading, setActionLoading] = useState(false);

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

  const currentTeamMembers = selected ? members(selected.department_id) : [];

  const memberRowSelection = {
    selectedRowKeys: selectedMemberKeys,
    onChange: (keys) => setSelectedMemberKeys(keys),
  };

  const getManagerName = (managerVal) => {
    if (!managerVal) return 'Chưa cập nhật';
    const foundEmp = employees.find(e => String(e.employee_id) === String(managerVal) || String(e.fullname).trim() === String(managerVal).trim());
    return foundEmp ? foundEmp.fullname : managerVal;
  };

  const handleDelete = (department) => {
    const team = members(department.department_id);
    if (team.length > 0) {
      Modal.error({
        title: 'Không thể xóa phòng ban',
        content: `Phòng ban "${department.department_name}" vẫn còn ${team.length} nhân viên trực thuộc. Vui lòng chuyển nhân viên sang phòng ban khác trước khi xóa.`
      });
      return;
    }

    Modal.confirm({
      title: 'Xác nhận xóa phòng ban',
      icon: <ExclamationCircleOutlined />,
      content: `Bạn có chắc chắn muốn xóa phòng ban "${department.department_name}" không?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteDepartment(department.department_id);
          message.success('Xóa phòng ban thành công!');
          setReload(v => v + 1);
          if (selected?.department_id === department.department_id) {
            setParams({}, { replace: true });
          }
        } catch (err) {
          message.error(err.message || 'Xóa phòng ban thất bại.');
        }
      }
    });
  };

  // Không chọn nhân viên thì chuyển toàn bộ phòng.
  const handleMoveMembers = async (moveToAll = false) => {
    const idsToProcess = moveToAll ? currentTeamMembers.map(m => m.employee_id) : selectedMemberKeys;

    if (idsToProcess.length === 0) {
      message.warning('Vui lòng chọn nhân viên cần chuyển!');
      return;
    }
    if (targetDeptId === undefined) {
      message.warning('Vui lòng chọn phòng ban đích cần chuyển đến!');
      return;
    }

    setActionLoading(true);
    try {
      await updateEmployeesDepartment({
        employee_ids: idsToProcess,
        new_department_id: targetDeptId
      });
      message.success('Chuyển phòng ban cho nhân viên thành công!');
      setSelectedMemberKeys([]);
      setTargetDeptId(undefined);
      setReload(v => v + 1);
    } catch (err) {
      message.error(err.message || 'Thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { title: 'Tên phòng ban', dataIndex: 'department_name', key: 'name', render: (name, department) => <Space size={12}>
      <Avatar size={36} style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 12 }}>
        {String(name || 'PB').split(/\s+/).filter(part => !['phòng', 'ban'].includes(part.toLocaleLowerCase('vi'))).slice(0, 2).map(part => part[0]).join('')}
      </Avatar>
      <div><div className="list-person-name">{name || 'Chưa đặt tên'}</div><div className="list-person-code">Mã phòng: {department.department_id}</div></div>
    </Space> },
    {
      title: 'Phụ trách',
      dataIndex: 'managment',
      key: 'manager',
      render: value => getManagerName(value)
    },
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
    { title: 'Phân loại', dataIndex: 'category', key: 'category', render: value => value || 'Chưa cập nhật' },
    { title: '', key: 'open', width: 40, render: () => <RightOutlined aria-hidden="true" style={{ color: 'var(--muted)', fontSize: 11 }} /> },
  ];

  return <div className="employees-page departments-page">
    <div className="employees-header list-page-header">
      <div><Space wrap size={12}><Typography.Title level={3}>Danh sách phòng ban</Typography.Title>
        <span className="list-count">{departments.length} phòng ban</span></Space>
        <Typography.Text type="secondary" className="list-page-subtitle">Xem nhân sự theo phòng ban. Bấm vào một hàng để mở chi tiết.</Typography.Text>
      </div>

      {role === 'admin' && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
          Tạo phòng ban
        </Button>
      )}
    </div>

    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }}
      action={<Button onClick={() => { setError(''); setLoading(true); setReload(value => value + 1); }}>Tải lại</Button>} />}

    <section className="list-panel" aria-label="Danh sách phòng ban">
      <div className="employees-filters list-filters">
        <div className="employees-filter-inputs"><Input aria-label="Tìm phòng ban" placeholder="Tìm tên, mã phòng ban hoặc người phụ trách..."
          prefix={<SearchOutlined />} value={query} allowClear onChange={event => { setQuery(event.target.value); setPage(1); }} /></div>
        <Typography.Text type="secondary" className="list-result-count">{filtered.length} kết quả</Typography.Text>
      </div>
      <Table rowKey="department_id" columns={columns} dataSource={filtered.slice((page - 1) * 8, page * 8)}
        onRow={department => ({ className: 'department-clickable-row', tabIndex: 0, 'aria-label': `Xem chi tiết ${department.department_name || 'phòng ban'}`,
          onClick: () => openDepartment(department), onKeyDown: event => {
            if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDepartment(department); }
          } })}
        loading={loading} pagination={false} scroll={{ x: 820 }} locale={{ emptyText: 'Chưa có phòng ban' }} />
      <ListPagination total={filtered.length} page={visiblePage} onChange={setPage} unit="phòng ban" />
    </section>

    <Modal
      open={Boolean(selected)}
      onCancel={() => {
        setParams({}, { replace: true });
        setSelectedMemberKeys([]);
      }}
      title={`Chi tiết phòng ban: ${selected?.department_name || ''}`}
      footer={null}
      width={780}
    >
      {selected && <>
        <Descriptions column={1} items={[
          { key: 'name', label: 'Tên phòng ban', children: selected.department_name },
          { key: 'id', label: 'ID phòng ban', children: selected.department_id },
          { key: 'manager', label: 'Phụ trách', children: getManagerName(selected.managment) },
          { key: 'category', label: 'Phân loại', children: selected.category || 'Chưa cập nhật' },
          { key: 'count', label: 'Thành viên', children: currentTeamMembers.length }
        ]} />

        {role === 'admin' && (
          <Space style={{ marginTop: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <Button type="primary" icon={<EditOutlined />} onClick={() => setEditingDept(selected)}>Sửa phòng ban</Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(selected)}>Xóa phòng ban</Button>
          </Space>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
          <Typography.Title level={5} style={{ margin: 0 }}>Thành viên phòng ban ({currentTeamMembers.length})</Typography.Title>
        </div>

        {role === 'admin' && currentTeamMembers.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: 12,
            background: 'var(--bg-card, var(--bg-container, rgba(0, 0, 0, 0.03)))',
            border: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
            padding: '10px',
            borderRadius: '6px',
            alignItems: 'center'
          }}>
            <Select
              size="small"
              placeholder="Chọn phòng ban đích để chuyển đến..."
              style={{ width: 240 }}
              value={targetDeptId}
              onChange={setTargetDeptId}
              options={departments
                .filter(d => d.department_id !== selected.department_id)
                .map(d => ({ value: d.department_id, label: d.department_name }))}
            />
            <Button
              type="primary"
              size="small"
              loading={actionLoading}
              disabled={targetDeptId === undefined}
              onClick={() => handleMoveMembers(selectedMemberKeys.length === 0)}
            >
              {selectedMemberKeys.length > 0 ? `Chuyển đã chọn (${selectedMemberKeys.length})` : 'Chuyển toàn bộ sang phòng này'}
            </Button>
          </div>
        )}

        {currentTeamMembers.length ? (
          <Table
            size="small"
            rowKey="employee_id"
            rowSelection={role === 'admin' ? memberRowSelection : undefined}
            pagination={{ pageSize: 5, hideOnSinglePage: true }}
            columns={[
              { title: 'Nhân viên', dataIndex: 'fullname' },
              { title: 'Chức vụ', dataIndex: 'position', render: value => value || 'Chưa cập nhật' },
              { title: 'Email', dataIndex: 'email' }
            ]}
            dataSource={currentTeamMembers}
          />
        ) : (
          <Empty description="Chưa có thành viên nào trong phòng ban này" />
        )}
      </>}
    </Modal>

    <CreateDepartmentModal
      open={isCreateModalOpen}
      onCancel={() => setIsCreateModalOpen(false)}
      onSuccess={() => setReload(v => v + 1)}
      employees={employees}
    />

    <EditDepartmentModal
      open={Boolean(editingDept)}
      department={editingDept}
      onCancel={() => setEditingDept(null)}
      onSuccess={() => {
        setEditingDept(null);
        setReload(v => v + 1);
        setParams({}, { replace: true });
      }}
      employees={employees}
    />
  </div>;
}