import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, message, Button, Space, Typography, Row, Col } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { createEmployee, updateEmployee } from '../services/employeeApi';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function EmployeeFormModal({ open, employee, departments, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);

  const isEditing = !!employee;

  useEffect(() => {
    if (open) {
      if (employee) {
        form.setFieldsValue({
          fullname: employee.fullname || '',
          phone_number: employee.phone_number || '',
          email: employee.email || '',
          department_id: employee.department_id || undefined,
          position: employee.position || '',
          birthday: employee.birthday ? dayjs(employee.birthday, 'DD/MM/YYYY') : null,
          status: employee.status || 'dang_lam_viec',
        });
        setIsEditingMode(false);
      } else {
        form.resetFields();
        form.setFieldsValue({ status: 'dang_lam_viec' });
        setIsEditingMode(true);
      }
    }
  }, [open, employee, form]);

  async function handleSubmit(values) {
    setConfirmLoading(true);
    try {
      const payload = {
        ...values,
        birthday: values.birthday ? values.birthday.format('DD/MM/YYYY') : null,
      };

      if (isEditing) {
        await updateEmployee(employee.employee_id, payload);
        message.success('Cập nhật thông tin nhân viên thành công');
      } else {
        await createEmployee(payload);
        message.success('Thêm nhân viên và khởi tạo tài khoản thành công');
      }
      onSaved();
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setConfirmLoading(false);
    }
  }

  const cancelButtonStyle = {
    borderRadius: 6,
    color: '#595959',
    borderColor: '#d9d9d9',
  };

  const cancelBtnHoverProps = {
    onMouseEnter: (e) => {
      e.currentTarget.style.color = '#ff4d4f';
      e.currentTarget.style.borderColor = '#ff4d4f';
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.color = '#595959';
      e.currentTarget.style.borderColor = '#d9d9d9';
    },
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={750}
      centered
      destroyOnClose
      closable={false}
      bodyStyle={{ padding: 24 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
            {isEditing ? 'Thông tin nhân viên' : 'Thêm nhân viên mới'}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {isEditing ? 'Chi tiết thông tin chi tiết của thành viên' : 'Nhập thông tin để khởi tạo nhân sự mới'}
          </Text>
        </div>

        <Space size={8}>
          {!isEditing ? (
            <>
              <Button onClick={onCancel} style={cancelButtonStyle} {...cancelBtnHoverProps}>
                Hủy
              </Button>
              <Button 
                type="primary" 
                loading={confirmLoading}
                onClick={() => form.submit()}
                style={{ borderRadius: 6 }}
              >
                Thêm
              </Button>
            </>
          ) : !isEditingMode ? (
            <>
              <Button onClick={onCancel} style={cancelButtonStyle} {...cancelBtnHoverProps}>
                Đóng
              </Button>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => setIsEditingMode(true)}
                style={{ borderRadius: 6 }}
              >
                Sửa
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditingMode(false)} style={cancelButtonStyle} {...cancelBtnHoverProps}>
                Hủy
              </Button>
              <Button 
                type="primary" 
                loading={confirmLoading}
                onClick={() => form.submit()}
                style={{ borderRadius: 6 }}
              >
                Lưu
              </Button>
            </>
          )}
        </Space>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', marginBottom: 20 }} />

      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleSubmit}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="fullname"
              label={<span style={{ color: '#8c8c8c', fontSize: 13 }}>Tên đầy đủ</span>}
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid #f5f5f5' }}>
                  {employee?.fullname || '---'}
                </div>
              ) : (
                <Input placeholder="Nhập họ và tên" style={{ borderRadius: 6 }} />
              )}
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="phone_number"
              label={<span style={{ color: '#8c8c8c', fontSize: 13 }}>Số điện thoại (Username)</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid #f5f5f5' }}>
                  {employee?.phone_number || '---'}
                </div>
              ) : (
                <Input placeholder="Nhập số điện thoại" style={{ borderRadius: 6 }} />
              )}
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="department_id"
              label={<span style={{ color: '#8c8c8c', fontSize: 13 }}>Phòng ban</span>}
              rules={[{ required: true, message: 'Vui lòng chọn phòng ban!' }]}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid #f5f5f5' }}>
                  {departments.find(d => d.department_id === employee?.department_id)?.department_name || employee?.departments?.department_name || 'Chưa phân ban'}
                </div>
              ) : (
                <Select placeholder="Chọn phòng ban" style={{ width: '100%' }}>
                  {departments.map((dept) => (
                    <Option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </Option>
                  ))}
                </Select>
              )}
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="position"
              label={<span style={{ color: '#8c8c8c', fontSize: 13 }}>Chức vụ / Vị trí</span>}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid #f5f5f5' }}>
                  {employee?.position || 'Chưa cập nhật'}
                </div>
              ) : (
                <Input placeholder="Nhập chức vụ" style={{ borderRadius: 6 }} />
              )}
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="email"
              label={<span style={{ color: '#8c8c8c', fontSize: 13 }}>Email</span>}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid #f5f5f5' }}>
                  {employee?.email || 'Chưa cập nhật'}
                </div>
              ) : (
                <Input placeholder="Nhập email" style={{ borderRadius: 6 }} />
              )}
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="birthday"
              label={<span style={{ color: '#8c8c8c', fontSize: 13 }}>Ngày sinh</span>}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid #f5f5f5' }}>
                  {employee?.birthday || 'Chưa cập nhật'}
                </div>
              ) : (
                <DatePicker style={{ width: '100%', borderRadius: 6 }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
              )}
            </Form.Item>
          </Col>
        </Row>

        {/* Trường Trạng thái làm việc */}
        {isEditing && (
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="status"
                label={<span style={{ color: '#8c8c8c', fontSize: 13 }}>Trạng thái làm việc</span>}
                rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
              >
                {!isEditingMode ? (
                  <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid #f5f5f5' }}>
                    {employee?.status === 'da_nghi_viec' ? (
                      <span style={{ color: '#ff4d4f' }}>Đã nghỉ việc</span>
                    ) : (
                      <span style={{ color: '#52c41a' }}>Đang làm việc</span>
                    )}
                  </div>
                ) : (
                  <Select placeholder="Chọn trạng thái" style={{ width: '100%' }}>
                    <Option value="dang_lam_viec">Đang làm việc</Option>
                    <Option value="da_nghi_viec">Đã nghỉ việc</Option>
                  </Select>
                )}
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>
    </Modal>
  );
}