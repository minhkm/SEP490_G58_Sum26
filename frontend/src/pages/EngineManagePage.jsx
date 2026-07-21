import { useState, useEffect } from 'react';
import { Card, Tag, Button, Table, Modal, Space, Spin, Empty, Typography, Tabs, Row, Col, Badge, Alert, InputNumber, Tooltip, Progress } from 'antd';
import { ToolOutlined, SettingOutlined, ExclamationCircleOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { voyageService, vesselService } from '../services/api';
import { PageHeader, notifySuccess, notifyError } from '../components/common';
import { Select } from 'antd';

const { Text } = Typography;

// Cấu hình trạng thái Engine
const ENGINE_STATUSES = [
  { value: 'Operational',      label: 'Hoạt động',       color: '#22c55e', textColor: '#16a34a' },
  { value: 'Standby',          label: 'Dự phòng / Chờ',  color: '#3b82f6', textColor: '#2563eb' },
  { value: 'Under Maintenance',label: 'Đang bảo dưỡng',  color: '#f59e0b', textColor: '#b45309' },
];


const getEngineStatusCfg = (s) => ENGINE_STATUSES.find(x => x.value === s) || { label: s, color: 'default' };

// Loại máy
const isMainEngine = (engine) =>
  engine.engineType?.toLowerCase().includes('main') || engine.engineType?.toLowerCase().includes('chính');

// Trạng thái hợp lệ theo loại máy
const validStatusesForEngine = (engine) => {
  if (isMainEngine(engine)) return ENGINE_STATUSES.filter(s => s.value !== 'Standby');
  return ENGINE_STATUSES;
};

// Màu viền card theo status
const cardBorderColor = (status) => {
  if (status === 'Operational')       return '#22c55e';
  if (status === 'Standby')           return '#3b82f6';
  if (status === 'Under Maintenance') return '#f59e0b';
  return '#d1d5db';
};

export default function EngineManagePage() {
  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [engines,       setEngines]       = useState([]);
  const [shipEquipments, setShipEquipments] = useState([]);   // thiết bị của tàu
  const [voyageEquipments, setVoyageEquipments] = useState([]); // vật tư y tế hải trình
  const [loading, setLoading] = useState(true);

  // Filter cho thiết bị tàu
  const [eqTypeFilter, setEqTypeFilter] = useState('Tất cả');

  // Modal đổi trạng thái Engine
  const [engineModal, setEngineModal] = useState({ open: false, engine: null, newStatus: null });

  // Modal cập nhật brokenCount (thiết bị tàu)
  const [brokenModal, setBrokenModal] = useState({ open: false, equip: null, newBroken: 0 });

  // Modal cập nhật số đã dùng (vật tư y tế)
  const [medModal, setMedModal] = useState({ open: false, equip: null, newUsed: 0 });

  // Tự động load hải trình đang hoạt động
  useEffect(() => {
    const init = async () => {
      try {
        const data = await voyageService.getAll();
        const current = data.find(v => v.status !== 'Completed' && v.status !== 'Cancelled');
        if (!current) { setLoading(false); return; }
        setSelectedVoyage(current);

        // Lấy engines + thiết bị tàu từ vessel
        if (current.shipId) {
          const vessel = await vesselService.getById(current.shipId);
          setEngines(vessel.Engines || []);
          try {
            const shipEqs = await vesselService.getShipEquipments(current.shipId);
            setShipEquipments(shipEqs || []);
          } catch (e) { console.error(e); }
        }

        // Lấy vật tư y tế từ hải trình
        try {
          const voyageEqs = await voyageService.getVoyageEquipments(current.id);
          setVoyageEquipments(voyageEqs || []);
        } catch (e) { console.error(e); }

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Đổi trạng thái Engine
  const confirmEngineStatus = async () => {
    const { engine, newStatus } = engineModal;
    try {
      await vesselService.updateEngineStatus(engine.id, newStatus);
      setEngines(prev => prev.map(e => e.id === engine.id ? { ...e, status: newStatus } : e));
      notifySuccess(`Đã cập nhật "${engine.engineName}" → ${getEngineStatusCfg(newStatus).label}`);
      setEngineModal({ open: false, engine: null, newStatus: null });
    } catch (err) {
      notifyError('Cập nhật thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  // Cập nhật brokenCount cho thiết bị tàu
  const confirmBrokenCount = async () => {
    const { equip, newBroken } = brokenModal;
    try {
      await vesselService.updateEquipmentBrokenCount(equip.id, newBroken);
      setShipEquipments(prev => prev.map(e => e.id === equip.id ? { ...e, brokenCount: newBroken } : e));
      notifySuccess(`Đã cập nhật số thiết bị hỏng: ${equip.equipmentName}`);
      setBrokenModal({ open: false, equip: null, newBroken: 0 });
    } catch (err) {
      notifyError('Cập nhật thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  // Cập nhật số đã dùng cho vật tư y tế (dùng brokenCount làm usedCount)
  const confirmMedUsed = async () => {
    const { equip, newUsed } = medModal;
    try {
      await voyageService.updateEquipmentBrokenCount(equip.id, newUsed);
      setVoyageEquipments(prev => prev.map(e => e.id === equip.id ? { ...e, brokenCount: newUsed } : e));
      notifySuccess(`Đã cập nhật số đã dùng: ${equip.equipmentName}`);
      setMedModal({ open: false, equip: null, newUsed: 0 });
    } catch (err) {
      notifyError('Cập nhật thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  const renderEngines = () => {
    if (engines.length === 0) return <Empty description="Không có thông tin máy của tàu này" />;
    return (
      <Row gutter={[16, 16]}>
        {engines.map(engine => {
          const statusCfg = getEngineStatusCfg(engine.status);
          const isMain    = isMainEngine(engine);
          return (
            <Col xs={24} sm={12} lg={8} key={engine.id}>
              <Card
                style={{ borderTop: `3px solid ${cardBorderColor(engine.status)}` }}
                actions={[
                  <Button
                    type="link"
                    icon={<SettingOutlined />}
                    onClick={() => setEngineModal({ open: true, engine, newStatus: engine.status })}
                  >
                    Đổi trạng thái
                  </Button>
                ]}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Tag color={isMain ? 'blue' : 'gold'}>{isMain ? 'Máy chính' : 'Máy phụ'}</Tag>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusCfg.color || '#d1d5db', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: statusCfg.textColor || '#6b7280', fontWeight: 600, fontSize: 13 }}>{statusCfg.label}</span>
                    </span>
                  </Space>
                  <Text strong style={{ fontSize: 16 }}>{engine.engineName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{engine.engineType}</Text>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  // ===== RENDER thiết bị tàu (có brokenCount) =====
  const eqTypes = ['Tất cả', ...Array.from(new Set(shipEquipments.map(e => e.equipmentType)))];
  const filteredShipEqs = shipEquipments.filter(e =>
    eqTypeFilter === 'Tất cả' || e.equipmentType === eqTypeFilter
  );

  const renderShipEquipmentCard = (eq) => {
    const good   = (eq.quantity || 1) - (eq.brokenCount || 0);
    const broken = eq.brokenCount || 0;
    const total  = eq.quantity || 1;
    const brokenPct = Math.round((broken / total) * 100);
    const allGood   = broken === 0;
    const allBroken = broken === total;

    return (
      <Card
        key={eq.id}
        size="small"
        style={{
          borderLeft: `4px solid ${allBroken ? '#ef4444' : allGood ? '#22c55e' : '#f59e0b'}`,
          marginBottom: 8,
        }}
        bodyStyle={{ padding: '10px 14px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Tên + loại */}
          <div style={{ flex: 1 }}>
            <Text strong>{eq.equipmentName}</Text>
            <div style={{ marginTop: 2 }}>
              <Tag style={{ fontSize: 11 }}>{eq.equipmentType}</Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>{eq.location}</Text>
              {eq.expiryNote && (
                <Tooltip title={`Hạn sử dụng: ${eq.expiryNote}`}>
                  <Tag color="orange" style={{ fontSize: 10, marginLeft: 4 }}>HSD: {eq.expiryNote}</Tag>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Visual số lượng */}
          <div style={{ minWidth: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ {good} còn tốt</Text>
              {broken > 0 && (
                <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>✗ {broken} hỏng</Text>
              )}
            </div>
            {broken > 0 ? (
              <Progress
                percent={brokenPct}
                strokeColor="#ef4444"
                trailColor="#22c55e"
                size="small"
                format={() => `${broken}/${total} hỏng`}
              />
            ) : (
              <Progress percent={100} strokeColor="#22c55e" size="small" format={() => `${total}/${total} tốt`} />
            )}
          </div>

          {/* Nút cập nhật */}
          <Button
            size="small"
            icon={<ExclamationCircleOutlined />}
            onClick={() => setBrokenModal({ open: true, equip: eq, newBroken: eq.brokenCount || 0 })}
          >
            Cập nhật hỏng
          </Button>
        </div>
      </Card>
    );
  };

  // ===== RENDER vật tư y tế hải trình =====
  const voyageEqColumns = [
    { title: 'Vật tư / Thuốc', dataIndex: 'equipmentName', key: 'name' },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'qty', width: 100,
      render: (q) => <Tag color="blue">{q}</Tag> },
    { title: 'Ghi chú hạn SD', dataIndex: 'expiryNote', key: 'expiry',
      render: (n) => n ? <Tag color="orange">{n}</Tag> : <Text type="secondary">—</Text> },
  ];

  if (loading) {
    return (
      <MasterLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
      </MasterLayout>
    );
  }

  if (!selectedVoyage) {
    return (
      <MasterLayout>
        <div style={{ padding: '24px 32px' }}>
          <PageHeader icon={<ToolOutlined style={{ color: '#f59e0b' }} />}
            breadcrumb="Quản lý Máy & Thiết bị" title="Quản lý Trạng thái Máy & Thiết bị" />
          <Card><Empty description="Hiện không có hải trình nào đang hoạt động." /></Card>
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader
          icon={<ToolOutlined style={{ color: '#f59e0b' }} />}
          breadcrumb="Quản lý Máy & Thiết bị"
          title="Quản lý Trạng thái Máy & Thiết bị"
        />

        {/* Thông tin hải trình hiện tại */}
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message={
            <span>
              Hải trình đang hoạt động:{' '}
              <strong>{selectedVoyage.voyageCode || `#${selectedVoyage.id}`}</strong>
              {' — '}
              {selectedVoyage.departurePort} → {selectedVoyage.destinationPort}
            </span>
          }
        />

        <Tabs
          defaultActiveKey="engines"
          items={[
            {
              key: 'engines',
              label: <span><ToolOutlined /> Máy tàu ({engines.length})</span>,
              children: (
                <Card title="Danh sách máy của tàu">
                  {renderEngines()}
                </Card>
              )
            },
            {
              key: 'ship-equipments',
              label: <span><ExclamationCircleOutlined /> Thiết bị tàu ({shipEquipments.length})</span>,
              children: (
                <Card
                  title="Thiết bị của tàu"
                  extra={
                    <Select style={{ width: 200 }} value={eqTypeFilter} onChange={setEqTypeFilter}
                      options={eqTypes.map(t => ({ value: t, label: t }))} />
                  }
                >
                  {filteredShipEqs.length === 0 ? (
                    <Empty description="Không có thiết bị nào." />
                  ) : (
                    <div>{filteredShipEqs.map(eq => renderShipEquipmentCard(eq))}</div>
                  )}
                </Card>
              )
            },
            {
              key: 'medical',
              label: <span><MedicineBoxOutlined /> Vật tư y tế ({voyageEquipments.length})</span>,
              children: (
                <Card title="Vật tư y tế hải trình">
                  {voyageEquipments.length === 0 ? (
                    <Empty description="Hải trình này chưa có vật tư y tế." />
                  ) : (
                    <div>
                      {voyageEquipments.map(eq => {
                        const used    = eq.brokenCount || 0;
                        const remain  = (eq.quantity || 0) - used;
                        const total   = eq.quantity || 1;
                        const usedPct = Math.round((used / total) * 100);
                        const isEmpty = remain === 0;
                        const isLow   = remain > 0 && remain < total / 3;
                        const borderColor = isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e';

                        return (
                          <Card
                            key={eq.id}
                            size="small"
                            style={{
                              borderLeft: `4px solid ${borderColor}`,
                              marginBottom: 8,
                            }}
                            bodyStyle={{ padding: '10px 14px' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {/* Tên + hạn SD */}
                              <div style={{ flex: 1 }}>
                                <Text strong>{eq.equipmentName}</Text>
                                <div style={{ marginTop: 2 }}>
                                  <Tag color="blue" style={{ fontSize: 11 }}>Vật tư y tế</Tag>
                                  {eq.expiryNote ? (
                                    <Tooltip title={`Hạn sử dụng: ${eq.expiryNote}`}>
                                      <Tag color="orange" style={{ fontSize: 10, marginLeft: 2 }}>HSD: {eq.expiryNote}</Tag>
                                    </Tooltip>
                                  ) : (
                                    <Text type="secondary" style={{ fontSize: 11 }}>Không có hạn SD</Text>
                                  )}
                                </div>
                              </div>

                              {/* Visual số lượng */}
                              <div style={{ minWidth: 180 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ {remain} còn lại</Text>
                                  {used > 0 && (
                                    <Text style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>✗ {used} đã dùng</Text>
                                  )}
                                </div>
                                {used > 0 ? (
                                  <Progress
                                    percent={usedPct}
                                    strokeColor="#f59e0b"
                                    trailColor="#22c55e"
                                    size="small"
                                    format={() => `${used}/${total} đã dùng`}
                                  />
                                ) : (
                                  <Progress percent={100} strokeColor="#22c55e" size="small" format={() => `${total}/${total} còn đủ`} />
                                )}
                              </div>

                              {/* Nút cập nhật */}
                              <Button
                                size="small"
                                icon={<MedicineBoxOutlined />}
                                onClick={() => setMedModal({ open: true, equip: eq, newUsed: used })}
                              >
                                Cập nhật
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )
            }
          ]}
        />
      </div>

      {/* Modal đổi trạng thái Máy */}
      <Modal
        title={`Đổi trạng thái: ${engineModal.engine?.engineName}`}
        open={engineModal.open}
        onCancel={() => setEngineModal({ open: false, engine: null, newStatus: null })}
        onOk={confirmEngineStatus}
        okText="Xác nhận" cancelText="Hủy"
      >
        {engineModal.engine && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Trạng thái hiện tại: <Badge
              status={getEngineStatusCfg(engineModal.engine.status).color}
              text={getEngineStatusCfg(engineModal.engine.status).label} /></Text>
            <Text strong>Chọn trạng thái mới:</Text>
            <Select
              style={{ width: '100%' }}
              value={engineModal.newStatus}
              onChange={(val) => setEngineModal(prev => ({ ...prev, newStatus: val }))}
              options={validStatusesForEngine(engineModal.engine).map(s => ({ value: s.value, label: s.label }))}
            />
          </Space>
        )}
      </Modal>

      {/* Modal cập nhật số thiết bị hỏng */}
      <Modal
        title={`Cập nhật số hỏng: ${brokenModal.equip?.equipmentName}`}
        open={brokenModal.open}
        onCancel={() => setBrokenModal({ open: false, equip: null, newBroken: 0 })}
        onOk={confirmBrokenCount}
        okText="Xác nhận" cancelText="Hủy"
      >
        {brokenModal.equip && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Tổng số lượng: <strong>{brokenModal.equip.quantity}</strong></Text>
            <Text>Hiện đang hỏng: <strong style={{ color: '#dc2626' }}>{brokenModal.equip.brokenCount || 0}</strong></Text>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Số lượng hỏng mới <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>(0 = tất cả còn tốt)</span>:
              </Text>
              <InputNumber
                min={0}
                max={brokenModal.equip.quantity}
                value={brokenModal.newBroken}
                onChange={val => setBrokenModal(prev => ({ ...prev, newBroken: val ?? 0 }))}
                style={{ width: '100%' }}
                addonAfter={`/ ${brokenModal.equip.quantity}`}
              />
            </div>
            <Alert
              type={brokenModal.newBroken === 0 ? 'success' : brokenModal.newBroken === brokenModal.equip.quantity ? 'error' : 'warning'}
              showIcon
              message={
                brokenModal.newBroken === 0
                  ? 'Tất cả còn tốt'
                  : brokenModal.newBroken === brokenModal.equip.quantity
                    ? 'Toàn bộ đã hỏng!'
                    : `Còn ${brokenModal.equip.quantity - brokenModal.newBroken} cái tốt, ${brokenModal.newBroken} cái hỏng`
              }
            />
          </Space>
        )}
      </Modal>
      {/* Modal cập nhật số đã dùng (vật tư y tế) */}
      <Modal
        title={`Cập nhật đã dùng: ${medModal.equip?.equipmentName}`}
        open={medModal.open}
        onCancel={() => setMedModal({ open: false, equip: null, newUsed: 0 })}
        onOk={confirmMedUsed}
        okText="Xác nhận" cancelText="Hủy"
      >
        {medModal.equip && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Số lượng ban đầu: <strong>{medModal.equip.quantity}</strong></Text>
            <Text>Đã dùng trước đó: <strong style={{ color: '#d97706' }}>{medModal.equip.brokenCount || 0}</strong></Text>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Tổng số đã sử dụng:</Text>
              <InputNumber
                min={0}
                max={medModal.equip.quantity}
                value={medModal.newUsed}
                onChange={val => setMedModal(prev => ({ ...prev, newUsed: val ?? 0 }))}
                style={{ width: '100%' }}
                addonAfter={`/ ${medModal.equip.quantity}`}
              />
            </div>
            <Alert
              type={medModal.newUsed === 0 ? 'info' : medModal.newUsed >= medModal.equip.quantity ? 'error' : 'warning'}
              showIcon
              message={
                medModal.newUsed === 0
                  ? 'Chưa sử dụng'
                  : medModal.newUsed >= medModal.equip.quantity
                    ? 'Đã dùng hết!'
                    : `Còn lại: ${medModal.equip.quantity - medModal.newUsed} đơn vị`
              }
            />
          </Space>
        )}
      </Modal>
    </MasterLayout>
  );
}
