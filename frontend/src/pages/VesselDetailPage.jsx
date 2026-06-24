import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Spin, Empty, Button, Space, Descriptions } from 'antd';
import {
  InfoCircleOutlined,
  SettingOutlined,
  InboxOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import { vesselService } from '../services/api';
import { PageHeader, StatusTag } from '../components/common';

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
      <AgencyLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spin size="large" tip="Đang tải dữ liệu...">
            <div style={{ minHeight: 80 }} />
          </Spin>
        </div>
      </AgencyLayout>
    );
  }

  if (!vessel) {
    return (
      <AgencyLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Empty description="Không tìm thấy tàu" />
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate('/vessels')}>
            Quay lại danh sách
          </Button>
        </div>
      </AgencyLayout>
    );
  }

  return (
    <AgencyLayout>
      <div style={{ padding: '24px 32px' }}>
        {/* Header */}
        <PageHeader
          onBack={() => navigate('/vessels')}
          title={vessel.shipName}
          breadcrumb={`IMO: ${vessel.imoNumber} • Quốc tịch: ${vessel.flag}`}
          extra={
            <StatusTag status={vessel.status} color={vessel.status === 'Hoạt động' ? 'green' : 'gold'} />
          }
        />

        {/* Content */}
        <Row gutter={[24, 24]}>
          {/* Card: Thông tin cơ bản */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <InfoCircleOutlined style={{ color: '#0ea5e9' }} /> Thông tin chung
                </Space>
              }
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Tên tàu">
                  <strong>{vessel.shipName}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Mã IMO">
                  <strong>{vessel.imoNumber}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Quốc gia đăng ký (Cờ)">
                  <strong>{vessel.flag || 'Chưa cập nhật'}</strong>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Card: Sức chứa */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <InboxOutlined style={{ color: '#f59e0b' }} /> Sức chứa & Tải trọng
                </Space>
              }
            >
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
            </Card>
          </Col>

          {/* Thông số máy chính */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <SettingOutlined style={{ color: '#6366f1' }} /> Máy móc
                </Space>
              }
            >
              {vessel.Engines && vessel.Engines.length > 0 ? (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  {vessel.Engines.map((engine, idx) => {
                    const isMainEngine = engine.engineType === 'Diesel 2-kỳ';
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
                            <Tag color={isMainEngine ? 'blue' : 'default'}>
                              {isMainEngine ? 'Máy chính' : 'Máy đèn'}
                            </Tag>
                            <strong style={{ color: '#334155' }}>{engine.engineName}</strong>
                          </Space>
                          <Tag color="geekblue">{engine.engineType}</Tag>
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
                                - {p.name}: <strong>{p.maxValue}</strong>
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
              )}
            </Card>
          </Col>

          {/* Khoang chứa & Thiết bị */}
          <Col xs={24} lg={12}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <Card
                title={
                  <Space>
                    <InboxOutlined style={{ color: '#10b981' }} /> Khoang hàng (Cargo Holds)
                  </Space>
                }
              >
                {vessel.CargoHolds && vessel.CargoHolds.length > 0 ? (
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
                        <strong style={{ color: '#166534', display: 'block' }}>{h.holdName}</strong>
                        <span style={{ color: '#15803d' }}>Sức chứa: {h.maxCapacity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa có dữ liệu khoang chứa"
                  />
                )}
              </Card>

              <Card
                title={
                  <Space>
                    <ToolOutlined style={{ color: '#8b5cf6' }} /> Trang thiết bị
                  </Space>
                }
              >
                {vessel.Equipment && vessel.Equipment.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', margin: 0, color: '#475569', fontSize: '0.95rem' }}>
                    {vessel.Equipment.map((e, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        <strong>{e.equipmentName}</strong> ({e.equipmentType}) - Vị trí: {e.location}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thiết bị" />
                )}
              </Card>
            </Space>
          </Col>
        </Row>
      </div>
    </AgencyLayout>
  );
}
