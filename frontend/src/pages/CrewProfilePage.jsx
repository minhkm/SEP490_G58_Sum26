import { useState, useEffect } from 'react';
import { Card, Button, Input, DatePicker, Form, Space, Typography, Spin, Empty, Row, Col } from 'antd';
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import MasterLayout from '../components/MasterLayout';
import { profileService } from '../services/api';
import { PageHeader, StatusTag, notifySuccess, notifyError, confirmDelete } from '../components/common';

const { Text } = Typography;

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
    profileForm.setFieldsValue({ fullName: profile?.fullName || '', phone: profile?.phone || '' });
    setEditing(true);
  };

  const handleSaveProfile = async (values) => {
    setSaving(true);
    try {
      await profileService.updateMe(values);
      const updated = await profileService.getMe();
      setProfile(updated);
      setEditing(false);
      notifySuccess('Cập nhật hồ sơ thành công.');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Lỗi khi lưu.');
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
      <MasterLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spin tip="Đang tải..." />
        </div>
      </MasterLayout>
    );
  }

  const certs = profile?.CrewCertificates || [];

  const profileFields = [
    ['Email (tên đăng nhập)', profile?.User?.username],
    ['Số điện thoại', profile?.phone || '—'],
    ['CCCD/CMND', profile?.cccd || '—'],
    [
      'Bộ phận',
      profile?.department === 'Deck'
        ? 'Boong (Deck)'
        : profile?.department === 'Engine'
        ? 'Máy (Engine)'
        : profile?.department || '—',
    ],
    ['Chức danh', profile?.position || '—'],
    ['Vai trò hệ thống', profile?.User?.role || '—'],
  ];

  return (
    <MasterLayout>
      <div style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>
        <PageHeader
          title={
            <>
              <UserOutlined style={{ marginRight: 8 }} />
              Hồ sơ của tôi
            </>
          }
        />

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
              <Button icon={<EditOutlined />} onClick={startEditProfile}>
                Chỉnh sửa
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
                  <Form.Item
                    label="Họ và tên"
                    name="fullName"
                    rules={[{ required: true, message: 'Vui lòng nhập họ và tên.' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Số điện thoại" name="phone">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="Email — không thể thay đổi">
                    <Input value={profile?.User?.username || ''} disabled />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Lưu thay đổi
              </Button>
            </Form>
          )}
        </Card>

        {/* CERTIFICATES */}
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
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item
                      label="Ngày hết hạn"
                      name="expiryDate"
                      rules={[{ required: true, message: 'Vui lòng điền đầy đủ thông tin.' }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
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
                              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
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
                              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
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
      </div>
    </MasterLayout>
  );
}
