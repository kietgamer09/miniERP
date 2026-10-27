import React, { useEffect, useRef, useState } from 'react';
import { App, Modal, Form, Input, Select, DatePicker, Button, Space, Typography, Row, Col } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { createEmployee, updateEmployee } from '../services/employeeApi';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { Option } = Select;

function employeeValues(employee) {
  return {
    fullname: employee.fullname || '',
    phone_number: employee.phone_number || '',
    email: employee.email || '',
    department_id: employee.department_id || undefined,
    position: employee.position || '',
    birthday: employee.birthday ? dayjs(employee.birthday, 'DD/MM/YYYY', true) : null,
    status: employee.status || 'dang_lam_viec',
  };
}

export default function EmployeeFormModal({ open, employee, departments, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const submitting = useRef(false);

  const isEditing = !!employee;

  useEffect(() => {
    if (open) {
      if (employee) {
        form.setFieldsValue(employeeValues(employee));
        setIsEditingMode(false);
      } else {
        form.resetFields();
        form.setFieldsValue({ status: 'dang_lam_viec' });
        setIsEditingMode(true);
      }
    }
  }, [open, employee, form]);

  async function handleSubmit(values) {
    if (submitting.current) return;
    submitting.current = true;
    setConfirmLoading(true);
    try {
      const payload = {
        ...values,
        birthday: values.birthday ? values.birthday.format('DD/MM/YYYY') : null,
      };

      let result;
      if (isEditing) {
        result = await updateEmployee(employee.employee_id, payload);
        message.success('Cập nhật thông tin nhân viên thành công');
      } else {
        result = await createEmployee(payload);
        message.success('Thêm nhân viên và khởi tạo tài khoản thành công');
      }
      onSaved(result);
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra');
    } finally {
      submitting.current = false;
      setConfirmLoading(false);
    }
  }

  const cancelButtonStyle = {
    borderRadius: 6,
    color: 'var(--muted)',
    borderColor: '#d9d9d9',
  };

  const cancelBtnHoverProps = {
    onMouseEnter: (e) => {
      e.currentTarget.style.color = 'var(--red-text)';
      e.currentTarget.style.borderColor = 'var(--red-text)';
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.color = 'var(--muted)';
      e.currentTarget.style.borderColor = '#d9d9d9';
    },
  };

  return (
    <Modal
      open={open}
      onCancel={() => { if (!submitting.current) onCancel(); }}
      footer={null}
      width={750}
      centered
      forceRender
      closable={false}
      styles={{ body: { padding: 24 } }}
    >
      <div className="employee-form-header">
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
              <Button disabled={confirmLoading} onClick={onCancel} style={cancelButtonStyle} {...cancelBtnHoverProps}>
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
              <Button disabled={confirmLoading} onClick={() => {
                form.setFieldsValue(employeeValues(employee));
                setIsEditingMode(false);
              }} style={cancelButtonStyle} {...cancelBtnHoverProps}>
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

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 20 }} />

      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleSubmit}
        disabled={confirmLoading}
      >
        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="fullname"
              label={<span style={{ color: 'var(--muted)', fontSize: 13 }}>Tên đầy đủ</span>}
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                  {employee?.fullname || '---'}
                </div>
              ) : (
                <Input placeholder="Nhập họ và tên" style={{ borderRadius: 6 }} />
              )}
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="phone_number"
              label={<span style={{ color: 'var(--muted)', fontSize: 13 }}>Số điện thoại (Username)</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                  {employee?.phone_number || '---'}
                </div>
              ) : (
                <Input placeholder="Nhập số điện thoại" style={{ borderRadius: 6 }} />
              )}
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="department_id"
              label={<span style={{ color: 'var(--muted)', fontSize: 13 }}>Phòng ban</span>}
              rules={[{ required: true, message: 'Vui lòng chọn phòng ban!' }]}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
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

          <Col xs={24} sm={12}>
            <Form.Item
              name="position"
              label={<span style={{ color: 'var(--muted)', fontSize: 13 }}>Chức vụ / Vị trí</span>}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                  {employee?.position || 'Chưa cập nhật'}
                </div>
              ) : (
                <Input placeholder="Nhập chức vụ" style={{ borderRadius: 6 }} />
              )}
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label={<span style={{ color: 'var(--muted)', fontSize: 13 }}>Email</span>}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                  {employee?.email || 'Chưa cập nhật'}
                </div>
              ) : (
                <Input placeholder="Nhập email" style={{ borderRadius: 6 }} />
              )}
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="birthday"
              label={<span style={{ color: 'var(--muted)', fontSize: 13 }}>Ngày sinh</span>}
            >
              {isEditing && !isEditingMode ? (
                <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
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
            <Col xs={24} sm={12}>
              <Form.Item
                name="status"
                label={<span style={{ color: 'var(--muted)', fontSize: 13 }}>Trạng thái làm việc</span>}
                rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
              >
                {!isEditingMode ? (
                  <div style={{ fontWeight: 500, fontSize: 15, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                    {form.getFieldValue('status') === 'da_nghi_viec' ? (
                      <span style={{ color: 'var(--red-text)' }}>Đã nghỉ việc</span>
                    ) : (
                      <span style={{ color: 'var(--green-text)' }}>Đang làm việc</span>
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
