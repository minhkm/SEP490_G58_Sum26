import { useState, useEffect } from 'react';
import { Card, Tag, Button, Table, Modal, Space, Spin, Empty, Typography, Tabs, Row, Col, Badge, Alert } from 'antd';
import { ToolOutlined, SettingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { voyageService, vesselService } from '../services/api';
import { PageHeader, notifySuccess, notifyError } from '../components/common';
import { Select } from 'antd';

const { Text } = Typography;

// Cấu hình trạng thái Engine
const ENGINE_STATUSES = [
  { value: 'Operational',      label: 'Hoạt động bình thường', color: 'success' },
  { value: 'Standby',          label: 'Dự phòng / Chờ',        color: 'processing' },
  { value: 'Under Maintenance',label: 'Đang bảo dưỡng',        color: 'warning' },
];

// Cấu hình trạng thái Equipment
const EQUIPMENT_STATUSES = [
  { value: 'Operational', label: 'Bình thường', color: 'success' },
  { value: 'Broken',      label: 'Hỏng hóc',   color: 'error' },
  { value: 'Lost',        label: 'Thất lạc',    color: 'default' },
];

const getEngineStatusCfg = (s) => ENGINE_STATUSES.find(x => x.value === s)    || { label: s, color: 'default' };
const getEquipStatusCfg  = (s) => EQUIPMENT_STATUSES.find(x => x.value === s) || { label: s, color: 'default' };

// Loại máy
const isMainEngine = (engine) =>
  engine.engineType?.toLowerCase().includes('main') || engine.engineType?.toLowerCase().includes('chính');

// Trạng thái hợp lệ theo loại máy
// Máy chính chỉ: Operational / Under Maintenance (không Standby vì chỉ có 1)
// Máy phụ: cả 3
const validStatusesForEngine = (engine) => {
  if (isMainEngine(engine)) return ENGINE_STATUSES.filter(s => s.value !== 'Standby');
  return ENGINE_STATUSES;
};

// Màu viền card theo status
const cardBorderColor = (status) => {
  if (status === 'Operational')      return '#22c55e';
  if (status === 'Standby')          return '#3b82f6';
  if (status === 'Under Maintenance') return '#f59e0b';
  return '#d1d5db';
};

export default function EngineManagePage() {
  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [engines, setEngines]   = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [eqTypeFilter, setEqTypeFilter]     = useState('Tất cả');
  const [eqStatusFilter, setEqStatusFilter] = useState('Tất cả');

  // Modal đổi trạng thái
  const [engineModal, setEngineModal] = useState({ open: false, engine: null, newStatus: null });
  const [equipModal,  setEquipModal]  = useState({ open: false, equip: null,  newStatus: null });

  // Tự động load hải trình đang hoạt động
  useEffect(() => {
    const init = async () => {
      try {
        const data = await voyageService.getAll();
        // Lấy hải trình đang active (không Completed, không Cancelled)
        const current = data.find(v => v.status !== 'Completed' && v.status !== 'Cancelled');
        if (!current) { setLoading(false); return; }

        setSelectedVoyage(current);

        // Lấy engines từ tàu
        if (current.shipId) {
          const vessel = await vesselService.getById(current.shipId);
          setEngines(vessel.Engines || []);
        }
        // Lấy equipments từ hải trình
        const eqs = await voyageService.getVoyageEquipments(current.id);
        setEquipments(eqs || []);
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

  // Đổi trạng thái Equipment
  const confirmEquipStatus = async () => {
    const { equip, newStatus } = equipModal;
    try {
      await voyageService.updateEquipmentStatus(equip.id, newStatus);
      setEquipments(prev => prev.map(e => e.id === equip.id ? { ...e, status: newStatus } : e));
      notifySuccess(`Đã cập nhật "${equip.equipmentName}" → ${getEquipStatusCfg(newStatus).label}`);
      setEquipModal({ open: false, equip: null, newStatus: null });
    } catch (err) {
      notifyError('Cập nhật thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  // ===== RENDER engines dạng card =====
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
                    <Badge status={statusCfg.color} text={statusCfg.label} />
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

  // ===== RENDER equipments dạng table =====
  const eqTypes = ['Tất cả', ...Array.from(new Set(equipments.map(e => e.equipmentType)))];
  const filteredEquipments = equipments.filter(e => {
    const matchType   = eqTypeFilter   === 'Tất cả' || e.equipmentType === eqTypeFilter;
    const matchStatus = eqStatusFilter === 'Tất cả' || e.status === eqStatusFilter;
    return matchType && matchStatus;
  });

  const equipColumns = [
    { title: 'Thiết bị',  dataIndex: 'equipmentName', key: 'name' },
    { title: 'Loại',      dataIndex: 'equipmentType', key: 'type', render: t => <Tag>{t}</Tag> },
    { title: 'Vị trí',    dataIndex: 'location',      key: 'loc' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (s) => {
        const cfg = getEquipStatusCfg(s);
        return <Badge status={cfg.color} text={cfg.label} />;
      }
    },
    {
      title: '', key: 'action', width: 130,
      render: (_, eq) => (
        <Button size="small" icon={<SettingOutlined />}
          onClick={() => setEquipModal({ open: true, equip: eq, newStatus: eq.status })}>
          Đổi trạng thái
        </Button>
      )
    }
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
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Lưu ý: Máy phụ nên có 1 chiếc Operational và 1 chiếc Standby. Thợ máy chỉ ghi nhật ký cho máy đang Operational."
                  />
                  {renderEngines()}
                </Card>
              )
            },
            {
              key: 'equipments',
              label: <span><ExclamationCircleOutlined /> Thiết bị hải trình ({equipments.length})</span>,
              children: (
                <Card
                  title="Danh sách thiết bị được cấp phát"
                  extra={
                    <Space>
                      <Select style={{ width: 160 }} value={eqTypeFilter} onChange={setEqTypeFilter}
                        options={eqTypes.map(t => ({ value: t, label: t }))} />
                      <Select style={{ width: 160 }} value={eqStatusFilter} onChange={setEqStatusFilter}
                        options={[
                          { value: 'Tất cả', label: 'Tất cả trạng thái' },
                          ...EQUIPMENT_STATUSES.map(s => ({ value: s.value, label: s.label }))
                        ]} />
                    </Space>
                  }
                >
                  <Table
                    rowKey="id"
                    columns={equipColumns}
                    dataSource={filteredEquipments}
                    pagination={{ pageSize: 15, hideOnSinglePage: true }}
                    locale={{ emptyText: 'Không có thiết bị nào.' }}
                    rowClassName={(eq) => eq.status !== 'Operational' ? 'row-warning' : ''}
                  />
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

      {/* Modal đổi trạng thái Thiết bị */}
      <Modal
        title={`Đổi trạng thái: ${equipModal.equip?.equipmentName}`}
        open={equipModal.open}
        onCancel={() => setEquipModal({ open: false, equip: null, newStatus: null })}
        onOk={confirmEquipStatus}
        okText="Xác nhận" cancelText="Hủy"
      >
        {equipModal.equip && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Trạng thái hiện tại: <Badge
              status={getEquipStatusCfg(equipModal.equip.status).color}
              text={getEquipStatusCfg(equipModal.equip.status).label} /></Text>
            <Text strong>Chọn trạng thái mới:</Text>
            <Select
              style={{ width: '100%' }}
              value={equipModal.newStatus}
              onChange={(val) => setEquipModal(prev => ({ ...prev, newStatus: val }))}
              options={EQUIPMENT_STATUSES.map(s => ({ value: s.value, label: s.label }))}
            />
          </Space>
        )}
      </Modal>
    </MasterLayout>
  );
}
