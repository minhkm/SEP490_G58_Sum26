import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Button, Tag, Input, Space, Typography } from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  UserAddOutlined,
  DashboardOutlined,
  TeamOutlined,
  CompassOutlined,
  ProfileOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import { dashboardService } from '../services/api';
import { PageHeader, StatusTag, notifyError } from '../components/common';
import './AgencyDashboard.css';

const { Text } = Typography;

export default function AgencyDashboard() {
  const navigate = useNavigate();

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [data, setData] = useState({
    totalVessels: 0,
    totalCrews: 0,
    voyagesInProgress: 0,
    pendingApprovals: 0,
    recentVessels: [],
    newCrews: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const result = await dashboardService.getAgencyDashboardData();
        setData(result);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu dashboard:', error);
        notifyError('Không thể tải dữ liệu bảng điều khiển.');
      }
    };
    fetchDashboardData();
  }, []);

  // Giữ nguyên màu & nhãn cũ cho từng trạng thái tàu (ghi đè màu mặc định của StatusTag).
  const VESSEL_STATUS = {
    Active: { color: 'green', text: 'Đang hoạt động' },
    Maintenance: { color: 'orange', text: 'Bảo trì' },
    Inactive: { color: 'default', text: 'Ngừng h.động' },
  };

  const vesselColumns = [
    {
      title: 'TÊN TÀU / IMO',
      key: 'name',
      render: (_, v) => (
        <div>
          <div><strong>{v.shipName}</strong></div>
          <Text type="secondary" style={{ fontSize: 12 }}>IMO: {v.imoNumber}</Text>
        </div>
      ),
    },
    {
      title: 'LOẠI TÀU',
      dataIndex: 'type',
      render: (type) => type || 'Tàu chở hàng',
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      render: (status) => {
        const cfg = VESSEL_STATUS[status];
        return (
          <StatusTag
            status={status}
            color={cfg ? cfg.color : 'blue'}
            text={cfg ? cfg.text : status || 'Bình thường'}
          />
        );
      },
    },
    {
      title: 'VỊ TRÍ',
      dataIndex: 'flag',
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      render: () => <Button type="text" icon={<MoreOutlined />} />,
    },
  ];

  return (
    <AgencyLayout>
      <div style={{ padding: '24px 32px' }}>
        {/* Header */}
        <PageHeader
          title="Bảng điều khiển Đại lý"
          extra={
            <Space wrap>
              <Text type="secondary">
                <CalendarOutlined /> {currentDate}
              </Text>
              <Button icon={<PlusOutlined />} onClick={() => navigate('/vessels/new')}>
                Thêm tàu mới
              </Button>
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate('/crews/new')}>
                Tạo tài khoản thuyền viên
              </Button>
            </Space>
          }
        />

        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="TỔNG SỐ TÀU"
                value={data.totalVessels}
                prefix={<DashboardOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="TỔNG THUYỀN VIÊN"
                value={data.totalCrews}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="CHUYẾN ĐANG ĐI"
                value={data.voyagesInProgress}
                prefix={<CompassOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="CHỜ PHÊ DUYỆT"
                value={data.pendingApprovals}
                valueStyle={{ color: '#cf1322' }}
                prefix={<ProfileOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content Grid */}
        <Row gutter={[16, 16]}>
          {/* Left Column */}
          <Col xs={24} lg={16}>
            <Card
              title="Tổng quan Đội tàu"
              extra={<Input.Search placeholder="Tìm kiếm tàu..." allowClear style={{ width: 220 }} />}
            >
              <Table
                rowKey="id"
                columns={vesselColumns}
                dataSource={data.recentVessels}
                pagination={{ pageSize: 5, hideOnSinglePage: true }}
                locale={{ emptyText: 'Chưa có dữ liệu tàu' }}
                footer={() => (
                  <Text type="secondary">
                    Hiển thị {data.recentVessels.length} trong số {data.totalVessels} tàu
                  </Text>
                )}
              />
            </Card>

            <Card
              title="Lưu lượng hàng hóa hàng tháng"
              extra={<Text type="secondary">Năm 2024</Text>}
              style={{ marginTop: 16 }}
            >
              <Text type="secondary">Dữ liệu tổng hợp từ các chuyến hải hành</Text>
            </Card>
          </Col>

          {/* Right Column */}
          <Col xs={24} lg={8}>
            <Card title="Báo cáo Hệ thống">
              <p>Mọi dịch vụ đang vận hành bình thường. Tốc độ đồng bộ hóa dữ liệu vệ tinh ổn định.</p>
              <Tag color="green">ĐANG KẾT NỐI</Tag>
            </Card>
          </Col>
        </Row>
      </div>
    </AgencyLayout>
  );
}
