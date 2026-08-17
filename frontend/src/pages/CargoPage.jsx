import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Card,
  Space,
  Typography,
  Tooltip,
  Modal,
  Checkbox,
  Popconfirm,
  Tag,
  Row,
  Col,
  Progress,
  Empty,
  Spin,
  message,
  Alert,
} from 'antd';
import {
  AppstoreOutlined,
  PlusOutlined,
  SaveOutlined,
  InboxOutlined,
  CalculatorOutlined,
  ContainerOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import AdminLayout from '../components/AdminLayout';
import { cargoService, voyageService, vesselService, cargoTypeService } from '../services/api';
import api from '../services/api';
import {
  PageHeader,
  PageContainer,
  StatCard,
  RowActions,
  notifySuccess,
  notifyError,
  notifyWarning,
  confirmDelete,
} from '../components/common';

const { Text } = Typography;

const AllocationModal = ({ open, cargo, holds, cargoList, onClose, onSave }) => {
  const sf = Number(cargo?.stowageFactor || 1.0);
  const targetWeight = Number(cargo?.weight || 0);
  const targetVolume = Math.round(targetWeight * sf * 100) / 100;

  const [allocations, setAllocations] = useState(() => {
    if (!cargo || !holds || holds.length === 0) return [];
    return holds.map((h) => {
      const existing = (cargo.allocations || []).find((a) => String(a.holdId) === String(h.id));
      return {
        holdId: h.id,
        holdName: h.holdName,
        maxCapacity: h.maxCapacity || 0,
        currentUsage: h.currentUsage || 0,
        weight: existing ? existing.weight : '',
      };
    });
  });

  const handleChange = (idx, value) => {
    const newAllo = [...allocations];
    newAllo[idx].weight = value;
    setAllocations(newAllo);
  };

  const totalAllocatedWeight = allocations.reduce((sum, a) => sum + Number(a.weight || 0), 0);
  const totalAllocatedVolume = Math.round(totalAllocatedWeight * sf * 100) / 100;
  const isOverWeight = totalAllocatedWeight > targetWeight;

  // Tính thể tích các hầm xem có hầm nào bị tràn thể tích m3 không
  const holdVolumeChecks = allocations.map((allo) => {
    const hold = holds.find((h) => String(h.id) === String(allo.holdId));
    const maxCap = hold?.maxCapacity || 0;
    
    // Tính thể tích hàng khác đang trong hầm (ngoại trừ phân bổ cũ của lô hàng này)
    let otherUsageVolume = 0;
    (cargoList || []).forEach((c) => {
      if (c.itemId !== cargo?.itemId && c.isLoaded && !c.isDischarged) {
        const cSf = Number(c.stowageFactor || 1.0);
        const alloc = (c.allocations || []).find((a) => String(a.holdId) === String(allo.holdId));
        if (alloc) {
          otherUsageVolume += Number(alloc.weight || 0) * cSf;
        }
      }
    });

    const thisAllocVolume = Number(allo.weight || 0) * sf;
    const totalSimulatedHoldVolume = Math.round((otherUsageVolume + thisAllocVolume) * 100) / 100;
    const isHoldOver = maxCap > 0 && totalSimulatedHoldVolume > maxCap;

    return {
      holdId: allo.holdId,
      totalSimulatedHoldVolume,
      maxCap,
      isHoldOver,
      percent: maxCap > 0 ? (totalSimulatedHoldVolume / maxCap) * 100 : 0,
    };
  });

  const hasHoldOverCapacity = holdVolumeChecks.some((c) => c.isHoldOver);

  return (
    <Modal
      open={open}
      title={
        <Space>
          <CalculatorOutlined style={{ color: '#2563eb' }} />
          <span>Phân bổ hầm hàng: {cargo?.itemName || ''}</span>
        </Space>
      }
      onCancel={onClose}
      onOk={() => {
        if (isOverWeight || hasHoldOverCapacity) return;
        const valid = allocations
          .filter((a) => a.holdId && Number(a.weight) > 0)
          .map((a) => ({
            holdId: a.holdId,
            weight: Number(a.weight),
            volume: Math.round(Number(a.weight) * sf * 100) / 100,
          }));
        onSave(cargo.itemId, valid);
      }}
      okButtonProps={{ disabled: isOverWeight || hasHoldOverCapacity }}
      width={720}
      okText="Xác nhận phân bổ"
      cancelText="Hủy"
    >
      <div
        style={{
          marginBottom: 16,
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <div>
              <Text type="secondary">Mặt hàng:</Text>{' '}
              <Text strong>{cargo?.itemName} ({cargo?.cargoType || 'Hàng hóa'})</Text>
            </div>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary">Khối lượng:</Text>{' '}
              <Text strong style={{ color: '#2563eb' }}>{targetWeight.toLocaleString()} MT</Text>
              {cargo?.quantity && cargo?.unit && cargo?.unit !== 'MT' && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  (SL: {cargo.quantity.toLocaleString()} {cargo.unit})
                </Text>
              )}
            </div>
          </Col>
          <Col span={12}>
            <div>
              <Text type="secondary">Hệ số chất xếp (SF):</Text>{' '}
              <Tag color="cyan" style={{ fontWeight: 600 }}>{sf} m³/MT</Tag>
            </div>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary">Thể tích chiếm dụng:</Text>{' '}
              <Text strong style={{ color: '#0284c7' }}>{targetVolume.toLocaleString()} m³</Text>
            </div>
          </Col>
        </Row>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          <Text strong>Trạng thái phân bổ: </Text>
          <Text type={isOverWeight ? 'danger' : totalAllocatedWeight === targetWeight ? 'success' : 'warning'}>
            {totalAllocatedWeight.toLocaleString()} / {targetWeight.toLocaleString()} MT
            {' '}({totalAllocatedVolume.toLocaleString()} / {targetVolume.toLocaleString()} m³)
          </Text>
        </span>
        {totalAllocatedWeight === targetWeight && (
          <Tag color="success">✅ Đã phân bổ 100%</Tag>
        )}
      </div>

      {hasHoldOverCapacity && (
        <Alert
          type="error"
          showIcon
          message="Vượt quá dung tích thể tích hầm tàu!"
          description="Một hoặc nhiều khoang hàng bị vượt quá dung tích tối đa (m³). Vui lòng giảm số lượng hoặc chia sang khoang khác."
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        dataSource={allocations}
        pagination={false}
        rowKey="holdId"
        size="small"
        bordered
        columns={[
          {
            title: 'Khoang hàng',
            dataIndex: 'holdName',
            width: 150,
            render: (text) => <Text strong>{text}</Text>,
          },
          {
            title: 'Dung tích hầm (m³)',
            width: 130,
            render: (_, record) => {
              const check = holdVolumeChecks.find((c) => String(c.holdId) === String(record.holdId));
              return (
                <div>
                  <Text strong>{record.maxCapacity.toLocaleString()} m³</Text>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Sau PB: {check ? check.totalSimulatedHoldVolume.toLocaleString() : 0} m³
                  </div>
                </div>
              );
            },
          },
          {
            title: 'Khối lượng (MT)',
            dataIndex: 'weight',
            width: 130,
            render: (_, record, idx) => {
              const weightVal = Number(record.weight || 0);
              const estimatedQty = cargo?.quantity && targetWeight > 0
                ? Math.round((weightVal / targetWeight) * cargo.quantity)
                : 0;

              return (
                <div>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0 MT"
                    value={record.weight}
                    onChange={(e) => handleChange(idx, e.target.value)}
                  />
                  {cargo?.quantity && cargo?.unit && cargo?.unit !== 'MT' && weightVal > 0 ? (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      ~ {estimatedQty.toLocaleString()} {cargo.unit}
                    </div>
                  ) : null}
                </div>
              );
            },
          },
          {
            title: 'Thể tích chiếm (m³)',
            width: 130,
            render: (_, record) => {
              const vol = Math.round(Number(record.weight || 0) * sf * 100) / 100;
              return <span style={{ color: '#0284c7', fontWeight: 600 }}>{vol.toLocaleString()} m³</span>;
            },
          },
          {
            title: 'Tỷ lệ lấp đầy',
            width: 140,
            render: (_, record) => {
              const check = holdVolumeChecks.find((c) => String(c.holdId) === String(record.holdId));
              const percent = check ? check.percent : 0;
              const isOver = check?.isHoldOver;
              let strokeColor = '#10b981';
              if (percent > 95 || isOver) strokeColor = '#ef4444';
              else if (percent > 75) strokeColor = '#f59e0b';

              return (
                <div>
                  <Progress
                    percent={Math.min(percent, 100)}
                    size="small"
                    strokeColor={strokeColor}
                    format={() => (
                      <span style={{ fontSize: 11, color: strokeColor, fontWeight: 600 }}>
                        {percent.toFixed(1)}%
                      </span>
                    )}
                  />
                  {isOver && <Tag color="error" style={{ fontSize: 10, marginTop: 2 }}>Tràn hầm!</Tag>}
                </div>
              );
            },
          },
        ]}
      />
    </Modal>
  );
};

export default function CargoPage() {
  const navigate = useNavigate();
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Voyage states
  const [activeVoyage, setActiveVoyage] = useState(null);
  const [cargoList, setCargoList] = useState([]);
  const [holds, setHolds] = useState([]);
  const [fetchingCargo, setFetchingCargo] = useState(false);
  const [fetchingHolds, setFetchingHolds] = useState(false);
  const [allocatingCargoItem, setAllocatingCargoItem] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [dischargingCargo, setDischargingCargo] = useState(null);
  const [dischargeValues, setDischargeValues] = useState({ actualQuantity: '', actualWeight: '' });

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = user.role === 'Admin' ? AdminLayout : MasterLayout;
  const canEdit = user.role === 'Admin';

  const activeVoyageId = localStorage.getItem('activeVoyageId');
  const activeVoyageRole = localStorage.getItem('activeVoyageRole');
  const userRole = (activeVoyageRole || user.role || '').replace(/\s+/g, '').toLowerCase();

  const isChiefOfficer = userRole === 'chiefofficer';

  const fetchHolds = useCallback(async (shipId) => {
    if (!shipId) return;
    try {
      setFetchingHolds(true);
      const ship = await vesselService.getById(shipId);
      setHolds(ship.CargoHolds || []);
    } catch (err) {
      console.error('Failed to fetch holds:', err);
    } finally {
      setFetchingHolds(false);
    }
  }, []);

  const fetchActiveVoyage = useCallback(async () => {
    if (!activeVoyageId) return;
    try {
      setFetchingCargo(true);
      const res = await api.get('/voyages');
      const voyages = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const voyageData = voyages.find((v) => String(v.id) === String(activeVoyageId));

      if (!voyageData) {
        throw new Error('Voyage not found');
      }

      setActiveVoyage(voyageData);

      const typesRes = await cargoTypeService.getAll().catch(() => []);
      const typeList = Array.isArray(typesRes) ? typesRes : (typesRes?.data || []);
      const sfMap = {};
      typeList.forEach((ct) => {
        sfMap[ct.name] = ct.stowageFactor || 1.0;
      });

      const rawCargoData = await voyageService.getVoyageCargo(activeVoyageId).catch(() => []);
      const cargoData = Array.isArray(rawCargoData) ? rawCargoData : (rawCargoData?.data || []);
      const formattedData = cargoData.map((c) => {
        const sf = Number(c.stowageFactor || sfMap[c.cargoType] || 1.0);
        const weight = Number(c.weight || 0);
        const volume = Number(c.volume || Math.round(weight * sf * 100) / 100);
        return {
          ...c,
          stowageFactor: sf,
          weight,
          volume,
          allocations: (c.allocations || (c.holdId ? [{ holdId: c.holdId, weight }] : [])).map((a) => ({
            ...a,
            weight: Number(a.weight || 0),
            volume: Number(a.volume || Math.round(Number(a.weight || 0) * sf * 100) / 100),
          })),
        };
      });
      setCargoList(formattedData);

      if (voyageData && voyageData.shipId) {
        fetchHolds(voyageData.shipId);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin hàng hải trình:', err);
    } finally {
      setFetchingCargo(false);
    }
  }, [activeVoyageId, fetchHolds]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeVoyageId) {
        await fetchActiveVoyage();
      } else {
        const cargoRes = await cargoService.getAllCargos();
        if (cargoRes?.success) {
          setCargos(cargoRes.data || []);
        } else if (Array.isArray(cargoRes)) {
          setCargos(cargoRes);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeVoyageId, fetchActiveVoyage]);

  useEffect(() => {
    let isMounted = true;
    if (activeVoyageId) {
      Promise.all([
        api.get('/voyages'),
        cargoTypeService.getAll().catch(() => []),
        voyageService.getVoyageCargo(activeVoyageId).catch(() => []),
      ])
        .then(async ([voyagesRes, typesRes, rawCargoData]) => {
          if (!isMounted) return;
          const voyages = Array.isArray(voyagesRes.data) ? voyagesRes.data : (voyagesRes.data?.data || []);
          const voyageData = voyages.find((v) => String(v.id) === String(activeVoyageId));
          setActiveVoyage(voyageData || null);

          const typeList = Array.isArray(typesRes) ? typesRes : (typesRes?.data || []);
          const sfMap = {};
          typeList.forEach((ct) => {
            sfMap[ct.name] = ct.stowageFactor || 1.0;
          });

          const cargoData = Array.isArray(rawCargoData) ? rawCargoData : (rawCargoData?.data || []);
          const formattedData = cargoData.map((c) => {
            const sf = Number(c.stowageFactor || sfMap[c.cargoType] || 1.0);
            const weight = Number(c.weight || 0);
            const volume = Number(c.volume || Math.round(weight * sf * 100) / 100);
            return {
              ...c,
              stowageFactor: sf,
              weight,
              volume,
              allocations: (c.allocations || (c.holdId ? [{ holdId: c.holdId, weight }] : [])).map((a) => ({
                ...a,
                weight: Number(a.weight || 0),
                volume: Number(a.volume || Math.round(Number(a.weight || 0) * sf * 100) / 100),
              })),
            };
          });
          setCargoList(formattedData);

          if (voyageData?.shipId) {
            const ship = await vesselService.getById(voyageData.shipId);
            if (isMounted) setHolds(ship?.CargoHolds || ship?.cargoHolds || []);
          }
        })
        .catch((err) => console.error('Lỗi Promise.all CargoPage:', err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      cargoService.getAllCargos()
        .then((cargoRes) => {
          if (!isMounted) return;
          if (cargoRes?.success) {
            setCargos(cargoRes.data || []);
          } else if (Array.isArray(cargoRes)) {
            setCargos(cargoRes);
          }
        })
        .catch((error) => console.error('Failed to fetch data:', error))
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeVoyageId]);

  const handleDelete = async (cargo) => {
    const confirmed = await confirmDelete({
      title: 'Xoá lô hàng?',
      content: `Bạn có chắc chắn muốn xoá lô hàng ${cargo.cargoName || `C60-${cargo.id}`}? Dữ liệu liên quan cũng sẽ bị xoá.`,
    });
    if (!confirmed) return;
    try {
      await cargoService.delete(cargo.id);
      await fetchData();
      notifySuccess('Lô hàng đã được xoá thành công.');
    } catch {
      notifyError('Không thể xoá lô hàng.');
    }
  };

  const handleCargoLoadChange = (itemId, isLoaded) => {
    setCargoList((prevList) =>
      prevList.map((cargo) => (cargo.itemId === itemId ? { ...cargo, isLoaded } : cargo))
    );
  };

  const handleCargoDischargeClick = (cargo) => {
    setDischargingCargo(cargo);
    setDischargeValues({
      actualQuantity: cargo.quantity || '',
      actualWeight: cargo.weight || ''
    });
    setDischargeModalOpen(true);
  };

  const submitDischarge = async () => {
    try {
      setLoading(true);
      await voyageService.dischargeCargoItem(activeVoyageId, dischargingCargo.itemId, {
        isDischarged: true,
        actualQuantity: Number(dischargeValues.actualQuantity) || undefined,
        actualWeight: Number(dischargeValues.actualWeight) || undefined
      });
      message.success('Đã dỡ hàng thành công!');
      setDischargeModalOpen(false);
      await fetchActiveVoyage();
    } catch {
      message.error('Lỗi khi dỡ hàng!');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllocations = (itemId, allocations) => {
    setCargoList((prevList) =>
      prevList.map((cargo) => (cargo.itemId === itemId ? { ...cargo, allocations } : cargo))
    );
    setAllocatingCargoItem(null);
  };

  const handleSaveVoyageCargoConfig = async () => {
    // Validate hold capacities in volume (m³)
    let hasOverload = false;
    for (const hold of holds) {
      const maxCap = hold.maxCapacity || 0;
      let simulatedUsageVolume = 0;

      cargoList.forEach((c) => {
        const sf = Number(c.stowageFactor || 1.0);
        if (c.isLoaded && !c.isDischarged) {
          const alloc = (c.allocations || []).find((a) => String(a.holdId) === String(hold.id));
          if (alloc) {
            simulatedUsageVolume += Number(alloc.weight || 0) * sf;
          }
        }
      });

      if (maxCap > 0 && simulatedUsageVolume > maxCap) {
        hasOverload = true;
        notifyWarning(
          `Khoang "${hold.holdName}" vượt quá dung tích thể tích (${simulatedUsageVolume.toFixed(1)} / ${maxCap} m³). Vui lòng điều chỉnh phân bổ.`
        );
        break;
      }
    }
    if (hasOverload) return;

    try {
      setSavingConfig(true);
      const payload = {
        cargoList: cargoList.map((c) => ({
          itemId: c.itemId,
          isLoaded: c.isLoaded,
          allocations: c.allocations,
          weight: c.weight,
        })),
      };
      await voyageService.updateVoyage(activeVoyageId, payload);
      notifySuccess('Lưu cấu hình hàng hóa thành công!');
      fetchActiveVoyage();
    } catch {
      notifyError('Có lỗi xảy ra khi lưu cấu hình hàng hóa.');
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredCargos = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return cargos;
    return cargos.filter((cargo) =>
      [`C60-${cargo.id}`, cargo.cargoName, cargo.cargoType, cargo.status]
        .some((value) => String(value || '').toLowerCase().includes(keyword))
    );
  }, [searchTerm, cargos]);

  const cargoStats = useMemo(() => {
    const total = cargos.length;
    const scheduled = cargos.filter((c) => c.Voyage).length;
    const pending = total - scheduled;
    return { total, scheduled, pending };
  }, [cargos]);

  const columns = [
    {
      title: 'ID Lô hàng',
      dataIndex: 'id',
      render: (id) => <strong>C60-{id}</strong>,
    },
    {
      title: 'Tên & Loại',
      key: 'name',
      render: (_, cargo) => (
        <Space>
          <AppstoreOutlined style={{ color: '#6366f1' }} />
          <div>
            <strong>{cargo.cargoName}</strong>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              {cargo.cargoType || 'Chưa phân loại'}
              {cargo.quantity && cargo.unit && cargo.unit !== 'MT' ? ` • ${cargo.quantity.toLocaleString()} ${cargo.unit}` : ''}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Khối lượng (MT)',
      dataIndex: 'totalWeight',
      render: (w) => `${w?.toLocaleString() || 0} MT`,
    },
    {
      title: 'Thể tích (m³)',
      dataIndex: 'totalVolume',
      render: (v) => `${v?.toLocaleString() || 0} m³`,
    },
    {
      title: 'Chuyến đi',
      dataIndex: 'Voyage',
      render: (v) =>
        v ? (
          <div key={v.id}>
            {v.voyageCode || `VY-${String(v.id).padStart(4, '0')}`} ({v.departurePort} ➔ {v.destinationPort})
          </div>
        ) : (
          <Tag color="default">Chưa gán</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      render: (_, cargo) => (
        <RowActions
          stopPropagation
          onView={() => navigate(`/cargos/view/${cargo.id}`)}
          onEdit={canEdit && !cargo.Voyage ? () => navigate(`/cargos/edit/${cargo.id}`) : undefined}
          onDelete={canEdit && !cargo.Voyage ? () => handleDelete(cargo) : undefined}
          deleteTitle="Xóa lô hàng"
        >
          {canEdit && cargo.Voyage && (
            <Tooltip title="Lô hàng đã thuộc hải trình nên không thể sửa/xoá">
              <Text type="secondary" italic style={{ fontSize: '0.75rem' }}>Đã khoá</Text>
            </Tooltip>
          )}
        </RowActions>
      ),
    },
  ];

  const voyageCargoColumns = [
    { title: 'STT', key: 'stt', width: 50, render: (_, __, idx) => idx + 1 },
    { title: 'Lô hàng', dataIndex: 'cargoName', key: 'cargoName', width: 140 },
    {
      title: 'Chi tiết / Quy cách',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 160,
      render: (text, cargo) => (
        <Space direction="vertical" size={2}>
          <Text>{text}</Text>
          {cargo.quantity && cargo.unit && cargo.unit !== 'MT' ? (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              SL: {cargo.quantity.toLocaleString()} {cargo.unit}
            </div>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Loại hàng & SF',
      key: 'cargoType',
      width: 160,
      render: (_, cargo) => (
        <Space direction="vertical" size={2}>
          <Text strong>{cargo.cargoType || 'Hàng rời'}</Text>
          <Tag color="cyan" style={{ fontSize: 11 }}>
            SF: {cargo.stowageFactor || 1.0} m³/MT
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Khối lượng & Thể tích',
      key: 'weightVolume',
      width: 170,
      render: (_, cargo) => {
        const sf = Number(cargo.stowageFactor || 1.0);
        const weight = Number(cargo.weight || 0);
        const vol = Math.round(weight * sf * 100) / 100;
        return (
          <div>
            <div><Text strong>{weight.toLocaleString()} MT</Text></div>
            <div style={{ fontSize: 12, color: '#0284c7' }}>~ {vol.toLocaleString()} m³</div>
          </div>
        );
      },
    },
  ];

  const isCargoLoadAllowed = isChiefOfficer && (
    activeVoyage?.status === 'Loading' ||
    (activeVoyage?.status === 'Loaded' && !activeVoyage?.isCargoLoaded)
  );

  if (activeVoyage && userRole !== 'admin') {
    if (activeVoyage.status === 'Discharge' || activeVoyage.status === 'Arrived' || activeVoyage.status === 'Completed') {
      voyageCargoColumns.push({
        title: 'Trạng thái dỡ',
        key: 'dischargeStatus',
        align: 'center',
        width: 150,
        render: (_, cargo) => {
          if (cargo.isDischarged) {
            const isDiff = cargo.dischargedQuantity !== cargo.quantity || cargo.dischargedWeight !== cargo.weight;
            return (
              <div style={{ textAlign: 'center' }}>
                <Tag color={isDiff ? 'warning' : 'success'} style={{ marginBottom: 4 }}>Đã dỡ xong</Tag>
                <div style={{ fontSize: 11, color: isDiff ? '#d97706' : '#64748b' }}>
                  SL: {cargo.dischargedQuantity?.toLocaleString()} / {cargo.quantity?.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: isDiff ? '#d97706' : '#64748b' }}>
                  KL: {cargo.dischargedWeight?.toLocaleString()} / {cargo.weight?.toLocaleString()} MT
                </div>
              </div>
            );
          }
          if (userRole !== 'chiefofficer') return <Tag color="default">Chưa dỡ</Tag>;
          return (
            <Button 
              type="primary" 
              size="small" 
              style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
              disabled={activeVoyage.status === 'Completed'}
              onClick={() => handleCargoDischargeClick(cargo)}
            >
              Tiến hành dỡ
            </Button>
          );
        },
      });
    } else {
      voyageCargoColumns.push(
        {
          title: 'Phân bổ khoang',
          key: 'allocations',
          width: 200,
          render: (_, cargo) => {
            const sf = Number(cargo.stowageFactor || 1.0);
            const totalAllocated = (cargo.allocations || []).reduce((sum, a) => sum + Number(a.weight || 0), 0);
            const totalVol = Math.round(totalAllocated * sf * 100) / 100;
            return (
              <Space direction="vertical" size={2}>
                <Button
                  size="small"
                  type="primary"
                  disabled={!cargo.itemId || !isCargoLoadAllowed}
                  onClick={() => setAllocatingCargoItem(cargo)}
                  style={{ background: '#2563eb', borderColor: '#2563eb' }}
                >
                  Phân bổ ({(cargo.allocations || []).length} khoang)
                </Button>
                {totalAllocated > 0 && (
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Đã PB: <strong>{totalAllocated} MT</strong> ({totalVol} m³)
                  </div>
                )}
              </Space>
            );
          },
        },
        {
          title: 'Đã lên tàu',
          key: 'isLoaded',
          align: 'center',
          width: 100,
          render: (_, cargo) => {
            const totalAllocated = (cargo.allocations || []).reduce((sum, a) => sum + Number(a.weight || 0), 0);
            const isFullyAllocated = totalAllocated === Number(cargo.weight);

            if (!isChiefOfficer) {
              return cargo.isLoaded ? (
                <Tag color="success">Đã lên tàu</Tag>
              ) : (
                <Tag color="default">Chưa</Tag>
              );
            }

            return (
              <Tooltip title={!isFullyAllocated && !cargo.isLoaded ? "Vui lòng phân bổ đủ khối lượng vào khoang trước khi đánh dấu" : ""}>
                <Checkbox
                  checked={cargo.isLoaded}
                  onChange={(e) => handleCargoLoadChange(cargo.itemId, e.target.checked)}
                  disabled={!cargo.itemId || !isCargoLoadAllowed || (!isFullyAllocated && !cargo.isLoaded)}
                />
              </Tooltip>
            );
          },
        }
      );
    }
  }

  return (
    <Layout>
      <PageContainer>
        <PageHeader
          icon={<InboxOutlined />}
          breadcrumb="Tổng quan lô hàng và phân bổ hầm tàu"
          title={activeVoyageId ? `Quản lý Hàng hóa - Chuyến ${activeVoyage?.voyageCode || `VY-${String(activeVoyageId).padStart(4, '0')}`}` : "Quản lý Hàng hóa"}
          extra={
            activeVoyageId ? (
              isChiefOfficer && isCargoLoadAllowed ? (
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveVoyageCargoConfig} loading={savingConfig}>
                  Lưu cấu hình hàng hóa
                </Button>
              ) : null
            ) : (
              canEdit && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/cargos/new')}>
                  Thêm Lô hàng Mới
                </Button>
              )
            )
          }
        />

        {activeVoyageId ? (
          <>
            <Card title="Danh sách hàng hóa" style={{ marginBottom: 20 }}>
              {fetchingCargo ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" /></div>
              ) : cargoList.length === 0 ? (
                <Empty description="Chưa có hàng hóa nào được đăng ký." />
              ) : (
                <Table
                  rowKey={(record) => record.itemId || record.cargoName}
                  size="small"
                  columns={voyageCargoColumns}
                  dataSource={cargoList}
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  bordered
                />
              )}
            </Card>

            {userRole !== 'admin' && (
              <Card title="Bản đồ Hầm hàng (Stowage Plan) - Sức chứa tính theo Thể tích (m³)">
                {fetchingHolds ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" /></div>
                ) : holds.length === 0 ? (
                  <Empty description="Tàu chưa được cấu hình hầm hàng." />
                ) : (
                  <Row gutter={[20, 20]}>
                    {holds.map((hold) => {
                      const maxCapVolume = hold.maxCapacity || 0;
                      let simulatedUsageVolume = 0;
                      let simulatedUsageWeight = 0;

                      cargoList.forEach((c) => {
                        const sf = Number(c.stowageFactor || 1.0);
                        if (c.isLoaded && !c.isDischarged) {
                          const alloc = (c.allocations || []).find((a) => String(a.holdId) === String(hold.id));
                          if (alloc) {
                            const allocWeight = Number(alloc.weight || 0);
                            simulatedUsageWeight += allocWeight;
                            simulatedUsageVolume += allocWeight * sf;
                          }
                        }
                      });

                      simulatedUsageVolume = Math.round(simulatedUsageVolume * 100) / 100;
                      const percentage = maxCapVolume > 0 ? (simulatedUsageVolume / maxCapVolume) * 100 : 0;
                      let strokeColor = '#10b981';
                      if (percentage > 95) strokeColor = '#ef4444';
                      else if (percentage > 75) strokeColor = '#f59e0b';

                      return (
                        <Col xs={24} sm={12} md={8} key={hold.id}>
                          <Card 
                            size="small" 
                            bordered={false}
                            style={{ 
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                              borderRadius: 16,
                              border: percentage > 100 ? '1px solid #ef4444' : '1px solid #e2e8f0'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <Text strong style={{ fontSize: 16, color: '#1e293b' }}>🚢 {hold.holdName}</Text>
                              <Tag color={percentage > 100 ? 'error' : 'blue'} style={{ fontWeight: 600 }}>
                                {simulatedUsageVolume.toLocaleString()} / {maxCapVolume.toLocaleString()} m³
                              </Tag>
                            </div>
                            
                            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                              <div>⚖️ Khối lượng hàng trong hầm: <strong>{simulatedUsageWeight.toLocaleString()} MT</strong></div>
                              <div>📦 Thể tích còn trống: <strong>{Math.max(0, maxCapVolume - simulatedUsageVolume).toLocaleString()} m³</strong></div>
                            </div>

                            <Progress
                              percent={Math.min(percentage, 100)}
                              strokeColor={strokeColor}
                              trailColor="#f1f5f9"
                              strokeWidth={10}
                              format={() => <Text strong style={{ color: strokeColor }}>{percentage.toFixed(1)}%</Text>}
                            />
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </Card>
            )}
          </>
        ) : (
          <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <StatCard title="Tổng lô hàng" value={cargoStats.total} icon={<ContainerOutlined />} tone="blue" />
            </Col>
            <Col xs={24} sm={8}>
              <StatCard title="Đã xếp lịch" value={cargoStats.scheduled} icon={<CheckCircleOutlined />} tone="green" />
            </Col>
            <Col xs={24} sm={8}>
              <StatCard title="Chưa xếp lịch" value={cargoStats.pending} icon={<InboxOutlined />} tone="gold" />
            </Col>
          </Row>
          <Card
            title="Danh sách lô hàng"
            extra={
              <Input.Search
                placeholder="Tìm ID hoặc tên lô hàng..."
                allowClear
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 280 }}
              />
            }
          >
            <Table
              rowKey="id"
              columns={columns}
              dataSource={filteredCargos}
              loading={loading}
              onRow={(cargo) => ({
                onClick: () => navigate(`/cargos/view/${cargo.id}`),
                style: { cursor: 'pointer' },
              })}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} lô hàng`,
              }}
              locale={{ emptyText: searchTerm ? 'Không tìm thấy lô hàng phù hợp' : 'Chưa có lô hàng nào' }}
            />
          </Card>
          </>
        )}
      </PageContainer>
      {allocatingCargoItem && (
        <AllocationModal
          key={allocatingCargoItem.itemId}
          open={!!allocatingCargoItem}
          cargo={allocatingCargoItem}
          holds={holds}
          cargoList={cargoList}
          onClose={() => setAllocatingCargoItem(null)}
          onSave={handleSaveAllocations}
        />
      )}
      <Modal
        title="Tiến hành dỡ hàng"
        open={dischargeModalOpen}
        onOk={submitDischarge}
        onCancel={() => setDischargeModalOpen(false)}
        okText="Xác nhận dỡ"
        cancelText="Hủy"
        confirmLoading={loading}
      >
        <Alert
          message="Vui lòng nhập số lượng và khối lượng hàng hóa thực tế đã dỡ xuống để đối chiếu."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 16 }}>
          <Text strong>Lô hàng:</Text> {dischargingCargo?.itemName}
        </div>
        <Row gutter={16}>
          {!(dischargingCargo?.unit === 'MT' && Number(dischargingCargo?.quantity) === Number(dischargingCargo?.weight)) && (
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">SL bốc lên:</Text>{' '}
                <Text strong>
                  {dischargingCargo?.quantity?.toLocaleString()} {dischargingCargo?.unit === 'MT' ? '' : dischargingCargo?.unit}
                </Text>
              </div>
              <div style={{ marginBottom: 4 }}>Số lượng dỡ thực tế:</div>
              <Input
                type="number"
                value={dischargeValues.actualQuantity}
                onChange={(e) => setDischargeValues({ ...dischargeValues, actualQuantity: e.target.value })}
                suffix={dischargingCargo?.unit === 'MT' ? undefined : dischargingCargo?.unit}
              />
            </Col>
          )}
          <Col span={dischargingCargo?.unit === 'MT' && Number(dischargingCargo?.quantity) === Number(dischargingCargo?.weight) ? 24 : 12}>
            <div style={{ marginBottom: 8 }}><Text type="secondary">KL bốc lên:</Text> <Text strong>{dischargingCargo?.weight?.toLocaleString()} MT</Text></div>
            <div style={{ marginBottom: 4 }}>Khối lượng dỡ thực tế:</div>
            <Input
              type="number"
              value={dischargeValues.actualWeight}
              onChange={(e) => {
                const w = e.target.value;
                const isBulk = dischargingCargo?.unit === 'MT' && Number(dischargingCargo?.quantity) === Number(dischargingCargo?.weight);
                setDischargeValues(prev => ({
                  ...prev,
                  actualWeight: w,
                  ...(isBulk ? { actualQuantity: w } : {})
                }));
              }}
              suffix="MT"
            />
          </Col>
        </Row>
      </Modal>
    </Layout>
  );
}
