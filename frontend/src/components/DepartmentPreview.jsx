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
      if (active) setData(items.map(item => ({ ...item, members_count: employees.filter(employee => employee.department_id === item.department_id).length })));
    }).catch(err => { if (active) setError(err.message || 'Không tải được phòng ban'); });
    return () => { active = false; };
  }, [reload]);
  if (error) return <Alert type="error" title={error} action={<Button onClick={() => { setError(''); setReload(value => value + 1); }}>Thử lại</Button>} />;
  if (!data) return <Spin />;
  return data.length ? <div className="department-preview-list" role="list" aria-label="Phòng ban công ty">
    {data.map(item => <div key={item.department_id} className="department-preview-item" role="listitem">
      <Link to="/quan-ly-phong-ban">{item.department_name}</Link>
      <Typography.Text type="secondary">Thành viên tham gia: {item.members_count}</Typography.Text>
    </div>)}
  </div> : <Empty description="Chưa có phòng ban" />;
}
