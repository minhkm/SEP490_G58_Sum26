import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Empty, Button, Space, Descriptions, Tabs } from 'antd';
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
  normalizeShipStatus,
} from '../utils/vessel';
import { getCode } from 'country-list';

const vietnameseRegionNames = new Intl.DisplayNames(['vi'], { type: 'region' });
const countryLabel = (country) => {
  if (!country) return 'Chưa cập nhật';
  const code = getCode(country);
  return code ? vietnameseRegionNames.of(code) : country;
};

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
                  vessel.Equipment && vessel.Equipment.length > 0 ? (
                    <ul style={{ paddingLeft: '20px', margin: 0, color: '#475569', fontSize: '0.95rem' }}>
                      {vessel.Equipment.map((e, idx) => (
                        <li key={idx} style={{ marginBottom: '6px' }}>
                          <strong>{equipmentNameLabel(e.equipmentName)}</strong> ({equipmentTypeLabel(e.equipmentType)}) - Vị trí: {equipmentLocationLabel(e.location)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thiết bị" />
                  )
                ),
              },
            ]}
          />
        </Card>
      </PageContainer>
    </AdminLayout>
  );
}
