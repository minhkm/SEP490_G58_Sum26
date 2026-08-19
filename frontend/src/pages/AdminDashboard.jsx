import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Table, Button, Input, Space, Typography, Steps, Tag, Empty, Tooltip } from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  UserAddOutlined,
  CompassOutlined,
  ContainerOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  PlayCircleOutlined,
  DatabaseOutlined,
  InboxOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { Joyride, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import AdminLayout from '../components/AdminLayout';
import { dashboardService } from '../services/api';
import { PageHeader, PageContainer, StatCard, StatusTag, notifyError } from '../components/common';

const { Text, Title } = Typography;

// Xóa VOYAGE_STATUS_MAP để dùng chung logic của StatusTag
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
    activeVoyages: [],
  });

  const [loading, setLoading] = useState(true);
  const [searchVoyage, setSearchVoyage] = useState('');

  // --- Joyride State ---
  const [runTour, setRunTour] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
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

  const handleJoyrideCallback = (tourData) => {
    const { status } = tourData;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('hasSeenTour', 'true');
    }
  };

  useEffect(() => {
    let isMounted = true;
    dashboardService.getAdminDashboardData()
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((error) => {
        console.error('Lỗi khi tải dữ liệu dashboard:', error);
        notifyError('Không thể tải dữ liệu bảng điều khiển.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Lọc hải trình theo ô tìm kiếm
  const filteredVoyages = useMemo(() => {
    const voyages = data.activeVoyages || [];
    if (!searchVoyage.trim()) return voyages;
    const q = searchVoyage.toLowerCase().trim();
    return voyages.filter(
      (v) =>
        (v.shipName && v.shipName.toLowerCase().includes(q)) ||
        (v.departurePort && v.departurePort.toLowerCase().includes(q)) ||
        (v.destinationPort && v.destinationPort.toLowerCase().includes(q)) ||
        (v.captainName && v.captainName.toLowerCase().includes(q)) ||
        (v.imoNumber && v.imoNumber.includes(q)) ||
        v.cargoList?.some((c) => (c.name && c.name.toLowerCase().includes(q)) || (c.type && c.type.toLowerCase().includes(q)))
    );
  }, [data.activeVoyages, searchVoyage]);

  // Cấu hình bảng Giám sát Hải trình
  const voyageColumns = [
    {
      title: 'TÀU & HẢI TRÌNH',
      key: 'vessel',
      width: 220,
      render: (_, v) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
            {v.shipName}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Hải trình #{v.id} {v.imoNumber ? `• IMO: ${v.imoNumber}` : ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'TUYẾN ĐƯỜNG VẬN TẢI',
      key: 'route',
      width: 260,
      render: (_, v) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
            <span>{v.departurePort}</span>
            <ArrowRightOutlined style={{ color: '#6366f1', fontSize: 12 }} />
            <span>{v.destinationPort}</span>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {v.departureDate ? new Date(v.departureDate).toLocaleDateString('vi-VN') : '—'}
            {' ➔ '}
            {v.arrivalDate ? new Date(v.arrivalDate).toLocaleDateString('vi-VN') : '—'}
          </Text>
        </div>
      ),
    },
    {
      title: 'TIẾN ĐỘ HÀNH TRÌNH',
      key: 'progress',
      width: 180,
      render: (_, v) => {
        const isCompleted = v.status === 'Completed';
        return (
          <div style={{ minWidth: 140, fontSize: 12, color: '#64748b' }}>
            {isCompleted
              ? 'Đã cập cảng đích'
              : v.status === 'Underway'
              ? 'Đang hành trình trên biển'
              : v.status === 'Loaded'
              ? 'Đã xếp hàng, sẵn sàng rời cảng'
              : 'Đang chuẩn bị chuyến'}
          </div>
        );
      },
    },
    {
      title: 'HÀNG HÓA TRÊN TÀU',
      key: 'cargo',
      width: 250,
      render: (_, v) => {
        const list = v.cargoList && v.cargoList.length > 0 
          ? v.cargoList 
          : (v.cargoTypes || []).map((t) => ({ name: t, type: t }));

        return (
          <div>
            {v.cargoCount > 0 || list.length > 0 ? (
              <>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4, fontSize: 13 }}>
                  {(v.totalWeight || 0).toLocaleString('vi-VN')} <span style={{ fontSize: 12, fontWeight: 500 }}>tấn</span>
                  {v.totalVolume > 0 && (
                    <span style={{ color: '#64748b', fontSize: 12, fontWeight: 400, marginLeft: 4 }}>
                      ({(v.totalVolume || 0).toLocaleString('vi-VN')} m³)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {list.map((cargo, idx) => (
                    <div
                      key={cargo.id || idx}
                      style={{
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {cargo.name}
                      </span>
                      {cargo.type && (
                        <Tag color="blue" style={{ fontSize: 10, borderRadius: 3, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                          {cargo.type}
                        </Tag>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 12 }}>
                Chưa gán hàng
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'THUYỀN TRƯỞNG & BIÊN CHẾ',
      key: 'crew',
      width: 200,
      render: (_, v) => (
        <div>
          <div style={{ fontWeight: 500, color: '#334155' }}>
            {v.captainName}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Biên chế: <strong>{v.crewCount}</strong> thuyền viên
          </Text>
        </div>
      ),
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      width: 140,
      render: (status) => <StatusTag status={status || 'Planning'} />,
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      align: 'center',
      width: 90,
      render: () => (
        <Tooltip title="Xem chi tiết danh sách hải trình">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate('/voyages')}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <AdminLayout>
      {/* Joyride Tour Component */}
      <Joyride
        key={stepIndex} // Dùng stepIndex làm key để reset tour khi bấm Hướng dẫn
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
                onClick={() => { setStepIndex(prev => prev + 1); setRunTour(true); }}
              >
                Hướng dẫn
              </Button>
            </Space>
          }
        />

        {/* Workflow Steps (Quy trình chuẩn SOP) */}
        <Card className="tour-quick-actions" style={{ marginBottom: 24, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>🛤️ Quy trình Vận hành Chuẩn (SOP)</Title>
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
              className="tour-vessels"
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
              className="tour-crews"
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
              className="tour-voyages"
              title="Hải trình đang đi"
              value={data.voyagesInProgress}
              icon={<CompassOutlined />}
              tone="cyan"
              footer="Theo dõi chuyến hải trình"
              onClick={() => navigate('/voyages')}
            />
          </Col>
        </Row>

        {/* Live Voyage & Fleet Operations Tracking */}
        <Card
          style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          title={
            <Space>
              <CompassOutlined style={{ color: '#6366f1', fontSize: 18 }} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>Giám sát Hải trình & Hoạt động Vận tải</span>
            </Space>
          }
          extra={
            <Input
              placeholder="Tìm theo cảng, tàu, thuyền trưởng..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchVoyage}
              onChange={(e) => setSearchVoyage(e.target.value)}
              allowClear
              style={{ width: 280 }}
            />
          }
        >
          {filteredVoyages.length === 0 ? (
            <Empty
              image={<CompassOutlined style={{ fontSize: 48, color: '#94a3b8', margin: '20px 0 10px' }} />}
              description={
                <div style={{ padding: '10px 0' }}>
                  <Title level={5} style={{ color: '#334155', marginBottom: 6 }}>
                    Hiện chưa có hải trình nào đang hoạt động
                  </Title>
                  <Text type="secondary" style={{ display: 'block', maxWidth: 500, margin: '0 auto' }}>
                    Toàn bộ đội tàu và thuyền viên đang ở trạng thái sẵn sàng.
                  </Text>
                </div>
              }
            />
          ) : (
            <Table
              rowKey="id"
              columns={voyageColumns}
              dataSource={filteredVoyages}
              loading={loading}
              pagination={{
                defaultPageSize: 5,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20'],
                showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} hải trình`,
              }}
              locale={{ emptyText: 'Không tìm thấy hải trình nào phù hợp' }}
            />
          )}
        </Card>
      </PageContainer>
    </AdminLayout>
  );
}
