import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Empty, Button, Space, Descriptions, Tabs, Table, Typography } from 'antd';
import {
  InfoCircleOutlined,
  SettingOutlined,
  InboxOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import AdminLayout from '../components/AdminLayout';
import { vesselService } from '../services/api';
import { PageHeader, PageContainer, StatusTag } from '../components/common';
import { engineNameLabel, engineParameterLabel, engineTypeLabel, isMainEngine, normalizeEngineStatus } from '../utils/engine';
import {
  cargoHoldNameLabel,
  equipmentLocationLabel,
  equipmentNameLabel,
  equipmentTypeLabel,
  formatEquipmentExpiryDate,
  isEquipmentExpired,
  normalizeShipStatus,
} from '../utils/vessel';
import { getCode } from 'country-list';

const { Text } = Typography;

const vietnameseRegionNames = new Intl.DisplayNames(['vi'], { type: 'region' });
const countryLabel = (country) => {
  if (!country) return 'Chưa cập nhật';
  const code = getCode(country);
  return code ? vietnameseRegionNames.of(code) : country;
};

// Cột bảng Trang thiết bị của tàu
const equipmentColumns = [
  {
    title: 'Tên thiết bị',
    dataIndex: 'equipmentName',
    key: 'equipmentName',
    width: 260,
    render: (name) => <Text strong>{equipmentNameLabel(name)}</Text>,
  },
  {
    title: 'Loại thiết bị',
    dataIndex: 'equipmentType',
    key: 'equipmentType',
    width: 200,
    render: (type) => <Tag color="purple">{equipmentTypeLabel(type)}</Tag>,
  },
  {
    title: 'Vị trí',
    dataIndex: 'location',
    key: 'location',
    width: 140,
    render: (location) => equipmentLocationLabel(location) || '—',
  },
  {
    title: 'Số lượng',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 160,
    align: 'right',
    render: (quantity, equipment) => {
      const total = quantity || 1;
      const broken = equipment.brokenCount || 0;
      return (
        <Space size={6}>
          <Text strong>{total}</Text>
          {broken > 0 && <Tag color="red">{broken} hỏng</Tag>}
        </Space>
      );
    },
  },
  {
    title: 'Hạn sử dụng',
    dataIndex: 'expiryNote',
    key: 'expiryNote',
    width: 180,
    render: (expiryNote) => {
      if (!expiryNote) return <Text type="secondary">Không có hạn sử dụng</Text>;
      const expired = isEquipmentExpired(expiryNote);
      return (
        <Tag color={expired ? 'red' : 'default'}>
          {formatEquipmentExpiryDate(expiryNote)}{expired ? ' (Hết hạn)' : ''}
        </Tag>
      );
    },
  },
];

export default function VesselDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vessel, setVessel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVessel = async () => {
      try {
        const data = await vesselService.getById(id);
        setVessel(data);
      } catch (error) {
        console.error('Lỗi tải thông tin tàu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVessel();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spin size="large" tip="Đang tải dữ liệu...">
            <div style={{ minHeight: 80 }} />
          </Spin>
        </div>
      </AdminLayout>
    );
  }

  if (!vessel) {
    return (
      <AdminLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Empty description="Không tìm thấy tàu" />
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate('/vessels')}>
            Quay lại danh sách
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageContainer>
        {/* Header */}
        <PageHeader
          onBack={() => navigate('/vessels')}
          title={vessel.shipName}
          breadcrumb={`IMO: ${vessel.imoNumber} • Quốc tịch: ${countryLabel(vessel.flag)}`}
          extra={
            <StatusTag status={normalizeShipStatus(vessel.status)} color={normalizeShipStatus(vessel.status) === 'Hoạt động' ? 'green' : 'gold'} />
          }
        />

        {/* Content: gom các nhóm vào Tabs trong một Card */}
        <Card styles={{ body: { paddingTop: 8 } }}>
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: (
                  <Space>
                    <InfoCircleOutlined style={{ color: '#0ea5e9' }} /> Thông tin chung
                  </Space>
                ),
                children: (
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Tên tàu">
                          <strong>{vessel.shipName}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Mã IMO">
                          <strong>{vessel.imoNumber}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Quốc gia đăng ký (Cờ)">
                          <strong>{countryLabel(vessel.flag)}</strong>
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Trọng tải tối đa">
                          <strong>
                            {vessel.ShipCapacity?.maxCargoWeight
                              ? `${vessel.ShipCapacity.maxCargoWeight.toLocaleString()} Tấn`
                              : 'Chưa cập nhật'}
                          </strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Thể tích tối đa">
                          <strong>
                            {vessel.ShipCapacity?.maxCargoVolume
                              ? `${vessel.ShipCapacity.maxCargoVolume.toLocaleString()} m³`
                              : 'Chưa cập nhật'}
                          </strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Thủy thủ đoàn tối đa">
                          <strong>
                            {vessel.ShipCapacity?.maxCrew
                              ? `${vessel.ShipCapacity.maxCrew} Người`
                              : 'Chưa cập nhật'}
                          </strong>
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'engines',
                label: (
                  <Space>
                    <SettingOutlined style={{ color: '#6366f1' }} /> Máy móc
                  </Space>
                ),
                children: (
                  vessel.Engines && vessel.Engines.length > 0 ? (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      {vessel.Engines.map((engine, idx) => {
                        const mainEngine = isMainEngine(engine);
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '12px',
                              background: '#f8fafc',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '8px',
                                flexWrap: 'wrap',
                                gap: 8,
                              }}
                            >
                              <Space>
                                <Tag color={mainEngine ? 'blue' : 'default'}>
                                  {engineTypeLabel(engine)}
                                </Tag>
                                <strong style={{ color: '#334155' }}>{engineNameLabel(engine.engineName)}</strong>
                              </Space>
                              <Tag color="geekblue">{normalizeEngineStatus(engine.status)}</Tag>
                            </div>
                            {engine.EngineParameters && engine.EngineParameters.length > 0 && (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: '8px',
                                  fontSize: '0.9rem',
                                  color: '#64748b',
                                  marginTop: '8px',
                                  borderTop: '1px solid #cbd5e1',
                                  paddingTop: '8px',
                                }}
                              >
                                {engine.EngineParameters.map((p, pIdx) => (
                                  <div key={pIdx}>
                                    - {engineParameterLabel(p.name)}: <strong>{p.maxValue}</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </Space>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu máy móc" />
                  )
                ),
              },
              {
                key: 'holds',
                label: (
                  <Space>
                    <InboxOutlined style={{ color: '#10b981' }} /> Khoang hàng
                  </Space>
                ),
                children: (
                  vessel.CargoHolds && vessel.CargoHolds.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {vessel.CargoHolds.map((h, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '10px',
                            background: '#f0fdf4',
                            borderRadius: '6px',
                            border: '1px solid #bbf7d0',
                            fontSize: '0.9rem',
                          }}
                        >
                          <strong style={{ color: '#166534', display: 'block' }}>{cargoHoldNameLabel(h.holdName)}</strong>
                          <span style={{ color: '#15803d' }}>Sức chứa: {h.maxCapacity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Chưa có dữ liệu khoang chứa"
                    />
                  )
                ),
              },
              {
                key: 'equipment',
                label: (
                  <Space>
                    <ToolOutlined style={{ color: '#8b5cf6' }} /> Trang thiết bị
                  </Space>
                ),
                children: (
                  <Table
                    rowKey={(equipment, idx) => equipment.id ?? idx}
                    columns={equipmentColumns}
                    dataSource={vessel.Equipment || []}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    pagination={{
                      defaultPageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50'],
                      showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} thiết bị`,
                    }}
                    locale={{
                      emptyText: (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thiết bị" />
                      ),
                    }}
                  />
                ),
              },
            ]}
          />
        </Card>
      </PageContainer>
    </AdminLayout>
  );
}
