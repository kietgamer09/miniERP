import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Spin, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { listEmployees } from '../services/employeeApi';
import { listDepartments } from '../services/departmentApi';

export default function DepartmentPreview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([listDepartments(), listEmployees()]).then(([items, employees]) => {
      if (!Array.isArray(items) || !Array.isArray(employees)) throw new Error('Dữ liệu phòng ban không hợp lệ');
      if (active) setData(items.map(item => {
        const members = employees.filter(employee => employee.department_id === item.department_id);
        return { ...item, members_count: members.length, active_count: members.filter(member => member.status === 'dang_lam_viec').length,
          preview: members.slice(0, 2).map(member => member.fullname || 'Chưa cập nhật').join(', ') };
      }));
    }).catch(err => { if (active) setError(err.message || 'Không tải được phòng ban'); });
    return () => { active = false; };
  }, [reload]);
  if (error) return <Alert type="error" title={error} action={<Button onClick={() => { setError(''); setReload(value => value + 1); }}>Thử lại</Button>} />;
  if (!data) return <Spin />;
  return data.length ? <div className="department-preview-list" role="list" aria-label="Phòng ban công ty">
    {data.map(item => <div key={item.department_id} role="listitem">
      <Link className="department-preview-item department-preview-link" to={`/quan-ly-phong-ban?department=${item.department_id}`}>
        <strong>{item.department_name || 'Chưa đặt tên'}</strong>
        <Typography.Text type="secondary">{item.members_count} thành viên · {item.active_count} đang làm việc</Typography.Text>
        {item.managment && <Typography.Text type="secondary">Phụ trách: {item.managment}</Typography.Text>}
        {item.preview && <Typography.Text type="secondary" className="department-preview-names">{item.preview}{item.members_count > 2 ? ` và ${item.members_count - 2} người khác` : ''}</Typography.Text>}
      </Link>
    </div>)}
  </div> : <Empty description="Chưa có phòng ban" />;
}
