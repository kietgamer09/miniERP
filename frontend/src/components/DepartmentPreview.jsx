import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Spin, Tag } from 'antd';
import { listDepartments } from '../services/departmentApi';

export default function DepartmentPreview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    listDepartments().then(items => {
      if (!Array.isArray(items)) throw new Error('Dữ liệu phòng ban không hợp lệ');
      if (active) setData(items);
    }).catch(err => { if (active) setError(err.message || 'Không tải được phòng ban'); });
    return () => { active = false; };
  }, [reload]);
  if (error) return <Alert type="error" title={error} action={<Button onClick={() => { setError(''); setReload(value => value + 1); }}>Thử lại</Button>} />;
  if (!data) return <Spin />;
  return data.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {data.map(item => <Tag key={item.department_id} style={{ whiteSpace: 'normal', padding: 8 }}>{item.department_name}</Tag>)}
  </div> : <Empty description="Chưa có phòng ban" />;
}
