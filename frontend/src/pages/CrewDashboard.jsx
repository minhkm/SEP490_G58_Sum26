import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag, Alert, Button, Row, Col, Space, Typography } from 'antd';
import {
  UserOutlined,
  CompassOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { profileService } from '../services/api';

const { Title, Text } = Typography;

const ROLE_LABELS = {
  DeckOfficer: 'Sĩ quan Boong',
  EngineOfficer: 'Sĩ quan Máy',
  Sailor: 'Thủy thủ / Thợ máy',
  ChiefOfficer: 'Đại phó',
  Master: 'Thuyền trưởng',
};

const DEPT_LABELS = {
  Deck: 'Bộ phận Boong',
  Engine: 'Bộ phận Máy',
};

export default function CrewDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [expiredCerts, setExpiredCerts] = useState([]);

  useEffect(() => {
    profileService
      .getMe()
      .then((data) => {
        setProfile(data);
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        const soonStr = soon.toISOString().split('T')[0];
        const warn = (data.CrewCertificates || []).filter(
          (c) => c.status === 'Expired' || (c.expiryDate && c.expiryDate <= soonStr)
        );
        setExpiredCerts(warn);
      })
      .catch(() => {});
  }, []);

  const activeVoyageRole = localStorage.getItem('activeVoyageRole');
  const roleLabelStr = ROLE_LABELS[activeVoyageRole || user.role] || (activeVoyageRole || user.role);
  const deptLabel = profile ? DEPT_LABELS[profile.department] || profile.department : '';

  const quickLinks = [
    {
      icon: <UserOutlined style={{ fontSize: 28 }} />,
      label: 'Hồ sơ của tôi',
      sub: 'Xem & cập nhật thông tin',
      path: '/crew-profile',
      color: '#3b82f6',
    },
    {
      icon: <CompassOutlined style={{ fontSize: 28 }} />,
      label: 'Hải trình',
      sub: 'Xem các hải trình',
      path: '/voyages',
      color: '#10b981',
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 28 }} />,
      label: 'Ca trực',
      sub: 'Lịch & nhật ký ca trực',
      path: null,
      color: '#f59e0b',
      disabled: true,
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 28 }} />,
      label: 'Báo cáo',
      sub: 'Báo cáo vận hành',
      path: null,
      color: '#8b5cf6',
      disabled: true,
    },
  ];

  const summaryFields = profile
    ? [
        ['Email', profile.User?.username],
        ['Điện thoại', profile.phone || '—'],
        ['CCCD', profile.cccd || '—'],
        ['Chức danh', profile.position || '—'],
        ['Chứng chỉ', `${(profile.CrewCertificates || []).length} chứng chỉ`],
      ]
    : [];

  return (
    <MasterLayout>
      <div style={{ padding: '24px 32px' }}>
        {/* Welcome header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
            borderRadius: '16px',
            padding: '28px 32px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            color: '#fff',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: 64,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RocketOutlined style={{ fontSize: 32, color: '#60a5fa' }} />
          </div>
          <div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>Chào mừng trở lại</p>
            <h2 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 700 }}>
              {profile?.fullName || user.fullName || user.username}
            </h2>
            <Space>
              <Tag color="blue">{roleLabelStr}</Tag>
              {deptLabel && <Tag>{deptLabel}</Tag>}
              {profile?.position && <Tag>{profile.position}</Tag>}
            </Space>
          </div>
        </div>

        {/* Cảnh báo chứng chỉ sắp hết hạn */}
        {expiredCerts.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
            message={
              <span>
                <strong>Chứng chỉ cần lưu ý:</strong>{' '}
                {expiredCerts.map((c) => c.certificateName).join(', ')} — kiểm tra tại{' '}
                <span
                  style={{ textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => navigate('/crew-profile')}
                >
                  Hồ sơ của tôi
                </span>
              </span>
            }
          />
        )}

        {/* Quick links */}
        <Title level={4} style={{ marginBottom: 16 }}>
          Truy cập nhanh
        </Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          {quickLinks.map((q, i) => (
            <Col xs={24} sm={12} md={8} lg={6} key={i}>
              <Card
                hoverable={!q.disabled}
                onClick={() => !q.disabled && q.path && navigate(q.path)}
                style={{ opacity: q.disabled ? 0.5 : 1, cursor: q.disabled ? 'default' : 'pointer' }}
              >
                <div style={{ color: q.color, marginBottom: 10 }}>{q.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{q.label}</div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {q.sub}
                </Text>
                {q.disabled && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Sắp ra mắt</div>
                )}
              </Card>
            </Col>
          ))}
        </Row>

        {/* Thông tin tóm tắt hồ sơ */}
        {profile && (
          <Card
            title="Thông tin hồ sơ"
            extra={<Button onClick={() => navigate('/crew-profile')}>Chỉnh sửa</Button>}
          >
            <Row gutter={[32, 10]}>
              {summaryFields.map(([label, value]) => (
                <Col xs={24} sm={12} key={label}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {label}
                  </Text>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
                </Col>
              ))}
            </Row>
          </Card>
        )}
      </div>
    </MasterLayout>
  );
}
