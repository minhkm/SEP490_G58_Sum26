import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Select, Button, Card, Row, Col, Space, Spin, Alert } from 'antd';
import { SaveOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import { crewService } from '../services/api';
import { PageHeader, notifySuccess, notifyError } from '../components/common';

export default function AddCrewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  // Theo dõi role để khóa/mở các trường phụ thuộc
  const [role, setRole] = useState('Sailor');

  useEffect(() => {
    if (isEditMode) {
      fetchCrew();
    }
  }, [id]);

  const fetchCrew = async () => {
    try {
      const data = await crewService.getById(id);
      const nextRole = data.User?.role || 'Sailor';
      setRole(nextRole);
      form.setFieldsValue({
        fullName: data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        cccd: data.cccd || '',
        department: data.department || 'Deck',
        position: data.position || '',
        role: nextRole,
        status: data.User?.status || 'Active',
      });
    } catch (error) {
      console.error('Lỗi khi lấy thông tin:', error);
      notifyError('Không thể tải thông tin thủy thủ.');
    } finally {
      setLoading(false);
    }
  };

  const isLockedRole = role === 'Master' || role === 'ChiefOfficer';

  const handleRoleChange = (value) => {
    setRole(value);
    if (value === 'Master') {
      form.setFieldsValue({ role: value, department: 'None', position: 'Thuyền trưởng' });
    } else if (value === 'ChiefOfficer') {
      form.setFieldsValue({ role: value, department: 'None', position: 'Đại phó' });
    } else {
      const prevDepartment = form.getFieldValue('department');
      const prevRole = form.getFieldValue('role');
      form.setFieldsValue({
        role: value,
        department: prevDepartment === 'None' ? 'Deck' : prevDepartment,
        position: prevRole === 'Master' || prevRole === 'ChiefOfficer' ? '' : form.getFieldValue('position'),
      });
    }
  };

  const handleSubmit = async (values) => {
    if (values.cccd) {
      if (!values.cccd.startsWith('0') || values.cccd.length !== 12 || !/^\d+$/.test(values.cccd)) {
        notifyError('CCCD phải bắt đầu bằng số 0 và bao gồm đúng 12 chữ số.');
        return;
      }
    }

    if (values.phone) {
      if (!values.phone.startsWith('0') || values.phone.length !== 10 || !/^\d+$/.test(values.phone)) {
        notifyError('Số điện thoại phải bắt đầu bằng số 0 và bao gồm đúng 10 chữ số.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await crewService.update(id, values);
        notifySuccess('Cập nhật thông tin thủy thủ thành công!');
      } else {
        await crewService.create(values);
        notifySuccess('Thêm thủy thủ mới thành công!');
      }
      navigate('/crews');
    } catch (error) {
      console.error('Lỗi lưu thủy thủ:', error);
      notifyError(error.response?.data?.message || 'Có lỗi hệ thống xảy ra khi lưu thông tin thủy thủ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AgencyLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spin tip="Đang tải dữ liệu..." />
        </div>
      </AgencyLayout>
    );
  }

  return (
    <AgencyLayout>
      <div style={{ padding: '24px 32px', maxWidth: 1000, margin: '0 auto' }}>
        <PageHeader
          onBack={() => navigate('/crews')}
          title={isEditMode ? 'Cập nhật Thủy thủ' : 'Thêm Thủy thủ mới'}
          breadcrumb="Điền thông tin hồ sơ và tài khoản đăng nhập"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            fullName: '',
            email: '',
            phone: '',
            cccd: '',
            department: 'Deck',
            position: '',
            role: 'Sailor',
            status: 'Active',
            password: '',
          }}
        >
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <TeamOutlined />
                    Thông tin Cá nhân
                  </Space>
                }
                style={{ marginBottom: 16 }}
              >
                <Form.Item
                  label="Họ và Tên"
                  name="fullName"
                  rules={[{ required: true, message: 'Vui lòng điền đầy đủ Họ tên và Email.' }]}
                >
                  <Input placeholder="Ví dụ: Nguyễn Văn A" />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="CCCD" name="cccd">
                      <Input placeholder="Mã định danh" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Số điện thoại" name="phone">
                      <Input placeholder="+84..." />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <TeamOutlined />
                    Phân công Công tác
                  </Space>
                }
                style={{ marginBottom: 16 }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Bộ phận" name="department">
                      <Select disabled={isLockedRole}>
                        <Select.Option value="None">Không thuộc bộ phận (None)</Select.Option>
                        <Select.Option value="Deck">Bộ phận Boong (Deck)</Select.Option>
                        <Select.Option value="Engine">Bộ phận Máy (Engine)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Chức vụ (Position)" name="position">
                      <Input placeholder="Ví dụ: Máy trưởng" readOnly={isLockedRole} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Quyền hệ thống (Role)" name="role">
                      <Select onChange={handleRoleChange}>
                        <Select.Option value="Master">Thuyền trưởng (Master)</Select.Option>
                        <Select.Option value="ChiefOfficer">Đại phó (Chief Officer)</Select.Option>
                        <Select.Option value="DeckOfficer">Sĩ quan boong (Deck Officer)</Select.Option>
                        <Select.Option value="EngineOfficer">Sĩ quan máy (Engine Officer)</Select.Option>
                        <Select.Option value="Sailor">Thủy thủ (Sailor)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Trạng thái" name="status">
                      <Select>
                        <Select.Option value="Active">Đang công tác (Active)</Select.Option>
                        <Select.Option value="Inactive">Tạm nghỉ (Inactive)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={24}>
              <Card
                title={
                  <Space>
                    <WarningOutlined style={{ color: '#dc2626' }} />
                    <span style={{ color: '#991b1b' }}>Tài khoản Đăng nhập</span>
                  </Space>
                }
                style={{ marginBottom: 16 }}
              >
                <Form.Item
                  label="Email (Tên đăng nhập)"
                  name="email"
                  rules={[
                    { required: true, message: 'Vui lòng điền đầy đủ Họ tên và Email.' },
                    { type: 'email', message: 'Email không hợp lệ.' },
                  ]}
                >
                  <Input placeholder="abc@cargoops.vn" disabled={isEditMode} />
                </Form.Item>
                {isEditMode ? (
                  <Form.Item label="Mật khẩu mới (Bỏ trống nếu không đổi)" name="password">
                    <Input placeholder="Tự nhập mật khẩu" />
                  </Form.Item>
                ) : (
                  <Alert
                    type="info"
                    showIcon
                    message={
                      <span style={{ fontSize: 13 }}>
                        <strong>Bảo mật tài khoản:</strong> Mật khẩu sẽ được hệ thống tự động sinh ngẫu
                        nhiên (chống đoán ngược) và gửi trực tiếp về địa chỉ Email trên.
                        <br />
                        Thủy thủ sẽ <strong>bắt buộc phải đổi mật khẩu</strong> ở lần đăng nhập đầu tiên
                        vào hệ thống.
                      </span>
                    }
                  />
                )}
              </Card>
            </Col>
          </Row>

          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => navigate('/crews')}>Hủy bỏ</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              {isEditMode ? 'Lưu thay đổi' : 'Khởi tạo Thủy thủ'}
            </Button>
          </Space>
        </Form>
      </div>
    </AgencyLayout>
  );
}
