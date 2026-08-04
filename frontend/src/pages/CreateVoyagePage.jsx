import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Empty,
  Alert,
  Table,
  Tooltip,
  Upload,
  Tabs,
  Modal,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  InboxOutlined,
  NodeIndexOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  ToolOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import { voyageService, vesselService, crewService, cargoService } from '../services/api';
import { PageHeader, notifySuccess, notifyError, notifyWarning } from '../components/common';
import { SEAPORTS } from '../data/ports';
import * as XLSX from 'xlsx';

const { Text } = Typography;
const DATE_FORMAT = 'YYYY-MM-DD';
const toDayjs = (value) => (value ? dayjs(value, DATE_FORMAT) : null);

const CREW_ROLE_OPTIONS = [
  { value: 'Captain (CAPT)', label: 'Thuyền trưởng (Captain)' },
  { value: 'Sĩ quan boong (Deck Officer)', label: 'Sĩ quan boong (Deck Officer)' },
  { value: 'Đại phó (Chief Officer)', label: 'Đại phó (Chief Officer)' },
  { value: 'Máy trưởng (Chief Engineer)', label: 'Máy trưởng (Chief Engineer)' },
  { value: 'Thủy thủ (Crew)', label: 'Thủy thủ (Crew)' },
];

// Trong hải trình chỉ có 1 loại: Vật tư y tế
const VOYAGE_EQ_TYPE = 'Vật tư y tế';

const EQUIPMENT_LOCATION_OPTIONS = [
  { label: 'Boong', value: 'Boong' },
  { label: 'Buồng máy', value: 'Buồng máy' },
  { label: 'Buồng lái', value: 'Buồng lái' },
];

const mapPositionToRole = (position) => {
  if (!position) return '';
  const pos = position.toLowerCase();
  if (pos.includes('captain') || pos.includes('master') || pos.includes('thuyền trưởng') || pos.includes('capt')) return 'Captain (CAPT)';
  if (pos.includes('chief officer') || pos.includes('đại phó') || pos.includes('c/o')) return 'Đại phó (Chief Officer)';
  if (pos.includes('chief engineer') || pos.includes('máy trưởng') || pos.includes('c/e')) return 'Máy trưởng (Chief Engineer)';
  if (pos.includes('deck officer') || pos.includes('sĩ quan boong') || pos.includes('d/o')) return 'Sĩ quan boong (Deck Officer)';
  return 'Thủy thủ (Crew)';
};

export default function CreateVoyagePage() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = user.role === 'Admin' || user.role === 'Agency' ? AgencyLayout : MasterLayout;

  // Basic Info State
  const [voyageId] = useState('');
  const [shipId, setShipId] = useState('');
  // Tab đang mở
  const [activeTab, setActiveTab] = useState('route');

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

  // Equipment State
  const [equipmentList, setEquipmentList] = useState([]);

  // Options State
  const [availableShips, setAvailableShips] = useState([]);
  const [availableCargos, setAvailableCargos] = useState([]);
  const [availableCrews, setAvailableCrews] = useState([]);

  // Capacity Calculations
  const [selectedShipCapacity, setSelectedShipCapacity] = useState({ maxWeight: 0, maxVolume: 0, minCrew: 0, maxCrew: 0 });
  const [currentCargoTotal, setCurrentCargoTotal] = useState({ weight: 0, volume: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const shipsRes = await vesselService.getAll();
        setAvailableShips(shipsRes || []);

        const crewsRes = await crewService.getAvailable();
        setAvailableCrews(crewsRes || []);

        const cargosRes = await cargoService.getAllCargos();
        if (cargosRes && cargosRes.data) {
          const unassignedCargos = cargosRes.data.filter(c => !c.voyageId);
          setAvailableCargos(unassignedCargos);
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
          minCrew: ship.ShipCapacity.minCrew || 10,
          maxCrew: ship.ShipCapacity.maxCrew || 25,
        });
      } else if (ship && ship.ShipCapacities && ship.ShipCapacities.length > 0) {
        setSelectedShipCapacity({
          maxWeight: ship.ShipCapacities[0].maxCargoWeight || 0,
          maxVolume: ship.ShipCapacities[0].maxCargoVolume || 0,
          minCrew: ship.ShipCapacities[0].minCrew || 10,
          maxCrew: ship.ShipCapacities[0].maxCrew || 25,
        });
      } else {
        setSelectedShipCapacity({ maxWeight: 0, maxVolume: 0, minCrew: 0, maxCrew: 0 });
      }
    } else {
      setSelectedShipCapacity({ maxWeight: 0, maxVolume: 0, minCrew: 0, maxCrew: 0 });
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
    if (name === 'crewId') {
      const selectedCrew = availableCrews.find(c => c.id === value);
      const autoRole = selectedCrew ? mapPositionToRole(selectedCrew.position) : '';
      setCrewList(crewList.map((c) => (c.id === id ? { ...c, crewId: value, role: autoRole } : c)));
    } else {
      setCrewList(crewList.map((c) => (c.id === id ? { ...c, [name]: value } : c)));
    }
  };

  // ===== Excel Import helpers =====
  const downloadTemplate = () => {
    const rows = [
      ['Tên thuốc / vật tư', 'Số lượng', 'Hạn sử dụng (ghi chú)'],
      // Thuốc thông thường
      ['Paracetamol 500mg (viên)', 100, '06/2027'],
      ['Ibuprofen 400mg (viên)', 50, '12/2027'],
      ['Amoxicillin 500mg (viên)', 60, '06/2027'],
      ['Metronidazole 250mg (viên)', 40, '12/2027'],
      ['Omeprazole 20mg (viên)', 30, '12/2027'],
      ['Loperamide - viên tiêu chảy', 30, '12/2027'],
      ['Vitamin C 1000mg (viên)', 100, '12/2028'],
      ['Thuốc say sóng Dimenhydrinate', 50, '06/2028'],
      ['Dung dịch nhỏ mắt', 5, '06/2027'],
      // Vật tư băng bó
      ['Băng gạc vô trùng 10x10cm', 50, 'Không có hạn'],
      ['Băng cuộn y tế 5cm', 20, 'Không có hạn'],
      ['Băng dán cá nhân (hộp 100 cái)', 3, 'Không có hạn'],
      ['Bông y tế (gói 100g)', 5, 'Không có hạn'],
      ['Cồn 70° (chai 500ml)', 5, '12/2027'],
      ['Povidone Iodine (chai 60ml)', 5, '12/2027'],
      ['Oxy già (chai 100ml)', 5, '12/2027'],
      ['Nước muối sinh lý (gói 10ml)', 30, '06/2027'],
      // Dụng cụ sơ cứu
      ['Kéo y tế', 2, 'Không có hạn'],
      ['Nhíp y tế', 2, 'Không có hạn'],
      ['Nhiệt kế điện tử', 2, 'Không có hạn'],
      ['Băng ép cầm máu khẩn cấp', 3, 'Không có hạn'],
      ['Găng tay y tế (hộp 100 cái)', 2, '12/2027'],
      ['Khẩu trang y tế (hộp 50 cái)', 2, '12/2027'],
      ['Mặt nạ hô hấp nhân tạo', 2, '12/2027'],
      ['Túi chườm lạnh khẩn cấp', 5, '12/2027'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 38 }, { wch: 12 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VatTuYTe');
    XLSX.writeFile(wb, 'mau-vat-tu-y-te.xlsx');
  };

  const handleImportExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // header:1 → mảng thô, defval:'' → ô trống thành chuỗi rỗng
        // Các cột thừa (> cột C) tự bị bỏ qua vì chỉ đọc index 0-2
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Bỏ dòng tiêu đề (dòng 0), lọc dòng có cột A không rỗng
        const nonEmptyRows = rows.slice(1).filter(r => String(r[0] || '').trim());
        if (nonEmptyRows.length === 0) {
          message.warning('File không có dữ liệu hoặc sai định dạng!');
          return;
        }

        const errors = [];
        const imported = [];
        const startId = equipmentList.length > 0 ? Math.max(...equipmentList.map(e => e.id)) + 1 : 1;

        nonEmptyRows.forEach((r, i) => {
          const rowNum = i + 2; // +2 vì dòng 1 là header
          const rowErrors = [];

          // --- Cột A: Tên thuốc / vật tư (bắt buộc, tối đa 255 ký tự) ---
          const name = String(r[0] || '').trim();
          if (!name) {
            rowErrors.push('Tên thuốc/vật tư không được để trống');
          } else if (name.length > 255) {
            rowErrors.push('Tên thuốc/vật tư quá dài (tối đa 255 ký tự)');
          }

          // --- Cột B: Số lượng (số nguyên dương, tùy chọn — mặc định 1) ---
          const rawQty = r[1];
          const qty = Number(rawQty);
          let quantity = 1;
          if (rawQty !== '' && rawQty !== null) {
            if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
              rowErrors.push(`Số lượng "${rawQty}" không hợp lệ (phải là số nguyên dương)`);
            } else {
              quantity = qty;
            }
          }

          // --- Cột C: Ghi chú hạn sử dụng (tùy chọn, tối đa 500 ký tự) ---
          const expiryNote = String(r[2] || '').trim();
          if (expiryNote.length > 500) {
            rowErrors.push('Ghi chú hạn sử dụng quá dài (tối đa 500 ký tự)');
          }

          if (rowErrors.length > 0) {
            errors.push({ rowNum, rowErrors });
          } else {
            imported.push({ id: startId + imported.length, name, type: VOYAGE_EQ_TYPE, location: '', quantity, expiryNote });
          }
        });

        // Hiển thị chi tiết lỗi nếu có
        if (errors.length > 0) {
          const errorMessages = errors.map(({ rowNum, rowErrors }) =>
            `Dòng ${rowNum}: ${rowErrors.join('; ')}`
          );
          Modal.warning({
            title: `Import có ${errors.length} dòng lỗi — bị bỏ qua`,
            width: 600,
            content: (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {errorMessages.map((msg, idx) => (
                  <div key={idx} style={{ marginBottom: 4, fontSize: 13 }}>⚠️ {msg}</div>
                ))}
              </div>
            ),
          });
        }

        if (imported.length > 0) {
          setEquipmentList(prev => [...prev, ...imported]);
          message.success(`Đã import ${imported.length} mặt hàng hợp lệ${errors.length > 0 ? `, bỏ qua ${errors.length} dòng lỗi` : ''}!`);
        } else {
          message.error('Không có dòng nào hợp lệ để import. Kiểm tra lại file!');
        }
      } catch {
        message.error('Không đọc được file. Hãy kiểm tra đúng định dạng xlsx/xls.');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // ngăn antd upload tự post
  };

  // Equipment handlers
  const addEquipment = () => {
    const newId = equipmentList.length > 0 ? Math.max(...equipmentList.map((e) => e.id)) + 1 : 1;
    setEquipmentList([...equipmentList, { id: newId, name: '', type: VOYAGE_EQ_TYPE, location: '', quantity: 1, expiryNote: '' }]);
  };

  const removeEquipment = (eqId) => {
    setEquipmentList(equipmentList.filter((e) => e.id !== eqId));
  };

  const handleEquipmentChange = (eqId, field, value) => {
    setEquipmentList(equipmentList.map((eq) => (eq.id === eqId ? { ...eq, [field]: value } : eq)));
  };

  const equipmentColumns = [
    {
      title: <span>Tên thuốc / vật tư <span style={{ color: 'red' }}>*</span></span>, dataIndex: 'name',
      render: (value, record) => (
        <Input placeholder="VD: Thuốc paracetamol, băng găc, ..." value={value}
          onChange={(e) => handleEquipmentChange(record.id, 'name', e.target.value)} />
      ),
    },
    {
      title: <span>Số lượng <span style={{ color: 'red' }}>*</span></span>, dataIndex: 'quantity', width: 120,
      render: (value, record) => (
        <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 50" value={value || 1}
          onChange={(v) => handleEquipmentChange(record.id, 'quantity', v)} />
      ),
    },
    {
      title: 'Ghi chú hạn sử dụng', dataIndex: 'expiryNote', width: 200,
      render: (value, record) => (
        <Input placeholder="VD: 12/2027 hoặc Hết hạn tháng 6/2025" value={value || ''}
          onChange={(e) => handleEquipmentChange(record.id, 'expiryNote', e.target.value)} />
      ),
    },
    {
      title: 'Thao tác', key: 'actions', width: 80, align: 'center',
      render: (_, record) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeEquipment(record.id)} />
      ),
    },
  ];

  const handleSubmit = async () => {
    if (!shipId) { setActiveTab('route'); return notifyWarning('Vui lòng chọn tàu vận chuyển!'); }

    if (routeInfo.departurePort && routeInfo.destinationPort && routeInfo.departurePort === routeInfo.destinationPort) {
      setActiveTab('route');
      return notifyWarning('Cảng đi và Cảng đến không được trùng nhau!');
    }

    if (!routeInfo.departurePort || !routeInfo.destinationPort) {
      setActiveTab('route');
      return notifyWarning('Vui lòng chọn cảng đi và cảng đến!');
    }

    if (!routeInfo.departureDate || !routeInfo.arrivalDate) {
      setActiveTab('route');
      return notifyWarning('Vui lòng chọn Ngày khởi hành và Ngày đến!');
    }

    if (routeInfo.departureDate >= routeInfo.arrivalDate) {
      setActiveTab('route');
      return notifyWarning('Ngày đến dự kiến phải sau ngày khởi hành!');
    }

    if (currentCargoTotal.weight > selectedShipCapacity.maxWeight) {
      setActiveTab('cargo');
      return notifyWarning(
        `Tổng trọng lượng hàng (${currentCargoTotal.weight} MT) vượt quá tải trọng của tàu (${selectedShipCapacity.maxWeight} MT)! Vui lòng điều chỉnh.`
      );
    }
    if (currentCargoTotal.volume > selectedShipCapacity.maxVolume) {
      setActiveTab('cargo');
      return notifyWarning(
        `Tổng thể tích hàng (${currentCargoTotal.volume} CBM) vượt quá dung tích của tàu (${selectedShipCapacity.maxVolume} CBM)! Vui lòng điều chỉnh.`
      );
    }

    const validCargos = cargoList.filter(c => c.cargoId);
    if (validCargos.length === 0) {
      setActiveTab('cargo');
      return notifyWarning('Hải trình bắt buộc phải có ít nhất một lô hàng được gán!');
    }

    const validCrews = crewList.filter(c => c.crewId && c.role);
    if (selectedShipCapacity.minCrew > 0 && (validCrews.length < selectedShipCapacity.minCrew || validCrews.length > selectedShipCapacity.maxCrew)) {
      setActiveTab('crew');
      return notifyWarning(`Số lượng nhân sự (${validCrews.length} người) không phù hợp với quy định của tàu này (Tối thiểu: ${selectedShipCapacity.minCrew}, Tối đa: ${selectedShipCapacity.maxCrew} người)!`);
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
      setActiveTab('crew');
      return notifyWarning(
        `Không thể tạo hải trình! Chuyến đi bắt buộc phải có đầy đủ Thuyền trưởng và các sĩ quan. Hiện đang thiếu: ${missingText}.`
      );
    }

    // Validate equipment: tất cả phải có tên và số lượng
    const invalidEq = equipmentList.filter(e => !e.name || !e.name.trim() || !e.quantity || e.quantity < 1);
    if (invalidEq.length > 0) {
      setActiveTab('supplies');
      return notifyWarning('Vật tư y tế bắt buộc phải có tên và số lượng hợp lệ!');
    }

    try {
      const data = { shipId, routeInfo, cargoList, crewList, equipmentList };
      console.log('Saving Voyage:', data);
      await voyageService.createVoyage(data);
      notifySuccess('Khởi tạo Hải trình thành công!');
      navigate('/voyages');
    } catch (error) {
      console.error('Lỗi khi tạo hải trình:', error);
      if (error.response && error.response.data && error.response.data.message) {
        notifyError(error.response.data.message);
      } else {
        notifyError('Lỗi khi khởi tạo hải trình. Vui lòng thử lại.');
      }
    }
  };

  const overWeight = currentCargoTotal.weight > selectedShipCapacity.maxWeight;
  const overVolume = currentCargoTotal.volume > selectedShipCapacity.maxVolume;
  const overCapacity = overWeight || overVolume;

  return (
    <Layout>
      <div style={{ padding: '24px 32px', height: '100%', overflowY: 'auto' }}>
        <PageHeader
          icon={<NodeIndexOutlined />}
          breadcrumb="Voyages / New"
          title="Tạo Hải trình Mới"
          extra={
            <Space>
              <Button onClick={() => navigate(-1)}>Hủy</Button>
              <Button type="primary" onClick={handleSubmit}>
                Khởi tạo Hải trình
              </Button>
            </Space>
          }
        />

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message='Trạng thái: Bản nháp (Draft) — hải trình sẽ chuyển "Đang lên kế hoạch" (Planning) sau khi khởi tạo.'
        />

        <Form layout="vertical">
          <Tabs
            type="card"
            size="large"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'route',
                label: 'Định danh & Tuyến đường',
                children: (
                  <>
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
                      <Select
                        showSearch
                        placeholder="📍 Chọn cảng đi..."
                        optionFilterProp="label"
                        options={SEAPORTS.map(port => ({
                          ...port,
                          disabled: port.value === routeInfo.destinationPort
                        }))}
                        value={routeInfo.departurePort || undefined}
                        onChange={(value) => handleRouteInfoChange('departurePort', value)}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="0 0 auto" style={{ paddingBottom: 8 }}>
                    <ArrowRightOutlined style={{ color: '#94a3b8' }} />
                  </Col>
                  <Col flex="1">
                    <Form.Item label="Cảng đến" required style={{ marginBottom: 0 }}>
                      <Select
                        showSearch
                        placeholder="📍 Chọn cảng đến..."
                        optionFilterProp="label"
                        options={SEAPORTS.map(port => ({
                          ...port,
                          disabled: port.value === routeInfo.departurePort
                        }))}
                        value={routeInfo.destinationPort || undefined}
                        onChange={(value) => handleRouteInfoChange('destinationPort', value)}
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
                        disabledDate={(current) => current && current.startOf('day').isBefore(dayjs().startOf('day'))}
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
                        disabledDate={(current) => {
                          if (!current) return false;
                          if (current.startOf('day').isBefore(dayjs().startOf('day'))) return true;
                          if (routeInfo.departureDate && !current.startOf('day').isAfter(dayjs(routeInfo.departureDate, DATE_FORMAT).startOf('day'))) return true;
                          return false;
                        }}
                        onChange={(d) =>
                          handleRouteInfoChange('arrivalDate', d ? d.format(DATE_FORMAT) : '')
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>


                  </>
                ),
              },
              {
                key: 'cargo',
                label: 'Lô hàng',
                children: (
              <Card
                title="Lô hàng Dự kiến (Tùy chọn)"
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

                ),
              },
              {
                key: 'crew',
                label: 'Nhân sự',
                children: (
              <Card
                title="Nhân sự Dự kiến (Voyage Crew)"
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
                              showSearch
                              optionFilterProp="label"
                              placeholder="Chọn thủy thủ..."
                              value={crew.crewId || undefined}
                              onChange={(value) => handleCrewChange(crew.id, 'crewId', value)}
                              options={availableCrews.map((ac) => ({
                                value: ac.id,
                                label: `${ac.fullName} (${ac.email}) - ${ac.position}`,
                                disabled: crewList.some(c => c.crewId === ac.id && c.id !== crew.id)
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
                              options={CREW_ROLE_OPTIONS.map(opt => ({
                                ...opt,
                                disabled: opt.value !== 'Thủy thủ (Crew)' && crewList.some(c => c.role === opt.value && c.id !== crew.id)
                              }))}
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

                ),
              },
              {
                key: 'supplies',
                label: 'Vật tư y tế',
                children: (
              <Card
                title={<span><ToolOutlined /> Vật tư y tế (Medical Supplies)</span>}
                extra={
                  <Space size="small">
                    <Tooltip title="Tải file Excel mẫu về, điền rồi import lên">
                      <Button size="small" icon={<DownloadOutlined />} onClick={downloadTemplate}>
                        Tải mẫu
                      </Button>
                    </Tooltip>
                    <Upload
                      accept=".xlsx,.xls"
                      showUploadList={false}
                      beforeUpload={handleImportExcel}
                    >
                      <Button size="small" icon={<UploadOutlined />} type="default">
                        Import Excel
                      </Button>
                    </Upload>
                    <Button type="link" icon={<PlusOutlined />} onClick={addEquipment}>
                      Thêm
                    </Button>
                  </Space>
                }
              >
                {equipmentList.length === 0 ? (
                  <Empty
                    image={<ToolOutlined style={{ fontSize: 32, color: '#94a3b8' }} />}
                    description={
                      <div>
                        <p style={{ margin: 0 }}>Chưa có vật tư y tế nào.</p>
                        <Text type="secondary">Thêm thuốc, băng găc, dụng cụ sơ cấp cứu...</Text>
                      </div>
                    }
                  />
                ) : (
                  <Table
                    rowKey="id"
                    size="small"
                    columns={equipmentColumns}
                    dataSource={equipmentList}
                    pagination={false}
                    scroll={{ x: 600 }}
                  />
                )}
              </Card>
                ),
              },
            ]}
          />
        </Form>
      </div>
    </Layout>
  );
}
