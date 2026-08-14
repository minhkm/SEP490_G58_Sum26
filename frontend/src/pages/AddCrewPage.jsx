import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Select, Button, Card, Row, Col, Space, Spin, Alert, Tabs, notification, Typography } from 'antd';
import { SaveOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import AdminLayout from '../components/AdminLayout';
import { crewService } from '../services/api';
import { PageHeader, PageContainer, notifySuccess, notifyError } from '../components/common';

// Chức vụ được suy ra từ quyền hệ thống — người dùng không nhập tay nữa.
const POSITION_BY_ROLE = {
  Master: 'Thuyền trưởng',
  ChiefOfficer: 'Đại phó',
  DeckOfficer: 'Sĩ quan boong',
  Sailor: 'Thủy thủ',
  EngineOfficer: 'Máy trưởng',
  EngineCrew: 'Thợ máy',
};

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
    if (value === 'Master' || value === 'ChiefOfficer') {
      form.setFieldsValue({ role: value, department: 'None', position: POSITION_BY_ROLE[value] });
    } else {
      const prevDepartment = form.getFieldValue('department');
      form.setFieldsValue({
        role: value,
        department: prevDepartment === 'None' ? 'Deck' : prevDepartment,
        position: POSITION_BY_ROLE[value] || '',
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
        const emailSent = response?.emailSent ?? response?.data?.emailSent;
        if (tempPass) {
          notification.success({
            message: emailSent
              ? 'Thêm thủy thủ và gửi email thành công!'
              : 'Thêm thủy thủ thành công nhưng email chưa gửi được!',
            description: (
              <div>
                <p style={{ marginBottom: 8, color: emailSent ? '#389e0d' : '#cf1322' }}>
                  {emailSent
                    ? `Gmail API đã gửi email tới ${values.email}.`
                    : 'Hãy kiểm tra Railway Logs và các biến GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN.'}
                </p>
                <p style={{ marginBottom: 4 }}>Mật khẩu tạm thời của thủy thủ là:</p>
                <Typography.Text copyable style={{ fontSize: '18px', fontWeight: 'bold', color: '#1677ff' }}>
                  {tempPass}
                </Typography.Text>
                {!emailSent && (
                  <p style={{ color: '#cf1322', marginTop: 8, fontSize: '13px' }}>
                    Vui lòng sao chép mật khẩu để gửi thủ công nếu cần.
                  </p>
                )}
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
            position: POSITION_BY_ROLE.Sailor,
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
                {/* Chức vụ được hệ thống tự suy ra từ quyền hệ thống — ẩn khỏi giao diện */}
                <Form.Item name="position" hidden>
                  <Input />
                </Form.Item>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Bộ phận" name="department">
                      <Select disabled={isLockedRole}>
                        <Select.Option value="None">Không thuộc bộ phận</Select.Option>
                        <Select.Option value="Deck">Bộ phận Boong</Select.Option>
                        <Select.Option value="Engine">Bộ phận Máy</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Quyền hệ thống" name="role">
                      <Select onChange={handleRoleChange}>
                        <Select.Option value="Master">Thuyền trưởng</Select.Option>
                        <Select.Option value="ChiefOfficer">Đại phó</Select.Option>
                        <Select.Option value="DeckOfficer">Sĩ quan boong</Select.Option>
                        <Select.Option value="Sailor">Thủy thủ</Select.Option>
                        <Select.Option value="EngineOfficer">Máy trưởng</Select.Option>
                        <Select.Option value="EngineCrew">Thợ máy</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    {/* Trạng thái do hệ thống quản lý (mặc định Sẵn sàng), người dùng không được đổi */}
                    <Form.Item
                      label="Trạng thái"
                      name="status"
                      tooltip="Trạng thái do hệ thống tự quản lý theo hải trình, không thể chỉnh sửa thủ công."
                    >
                      <Select disabled>
                        <Select.Option value="Available">Sẵn sàng (Available)</Select.Option>
                        <Select.Option value="OnLeave">Nghỉ phép (On Leave)</Select.Option>
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
