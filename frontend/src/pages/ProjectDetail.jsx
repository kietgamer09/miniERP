import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Descriptions, Popconfirm, Space, Spin, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { completeProject, getProject, reopenProject } from '../services/projectApi';
import { formatDateOnlyVN } from '../utils/dates';
import ProgressBar from '../components/ProgressBar';
import ProjectFormModal from '../components/ProjectFormModal';
import MemberList from '../components/MemberList';
import AddMembersModal from '../components/AddMembersModal';

function ProjectDetailContent({ id }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const submitting = useRef(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    let active = true;
    getProject(id)
      .then((data) => {
        if (!data || !Array.isArray(data.members)) throw new Error('Dữ liệu dự án từ máy chủ không hợp lệ');
        if (active) setProject(data);
      })
      .catch((error) => { if (active) setLoadError(error.message || 'Không tải được chi tiết dự án'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, reloadKey]);

  function reload() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  function handleSaved(text) {
    setFormOpen(false);
    setMembersOpen(false);
    messageApi.success(text);
    reload();
  }

  async function changeStatus() {
    if (submitting.current) return;
    submitting.current = true;
    setChangingStatus(true);
    const completed = project.status === 'hoan_thanh';
    try {
      await (completed ? reopenProject(id) : completeProject(id));
      messageApi.success(completed ? 'Đã mở lại dự án' : 'Đã hoàn thành dự án');
      reload();
    } catch (error) {
      messageApi.error(error.message || 'Không thay đổi được trạng thái dự án');
    } finally {
      submitting.current = false;
      setChangingStatus(false);
    }
  }

  const completed = project?.status === 'hoan_thanh';
  return <div className="project-overview">
    {contextHolder}
    <Space wrap className="project-page-header">
      <Link to="/du-an/cua-toi"><Button icon={<ArrowLeftOutlined />}>Quay lại</Button></Link>
      <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading || changingStatus}>Tải lại</Button>
    </Space>
    {loading ? <div className="project-panel-loading"><Spin /></div>
      : loadError ? <Alert type="error" showIcon title={loadError} action={<Button onClick={reload}>Thử lại</Button>} />
        : project && <>
          <Card>
            <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ minWidth: 0 }}>
                <Typography.Title level={3} style={{ margin: 0, overflowWrap: 'anywhere' }}>{project.name}</Typography.Title>
                <Typography.Text type="secondary">Mã dự án: {project.code}</Typography.Text>
              </div>
              <Tag color={completed ? 'green' : 'blue'}>{completed ? 'Hoàn thành' : 'Đang thực hiện'}</Tag>
            </Space>
            <Descriptions column={{ xs: 1, sm: 2 }} items={[
              { key: 'dates', label: 'Thời hạn', children: `${formatDateOnlyVN(project.start_date)} – ${formatDateOnlyVN(project.end_date)}` },
              { key: 'manager', label: 'Quản lý dự án', children: project.manager_name || 'Chưa phân công' },
              { key: 'description', label: 'Mô tả', span: 'filled', children: <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{project.description || 'Chưa có mô tả'}</span> },
            ]} />
            <ProgressBar {...project} />
            {project.can_manage && <Space wrap style={{ marginTop: 16 }}>
              <Button icon={<EditOutlined />} disabled={changingStatus} onClick={() => setFormOpen(true)}>Sửa dự án</Button>
              <Button icon={<PlusOutlined />} disabled={changingStatus} onClick={() => setMembersOpen(true)}>Thêm thành viên</Button>
              <Popconfirm title={completed ? 'Mở lại dự án này?' : 'Hoàn thành dự án này?'}
                okText={completed ? 'Mở lại' : 'Hoàn thành'} cancelText="Hủy" onConfirm={changeStatus}
                okButtonProps={{ loading: changingStatus }}>
                <Button type="primary" loading={changingStatus}>{completed ? 'Mở lại dự án' : 'Hoàn thành dự án'}</Button>
              </Popconfirm>
            </Space>}
          </Card>
          <MemberList project={project} onChanged={() => handleSaved('Đã bớt thành viên khỏi dự án')} />
          {project.can_manage && formOpen && <ProjectFormModal open project={project}
            onCancel={() => setFormOpen(false)} onSaved={() => handleSaved('Cập nhật dự án thành công')} />}
          {project.can_manage && membersOpen && <AddMembersModal projectId={project.id}
            onCancel={() => setMembersOpen(false)} onSaved={() => handleSaved('Thêm thành viên thành công')} />}
        </>}
  </div>;
}

function ProjectDetail() {
  const { id } = useParams();
  // Đổi dự án phải xóa cả trạng thái form và dữ liệu của dự án trước.
  return <ProjectDetailContent key={id} id={id} />;
}

export default ProjectDetail;
