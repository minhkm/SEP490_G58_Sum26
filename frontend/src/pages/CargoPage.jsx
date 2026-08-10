import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Card, Space, Typography, Tooltip, Modal, Select, Checkbox, Popconfirm, Tag, Row, Col, Progress, Empty, Spin, message } from 'antd';
import { AppstoreOutlined, PlusOutlined, SaveOutlined, InboxOutlined, ContainerOutlined, CheckCircleOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import AdminLayout from '../components/AdminLayout';
import { cargoService, voyageService, vesselService } from '../services/api';
import api from '../services/api';
import { PageHeader, PageContainer, StatCard, StatusTag, RowActions, notifySuccess, notifyError, confirmDelete } from '../components/common';

const { Text } = Typography;

const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '—';
  return new Intl.NumberFormat('en-US').format(num);
};

const AllocationModal = ({ open, cargo, holds, onClose, onSave }) => {
  const [allocations, setAllocations] = useState([]);

  useEffect(() => {
    if (open && cargo && holds.length > 0) {
      const initialAllo = holds.map(h => {
        const existing = (cargo.allocations || []).find(a => String(a.holdId) === String(h.id));
        return {
          holdId: h.id,
          holdName: h.holdName,
          weight: existing ? existing.weight : ''
        };
      });
      setAllocations(initialAllo);
    }
  }, [open, cargo, holds]);

  const handleChange = (idx, value) => {
    const newAllo = [...allocations];
    newAllo[idx].weight = value;
    setAllocations(newAllo);
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.weight || 0), 0);
  const isOver = totalAllocated > (cargo?.weight || 0);

  return (
    <Modal
      open={open}
      title={`Phân bổ: ${cargo?.itemName || ''} (${cargo?.weight} MT)`}
      onCancel={onClose}
      onOk={() => {
        if (isOver) return;
        const valid = allocations.filter((a) => a.holdId && Number(a.weight) > 0);
        onSave(cargo.itemId, valid);
      }}
      okButtonProps={{ disabled: isOver }}
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <Text strong>Tổng khối lượng: {cargo?.weight} MT</Text>
        <br />
        <Text type={isOver ? 'danger' : 'success'}>
          Đã phân bổ: {totalAllocated} MT
        </Text>
      </div>

      <Table
        dataSource={allocations}
        pagination={false}
        rowKey="holdId"
        size="small"
        columns={[
          {
            title: 'Khoang',
            dataIndex: 'holdName',
            render: (text) => <Text strong>{text}</Text>
          },
          {
            title: 'Khối lượng (MT)',
            dataIndex: 'weight',
            width: 150,
            render: (_, record, idx) => (
              <Input
                type="number"
                min={0}
                placeholder="MT"
                value={record.weight}
                onChange={(e) => handleChange(idx, e.target.value)}
              />
            ),
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
  const [originalCargoList, setOriginalCargoList] = useState([]);
  const [holds, setHolds] = useState([]);
  const [fetchingCargo, setFetchingCargo] = useState(false);
  const [fetchingHolds, setFetchingHolds] = useState(false);
  const [allocatingCargoItem, setAllocatingCargoItem] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = user.role === 'Admin' ? AdminLayout : MasterLayout;
  const canEdit = user.role === 'Admin';

  const activeVoyageId = localStorage.getItem('activeVoyageId');
  const activeVoyageRole = localStorage.getItem('activeVoyageRole');
  const userRole = (activeVoyageRole || user.role || '').replace(/\s+/g, '').toLowerCase();

  const isShipStaff = userRole === 'chiefofficer' || userRole === 'master';
  const isChiefOfficer = userRole === 'chiefofficer';

  const fetchActiveVoyage = async () => {
    if (!activeVoyageId) return;
    try {
      setFetchingCargo(true);
      // Fallback workaround: backend on production might not have GET /:id yet
      const res = await api.get('/voyages');
      const voyageData = (res.data || []).find(v => String(v.id) === String(activeVoyageId));
      
      if (!voyageData) {
        throw new Error('Voyage not found');
      }
      
      setActiveVoyage(voyageData);

      const data = await voyageService.getVoyageCargo(activeVoyageId);
      const formattedData = (data || []).map((c) => ({
        ...c,
        allocations: c.allocations || (c.holdId ? [{ holdId: c.holdId, weight: c.weight }] : []),
      }));
      setCargoList(formattedData);
      setOriginalCargoList(JSON.parse(JSON.stringify(formattedData)));
      
      if (voyageData && voyageData.shipId) {
        fetchHolds(voyageData.shipId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingCargo(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeVoyageId) {
        await fetchActiveVoyage();
      } else {
        const cargoRes = await cargoService.getAllCargos(activeVoyageId);
        if (cargoRes.success) {
          setCargos(cargoRes.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolds = async (shipId) => {
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
  };

  useEffect(() => {
    fetchData();
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

  const handleCargoDischarge = async (itemId) => {
    try {
      setLoading(true);
      await voyageService.dischargeCargoItem(activeVoyageId, itemId, true);
      message.success('Đã dỡ hàng thành công!');
      await fetchActiveVoyage();
    } catch (err) {
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
    // Validate hold capacities
    let hasOverload = false;
    for (const hold of holds) {
      const maxCap = hold.maxCapacity || 0;
      let simulatedUsage = hold.currentUsage || 0;
      
      cargoList.forEach((c) => {
        const orig = originalCargoList.find((o) => o.itemId === c.itemId);
        const origWeight = orig?.isLoaded && !orig?.isDischarged
          ? (orig.allocations || []).filter((a) => String(a.holdId) === String(hold.id)).reduce((s, a) => s + Number(a.weight), 0)
          : 0;
        const newWeight = c.isLoaded && !c.isDischarged
          ? (c.allocations || []).filter((a) => String(a.holdId) === String(hold.id)).reduce((s, a) => s + Number(a.weight), 0)
          : 0;
        simulatedUsage += (newWeight - origWeight);
      });
      
      if (simulatedUsage > maxCap) {
        hasOverload = true;
        notifyWarning(`Khoang "${hold.holdName}" vượt quá sức chứa (${simulatedUsage}/${maxCap} tấn). Vui lòng điều chỉnh phân bổ.`);
        break;
      }
    }
    if (hasOverload) return;

    try {
      setSavingConfig(true);
      // Constructing minimal payload to not override other voyage data
      // Although updateVoyage typically takes the whole voyage payload, 
      // let's construct it exactly as it used to be: combining activeVoyage and cargoList
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
    } catch (error) {
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
            <div style={{ fontWeight: 600 }}>{cargo.cargoName || 'Chưa cập nhật'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{cargo.cargoType || 'N/A'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Khối lượng',
      dataIndex: 'totalWeight',
      render: (w) => `${formatNumber(w)} T`,
    },
    {
      title: 'Thể tích',
      dataIndex: 'totalVolume',
      render: (v) => `${formatNumber(v)} m³`,
    },
    {
      title: 'Hành trình',
      key: 'route',
      render: (_, cargo) =>
        cargo.Voyage ? (
          <Space size={6}>
            <span>{cargo.Voyage.departurePort || '?'}</span>
            <span style={{ color: '#94a3b8' }}>→</span>
            <span>{cargo.Voyage.destinationPort || '?'}</span>
          </Space>
        ) : (
          <Text type="secondary">Chưa xếp lịch</Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <StatusTag status={status} text={status || 'Chờ xử lý'} />,
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
    { title: 'STT', key: 'stt', width: 60, render: (_, __, idx) => idx + 1 },
    { title: 'Lô hàng', dataIndex: 'cargoName', key: 'cargoName' },
    { title: 'Chi tiết / Quy cách', dataIndex: 'itemName', key: 'itemName' },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
    {
      title: 'Khối lượng',
      key: 'weight',
      render: (_, cargo) => `${cargo.weight} MT`,
    },
  ];

  // Trạng thái Loaded nhưng cờ hàng chưa hoàn tất chỉ có thể xuất hiện từ dữ liệu
  // cũ. Cho phép Đại phó hoàn thiện dữ liệu đó để hải trình không bị mắc kẹt.
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
          if (cargo.isDischarged) return <Tag color="success">Đã dỡ xong</Tag>;
          if (userRole !== 'chiefofficer') return <Tag color="default">Chưa dỡ</Tag>;
          return (
            <Popconfirm
              title="Xác nhận dỡ hàng?"
              description={`Bạn có chắc chắn đã dỡ toàn bộ lô ${cargo.itemName} khỏi hầm?`}
              onConfirm={() => handleCargoDischarge(cargo.itemId)}
              okText="Xác nhận"
              cancelText="Hủy"
              disabled={activeVoyage.status === 'Completed'}
            >
              <Button type="primary" size="small" style={{ background: '#fa8c16', borderColor: '#fa8c16' }}>Tiến hành dỡ</Button>
            </Popconfirm>
          );
        },
      });
    } else {
      voyageCargoColumns.push(
        {
          title: 'Phân bổ khoang',
          key: 'allocations',
          width: 180,
          render: (_, cargo) => {
            const totalAllocated = (cargo.allocations || []).reduce((sum, a) => sum + Number(a.weight), 0);
            return (
              <Space direction="vertical" size="small">
                <Button
                  size="small"
                  type="primary"
                  disabled={!cargo.itemId || !isCargoLoadAllowed}
                  onClick={() => setAllocatingCargoItem(cargo)}
                >
                  Phân bổ ({(cargo.allocations || []).length} khoang)
                </Button>
                {totalAllocated > 0 && <Text type="secondary" style={{ fontSize: 12 }}>Đã PB: {totalAllocated} MT</Text>}
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
            const totalAllocated = (cargo.allocations || []).reduce((sum, a) => sum + Number(a.weight), 0);
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
          title={activeVoyageId ? `Quản lý Hàng hóa - Chuyến VY-${String(activeVoyageId).padStart(4, '0')}` : "Quản lý Hàng hóa"}
          extra={
            activeVoyageId ? (
              isChiefOfficer ? (
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
              <Card title="Bản đồ Hầm hàng (Stowage Plan)">
                {fetchingHolds ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" /></div>
                ) : holds.length === 0 ? (
                  <Empty description="Tàu chưa được cấu hình hầm hàng." />
                ) : (
                  <Row gutter={[20, 20]}>
                    {holds.map((hold) => {
                      const maxCap = hold.maxCapacity || 0;
                      let simulatedUsage = hold.currentUsage || 0;
                      cargoList.forEach((c) => {
                        const orig = originalCargoList.find((o) => o.itemId === c.itemId);
                        const origWeight = orig?.isLoaded && !orig?.isDischarged
                          ? (orig.allocations || []).filter((a) => String(a.holdId) === String(hold.id)).reduce((s, a) => s + Number(a.weight), 0)
                          : 0;
                        const newWeight = c.isLoaded && !c.isDischarged
                          ? (c.allocations || []).filter((a) => String(a.holdId) === String(hold.id)).reduce((s, a) => s + Number(a.weight), 0)
                          : 0;
                        simulatedUsage += (newWeight - origWeight);
                      });
                      if (simulatedUsage < 0) simulatedUsage = 0;

                      const percentage = maxCap > 0 ? (simulatedUsage / maxCap) * 100 : 0;
                      let strokeColor = '#10b981';
                      if (percentage > 90) strokeColor = '#ef4444';
                      else if (percentage > 70) strokeColor = '#f59e0b';

                      return (
                        <Col xs={24} sm={12} md={8} key={hold.id}>
                          <Card 
                            size="small" 
                            bordered={false}
                            style={{ 
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                              borderRadius: 16,
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                              <Text strong style={{ fontSize: 16, color: '#1e293b' }}>{hold.holdName}</Text>
                              <Text type="secondary" style={{ fontSize: 13, background: '#f1f5f9', padding: '4px 10px', borderRadius: 16, fontWeight: 500, color: '#64748b' }}>
                                {simulatedUsage.toLocaleString('en-US')} / {maxCap.toLocaleString('en-US')} MT
                              </Text>
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
      <AllocationModal
        open={!!allocatingCargoItem}
        cargo={allocatingCargoItem}
        holds={holds}
        onClose={() => setAllocatingCargoItem(null)}
        onSave={handleSaveAllocations}
      />
    </Layout>
  );
}
