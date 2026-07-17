import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Button, Tag, Input, Space, Typography, Steps } from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  UserAddOutlined,
  DashboardOutlined,
  TeamOutlined,
  CompassOutlined,
  ProfileOutlined,
  MoreOutlined,
  QuestionCircleOutlined,
  PlayCircleOutlined,
  DatabaseOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { Joyride, STATUS } from 'react-joyride';
import AgencyLayout from '../components/AgencyLayout';
import { dashboardService } from '../services/api';
import { PageHeader, StatusTag, notifyError } from '../components/common';
import './AgencyDashboard.css';

const { Text, Title } = Typography;

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

  // --- Joyride State ---
  const [runTour, setRunTour] = useState(false);
  const [tourSteps] = useState([
    {
      target: '.tour-quick-actions',
      content: 'Bắt đầu từ đây! Sơ đồ này hướng dẫn bạn quy trình 3 bước chuẩn: Chuẩn bị Nguồn lực (Tàu & Thủy thủ) ➔ Nhận Hàng hóa ➔ Lập Hải trình.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-vessels',
      content: 'Quản lý Đội tàu: Xem danh sách, hồ sơ và giấy tờ của tất cả các tàu trong hệ thống.',
      placement: 'right',
    },
    {
      target: '.tour-crews',
      content: 'Quản lý Thủy thủ đoàn: Nơi lưu trữ hồ sơ, quản lý trạng thái và phân bổ thuyền viên.',
      placement: 'right',
    },
    {
      target: '.tour-voyages',
      content: 'Chuyến hải trình: Theo dõi và quản lý lịch trình hiện tại của tàu.',
      placement: 'right',
    },
    {
      target: '.tour-help-btn',
      content: 'Bạn luôn có thể xem lại hướng dẫn này bất cứ lúc nào bằng cách nhấn vào đây!',
      placement: 'left',
    }
  ]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
    }
  };

  useEffect(() => {
    // Tự động bật tour nếu là lần đầu đăng nhập
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      setRunTour(true);
      localStorage.setItem('hasSeenTour', 'true');
    }
  }, []);
  // ---------------------

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
      {/* Joyride Tour Component */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#0b1a2c',
            zIndex: 10000,
          },
        }}
        locale={{
          back: 'Quay lại',
          close: 'Đóng',
          last: 'Hoàn tất',
          next: 'Tiếp theo',
          skip: 'Bỏ qua',
        }}
      />

      <div style={{ padding: '24px 32px' }}>
        {/* Header */}
        <PageHeader
          title="Bảng điều khiển Đại lý"
          extra={
            <Space wrap>
              <Text type="secondary">
                <CalendarOutlined /> {currentDate}
              </Text>
              <Button 
                className="tour-help-btn"
                icon={<QuestionCircleOutlined />} 
                onClick={() => setRunTour(true)}
              >
                Hướng dẫn
              </Button>
            </Space>
          }
        />

        {/* Workflow Steps (Quy trình chuẩn) */}
        <Card className="tour-quick-actions" style={{ marginBottom: 24, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>🛤️ Quy trình Vận hành Chuẩn (SOP)</Title>
            <Text type="secondary">Vui lòng đảm bảo bạn đã tạo Tàu và Hàng hóa trước khi Lập Kế hoạch Hải trình.</Text>
          </div>
          
          <Steps
            current={2}
            items={[
              {
                title: 'Bước 1: Chuẩn bị',
                description: (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                      Thêm dữ liệu Tàu & Thủy thủ
                    </Text>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Button size="small" icon={<PlusOutlined />} onClick={() => navigate('/vessels/new')} block>
                        Thêm Tàu Mới
                      </Button>
                      <Button size="small" icon={<UserAddOutlined />} onClick={() => navigate('/crews/new')} block>
                        Thêm Thủy Thủ
                      </Button>
                    </Space>
                  </div>
                ),
                icon: <DatabaseOutlined />,
              },
              {
                title: 'Bước 2: Hàng hóa',
                description: (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                      Tạo & phân loại Hàng hóa
                    </Text>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Button size="small" icon={<InboxOutlined />} onClick={() => navigate('/cargos')} block>
                        Quản lý Hàng Hóa
                      </Button>
                    </Space>
                  </div>
                ),
                icon: <InboxOutlined />,
              },
              {
                title: 'Bước 3: Lập kế hoạch',
                description: (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                      Chọn tàu và gán hàng hóa
                    </Text>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => navigate('/voyages/new')} block>
                        Tạo Hải Trình Mới
                      </Button>
                    </Space>
                  </div>
                ),
                icon: <CompassOutlined />,
              },
            ]}
          />
        </Card>

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
