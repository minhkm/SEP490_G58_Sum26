import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, DatePicker, Form, Space, Typography, Spin, Empty, Row, Col, Layout, Tabs } from 'antd';
import {
  UserOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  ArrowLeftOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { profileService } from '../services/api';
import { PageHeader, StatusTag, notifySuccess, notifyError, confirmDelete } from '../components/common';
import { roleLabel, positionLabel, departmentLabel } from '../config/roles';

const { Text } = Typography;
const { Header, Content } = Layout;

const STATUS_CONFIG = {
  Valid: { color: 'green', icon: <CheckCircleOutlined />, label: 'Còn hiệu lực' },
  Expired: { color: 'red', icon: <ExclamationCircleOutlined />, label: 'Hết hạn' },
  Expiring: { color: 'orange', icon: <ClockCircleOutlined />, label: 'Sắp hết hạn' },
};

function certDisplayStatus(cert) {
  if (cert.status === 'Expired') return 'Expired';
  if (!cert.expiryDate) return cert.status;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  if (new Date(cert.expiryDate) <= soon) return 'Expiring';
  return 'Valid';
}

const toDate = (val) => (val ? dayjs(val) : null);
const fromDate = (d) => (d ? d.format('YYYY-MM-DD') : '');

export default function CrewProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileForm] = Form.useForm();

  const [showAddCert, setShowAddCert] = useState(false);
  const [addingCert, setAddingCert] = useState(false);
  const [addForm] = Form.useForm();

  const [editingCertId, setEditingCertId] = useState(null);
  const [savingCert, setSavingCert] = useState(false);
  const [editForm] = Form.useForm();

  const load = async () => {
    try {
      const data = await profileService.getMe();
      setProfile(data);
    } catch {
      // no profile yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEditProfile = () => {
    profileForm.resetFields();
    setEditing(true);
  };

  const handleSaveProfile = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      notifyError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSaving(true);
    try {
      await profileService.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      });
      setEditing(false);
      notifySuccess('Đổi mật khẩu thành công.');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Lỗi khi đổi mật khẩu.');
    } finally {
      setSaving(false);
    }
  };

  const openAddCert = () => {
    addForm.resetFields();
    setShowAddCert(true);
  };

  const handleAddCert = async (values) => {
    if (values.expiryDate && values.issueDate && values.expiryDate.isBefore(values.issueDate)) {
      notifyError('Ngày hết hạn phải sau ngày cấp.');
      return;
    }
    const payload = {
      certificateName: values.certificateName,
      issueDate: fromDate(values.issueDate),
      expiryDate: fromDate(values.expiryDate),
      fileUrl: values.fileUrl || '',
    };
    setAddingCert(true);
    try {
      await profileService.addCertificate(payload);
      await load();
      setShowAddCert(false);
      addForm.resetFields();
      notifySuccess('Chứng chỉ đã được lưu.');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Lỗi khi thêm chứng chỉ.');
    } finally {
      setAddingCert(false);
    }
  };

  const startEditCert = (cert) => {
    setEditingCertId(cert.id);
    editForm.setFieldsValue({
      certificateName: cert.certificateName || '',
      issueDate: toDate(cert.issueDate),
      expiryDate: toDate(cert.expiryDate),
      fileUrl: cert.fileUrl || '',
    });
  };

  const handleSaveCert = async (values) => {
    if (values.expiryDate && values.issueDate && values.expiryDate.isBefore(values.issueDate)) {
      notifyError('Ngày hết hạn phải sau ngày cấp.');
      return;
    }
    const payload = {
      certificateName: values.certificateName,
      issueDate: fromDate(values.issueDate),
      expiryDate: fromDate(values.expiryDate),
      fileUrl: values.fileUrl || '',
    };
    setSavingCert(true);
    try {
      await profileService.updateCertificate(editingCertId, payload);
      await load();
      setEditingCertId(null);
      notifySuccess('Cập nhật chứng chỉ thành công.');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Lỗi khi cập nhật.');
    } finally {
      setSavingCert(false);
    }
  };

  const handleDeleteCert = async (certId, certName) => {
    if (!(await confirmDelete({ title: 'Xóa chứng chỉ?', content: certName }))) return;
    try {
      await profileService.deleteCertificate(certId);
      await load();
    } catch {
      notifyError('Không thể xóa chứng chỉ.');
    }
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f4f7fb' }}>
        <Header style={{ background: '#001529', padding: '0 32px', display: 'flex', alignItems: 'center' }}>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
            <span style={{ fontSize: 24, marginRight: 12 }}>🚢</span> CargoOps
          </div>
        </Header>
        <Content style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spin tip="Đang tải..." />
        </Content>
      </Layout>
    );
  }

  const certs = profile?.CrewCertificates || [];

  const profileFields = [
    ['Email (tên đăng nhập)', profile?.User?.username],
    ['Số điện thoại', profile?.phone || '—'],
    ['CCCD/CMND', profile?.cccd || '—'],
    ['Bộ phận', departmentLabel(profile?.department)],
    ['Chức danh', positionLabel(profile?.position) || '—'],
    ['Vai trò hệ thống', roleLabel(profile?.User?.role) || '—'],
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      <Header style={{ background: '#001529', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px' }}>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 24, marginRight: 12 }}>🚢</span> CargoOps
        </div>
        <Button 
          type="primary" 
          ghost 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
        >
          Quay lại
        </Button>
      </Header>
      <Content style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <PageHeader
          title={
            <>
              <UserOutlined style={{ marginRight: 8 }} />
              Hồ sơ của tôi
            </>
          }
        />

        <Tabs
          defaultActiveKey="profile"
          items={[
            {
              key: 'profile',
              label: (
                <Space>
                  <UserOutlined /> Hồ sơ
                </Space>
              ),
              children: (
                <>
        {/* PROFILE CARD */}
        <Card
          style={{ marginBottom: 24 }}
          title={
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Thông tin cá nhân
              </Text>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{profile?.fullName || '—'}</div>
            </div>
          }
          extra={
            !editing ? (
              <Button icon={<KeyOutlined />} onClick={startEditProfile}>
                Đổi mật khẩu
              </Button>
            ) : (
              <Button
                icon={<CloseOutlined />}
                onClick={() => setEditing(false)}
              >
                Hủy
              </Button>
            )
          }
        >
          {!editing ? (
            <Row gutter={[40, 16]}>
              {profileFields.map(([label, value]) => (
                <Col xs={24} sm={12} key={label}>
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    {label}
                  </Text>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{value}</div>
                </Col>
              ))}
            </Row>
          ) : (
            <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile}>
              <Row gutter={24}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Mật khẩu cũ" name="oldPassword" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ' }]}>
                    <Input.Password />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}></Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Mật khẩu mới" name="newPassword" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới', min: 6 }]}>
                    <Input.Password />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Xác nhận mật khẩu mới" name="confirmPassword" rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu' }]}>
                    <Input.Password />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Lưu thay đổi
              </Button>
            </Form>
          )}
        </Card>

                </>
              ),
            },
            {
              key: 'certificates',
              label: (
                <Space>
                  <SafetyCertificateOutlined /> Chứng chỉ ({certs.length})
                </Space>
              ),
              children: (
                <>
        {/* CERTIFICATES */}
        {!editing && (
        <Card
          title={
            <Space>
              <SafetyCertificateOutlined style={{ color: '#3b82f6' }} />
              <span>Chứng chỉ ({certs.length})</span>
            </Space>
          }
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddCert}>
              Thêm chứng chỉ
            </Button>
          }
        >
          {/* Form thêm chứng chỉ */}
          {showAddCert && (
            <Card type="inner" title="Thêm chứng chỉ mới" style={{ marginBottom: 16 }}>
              <Form form={addForm} layout="vertical" onFinish={handleAddCert}>
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Tên chứng chỉ"
                      name="certificateName"
                      rules={[{ required: true, message: 'Vui lòng điền đầy đủ thông tin.' }]}
                    >
                      <Input placeholder="Ví dụ: Certificate of Competency - OOW" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item
                      label="Ngày cấp"
                      name="issueDate"
                      rules={[{ required: true, message: 'Vui lòng điền đầy đủ thông tin.' }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(current) => current && current > dayjs().endOf('day')} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item
                      label="Ngày hết hạn"
                      name="expiryDate"
                      rules={[{ required: true, message: 'Vui lòng điền đầy đủ thông tin.' }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(current) => current && current < dayjs().startOf('day')} />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label={
                        <span>
                          Link tài liệu{' '}
                          <Text type="secondary">(tùy chọn — Google Drive, Dropbox...)</Text>
                        </span>
                      }
                      name="fileUrl"
                    >
                      <Input placeholder="https://drive.google.com/..." />
                    </Form.Item>
                  </Col>
                </Row>
                <Space>
                  <Button type="primary" htmlType="submit" loading={addingCert}>
                    Lưu
                  </Button>
                  <Button onClick={() => setShowAddCert(false)}>Hủy</Button>
                </Space>
              </Form>
            </Card>
          )}

          {/* Danh sách chứng chỉ */}
          {certs.length === 0 ? (
            <Empty description='Chưa có chứng chỉ nào. Nhấn "Thêm chứng chỉ" để bắt đầu.' />
          ) : (
            certs.map((cert) => {
              const displayStatus = certDisplayStatus(cert);
              const cfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Valid;
              const isEditing = editingCertId === cert.id;

              return (
                <div
                  key={cert.id}
                  style={{ borderBottom: '1px solid #f1f5f9', padding: '14px 0' }}
                >
                  {!isEditing && (
                    <Row align="middle" justify="space-between" gutter={16}>
                      <Col flex="auto">
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{cert.certificateName}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Cấp: {cert.issueDate || '—'} · Hết hạn: {cert.expiryDate || '—'}
                        </Text>
                      </Col>
                      <Col>
                        <Space>
                          <StatusTag
                            status={displayStatus}
                            color={cfg.color}
                            text={cfg.label}
                            icon={cfg.icon}
                          />
                          {cert.fileUrl && (
                            <Button
                              type="text"
                              icon={<LinkOutlined />}
                              title="Xem tài liệu"
                              href={cert.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          )}
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            title="Chỉnh sửa"
                            onClick={() => startEditCert(cert)}
                          />
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            title="Xóa"
                            onClick={() => handleDeleteCert(cert.id, cert.certificateName)}
                          />
                        </Space>
                      </Col>
                    </Row>
                  )}

                  {isEditing && (
                    <div>
                      <Text strong>Chỉnh sửa chứng chỉ</Text>
                      <Form
                        form={editForm}
                        layout="vertical"
                        onFinish={handleSaveCert}
                        style={{ marginTop: 12 }}
                      >
                        <Row gutter={12}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Tên chứng chỉ"
                              name="certificateName"
                              rules={[
                                { required: true, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' },
                              ]}
                            >
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={6}>
                            <Form.Item
                              label="Ngày cấp"
                              name="issueDate"
                              rules={[
                                { required: true, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' },
                              ]}
                            >
                              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(current) => current && current > dayjs().endOf('day')} />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={6}>
                            <Form.Item
                              label="Ngày hết hạn"
                              name="expiryDate"
                              rules={[
                                { required: true, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' },
                              ]}
                            >
                              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(current) => current && current < dayjs().startOf('day')} />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item
                              label={
                                <span>
                                  Link tài liệu <Text type="secondary">(tùy chọn)</Text>
                                </span>
                              }
                              name="fileUrl"
                            >
                              <Input placeholder="https://drive.google.com/..." />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Space>
                          <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={savingCert}
                          >
                            Lưu
                          </Button>
                          <Button onClick={() => setEditingCertId(null)}>Hủy</Button>
                        </Space>
                      </Form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Card>
        )}
                </>
              ),
            },
          ]}
        />
      </Content>
    </Layout>
  );
}
