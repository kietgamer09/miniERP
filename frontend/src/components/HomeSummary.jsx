import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Statistic, Tooltip } from 'antd';
import { useRole } from '../hooks/useAuth';
import { getProjectSummary } from '../services/projectApi';
import { getPendingLeaveCount } from '../services/leaveApi';

function SummaryCard({ title, result, destination, navigate, errorHint }) {
  const value = result.role === result.currentRole && !result.loading
    ? result.count ?? '—' : '…';
  const card = (
    <Card hoverable role="button" tabIndex={0}
      aria-label={`${title}: ${value}`}
      onClick={() => navigate(destination)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(destination);
        }
      }}>
      <Statistic title={title} value={value} />
    </Card>
  );
  return result.error && result.role === result.currentRole
    ? <Tooltip title={errorHint}>{card}</Tooltip>
    : card;
}

const initialResult = { role: null, loading: true, count: null, error: false };

export default function HomeSummary() {
  const { role } = useRole();
  const navigate = useNavigate();
  const [projectResult, setProjectResult] = useState(initialResult);
  const [leaveResult, setLeaveResult] = useState(initialResult);
  const canView = role === 'manager' || role === 'admin';

  useEffect(() => {
    if (role !== 'manager' && role !== 'admin') return undefined;
    let active = true;
    getProjectSummary()
      .then((data) => {
        if (!Number.isInteger(data?.active_projects) || data.active_projects < 0) {
          throw new Error('Dữ liệu số dự án không hợp lệ');
        }
        if (active) setProjectResult({ role, loading: false, count: data.active_projects, error: false });
      })
      .catch(() => {
        if (active) setProjectResult({ role, loading: false, count: null, error: true });
      });
    return () => { active = false; };
  }, [role]);

  useEffect(() => {
    if (role !== 'manager' && role !== 'admin') return undefined;
    let active = true;
    getPendingLeaveCount()
      .then((count) => {
        if (active) setLeaveResult({ role, loading: false, count, error: false });
      })
      .catch(() => {
        if (active) setLeaveResult({ role, loading: false, count: null, error: true });
      });
    return () => { active = false; };
  }, [role]);

  if (!canView) return null;

  const projectTitle = role === 'admin' ? 'Dự án đang thực hiện' : 'Dự án đang quản lý';
  return (
    <Row gutter={[12, 12]} className="home-summary">
      <Col xs={24} sm={12}>
        <SummaryCard title={projectTitle} result={{ ...projectResult, currentRole: role }}
          destination="/du-an/cua-toi" navigate={navigate} errorHint="Chưa lấy được số liệu dự án" />
      </Col>
      <Col xs={24} sm={12}>
        <SummaryCard title="Đơn nghỉ phép chờ duyệt" result={{ ...leaveResult, currentRole: role }}
          destination="/phe-duyet" navigate={navigate} errorHint="Chưa lấy được dữ liệu" />
      </Col>
    </Row>
  );
}
