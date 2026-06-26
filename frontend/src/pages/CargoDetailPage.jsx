import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Spin,
  Card,
  Button,
  Descriptions,
  Row,
  Col,
  Empty,
  Typography,
  Space,
} from 'antd';
import {
  AppstoreOutlined,
  InfoCircleOutlined,
  CompassOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import MasterLayout from '../components/MasterLayout';
import { cargoService } from '../services/api';
import { PageHeader, StatusTag } from '../components/common';

const { Text } = Typography;

const formatNumber = (num) => (num || num === 0 ? new Intl.NumberFormat('en-US').format(num) : '—');

export default function CargoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;

  useEffect(() => {
    cargoService.getById(id).then(res => {
      if (res.success) setCargo(res.data);
    }).catch(err => {
      console.error('Lỗi tải chi tiết lô hàng:', err);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spin size="large" tip="Đang tải dữ liệu...">
            <div style={{ minHeight: 80 }} />
          </Spin>
        </div>
      </Layout>
    );
  }

  if (!cargo) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Empty
            image={<ExclamationCircleOutlined style={{ fontSize: 48, color: '#ef4444' }} />}
            description="Không tìm thấy lô hàng"
          >
            <Button onClick={() => navigate('/cargos')}>Quay lại danh sách</Button>
          </Empty>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '24px 32px' }}>
        {/* Header */}
        <PageHeader
          onBack={() => navigate('/cargos')}
          icon={<AppstoreOutlined />}
          breadcrumb={`ID: C60-${cargo.id} • Loại: ${cargo.cargoType || 'N/A'}`}
          title={cargo.cargoName || 'Lô hàng chưa đặt tên'}
          extra={
            <Space size={12}>
              <StatusTag
                status={cargo.status}
                text={cargo.status || 'Chờ xử lý'}
                style={{ padding: '4px 14px', borderRadius: 999, margin: 0 }}
              />
              <Button icon={<EditOutlined />} onClick={() => navigate(`/cargos/edit/${cargo.id}`)}>
                Chỉnh sửa
              </Button>
            </Space>
          }
        />

        {/* Content */}
        <Row gutter={[24, 24]}>
          {/* Card: Thông tin lô hàng */}
          <Col xs={24} md={12}>
            <Card
              title={<Space><InfoCircleOutlined style={{ color: '#0ea5e9' }} /> Thông tin lô hàng</Space>}
              styles={{ body: { paddingTop: 0 } }}
            >
              <Descriptions column={1} colon={false}>
                <Descriptions.Item label="Tên hàng hóa"><strong>{cargo.cargoName || 'Chưa cập nhật'}</strong></Descriptions.Item>
                <Descriptions.Item label="Loại hàng"><strong>{cargo.cargoType || 'Chưa cập nhật'}</strong></Descriptions.Item>
                <Descriptions.Item label="Tổng khối lượng"><strong>{formatNumber(cargo.totalWeight)} Tấn</strong></Descriptions.Item>
                <Descriptions.Item label="Tổng thể tích"><strong>{formatNumber(cargo.totalVolume)} m³</strong></Descriptions.Item>
                <Descriptions.Item label="Trạng thái"><strong>{cargo.status || 'Chưa cập nhật'}</strong></Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Card: Hành trình */}
          <Col xs={24} md={12}>
            <Card title={<Space><CompassOutlined style={{ color: '#f59e0b' }} /> Thông tin hành trình</Space>}>
              {cargo.Voyage ? (
                <Descriptions column={1} colon={false}>
                  <Descriptions.Item label="Tàu"><strong>{cargo.Voyage.Ship?.shipName || 'Chưa xác định'}</strong></Descriptions.Item>
                  <Descriptions.Item label="Cảng đi"><strong>{cargo.Voyage.departurePort || 'N/A'}</strong></Descriptions.Item>
                  <Descriptions.Item label="Cảng đến"><strong>{cargo.Voyage.destinationPort || 'N/A'}</strong></Descriptions.Item>
                  <Descriptions.Item label="Ngày đi (ETD)"><strong>{cargo.Voyage.departureDate || 'Chưa có'}</strong></Descriptions.Item>
                  <Descriptions.Item label="Ngày đến (ETA)"><strong>{cargo.Voyage.arrivalDate || 'Chưa có'}</strong></Descriptions.Item>
                </Descriptions>
              ) : (
                <Text type="secondary" italic>Lô hàng chưa được xếp vào hải trình nào.</Text>
              )}
            </Card>
          </Col>

          {/* Card: Phân bổ hầm tàu */}
          <Col span={24}>
            <Card title={<Space><InboxOutlined style={{ color: '#10b981' }} /> Phân bổ hầm tàu (Cargo Allocation)</Space>}>
              {cargo.CargoAllocations && cargo.CargoAllocations.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {cargo.CargoAllocations.map((a, idx) => (
                    <div key={idx} style={{ padding: '12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.9rem' }}>
                      <strong style={{ color: '#166534', display: 'block' }}>{a.CargoHold?.holdName || `Hầm #${a.cargoHoldId}`}</strong>
                      <span style={{ color: '#15803d' }}>Khối lượng: {formatNumber(a.allocatedWeight)} T</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary" italic>Lô hàng chưa được phân bổ vào hầm tàu nào.</Text>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </Layout>
  );
}
