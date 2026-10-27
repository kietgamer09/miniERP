/** Trang mẫu danh sách phòng ban; có thể dùng cấu trúc này cho Nhân viên và Dự án. */
import { useEffect, useState } from 'react';
import { Alert, Button, Popconfirm, Space, Table, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { deleteDepartment, listDepartments } from '../services/departmentApi';
import DepartmentFormModal from '../components/DepartmentFormModal';
import { useRole } from '../hooks/useAuth';

const { Title } = Typography;

async function getDepartmentList() {
  const data = await listDepartments();
  if (!Array.isArray(data)) throw new Error('Dữ liệu phòng ban từ máy chủ không hợp lệ');
  return data;
}

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { role } = useRole();
  const isAdmin = role === 'admin';

  useEffect(() => {
    let isMounted = true;
    getDepartmentList()
      .then((data) => {
        if (isMounted) setDepartments(data);
      })
      .catch((error) => {
        if (!isMounted) return;
        const errorMessage = error.message || 'Không tải được danh sách phòng ban';
        setLoadError(errorMessage);
        messageApi.error(errorMessage);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [messageApi, reloadKey]);

  function retryLoading() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  function openCreateForm() {
    setSelectedDepartment(null);
    setFormOpen(true);
  }

  function openEditForm(department) {
    setSelectedDepartment(department);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setSelectedDepartment(null);
  }

  function reloadDepartments() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  async function handleDelete(department) {
    setDeletingId(department.department_id);
    try {
      await deleteDepartment(department.department_id);
      messageApi.success('Xóa phòng ban thành công');
      reloadDepartments();
    } catch (error) {
      messageApi.error(error.message || 'Không xóa được phòng ban');
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    {
      title: 'Tên phòng ban',
      dataIndex: 'department_name',
      key: 'department_name',
    },
      ...(isAdmin ? [{
      title: 'Thao tác',
      key: 'actions',
      render: (_, department) => (
        <Space>
          <Button disabled title="Backend chưa hỗ trợ sửa phòng ban" size="small" icon={<EditOutlined />} onClick={() => openEditForm(department)}>
            Sửa
          </Button>
          <Popconfirm
            disabled
            title="Bạn chắc chắn xóa phòng ban này?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ loading: deletingId === department.department_id }}
            onConfirm={() => handleDelete(department)}
          >
            <Button disabled title="Backend chưa hỗ trợ xóa phòng ban" size="small" danger icon={<DeleteOutlined />} loading={deletingId === department.department_id}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
      }] : []),
  ];

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Quản lý phòng ban</Title>
        {isAdmin && (
          <Button disabled title="Backend chưa hỗ trợ thêm phòng ban" type="primary" icon={<PlusOutlined />} onClick={openCreateForm}>
            Thêm phòng ban
          </Button>
        )}
      </div>

      {isAdmin && <Alert type="info" showIcon title="Hiện chỉ hỗ trợ xem phòng ban"
        description="Backend chưa cung cấp API thêm, sửa, xóa phòng ban." style={{ marginBottom: 16 }} />}

      {loadError && (
        <Alert
          type="error"
          showIcon
          title={loadError}
          action={<Button size="small" type="link" onClick={retryLoading}>Tải lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="department_id"
        columns={columns}
        dataSource={departments}
        loading={loading}
        locale={{ emptyText: 'Chưa có phòng ban' }}
      />
      {isAdmin && (
        <DepartmentFormModal
          open={formOpen}
          department={selectedDepartment}
          onCancel={closeForm}
          onSaved={() => {
            closeForm();
            reloadDepartments();
          }}
        />
      )}
    </>
  );
}

export default Departments;
