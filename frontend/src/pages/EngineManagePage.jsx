import { useState, useEffect } from 'react';
import { Card, Tag, Button, Modal, Space, Spin, Empty, Typography, Tabs, Row, Col, Badge, Alert, Input, InputNumber, Tooltip, Progress } from 'antd';
import { ToolOutlined, SettingOutlined, ExclamationCircleOutlined, MedicineBoxOutlined, SearchOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { voyageService, vesselService } from '../services/api';
import { PageHeader, PageContainer, notifySuccess, notifyError } from '../components/common';
import { getEffectiveRole } from '../config/roles';
import { Select } from 'antd';
import {
  ENGINE_STATUS,
  ENGINE_STATUS_OPTIONS,
  engineNameLabel,
  engineTypeLabel,
  isMainEngine,
  normalizeEngineStatus,
} from '../utils/engine';
import {
  equipmentLocationLabel,
  equipmentNameLabel,
  equipmentTypeLabel,
  formatEquipmentExpiryDate,
  isEquipmentExpired,
} from '../utils/vessel';

const { Text } = Typography;

const getEngineStatusCfg = (status) => {
  const normalized = normalizeEngineStatus(status);
  return ENGINE_STATUS_OPTIONS.find((item) => item.value === normalized)
    || { label: normalized, color: 'default' };
};

// Máy chính không có chế độ dự phòng; máy phụ có đủ ba trạng thái vận hành.
const validStatusesForEngine = (engine) => (
  isMainEngine(engine)
    ? ENGINE_STATUS_OPTIONS.filter((item) => item.value !== ENGINE_STATUS.STANDBY)
    : ENGINE_STATUS_OPTIONS
);

const normalizeSearchText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const isPositiveIntegerWithin = (value, maximum) => (
  Number.isInteger(value) && value > 0 && value <= maximum
);

const remainingQuantity = (equipment) => Math.max(
  0,
  Number(equipment?.quantity || 0) - Number(equipment?.brokenCount || 0),
);

const isExpiredWithStock = (equipment) => (
  remainingQuantity(equipment) > 0 && isEquipmentExpired(equipment?.expiryNote)
);

// Màu viền card theo status
const cardBorderColor = (status) => {
  const normalized = normalizeEngineStatus(status);
  if (normalized === ENGINE_STATUS.OPERATIONAL) return '#22c55e';
  if (normalized === ENGINE_STATUS.STANDBY) return '#3b82f6';
  if (normalized === ENGINE_STATUS.MAINTENANCE) return '#f59e0b';
  return '#d1d5db';
};

export default function EngineManagePage() {
  const role = getEffectiveRole();
  const isEngineOfficer = role === 'EngineOfficer';
  const canManageSupplies = ['Master', 'ChiefOfficer'].includes(role);
  const pageTitle = isEngineOfficer
    ? 'Quản lý trạng thái máy'
    : 'Quản lý thiết bị và vật tư y tế';

  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [engines,       setEngines]       = useState([]);
  const [shipEquipments, setShipEquipments] = useState([]);   // thiết bị của tàu
  const [voyageEquipments, setVoyageEquipments] = useState([]); // vật tư y tế hải trình
  const [loading, setLoading] = useState(true);
  const [voyageContextError, setVoyageContextError] = useState('');

  // Filter cho thiết bị tàu
  const [eqTypeFilter, setEqTypeFilter] = useState('Tất cả');
  const [eqSearch, setEqSearch] = useState('');
  const [medicalSearch, setMedicalSearch] = useState('');

  // Modal đổi trạng thái Engine
  const [engineModal, setEngineModal] = useState({ open: false, engine: null, newStatus: null });

  // Modal cập nhật brokenCount (thiết bị tàu)
  const [brokenModal, setBrokenModal] = useState({ open: false, equip: null, newBroken: 1 });

  // Modal cập nhật số đã dùng (vật tư y tế)
  const [medModal, setMedModal] = useState({ open: false, equip: null, newUsed: 1 });
  const canUpdateSupplies = ['Underway', 'At Anchor', 'Homeward Bounding'].includes(selectedVoyage?.status);

  // Chỉ tải đúng hải trình người dùng đã chọn tại trang "Hải trình của tôi".
  useEffect(() => {
    const init = async () => {
      try {
        const activeVoyageId = localStorage.getItem('activeVoyageId');
        if (!activeVoyageId) {
          setVoyageContextError('Vui lòng chọn một hải trình trước khi truy cập trang này.');
          return;
        }

        const data = await voyageService.getAll();
        const current = (data || []).find(v => String(v.id) === String(activeVoyageId));
        if (!current) {
          setVoyageContextError('Không tìm thấy hải trình đã chọn hoặc bạn không còn được phân công vào hải trình này.');
          return;
        }

        setVoyageContextError('');
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
        setVoyageContextError('Không thể tải dữ liệu của hải trình đã chọn.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Đổi trạng thái Engine
  const confirmEngineStatus = async () => {
    const { engine, newStatus } = engineModal;
    // Chỉ đổi trạng thái máy khi hải trình đang đi hoặc neo đậu.
    if (!['Underway', 'Anchored', 'At Anchor', 'Homeward Bounding'].includes(selectedVoyage?.status)) {
      notifyError('Chỉ được phép đổi trạng thái máy khi hải trình đang di chuyển, neo đậu hoặc quay về cảng xuất phát!');
      setEngineModal({ open: false, engine: null, newStatus: null });
      return;
    }
    const isMain = isMainEngine(engine);
    const stoppingMainEngine = newStatus !== ENGINE_STATUS.OPERATIONAL;

    const doUpdate = async () => {
      // Truyền hải trình cho mọi máy để backend kiểm tra đúng chức danh được phân công.
      const voyageId = selectedVoyage?.id || null;
      const result = await vesselService.updateEngineStatus(engine.id, newStatus, voyageId);
      setEngines(prev => prev.map(e => e.id === engine.id ? { ...e, status: normalizeEngineStatus(newStatus) } : e));
      notifySuccess(`Đã cập nhật "${engineNameLabel(engine.engineName)}" → ${getEngineStatusCfg(newStatus).label}`);
      if (result.voyageUpdated && result.newVoyageStatus) {
        setSelectedVoyage(prev => ({ ...prev, status: result.newVoyageStatus }));
        const voyageLabel = (result.newVoyageStatus === 'Anchored' || result.newVoyageStatus === 'At Anchor')
          ? 'Neo đậu'
          : result.newVoyageStatus === 'Homeward Bounding'
          ? 'Đang quay về cảng xuất phát'
          : 'Đang hành trình';
        notifySuccess(`Hải trình đã chuyển sang trạng thái ${voyageLabel}`);
      }
      setEngineModal({ open: false, engine: null, newStatus: null });
    };


    try {
      // Máy chính ngừng chạy thì hải trình bắt buộc chuyển sang neo đậu.
      if (isMain && stoppingMainEngine && selectedVoyage) {
        setEngineModal({ open: false, engine: null, newStatus: null }); // đóng modal select trước
        Modal.confirm({
          title: 'Máy chính sẽ ngừng hoạt động',
          icon: <ExclamationCircleOutlined style={{ color: '#f59e0b' }} />,
          content: (
            <div>
              <p>Máy chính chuyển sang <strong>{getEngineStatusCfg(newStatus).label}</strong>.</p>
              <p>Tàu sẽ không thể vận hành và hải trình sẽ tự chuyển sang trạng thái <strong>Neo đậu</strong>.</p>
            </div>
          ),
          okText: 'Xác nhận',
          cancelText: 'Hủy',
          onOk: async () => {
            try {
              await doUpdate();
            } catch (err) {
              notifyError('Cập nhật thất bại: ' + (err.response?.data?.message || 'Không thể kết nối tới máy chủ.'));
              throw err;
            }
          },
        });
      } else {
        // Máy chính hoạt động lại: backend tự cho hải trình tiếp tục nếu đang neo đậu.
        await doUpdate();
      }

    } catch (err) {
      notifyError('Cập nhật thất bại: ' + (err.response?.data?.message || 'Không thể kết nối tới máy chủ.'));
    }
  };

  // Cập nhật brokenCount cho thiết bị tàu
  const confirmBrokenCount = async () => {
    const { equip, newBroken } = brokenModal;
    if (!canUpdateSupplies) {
      notifyError('Chỉ được cập nhật thiết bị khi hải trình đang di chuyển.');
      return;
    }
    if (isExpiredWithStock(equip)) {
      notifyError(`${equip.equipmentName} đã hết hạn sử dụng.`);
      return;
    }
    const remainingGood = (equip?.quantity || 0) - (equip?.brokenCount || 0);
    if (!isPositiveIntegerWithin(newBroken, remainingGood)) {
      notifyError(`Số lượng hỏng mới phải là số nguyên dương và không vượt quá ${remainingGood}.`);
      return;
    }
    try {
      const result = await vesselService.updateEquipmentBrokenCount(equip.id, newBroken);
      const updatedBrokenCount = result.equipment?.brokenCount ?? ((equip.brokenCount || 0) + newBroken);
      setShipEquipments(prev => prev.map(e => e.id === equip.id ? { ...e, brokenCount: updatedBrokenCount } : e));
      notifySuccess(`Đã ghi nhận thêm ${newBroken} thiết bị hỏng: ${equip.equipmentName}`);
      setBrokenModal({ open: false, equip: null, newBroken: 1 });
    } catch (err) {
      notifyError('Cập nhật thất bại: ' + (err.response?.data?.message || 'Không thể kết nối tới máy chủ.'));
    }
  };

  // Cập nhật số đã dùng cho vật tư y tế (dùng brokenCount làm usedCount)
  const confirmMedUsed = async () => {
    const { equip, newUsed } = medModal;
    if (!canUpdateSupplies) {
      notifyError('Chỉ được cập nhật vật tư y tế khi hải trình đang di chuyển.');
      return;
    }
    if (isExpiredWithStock(equip)) {
      notifyError(`${equip.equipmentName} đã hết hạn sử dụng.`);
      return;
    }
    const remaining = (equip?.quantity || 0) - (equip?.brokenCount || 0);
    if (!isPositiveIntegerWithin(newUsed, remaining)) {
      notifyError(`Số lượng sử dụng thêm phải là số nguyên dương và không vượt quá ${remaining}.`);
      return;
    }
    try {
      const result = await voyageService.updateEquipmentBrokenCount(equip.id, newUsed);
      const updatedUsedCount = result.equipment?.brokenCount ?? ((equip.brokenCount || 0) + newUsed);
      setVoyageEquipments(prev => prev.map(e => e.id === equip.id ? { ...e, brokenCount: updatedUsedCount } : e));
      notifySuccess(`Đã ghi nhận thêm ${newUsed} vật tư đã dùng: ${equip.equipmentName}`);
      setMedModal({ open: false, equip: null, newUsed: 1 });
    } catch (err) {
      notifyError('Cập nhật thất bại: ' + (err.response?.data?.message || 'Không thể kết nối tới máy chủ.'));
    }
  };

  const renderEngines = () => {
    if (engines.length === 0) return <Empty description="Không có thông tin máy của tàu này" />;
    return (
      <Row gutter={[16, 16]}>
        {engines.map(engine => {
          const statusCfg = getEngineStatusCfg(engine.status);
          const isMain    = isMainEngine(engine);
          // Được đổi trạng thái khi hải trình đang đi hoặc neo đậu
          const canChangeStatus = ['Underway', 'Anchored', 'At Anchor', 'Homeward Bounding'].includes(selectedVoyage?.status);
          return (
            <Col xs={24} sm={12} lg={8} key={engine.id}>
              <Card
                style={{ borderTop: `3px solid ${cardBorderColor(engine.status)}` }}
                actions={[
                  <Tooltip
                    key="change-status"
                    title={!canChangeStatus ? 'Chỉ được đổi trạng thái máy khi hải trình đang đi hoặc neo đậu' : ''}
                  >
                    <Button
                      type="link"
                      icon={<SettingOutlined />}
                      disabled={!canChangeStatus}
                      onClick={() => canChangeStatus && setEngineModal({ open: true, engine, newStatus: normalizeEngineStatus(engine.status) })}
                    >
                      Đổi trạng thái
                    </Button>
                  </Tooltip>
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
                  <Text strong style={{ fontSize: 16 }}>{engineNameLabel(engine.engineName)}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{engineTypeLabel(engine)}</Text>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  // ===== RENDER thiết bị tàu (có brokenCount) =====
  const eqTypes = ['Tất cả', ...Array.from(new Set(shipEquipments.map(e => equipmentTypeLabel(e.equipmentType))))];
  const normalizedEqSearch = normalizeSearchText(eqSearch);
  const filteredShipEqs = shipEquipments.filter((equipment) => {
    const matchesType = eqTypeFilter === 'Tất cả'
      || equipmentTypeLabel(equipment.equipmentType) === eqTypeFilter;
    const searchableText = normalizeSearchText([
      equipmentNameLabel(equipment.equipmentName),
      equipmentTypeLabel(equipment.equipmentType),
      equipmentLocationLabel(equipment.location),
    ].join(' '));
    return matchesType && (!normalizedEqSearch || searchableText.includes(normalizedEqSearch));
  });

  const normalizedMedicalSearch = normalizeSearchText(medicalSearch);
  const filteredVoyageEquipments = voyageEquipments.filter((equipment) => (
    !normalizedMedicalSearch
    || normalizeSearchText(equipment.equipmentName).includes(normalizedMedicalSearch)
  ));
  const expiredItemsWithStock = [...shipEquipments, ...voyageEquipments]
    .filter(isExpiredWithStock);

  const renderShipEquipmentCard = (eq) => {
    const good   = (eq.quantity || 1) - (eq.brokenCount || 0);
    const broken = eq.brokenCount || 0;
    const total  = eq.quantity || 1;
    const brokenPct = Math.round((broken / total) * 100);
    const allGood   = broken === 0;
    const allBroken = broken === total;
    const expired = isExpiredWithStock(eq);
    const updateDisabled = allBroken || expired || !canUpdateSupplies;

    return (
      <Card
        key={eq.id}
        size="small"
        style={{
          borderLeft: `4px solid ${expired || allBroken ? '#ef4444' : allGood ? '#22c55e' : '#f59e0b'}`,
          marginBottom: 8,
          background: expired ? '#f3f4f6' : undefined,
          opacity: expired ? 0.62 : 1,
        }}
        bodyStyle={{ padding: '10px 14px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Tên + loại */}
          <div style={{ flex: 1 }}>
            <Text strong>{equipmentNameLabel(eq.equipmentName)}</Text>
            <div style={{ marginTop: 2 }}>
              <Tag style={{ fontSize: 11 }}>{equipmentTypeLabel(eq.equipmentType)}</Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>{equipmentLocationLabel(eq.location)}</Text>
              {eq.expiryNote && (
                <Tooltip title={`Hạn sử dụng: ${formatEquipmentExpiryDate(eq.expiryNote)}`}>
                  <Tag color={expired ? 'red' : 'orange'} style={{ fontSize: 10, marginLeft: 4 }}>
                    HSD: {formatEquipmentExpiryDate(eq.expiryNote)}
                  </Tag>
                </Tooltip>
              )}
              {expired && (
                <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                  {equipmentNameLabel(eq.equipmentName)} đã hết hạn sử dụng
                </div>
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
          <Tooltip title={!canUpdateSupplies
            ? 'Chỉ được cập nhật khi hải trình đang di chuyển'
            : (expired ? 'Thiết bị đã hết hạn sử dụng' : '')}>
            <Button
              size="small"
              icon={<ExclamationCircleOutlined />}
              disabled={updateDisabled}
              onClick={() => !updateDisabled && setBrokenModal({ open: true, equip: eq, newBroken: 1 })}
            >
              {allBroken ? 'Đã hỏng toàn bộ' : expired ? 'Đã hết hạn' : 'Ghi nhận hỏng'}
            </Button>
          </Tooltip>
        </div>
      </Card>
    );
  };

  // ===== RENDER vật tư y tế hải trình =====
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
        <div style={{ padding: 'clamp(12px, 4vw, 32px)' }}>
          <PageHeader icon={<ToolOutlined />}
            breadcrumb={pageTitle} title={pageTitle} />
          <Card>
            <Empty description={voyageContextError || 'Vui lòng chọn một hải trình trước khi truy cập trang này.'} />
          </Card>
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      <PageContainer>
        <PageHeader
          icon={<ToolOutlined />}
          breadcrumb={pageTitle}
          title={pageTitle}
        />

        {/* Thông tin hải trình hiện tại */}
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message={
            <span>
              Hải trình đã chọn:{' '}
              <strong>{selectedVoyage.voyageCode || `Hải trình số ${selectedVoyage.id}`}</strong>
              {' — '}
              {selectedVoyage.departurePort} → {selectedVoyage.destinationPort}
            </span>
          }
        />

        {canManageSupplies && !canUpdateSupplies && (
          <Alert
            style={{ marginBottom: 16 }}
            type="warning"
            showIcon
            message="Hải trình chưa ở trạng thái Đang hành trình"
            description="Thiết bị và vật tư y tế chỉ được cập nhật khi tàu đang di chuyển."
          />
        )}

        {canManageSupplies && expiredItemsWithStock.length > 0 && (
          <Alert
            style={{ marginBottom: 16 }}
            type="error"
            showIcon
            message="Có thiết bị hoặc vật tư đã hết hạn sử dụng"
            description={expiredItemsWithStock.map((equipment) => (
              <div key={`${equipment.voyageId || 'ship'}-${equipment.id}`}>
                {equipmentNameLabel(equipment.equipmentName)} đã hết hạn sử dụng
              </div>
            ))}
          />
        )}

        <Tabs
          defaultActiveKey={isEngineOfficer ? 'engines' : 'ship-equipments'}
          items={[
            isEngineOfficer && {
              key: 'engines',
              label: <span><ToolOutlined /> Máy tàu ({engines.length})</span>,
              children: (
                <Card title="Danh sách máy của tàu">
                  {renderEngines()}
                </Card>
              )
            },
            canManageSupplies && {
              key: 'ship-equipments',
              label: <span><ExclamationCircleOutlined /> Thiết bị tàu ({shipEquipments.length})</span>,
              children: (
                <Card
                  title="Thiết bị của tàu"
                  extra={
                    <Space wrap>
                      <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Tìm tên thiết bị..."
                        value={eqSearch}
                        onChange={(event) => setEqSearch(event.target.value)}
                        style={{ width: 220 }}
                      />
                      <Select style={{ width: 180 }} value={eqTypeFilter} onChange={setEqTypeFilter}
                        options={eqTypes.map(t => ({ value: t, label: t }))} />
                    </Space>
                  }
                >
                  {filteredShipEqs.length === 0 ? (
                    <Empty description="Không tìm thấy thiết bị phù hợp." />
                  ) : (
                    <div>{filteredShipEqs.map(eq => renderShipEquipmentCard(eq))}</div>
                  )}
                </Card>
              )
            },
            canManageSupplies && {
              key: 'medical',
              label: <span><MedicineBoxOutlined /> Vật tư y tế ({voyageEquipments.length})</span>,
              children: (
                <Card
                  title="Vật tư y tế hải trình"
                  extra={(
                    <Input
                      allowClear
                      prefix={<SearchOutlined />}
                      placeholder="Tìm tên vật tư..."
                      value={medicalSearch}
                      onChange={(event) => setMedicalSearch(event.target.value)}
                      style={{ width: 220 }}
                    />
                  )}
                >
                  {filteredVoyageEquipments.length === 0 ? (
                    <Empty description={voyageEquipments.length === 0
                      ? 'Hải trình này chưa có vật tư y tế.'
                      : 'Không tìm thấy vật tư phù hợp.'} />
                  ) : (
                    <div>
                      {filteredVoyageEquipments.map(eq => {
                        const used    = eq.brokenCount || 0;
                        const remain  = (eq.quantity || 0) - used;
                        const total   = eq.quantity || 1;
                        const usedPct = Math.round((used / total) * 100);
                        const isEmpty = remain === 0;
                        const isLow   = remain > 0 && remain < total / 3;
                        const expired = isExpiredWithStock(eq);
                        const updateDisabled = isEmpty || expired || !canUpdateSupplies;
                        const borderColor = expired || isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e';

                        return (
                          <Card
                            key={eq.id}
                            size="small"
                            style={{
                              borderLeft: `4px solid ${borderColor}`,
                              marginBottom: 8,
                              background: expired ? '#f3f4f6' : undefined,
                              opacity: expired ? 0.62 : 1,
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
                                    <Tooltip title={`Hạn sử dụng: ${formatEquipmentExpiryDate(eq.expiryNote)}`}>
                                      <Tag color={expired ? 'red' : 'orange'} style={{ fontSize: 10, marginLeft: 2 }}>
                                        HSD: {formatEquipmentExpiryDate(eq.expiryNote)}
                                      </Tag>
                                    </Tooltip>
                                  ) : (
                                    <Text type="secondary" style={{ fontSize: 11 }}>Không có hạn SD</Text>
                                  )}
                                  {expired && (
                                    <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                                      {eq.equipmentName} đã hết hạn sử dụng
                                    </div>
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
                              <Tooltip title={!canUpdateSupplies
                                ? 'Chỉ được cập nhật khi hải trình đang di chuyển'
                                : (expired ? 'Vật tư đã hết hạn sử dụng' : '')}>
                                <Button
                                  size="small"
                                  icon={<MedicineBoxOutlined />}
                                  disabled={updateDisabled}
                                  onClick={() => !updateDisabled && setMedModal({ open: true, equip: eq, newUsed: 1 })}
                                >
                                  {isEmpty ? 'Đã dùng hết' : expired ? 'Đã hết hạn' : 'Ghi nhận sử dụng'}
                                </Button>
                              </Tooltip>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )
            }
          ].filter(Boolean)}
        />
      </PageContainer>

      {/* Modal đổi trạng thái Máy */}
      <Modal
        title={`Đổi trạng thái: ${engineNameLabel(engineModal.engine?.engineName)}`}
        open={engineModal.open}
        onCancel={() => setEngineModal({ open: false, engine: null, newStatus: null })}
        onOk={confirmEngineStatus}
        okText="Xác nhận" cancelText="Hủy"
      >
        {engineModal.engine && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Trạng thái hiện tại: <Badge
              color={getEngineStatusCfg(engineModal.engine.status).color}
              text={getEngineStatusCfg(engineModal.engine.status).label} /></Text>
            <Text strong>Chọn trạng thái mới:</Text>
            <Select
              style={{ width: '100%' }}
              value={engineModal.newStatus}
              onChange={(val) => setEngineModal(prev => ({ ...prev, newStatus: val }))}
              options={validStatusesForEngine(engineModal.engine).map(s => ({ value: s.value, label: s.label }))}
            />
            {/* Cảnh báo khi máy chính vào bảo dưỡng */}
            {isMainEngine(engineModal.engine) && engineModal.newStatus === ENGINE_STATUS.MAINTENANCE && (
              <Alert
                type="warning"
                showIcon
                message="Máy chính chuyển sang bảo dưỡng"
                description="Tàu sẽ không thể vận hành và hải trình sẽ chuyển sang trạng thái Neo đậu sau khi bạn xác nhận."
              />
            )}
          </Space>
        )}
      </Modal>

      {/* Modal cập nhật số thiết bị hỏng */}
      <Modal
        title={`Ghi nhận thiết bị hỏng: ${brokenModal.equip?.equipmentName}`}
        open={brokenModal.open}
        onCancel={() => setBrokenModal({ open: false, equip: null, newBroken: 1 })}
        onOk={confirmBrokenCount}
        okText="Xác nhận" cancelText="Hủy"
        okButtonProps={{
          disabled: !brokenModal.equip || !isPositiveIntegerWithin(
            brokenModal.newBroken,
            (brokenModal.equip.quantity || 0) - (brokenModal.equip.brokenCount || 0),
          ),
        }}
      >
        {brokenModal.equip && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Tổng số lượng: <strong>{brokenModal.equip.quantity}</strong></Text>
            <Text>Hiện đang hỏng: <strong style={{ color: '#dc2626' }}>{brokenModal.equip.brokenCount || 0}</strong></Text>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Số lượng hỏng mới phát sinh <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>(chỉ nhập số nguyên dương)</span>:
              </Text>
              {/* Cho phép nhập 0 để state đồng bộ; phần xác nhận sẽ chặn giá trị không dương. */}
              <InputNumber
                min={0}
                max={(brokenModal.equip.quantity || 0) - (brokenModal.equip.brokenCount || 0)}
                precision={0}
                step={1}
                value={brokenModal.newBroken}
                onKeyDown={(event) => {
                  if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
                }}
                onChange={val => setBrokenModal(prev => ({ ...prev, newBroken: val }))}
                style={{ width: '100%' }}
                addonAfter={`/ ${(brokenModal.equip.quantity || 0) - (brokenModal.equip.brokenCount || 0)} còn tốt`}
              />
            </div>
            <Alert
              type={brokenModal.newBroken === 0
                || (brokenModal.equip.brokenCount || 0) + (brokenModal.newBroken ?? 0) === brokenModal.equip.quantity
                ? 'error'
                : 'warning'}
              showIcon
              message={brokenModal.newBroken === 0
                ? 'Số lượng hỏng mới phải là số nguyên dương.'
                : `Sau khi ghi nhận: ${brokenModal.equip.quantity - (brokenModal.equip.brokenCount || 0) - (brokenModal.newBroken ?? 0)} cái tốt, ${(brokenModal.equip.brokenCount || 0) + (brokenModal.newBroken ?? 0)} cái hỏng`}
            />
          </Space>
        )}
      </Modal>
      {/* Modal cập nhật số đã dùng (vật tư y tế) */}
      <Modal
        title={`Ghi nhận vật tư đã dùng: ${medModal.equip?.equipmentName}`}
        open={medModal.open}
        onCancel={() => setMedModal({ open: false, equip: null, newUsed: 1 })}
        onOk={confirmMedUsed}
        okText="Xác nhận" cancelText="Hủy"
        okButtonProps={{
          disabled: !medModal.equip || !isPositiveIntegerWithin(
            medModal.newUsed,
            (medModal.equip.quantity || 0) - (medModal.equip.brokenCount || 0),
          ),
        }}
      >
        {medModal.equip && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Số lượng ban đầu: <strong>{medModal.equip.quantity}</strong></Text>
            <Text>Đã dùng trước đó: <strong style={{ color: '#d97706' }}>{medModal.equip.brokenCount || 0}</strong></Text>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Số lượng mới sử dụng thêm:</Text>
              {/* Cho phép nhập 0 để state đồng bộ; phần xác nhận sẽ chặn giá trị không dương. */}
              <InputNumber
                min={0}
                max={(medModal.equip.quantity || 0) - (medModal.equip.brokenCount || 0)}
                precision={0}
                step={1}
                value={medModal.newUsed}
                onKeyDown={(event) => {
                  if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
                }}
                onChange={val => setMedModal(prev => ({ ...prev, newUsed: val }))}
                style={{ width: '100%' }}
                addonAfter={`/ ${(medModal.equip.quantity || 0) - (medModal.equip.brokenCount || 0)} còn lại`}
              />
            </div>
            <Alert
              type={medModal.newUsed === 0
                || (medModal.equip.brokenCount || 0) + (medModal.newUsed ?? 0) >= medModal.equip.quantity
                ? 'error'
                : 'warning'}
              showIcon
              message={medModal.newUsed === 0
                ? 'Số lượng sử dụng thêm phải là số nguyên dương.'
                : `Sau khi ghi nhận còn lại: ${medModal.equip.quantity - (medModal.equip.brokenCount || 0) - (medModal.newUsed ?? 0)} đơn vị`}
            />
          </Space>
        )}
      </Modal>
    </MasterLayout>
  );
}
