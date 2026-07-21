import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Table, Space, Button, Tag, message } from 'antd';
import { CompassOutlined, ArrowRightOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { voyageService } from '../services/api';
import { PageHeader, StatusTag } from '../components/common';

const { Content, Header } = Layout;
const { Text } = Typography;

const formatDate = (date) => {
  if (!date) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
};

export default function MyVoyagesPage() {
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchMyVoyages();
  }, []);

  const fetchMyVoyages = async () => {
    try {
      const data = await voyageService.getAll();
      setVoyages(data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách chuyến đi của bạn');
    } finally {
      setLoading(false);
    }
  };

  // Đưa chuỗi role trong VoyageCrew và role thực tế của tài khoản vào để map sang frontend role
  const parseRole = (roleStr, accountRole) => {
    if (!roleStr && !accountRole) return 'Sailor';
    const lower = (roleStr || '').toLowerCase();
    // Map vai trò rõ ràng trước
    if (lower.includes('captain') || lower.includes('master')) return 'Master';
    if (lower.includes('chief officer')) return 'ChiefOfficer';
    if (lower.includes('chief engineer') || lower.includes('engine officer')) return 'EngineOfficer';
    if (lower.includes('deck officer')) return 'DeckOfficer';
    if (lower.includes('engine crew')) return 'EngineCrew';
    // Với các chuỗi chung (“Thủy thủ”, “Crew”, v.v.), dùng role thực tế của tài khoản
    if (accountRole === 'EngineCrew') return 'EngineCrew';
    if (accountRole === 'Sailor') return 'Sailor';
    if (accountRole === 'DeckOfficer') return 'DeckOfficer';
    if (accountRole === 'EngineOfficer') return 'EngineOfficer';
    if (accountRole === 'ChiefEngineer') return 'EngineOfficer'; // legacy
    return 'Sailor';
  };

  const handleSelectVoyage = (voyage) => {
    const activeRole = parseRole(voyage.userRoleInVoyage, user.role);
    
    // Save context
    localStorage.setItem('activeVoyageId', voyage.id);
    localStorage.setItem('activeVoyageRole', activeRole);
    
    // Route based on role
    if (activeRole === 'Master' || activeRole === 'ChiefOfficer') {
      navigate('/master-dashboard');
    } else {
      navigate('/crew-dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeVoyageId');
    localStorage.removeItem('activeVoyageRole');
    navigate('/login');
  };

  const columns = [
    {
      title: 'Hải trình',
      dataIndex: 'id',
      render: (id) => <strong>VY-{String(id).padStart(4, '0')}</strong>,
    },
    {
      title: 'Tàu vận chuyển',
      key: 'ship',
      render: (_, voyage) => (
        <div>
          <div>
            <strong>{voyage.Ship?.shipName || `Tàu #${voyage.shipId}`}</strong>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {voyage.Ship?.imoNumber || 'Chưa có IMO'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tuyến đường',
      key: 'route',
      render: (_, voyage) => (
        <Space size={6}>
          <span>{voyage.departurePort || '--'}</span>
          <ArrowRightOutlined style={{ color: '#94a3b8' }} />
          <span>{voyage.destinationPort || '--'}</span>
        </Space>
      ),
    },
    { title: 'Khởi hành', dataIndex: 'departureDate', render: (d) => formatDate(d) },
    { title: 'Dự kiến đến', dataIndex: 'arrivalDate', render: (d) => formatDate(d) },
    {
      title: 'Chức danh',
      dataIndex: 'userRoleInVoyage',
      render: (role) => (
        <Tag color="blue" style={{ fontWeight: 'bold' }}>
          {role || 'Crew'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <StatusTag status={status} text={status || 'Planning'} />,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, voyage) => (
        <Button type="primary" onClick={() => handleSelectVoyage(voyage)}>
          Truy cập
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      <Header style={{ background: '#001529', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px' }}>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 24, marginRight: 12 }}>🚢</span> CargoOps
        </div>
        <div style={{ color: 'white', display: 'flex', gap: 16, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Xin chào, {user.fullName || user.username || 'Crew'}</Text>
          <Button type="text" danger icon={<LogoutOutlined />} onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </Header>

      <Content style={{ padding: '24px 32px', margin: '0 auto', maxWidth: 1200, width: '100%' }}>
        <PageHeader
          icon={<CompassOutlined />}
          breadcrumb="Welcome"
          title="Hải trình của tôi"
        />

        <Card title="Danh sách các hải trình bạn tham gia" style={{ marginTop: 24 }}>
          <Table
            columns={columns}
            dataSource={voyages}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Bạn chưa được phân công vào hải trình nào.' }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
