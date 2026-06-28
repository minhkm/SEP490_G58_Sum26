import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Space } from 'antd';
import { SettingOutlined, TagOutlined, RightOutlined } from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import MasterLayout from '../components/MasterLayout';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;

  // Danh mục các mục cài đặt (chỉ Admin truy cập màn này)
  const settingItems = [
    {
      key: 'cargo-types',
      title: 'Loại Hàng hóa',
      description: 'Cấu hình danh mục loại hàng hóa dùng khi thêm lô hàng.',
      icon: <TagOutlined style={{ fontSize: 24, color: '#6366f1' }} />,
      path: '/cargo-types',
    },
  ];

  return (
    <Layout>
      <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <Space align="center" size={12} style={{ marginBottom: 4 }}>
          <SettingOutlined style={{ fontSize: 26, color: '#6366f1' }} />
          <Title level={3} style={{ margin: 0 }}>Cài đặt</Title>
        </Space>
        <p style={{ color: '#64748b', marginTop: 0, marginBottom: 24, fontSize: '0.9rem' }}>
          Quản lý cấu hình hệ thống.
        </p>

        {/* Setting cards */}
        <Row gutter={[16, 16]}>
          {settingItems.map((item) => (
            <Col xs={24} md={12} key={item.key}>
              <Card hoverable onClick={() => navigate(item.path)} styles={{ body: { padding: 20 } }}>
                <Space align="center" size={16} style={{ width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: '#eef2ff',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{item.title}</div>
                    <Text type="secondary" style={{ fontSize: '0.825rem' }}>{item.description}</Text>
                  </div>
                  <RightOutlined style={{ color: '#94a3b8' }} />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </Layout>
  );
}
