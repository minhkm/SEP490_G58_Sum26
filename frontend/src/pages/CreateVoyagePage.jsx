import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Empty,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  InboxOutlined,
  NodeIndexOutlined,
  TeamOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import { voyageService, vesselService, crewService, cargoService } from '../services/api';
import { PageHeader, notifySuccess, notifyError, notifyWarning } from '../components/common';

const { Title, Text } = Typography;
const DATE_FORMAT = 'YYYY-MM-DD';
const toDayjs = (value) => (value ? dayjs(value, DATE_FORMAT) : null);

const CREW_ROLE_OPTIONS = [
  { value: 'Captain (CAPT)', label: 'Thuyền trưởng (Captain)' },
  { value: 'Sĩ quan boong (Deck Officer)', label: 'Sĩ quan boong (Deck Officer)' },
  { value: 'Đại phó (Chief Officer)', label: 'Đại phó (Chief Officer)' },
  { value: 'Máy trưởng (Chief Engineer)', label: 'Máy trưởng (Chief Engineer)' },
  { value: 'Thủy thủ (Crew)', label: 'Thủy thủ (Crew)' },
];

export default function CreateVoyagePage() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = user.role === 'Admin' || user.role === 'Agency' ? AgencyLayout : MasterLayout;

  // Basic Info State
  const [voyageId] = useState('');
  const [shipId, setShipId] = useState('');

  // Route State
  const [routeInfo, setRouteInfo] = useState({
    departurePort: '',
    destinationPort: '',
    departureDate: '',
    arrivalDate: '',
  });

  // Cargo State
  const [cargoList, setCargoList] = useState([]);

  // Crew State
  const [crewList, setCrewList] = useState([]);

  // Options State
  const [availableShips, setAvailableShips] = useState([]);
  const [availableCargos, setAvailableCargos] = useState([]);
  const [availableCrews, setAvailableCrews] = useState([]);

  // Capacity Calculations
  const [selectedShipCapacity, setSelectedShipCapacity] = useState({ maxWeight: 0, maxVolume: 0 });
  const [currentCargoTotal, setCurrentCargoTotal] = useState({ weight: 0, volume: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const shipsRes = await vesselService.getAll();
        setAvailableShips(shipsRes || []);

        const crewsRes = await crewService.getAll();
        setAvailableCrews(crewsRes || []);

        const cargosRes = await cargoService.getAllCargos();
        if (cargosRes && cargosRes.data) {
          setAvailableCargos(cargosRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch reference data', err);
      }
    };
    fetchData();
  }, []);

  // Update selected ship capacity when shipId changes
  useEffect(() => {
    if (shipId) {
      const ship = availableShips.find((s) => s.id === parseInt(shipId));
      if (ship && ship.ShipCapacity) {
        setSelectedShipCapacity({
          maxWeight: ship.ShipCapacity.maxCargoWeight || 0,
          maxVolume: ship.ShipCapacity.maxCargoVolume || 0,
        });
      } else if (ship && ship.ShipCapacities && ship.ShipCapacities.length > 0) {
        setSelectedShipCapacity({
          maxWeight: ship.ShipCapacities[0].maxCargoWeight || 0,
          maxVolume: ship.ShipCapacities[0].maxCargoVolume || 0,
        });
      } else {
        setSelectedShipCapacity({ maxWeight: 0, maxVolume: 0 });
      }
    } else {
      setSelectedShipCapacity({ maxWeight: 0, maxVolume: 0 });
    }
  }, [shipId, availableShips]);

  // Update current cargo totals when cargoList changes
  useEffect(() => {
    let tWeight = 0;
    let tVolume = 0;
    cargoList.forEach((item) => {
      if (item.cargoId) {
        const cargo = availableCargos.find((c) => c.id === parseInt(item.cargoId));
        if (cargo) {
          tWeight += cargo.totalWeight || 0;
          tVolume += cargo.totalVolume || 0;
        }
      }
    });
    setCurrentCargoTotal({ weight: tWeight, volume: tVolume });
  }, [cargoList, availableCargos]);

  // Handlers
  const handleRouteInfoChange = (name, value) => {
    setRouteInfo((prev) => ({ ...prev, [name]: value }));
  };

  const addCargo = () => {
    const newId = cargoList.length > 0 ? Math.max(...cargoList.map((c) => c.id)) + 1 : 1;
    setCargoList([...cargoList, { id: newId, cargoId: '' }]);
  };

  const removeCargo = (id) => {
    setCargoList(cargoList.filter((c) => c.id !== id));
  };

  const handleCargoChange = (id, name, value) => {
    setCargoList(cargoList.map((c) => (c.id === id ? { ...c, [name]: value } : c)));
  };

  const addCrew = () => {
    const newId = crewList.length > 0 ? Math.max(...crewList.map((c) => c.id)) + 1 : 1;
    setCrewList([...crewList, { id: newId, crewId: '', role: '' }]);
  };

  const removeCrew = (id) => {
    setCrewList(crewList.filter((c) => c.id !== id));
  };

  const handleCrewChange = (id, name, value) => {
    setCrewList(crewList.map((c) => (c.id === id ? { ...c, [name]: value } : c)));
  };

  const handleSubmit = async () => {
    if (!shipId) return notifyWarning('Vui lòng chọn tàu vận chuyển!');

    if (currentCargoTotal.weight > selectedShipCapacity.maxWeight) {
      return notifyWarning(
        `Tổng trọng lượng hàng (${currentCargoTotal.weight} MT) vượt quá tải trọng của tàu (${selectedShipCapacity.maxWeight} MT)! Vui lòng điều chỉnh.`
      );
    }
    if (currentCargoTotal.volume > selectedShipCapacity.maxVolume) {
      return notifyWarning(
        `Tổng thể tích hàng (${currentCargoTotal.volume} CBM) vượt quá dung tích của tàu (${selectedShipCapacity.maxVolume} CBM)! Vui lòng điều chỉnh.`
      );
    }

    const selectedRoles = crewList.map((c) => c.role);
    const requiredRoles = [
      { id: 'Captain (CAPT)', name: 'Thuyền trưởng' },
      { id: 'Đại phó (Chief Officer)', name: 'Đại phó' },
      { id: 'Sĩ quan boong (Deck Officer)', name: 'Sĩ quan boong' },
      { id: 'Máy trưởng (Chief Engineer)', name: 'Máy trưởng' },
    ];

    const missingRoles = requiredRoles.filter((r) => !selectedRoles.includes(r.id));
    if (missingRoles.length > 0) {
      const missingText = missingRoles.map((r) => r.name).join(', ');
      return notifyWarning(
        `Không thể tạo hải trình! Chuyến đi bắt buộc phải có đầy đủ Thuyền trưởng và các sĩ quan. Hiện đang thiếu: ${missingText}.`
      );
    }

    try {
      const data = { shipId, routeInfo, cargoList, crewList };
      console.log('Saving Voyage:', data);
      await voyageService.createVoyage(data);
      notifySuccess('Khởi tạo Hải trình thành công!');
      navigate('/master-dashboard');
    } catch (error) {
      console.error('Lỗi khi tạo hải trình:', error);
      notifyError('Lỗi khi khởi tạo hải trình. Vui lòng thử lại.');
    }
  };

  const overWeight = currentCargoTotal.weight > selectedShipCapacity.maxWeight;
  const overVolume = currentCargoTotal.volume > selectedShipCapacity.maxVolume;
  const overCapacity = overWeight || overVolume;

  return (
    <Layout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader
          icon={<NodeIndexOutlined />}
          breadcrumb="Voyages / New"
          title="Tạo Hải trình Mới"
          extra={
            <Space>
              <Button onClick={() => navigate(-1)}>Hủy</Button>
              <Button>Lưu Bản nháp</Button>
              <Button type="primary" onClick={handleSubmit}>
                Khởi tạo Hải trình
              </Button>
            </Space>
          }
        />

        <Row gutter={24}>
          {/* LEFT COLUMN */}
          <Col xs={24} lg={16}>
            <Form layout="vertical">
              {/* Card: Identity */}
              <Card title="Thông tin Định danh" style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Mã Hải trình (Tự động)">
                      <Input placeholder="(Sẽ tạo tự động)" value={voyageId} disabled />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Tàu Vận chuyển" required>
                      <Select
                        placeholder="Chọn tàu từ hệ thống..."
                        value={shipId || undefined}
                        onChange={(value) => setShipId(value)}
                        options={availableShips.map((ship) => ({
                          value: ship.id,
                          label: `${ship.shipName} (IMO: ${ship.imoNumber})`,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Card: Route */}
              <Card title="Chi tiết Tuyến đường" style={{ marginBottom: 24 }}>
                <Row gutter={16} align="bottom">
                  <Col flex="1">
                    <Form.Item label="Cảng đi" required style={{ marginBottom: 0 }}>
                      <Input
                        placeholder="📍 Nhập tên cảng..."
                        value={routeInfo.departurePort}
                        onChange={(e) => handleRouteInfoChange('departurePort', e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="0 0 auto" style={{ paddingBottom: 8 }}>
                    <ArrowRightOutlined style={{ color: '#94a3b8' }} />
                  </Col>
                  <Col flex="1">
                    <Form.Item label="Cảng đến" required style={{ marginBottom: 0 }}>
                      <Input
                        placeholder="📍 Nhập tên cảng..."
                        value={routeInfo.destinationPort}
                        onChange={(e) => handleRouteInfoChange('destinationPort', e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Ngày Khởi hành (Dự kiến)" required style={{ marginBottom: 0 }}>
                      <DatePicker
                        style={{ width: '100%' }}
                        format={DATE_FORMAT}
                        value={toDayjs(routeInfo.departureDate)}
                        onChange={(d) =>
                          handleRouteInfoChange('departureDate', d ? d.format(DATE_FORMAT) : '')
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Ngày Đến (Dự kiến)" required style={{ marginBottom: 0 }}>
                      <DatePicker
                        style={{ width: '100%' }}
                        format={DATE_FORMAT}
                        value={toDayjs(routeInfo.arrivalDate)}
                        onChange={(d) =>
                          handleRouteInfoChange('arrivalDate', d ? d.format(DATE_FORMAT) : '')
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Card: Cargo */}
              <Card
                title="Lô hàng Dự kiến (Tùy chọn)"
                style={{ marginBottom: 24 }}
                extra={
                  <Button type="link" icon={<PlusOutlined />} onClick={addCargo}>
                    Thêm Lô hàng
                  </Button>
                }
              >
                {cargoList.length === 0 ? (
                  <Empty
                    image={<InboxOutlined style={{ fontSize: 32, color: '#94a3b8' }} />}
                    description={
                      <div>
                        <p style={{ margin: 0 }}>
                          Chưa có lô hàng nào được liên kết với hải trình này.
                        </p>
                        <Text type="secondary">Bạn có thể thêm lô hàng sau khi lưu hải trình.</Text>
                      </div>
                    }
                  />
                ) : (
                  <>
                    {/* Hiển thị Capacity Indicator */}
                    {shipId && selectedShipCapacity.maxWeight > 0 && (
                      <Alert
                        type={overCapacity ? 'error' : 'success'}
                        style={{ marginBottom: 16 }}
                        message={
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong>Kiểm tra tải trọng (Weight):</strong>
                              <span style={{ color: overWeight ? 'red' : 'green', fontWeight: 'bold' }}>
                                {currentCargoTotal.weight.toFixed(2)} / {selectedShipCapacity.maxWeight} MT
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong>Kiểm tra thể tích (Volume):</strong>
                              <span style={{ color: overVolume ? 'red' : 'green', fontWeight: 'bold' }}>
                                {currentCargoTotal.volume.toFixed(2)} / {selectedShipCapacity.maxVolume} CBM
                              </span>
                            </div>
                          </Space>
                        }
                      />
                    )}

                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                      {cargoList.map((cargo) => (
                        <Row key={cargo.id} gutter={8} align="bottom" wrap={false}>
                          <Col flex="1">
                            <Form.Item label="Chọn Lô hàng" style={{ marginBottom: 0 }}>
                              <Select
                                placeholder="Chọn lô hàng từ hệ thống..."
                                value={cargo.cargoId || undefined}
                                onChange={(value) => handleCargoChange(cargo.id, 'cargoId', value)}
                                options={availableCargos.map((ac) => ({
                                  value: ac.id,
                                  label: `${ac.cargoName || `Cargo #${ac.id}`} - ${ac.cargoType} (${ac.totalWeight} MT | ${ac.totalVolume} CBM)`,
                                }))}
                              />
                            </Form.Item>
                          </Col>
                          <Col flex="0 0 auto">
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              onClick={() => removeCargo(cargo.id)}
                            />
                          </Col>
                        </Row>
                      ))}
                    </Space>
                  </>
                )}
              </Card>

              {/* Card: Crew */}
              <Card
                title="Nhân sự Dự kiến (Voyage Crew)"
                style={{ marginBottom: 24 }}
                extra={
                  <Button type="link" icon={<PlusOutlined />} onClick={addCrew}>
                    Thêm Nhân sự
                  </Button>
                }
              >
                {crewList.length === 0 ? (
                  <Empty
                    image={<TeamOutlined style={{ fontSize: 32, color: '#94a3b8' }} />}
                    description={
                      <div>
                        <p style={{ margin: 0 }}>Chưa phân bổ nhân sự cho chuyến đi này.</p>
                        <Text type="secondary">
                          Chọn Thuyền trưởng và các thuyền viên quan trọng.
                        </Text>
                      </div>
                    }
                  />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    {crewList.map((crew) => (
                      <Row key={crew.id} gutter={8} align="bottom" wrap={false}>
                        <Col flex="1.5">
                          <Form.Item label="Chọn Nhân sự" required style={{ marginBottom: 0 }}>
                            <Select
                              placeholder="Chọn thủy thủ..."
                              value={crew.crewId || undefined}
                              onChange={(value) => handleCrewChange(crew.id, 'crewId', value)}
                              options={availableCrews.map((ac) => ({
                                value: ac.id,
                                label: `${ac.fullName} (${ac.email}) - ${ac.position}`,
                              }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col flex="1">
                          <Form.Item label="Chức danh cho chuyến đi" required style={{ marginBottom: 0 }}>
                            <Select
                              placeholder="Chọn chức danh..."
                              value={crew.role || undefined}
                              onChange={(value) => handleCrewChange(crew.id, 'role', value)}
                              options={CREW_ROLE_OPTIONS}
                            />
                          </Form.Item>
                        </Col>
                        <Col flex="0 0 auto">
                          <Button
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => removeCrew(crew.id)}
                          />
                        </Col>
                      </Row>
                    ))}
                  </Space>
                )}
              </Card>
            </Form>
          </Col>

          {/* RIGHT COLUMN */}
          <Col xs={24} lg={8}>
            {/* Card: Status */}
            <Card title="Trạng thái" style={{ marginBottom: 24 }}>
              <Space align="start">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#94a3b8',
                    marginTop: 6,
                  }}
                />
                <div>
                  <Title level={5} style={{ margin: 0 }}>
                    Bản nháp (Draft)
                  </Title>
                  <Text type="secondary">
                    Hải trình sẽ chuyển sang trạng thái "Đang lên kế hoạch" (Planning) sau khi được
                    khởi tạo.
                  </Text>
                </div>
              </Space>
            </Card>

            {/* Card: Map */}
            <Card
              title={
                <span>
                  <NodeIndexOutlined /> Bản đồ Tuyến đường Dự kiến
                </span>
              }
              style={{ marginBottom: 24 }}
            >
              <Empty
                image={<NodeIndexOutlined style={{ fontSize: 32, color: '#cbd5e1' }} />}
                description="Bản đồ sẽ hiển thị sau khi chọn Cảng đi và Cảng đến."
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Layout>
  );
}
