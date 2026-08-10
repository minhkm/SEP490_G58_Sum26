import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Table, Typography, Empty, Space, Spin, Timeline, List, Tag, Alert, Progress } from 'antd';
import {
  ProfileOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  NodeIndexOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  FileAddOutlined,
  HistoryOutlined,
  RightOutlined,
} from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { PageContainer, StatCard, ChartCard, StatusTag, notifyError } from '../components/common';
import { Pie } from '@ant-design/charts';
import { dashboardService } from '../services/api';

const { Text, Title } = Typography;

// Cột bảng hàng hoá — hằng số, đặt ngoài component (không phụ thuộc state/props).
const cargoColumns = [
  { title: 'Tên hàng', dataIndex: 'cargoName', render: (v) => <strong>{v}</strong> },
  { title: 'Cảng xếp', dataIndex: 'loadPort', render: (v) => <Text type="secondary">{v || '--'}</Text> },
  { title: 'Trạng thái', dataIndex: 'status', render: (s) => <StatusTag status={s} /> },
];

// % tiến độ tuyến đường theo trạng thái hải trình (thanh Progress).
const ROUTE_PROGRESS = {
  Planning: 5, Loading: 15, Loaded: 25, Underway: 55,
  'At Anchor': 55, Anchored: 55, Arrived: 75, Discharge: 82,
  Discharged: 90, 'Homeward Bounding': 95, Completed: 100,
};
const CHART_PALETTE = ['#0E5FB5', '#47BFFF', '#0F9D6E', '#E8A21C', '#E5484D', '#5B54D6'];

export default function MasterDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lấy dữ liệu dashboard theo hải trình đang hoạt động
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const activeVoyageId = localStorage.getItem('activeVoyageId');
        const data = await dashboardService.getMasterDashboardData(activeVoyageId);
        setDashboardData(data); // có thể null nếu không có hải trình đang hoạt động
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        notifyError('Lỗi khi tải dữ liệu dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const voyage = dashboardData?.voyage;
  const stats = dashboardData?.stats;
  const utc = new Date().toISOString().substring(11, 16);
  const routePct = ROUTE_PROGRESS[voyage?.status] ?? 0;
  const cargoWeightData = (voyage?.Cargos || [])
    .map((c) => ({
      type: c.cargoName || `Lô #${c.id}`,
      value: c.totalWeight || (c.CargoItems || []).reduce((s, it) => s + (it.weight || 0), 0),
    }))
    .filter((d) => d.value > 0);

  const quickActions = [
    { icon: <FileAddOutlined />, label: 'Tạo báo cáo mới', onClick: () => navigate('/reports') },
    { icon: <HistoryOutlined />, label: 'Lịch sử lệnh', onClick: () => navigate('/reports') },
  ];

  if (loading) {
    return (
      <MasterLayout>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
          <Spin size="large" />
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      <PageContainer>
        {/* Tiêu đề + trạng thái hải trình */}
        <Row justify="space-between" align="bottom" style={{ marginBottom: 24, rowGap: 12 }}>
          <Col>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Tổng quan hoạt động
            </Text>
            <Title level={3} style={{ margin: '4px 0 0' }}>
              {voyage
                ? `Hải trình #${voyage.id}: ${voyage.departurePort || '---'} ➔ ${voyage.destinationPort || '---'}`
                : 'Chưa có chuyến đi nào đang hoạt động'}
            </Title>
          </Col>
          <Col>
            <Space>
              {voyage ? <StatusTag status={voyage.status} /> : <Tag>Chưa có dữ liệu</Tag>}
              <Tag icon={<EnvironmentOutlined />} style={{ borderRadius: 16 }}>UTC {utc}</Tag>
            </Space>
          </Col>
        </Row>

        {/* Thẻ chỉ số */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Tàu hiện tại"
              value={voyage?.Ship?.shipName || 'Không có dữ liệu'}
              icon={<ProfileOutlined />}
              tone="blue"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Tải trọng hàng hóa"
              value={stats ? `${stats.totalWeight} MT` : 'Trống'}
              icon={<FileTextOutlined />}
              tone="cyan"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Tình trạng thiết bị"
              value={stats?.equipmentStatus || 'Không có dữ liệu'}
              icon={<ThunderboltOutlined />}
              tone="gold"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Thuyền viên hải trình"
              value={stats?.totalCrewCount ? `${stats.totalCrewCount} thuyền viên` : '-- / --'}
              icon={<TeamOutlined />}
              tone="green"
            />
          </Col>
        </Row>

        {/* Lưới nội dung chính */}
        <Row gutter={[20, 20]}>
          {/* Cột trái */}
          <Col xs={24} lg={16}>
            <Card title={<Space><EnvironmentOutlined /> Vị trí & Hành trình</Space>}>
              {voyage ? (
                <>
                  <Row justify="space-between" align="top" style={{ marginBottom: 16 }}>
                    <Col>
                      <Text type="secondary">Cảng khởi hành</Text>
                      <Title level={5} style={{ margin: '2px 0' }}>{voyage.departurePort}</Title>
                      <Text type="secondary" style={{ fontSize: 13 }}>{voyage.departureDate}</Text>
                    </Col>
                    <Col style={{ color: '#cbd5e1', paddingTop: 8 }}>
                      <RightOutlined style={{ fontSize: 24 }} />
                    </Col>
                    <Col style={{ textAlign: 'right' }}>
                      <Text type="secondary">Cảng đến</Text>
                      <Title level={5} style={{ margin: '2px 0' }}>{voyage.destinationPort}</Title>
                      <Text type="secondary" style={{ fontSize: 13 }}>ETA: {voyage.arrivalDate}</Text>
                    </Col>
                  </Row>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Tiến độ tuyến đường</Text>
                    <Progress
                      percent={routePct}
                      status={voyage.status === 'Completed' ? 'success' : 'active'}
                      strokeColor={{ '0%': '#47BFFF', '100%': '#0E5FB5' }}
                    />
                  </div>
                  <Alert
                    type={voyage.issueReason ? 'error' : 'info'}
                    showIcon
                    message={
                      <Space size={8}>
                        <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>Trạng thái hiện tại:</span>
                        <StatusTag status={voyage.status} />
                      </Space>
                    }
                    description={voyage.issueReason ? `Vấn đề: ${voyage.issueReason}` : undefined}
                  />
                </>
              ) : (
                <Empty description="Chưa lập kế hoạch hành trình. Hãy khởi tạo lộ trình để theo dõi vị trí và ETA của tàu." />
              )}
            </Card>

            <Card title={<Space><InboxOutlined /> Danh sách Hàng hóa</Space>} style={{ marginTop: 20 }} styles={{ body: { padding: 0 } }}>
              {voyage?.Cargos?.length > 0 ? (
                <Table
                  rowKey="id"
                  columns={cargoColumns}
                  dataSource={voyage.Cargos}
                  pagination={false}
                  size="middle"
                />
              ) : (
                <div style={{ padding: 24 }}>
                  <Empty description="Chưa có hàng hóa nào được gán cho chuyến đi này." />
                </div>
              )}
            </Card>
          </Col>

          {/* Cột phải */}
          <Col xs={24} lg={8}>
            <Card title={<Space><NodeIndexOutlined /> Chi tiết hành trình</Space>}>
              {voyage ? (
                <Timeline
                  items={[
                    {
                      color: 'green',
                      children: (
                        <>
                          <div style={{ fontWeight: 600 }}>Khởi hành từ {voyage.departurePort}</div>
                          <Text type="secondary" style={{ fontSize: 13 }}>{voyage.departureDate}</Text>
                        </>
                      ),
                    },
                    { color: 'gray', children: <Text type="secondary" italic>Đang di chuyển...</Text> },
                    {
                      color: 'blue',
                      children: (
                        <>
                          <div style={{ fontWeight: 600 }}>Dự kiến đến {voyage.destinationPort}</div>
                          <Text type="secondary" style={{ fontSize: 13 }}>{voyage.arrivalDate}</Text>
                        </>
                      ),
                    },
                  ]}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu hành trình hiện tại" />
              )}
            </Card>

            <ChartCard title="Phân bổ tải trọng (MT)" empty={cargoWeightData.length === 0} height={240} style={{ marginTop: 20 }}>
              <Pie
                data={cargoWeightData}
                angleField="value"
                colorField="type"
                innerRadius={0.6}
                height={208}
                scale={{ color: { range: CHART_PALETTE } }}
              />
            </ChartCard>

            <Card title={<Space><FileTextOutlined /> Báo cáo & Lệnh</Space>} style={{ marginTop: 20 }}>
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="Hệ thống giám sát đang hoạt động bình thường."
                style={{ marginBottom: 16 }}
              />
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                Hành động nhanh
              </Text>
              <List
                size="small"
                dataSource={quickActions}
                style={{ marginTop: 8 }}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer', paddingInline: 8, borderRadius: 8 }}
                    onClick={item.onClick}
                    actions={[<RightOutlined key="go" style={{ color: '#94a3b8' }} />]}
                  >
                    <Space>{item.icon}<span>{item.label}</span></Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </PageContainer>
    </MasterLayout>
  );
}
