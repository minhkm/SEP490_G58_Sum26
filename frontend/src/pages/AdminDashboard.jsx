import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Table, Button, Input, Space, Typography, Steps } from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  UserAddOutlined,
  CompassOutlined,
  ContainerOutlined,
  TeamOutlined,
  MoreOutlined,
  QuestionCircleOutlined,
  PlayCircleOutlined,
  DatabaseOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { Joyride, STATUS } from 'react-joyride';
import AdminLayout from '../components/AdminLayout';
import { dashboardService } from '../services/api';
import { PageHeader, PageContainer, StatCard, ChartCard, StatusTag, notifyError } from '../components/common';
import { Pie, Column } from '@ant-design/charts';

const { Text, Title } = Typography;

// Bảng màu biểu đồ theo thương hiệu.
const CHART_PALETTE = ['#0E5FB5', '#47BFFF', '#0F9D6E', '#E8A21C', '#E5484D', '#5B54D6'];

// Cấu hình trạng thái tàu + cột bảng — hằng số, đặt ngoài component (không phụ thuộc state/props).
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

export default function AdminDashboard() {
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
        const result = await dashboardService.getAdminDashboardData();
        setData(result);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu dashboard:', error);
        notifyError('Không thể tải dữ liệu bảng điều khiển.');
      }
    };
    fetchDashboardData();
  }, []);

  // Dữ liệu biểu đồ — tính từ data API sẵn có
  const fleetCounts = {};
  (data.recentVessels || []).forEach((v) => {
    const key = VESSEL_STATUS[v.status]?.text || v.status || 'Khác';
    fleetCounts[key] = (fleetCounts[key] || 0) + 1;
  });
  const fleetStatusData = Object.entries(fleetCounts).map(([type, value]) => ({ type, value }));
  const overviewData = [
    { type: 'Tàu', value: data.totalVessels || 0 },
    { type: 'Thuyền viên', value: data.totalCrews || 0 },
    { type: 'Hải trình đang đi', value: data.voyagesInProgress || 0 },
  ];

  return (
    <AdminLayout>
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

      <PageContainer>
        {/* Header */}
        <PageHeader
          title="Bảng điều khiển Quản trị viên"
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
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8} lg={8}>
            <StatCard
              title="Quản lý đội tàu"
              value={data.totalVessels}
              icon={<ContainerOutlined />}
              tone="blue"
              footer="Xem danh sách tàu"
              onClick={() => navigate('/vessels')}
            />
          </Col>
          <Col xs={24} sm={8} lg={8}>
            <StatCard
              title="Thủy thủ đoàn"
              value={data.totalCrews}
              icon={<TeamOutlined />}
              tone="indigo"
              footer="Xem danh sách thuyền viên"
              onClick={() => navigate('/crews')}
            />
          </Col>
          <Col xs={24} sm={8} lg={8}>
            <StatCard
              title="Hải trình đang đi"
              value={data.voyagesInProgress}
              icon={<CompassOutlined />}
              tone="cyan"
              footer="Theo dõi chuyến hải trình"
              onClick={() => navigate('/voyages')}
            />
          </Col>
        </Row>

        {/* Biểu đồ tổng quan */}
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} md={10}>
            <ChartCard title="Tình trạng đội tàu" empty={fleetStatusData.length === 0}>
              <Pie
                data={fleetStatusData}
                angleField="value"
                colorField="type"
                innerRadius={0.6}
                height={228}
                scale={{ color: { range: CHART_PALETTE } }}
              />
            </ChartCard>
          </Col>
          <Col xs={24} md={14}>
            <ChartCard title="Số lượng theo hạng mục">
              <Column
                data={overviewData}
                xField="type"
                yField="value"
                colorField="type"
                legend={false}
                height={228}
                scale={{ color: { range: CHART_PALETTE } }}
              />
            </ChartCard>
          </Col>
        </Row>

        {/* Main Content Grid - Vessel Overview */}
        <Row gutter={[20, 20]}>
          <Col xs={24}>
            <Card
              title="Tổng quan Đội tàu"
              extra={<Input.Search placeholder="Tìm kiếm tàu..." allowClear style={{ width: 260 }} />}
            >
              <Table
                rowKey="id"
                columns={vesselColumns}
                dataSource={data.recentVessels}
                pagination={{
                  defaultPageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50'],
                  showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} tàu`,
                }}
                locale={{ emptyText: 'Chưa có dữ liệu tàu' }}
                footer={() => (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Hiển thị {data.recentVessels.length} trong số {data.totalVessels} tàu
                  </Text>
                )}
              />
            </Card>
          </Col>
        </Row>
      </PageContainer>
    </AdminLayout>
  );
}
