import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Select, Button, Card, Row, Col, Space, Spin, Alert, Tabs, notification, Typography } from 'antd';
import { SaveOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import AdminLayout from '../components/AdminLayout';
import { crewService } from '../services/api';
import { PageHeader, PageContainer, notifySuccess, notifyError } from '../components/common';

export default function AddCrewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [isOnVoyage, setIsOnVoyage] = useState(false);
  // Theo dõi role để khóa/mở các trường phụ thuộc
  const [role, setRole] = useState('Sailor');
  // Tab đang mở
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (!isEditMode) return;
    let isMounted = true;
    crewService.getById(id)
      .then((data) => {
        if (!isMounted) return;
        const nextRole = data.User?.role || 'Sailor';
        const onVoyage = Boolean(data.isOnVoyage || data.User?.status === 'OnVoyage');
        setIsOnVoyage(onVoyage);
        setRole(nextRole);
        form.setFieldsValue({
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          cccd: data.cccd || '',
          department: data.department || 'Deck',
          position: data.position || '',
          role: nextRole,
          status: data.User?.status || 'Available',
        });
      })
      .catch((error) => {
        console.error('Lỗi khi lấy thông tin:', error);
        notifyError('Không thể tải thông tin thủy thủ.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, form]);

  const isLockedRole = role === 'Master' || role === 'ChiefOfficer' || isOnVoyage;

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
    if (isOnVoyage) {
      notifyError('Không thể chỉnh sửa thông tin của thuyền viên đang tham gia hải trình!');
      return;
    }

    if (values.cccd) {
      if (!values.cccd.startsWith('0') || values.cccd.length !== 12 || !/^\d+$/.test(values.cccd)) {
        setActiveTab('personal');
        notifyError('CCCD phải bắt đầu bằng số 0 và bao gồm đúng 12 chữ số.');
        return;
      }
    }

    if (values.phone) {
      if (!values.phone.startsWith('0') || values.phone.length !== 10 || !/^\d+$/.test(values.phone)) {
        setActiveTab('personal');
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
        const response = await crewService.create(values);
        const tempPass = response?.temporaryPassword || response?.data?.temporaryPassword;
        if (tempPass) {
          notification.success({
            message: 'Thêm thủy thủ mới thành công!',
            description: (
              <div>
                <p style={{ marginBottom: 4 }}>Mật khẩu tạm thời của thủy thủ là:</p>
                <Typography.Text copyable style={{ fontSize: '18px', fontWeight: 'bold', color: '#1677ff' }}>
                  {tempPass}
                </Typography.Text>
                <p style={{ color: '#cf1322', marginTop: 8, fontSize: '13px' }}>
                  (Lưu ý: Vui lòng Copy và gửi thủ công vì Server miễn phí đang chặn gửi Mail)
                </p>
              </div>
            ),
            duration: 0, // Không bao giờ tự động đóng
            placement: 'topRight'
          });
        } else {
          notifySuccess('Thêm thủy thủ mới thành công!');
        }
      }
      navigate('/crews');
    } catch (error) {
      console.error('Lỗi lưu thủy thủ:', error);
      notifyError(error.response?.data?.message || 'Có lỗi hệ thống xảy ra khi lưu thông tin thủy thủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Khi validation của Form fail → nhảy tới tab chứa field lỗi đầu tiên
  const FIELD_TO_TAB = { fullName: 'personal', email: 'account' };
  const handleFinishFailed = ({ errorFields }) => {
    if (!errorFields || !errorFields.length) return;
    const firstField = errorFields[0].name[0];
    const tab = FIELD_TO_TAB[firstField];
    if (tab) setActiveTab(tab);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spin tip="Đang tải dữ liệu..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageContainer style={{ maxWidth: 1000, margin: '0 auto' }}>
        <PageHeader
          onBack={() => navigate('/crews')}
          title={isEditMode ? 'Cập nhật Thủy thủ' : 'Thêm Thủy thủ mới'}
          breadcrumb="Điền thông tin hồ sơ và tài khoản đăng nhập"
        />

        {isOnVoyage && (
          <Alert
            type="error"
            showIcon
            message="Thuyền viên đang tham gia hải trình hoạt động"
            description="Hồ sơ nhân sự này đang được phân công trong một hải trình chưa hoàn thành. Hệ thống tạm khóa chỉnh sửa để đảm bảo tính toàn vẹn dữ liệu cho đến khi chuyến đi kết thúc."
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          disabled={isOnVoyage}
          onFinish={handleSubmit}
          onFinishFailed={handleFinishFailed}
          initialValues={{
            fullName: '',
            email: '',
            phone: '',
            cccd: '',
            department: 'Deck',
            position: '',
            role: 'Sailor',
            status: 'Available',
            password: '',
          }}
        >
          <Tabs
            type="card"
            size="large"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'personal',
                forceRender: true,
                label: 'Thông tin cá nhân',
                children: (
              <Card
                title={
                  <Space>
                    <TeamOutlined />
                    Thông tin Cá nhân
                  </Space>
                }
              >
                <Form.Item
                  label="Họ và Tên"
                  name="fullName"
                  rules={[{ required: true, message: 'Vui lòng điền đầy đủ Họ tên và Email.' }]}
                >
                  <Input placeholder="Ví dụ: Nguyễn Văn A" disabled={isEditMode} />
                </Form.Item>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="CCCD" name="cccd">
                      <Input placeholder="Mã định danh" disabled={isEditMode} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Số điện thoại" name="phone">
                      <Input placeholder="+84..." />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
                ),
              },
              {
                key: 'assignment',
                forceRender: true,
                label: 'Phân công công tác',
                children: (
              <Card
                title={
                  <Space>
                    <TeamOutlined />
                    Phân công Công tác
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Bộ phận" name="department">
                      <Select disabled={isLockedRole}>
                        <Select.Option value="None">Không thuộc bộ phận (None)</Select.Option>
                        <Select.Option value="Deck">Bộ phận Boong (Deck)</Select.Option>
                        <Select.Option value="Engine">Bộ phận Máy (Engine)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Chức vụ (Position)" name="position">
                      <Input placeholder="Ví dụ: Máy trưởng" readOnly={isLockedRole} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Quyền hệ thống (Role)" name="role">
                      <Select onChange={handleRoleChange}>
                        <Select.Option value="Master">Thuyền trưởng (Master)</Select.Option>
                        <Select.Option value="ChiefOfficer">Đại phó (Chief Officer)</Select.Option>
                        <Select.Option value="DeckOfficer">Sĩ quan boong (Deck Officer)</Select.Option>
                        <Select.Option value="Sailor">Thủy thủ (Sailor)</Select.Option>
                        <Select.Option value="EngineOfficer">Sĩ quan máy / Máy trưởng (Engine Officer)</Select.Option>
                        <Select.Option value="EngineCrew">Thợ máy (Engine Crew)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Trạng thái" name="status">
                      <Select>
                        <Select.Option value="Available">Sẵn sàng (Available)</Select.Option>
                        <Select.Option value="OnVoyage">Đang trên hải trình (OnVoyage)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
                ),
              },
              {
                key: 'account',
                forceRender: true,
                label: 'Tài khoản đăng nhập',
                children: (
              <Card
                title={
                  <Space>
                    <WarningOutlined style={{ color: '#dc2626' }} />
                    <span style={{ color: '#991b1b' }}>Tài khoản Đăng nhập</span>
                  </Space>
                }
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
                ),
              },
            ]}
          />

          <Space style={{ justifyContent: 'flex-end', width: '100%', marginTop: 16 }}>
            <Button onClick={() => navigate('/crews')}>Hủy bỏ</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting} disabled={isOnVoyage}>
              {isEditMode ? 'Lưu thay đổi' : 'Khởi tạo Thủy thủ'}
            </Button>
          </Space>
        </Form>
      </PageContainer>
    </AdminLayout>
  );
}
