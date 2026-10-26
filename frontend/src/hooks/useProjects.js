/** Tải danh sách dự án thật từ API và cung cấp trạng thái tải lại dùng chung. */
import { useEffect, useState } from 'react';
import { listProjects } from '../services/projectApi';

function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    listProjects()
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Dữ liệu dự án từ máy chủ không hợp lệ');
        if (active) setProjects(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Không tải được danh sách dự án');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  function reload() {
    setLoading(true);
    setError('');
    setReloadKey((key) => key + 1);
  }

  return { projects, loading, error, reload };
}

export default useProjects;
