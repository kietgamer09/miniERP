import { useRef, useState } from 'react';
import { Button, Card, Empty, Popconfirm, Space, Tag, message } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { removeMember } from '../services/projectApi';

function MemberList({ project, onChanged }) {
  const [removingId, setRemovingId] = useState(null);
  const removing = useRef(false);
  const [messageApi, contextHolder] = message.useMessage();
  const members = project.members || [];

  async function handleRemove(member) {
    if (removing.current) return;
    removing.current = true;
    setRemovingId(member.employee_id);
    try {
      await removeMember(project.id, member.employee_id);
      onChanged();
    } catch (error) {
      messageApi.error(error.message || 'Không bớt được thành viên');
    } finally {
      removing.current = false;
      setRemovingId(null);
    }
  }

  return <Card title={`Thành viên: ${members.length}`}>
    {contextHolder}
    {members.length ? <Space wrap size={[8, 12]}>
      {members.map((member) => <Tag key={member.employee_id} style={{ padding: '6px 10px', whiteSpace: 'normal' }}>
        {member.fullname || `Nhân viên ${member.employee_id}`}{member.is_manager && ' · Quản lý dự án'}
        {project.can_manage && !member.is_manager && <Popconfirm
          title={`Bớt ${member.fullname || 'thành viên này'} khỏi dự án?`}
          okText="Bớt thành viên" cancelText="Hủy" onConfirm={() => handleRemove(member)}
          okButtonProps={{ loading: removingId === member.employee_id }}>
          <Button type="text" size="small" icon={<CloseOutlined />} aria-label={`Bớt ${member.fullname || 'thành viên'}`}
            disabled={removingId !== null} />
        </Popconfirm>}
      </Tag>)}
    </Space> : <Empty description="Dự án chưa có thành viên" />}
  </Card>;
}

export default MemberList;
