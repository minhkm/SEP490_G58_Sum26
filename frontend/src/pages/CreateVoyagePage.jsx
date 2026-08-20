import { useEffect, useMemo, useState } from 'react';
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
  Progress,
  Tag,
  message,
  Checkbox,
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
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import AdminLayout from '../components/AdminLayout';
import { voyageService, vesselService, crewService, cargoService, portService } from '../services/api';
import { PageHeader, notifySuccess, notifyError, notifyWarning } from '../components/common';
import { positionLabel } from '../config/roles';
import * as XLSX from 'xlsx';
import {
  equipmentIdentityKey,
  findDuplicateEquipment,
  normalizeEquipmentExpiryDate,
  isEquipmentExpiryAllowed,
} from '../utils/vessel';

const { Text } = Typography;
const DATE_FORMAT = 'YYYY-MM-DD';
const MAX_EQUIPMENT_QUANTITY = 999999;
const toDayjs = (value) => (value ? dayjs(value, DATE_FORMAT) : null);

const parseExcelExpiryDate = (value) => {
  if (value == null || String(value).trim() === '') return null;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return undefined;
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dayjs(value).format(DATE_FORMAT);
  }
  return normalizeEquipmentExpiryDate(value);
};

const CREW_ROLE_OPTIONS = [
  { value: 'Captain (CAPT)', label: 'Thuyền trưởng' },
  { value: 'Sĩ quan boong (Deck Officer)', label: 'Sĩ quan boong' },
  { value: 'Đại phó (Chief Officer)', label: 'Đại phó' },
  { value: 'Máy trưởng (Chief Engineer)', label: 'Máy trưởng' },
  { value: 'Thợ máy (Engine Crew)', label: 'Thợ máy' },
  { value: 'Thủy thủ (Crew)', label: 'Thủy thủ' },
];

// Các chức danh cho phép nhiều người (không giới hạn trùng)
const MULTI_ALLOWED_ROLES = ['Thủy thủ (Crew)', 'Thợ máy (Engine Crew)'];

// Trong hải trình chỉ có 1 loại: Vật tư y tế
const VOYAGE_EQ_TYPE = 'Vật tư y tế';

const CARGO_TYPE_LABELS = {
  Rice: 'Gạo',
  Coal: 'Than đá',
  Stores: 'Vật tư, lương thực',
  Container: 'Hàng công-ten-nơ',
  Steel: 'Sắt thép',
  Cement: 'Xi măng',
};

const cargoTypeLabel = (type) => CARGO_TYPE_LABELS[type] || type || 'Chưa phân loại';

const mapPositionToRole = (position, department) => {
  if (!position) return '';
  const pos = position.toLowerCase();
  if (pos.includes('captain') || pos.includes('master') || pos.includes('thuyền trưởng') || pos.includes('capt')) return 'Captain (CAPT)';
  if (pos.includes('chief officer') || pos.includes('đại phó') || pos.includes('c/o')) return 'Đại phó (Chief Officer)';
  if (pos.includes('chief engineer') || pos.includes('máy trưởng') || pos.includes('c/e')) return 'Máy trưởng (Chief Engineer)';
  if (pos.includes('engine officer') || pos.includes('engine office') || pos.includes('sĩ quan máy')) return 'Máy trưởng (Chief Engineer)';
  if (pos.includes('deck officer') || pos.includes('sĩ quan boong') || pos.includes('d/o')) return 'Sĩ quan boong (Deck Officer)';
  if (pos.includes('engine crew') || pos.includes('seaman engine') || pos.includes('thợ máy') || department === 'Engine') return 'Thợ máy (Engine Crew)';
  return 'Thủy thủ (Crew)';
};

export default function CreateVoyagePage() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = user.role === 'Admin' ? AdminLayout : MasterLayout;

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
  const [portList, setPortList] = useState([]);

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

        const portsRes = await portService.getAllPorts();
        if (portsRes && portsRes.success) {
          setPortList(portsRes.data.filter(p => p.status === 'Active'));
        }
      } catch (err) {
        console.error('Không thể tải dữ liệu tham chiếu', err);
      }
    };
    fetchData();
  }, []);

  const selectedShip = useMemo(() => {
    return availableShips.find((item) => item.id === Number(shipId));
  }, [shipId, availableShips]);

  const selectedShipCapacity = useMemo(() => {
    const capacity = selectedShip?.ShipCapacity || selectedShip?.ShipCapacities?.[0];
    if (!capacity) return { maxWeight: 0, maxVolume: 0, minCrew: 10, maxCrew: 15 };

    return {
      maxWeight: capacity.maxCargoWeight || 0,
      maxVolume: capacity.maxCargoVolume || 0,
      minCrew: capacity.minCrew || 10,
      maxCrew: capacity.maxCrew || 15,
    };
  }, [selectedShip]);

  const validCrews = useMemo(() => {
    return crewList.filter((c) => c.crewId && c.role);
  }, [crewList]);

  const crewStats = useMemo(() => {
    const count = validCrews.length;
    const min = selectedShipCapacity.minCrew || 10;
    const max = selectedShipCapacity.maxCrew || 15;
    const percent = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
    const isUnderMin = count < min;
    const isOverMax = count > max;
    const isValid = count >= min && count <= max;

    const selectedRoles = validCrews.map((c) => c.role);
    const hasCaptain = selectedRoles.includes('Captain (CAPT)');
    const hasChiefOfficer = selectedRoles.includes('Đại phó (Chief Officer)');
    const hasDeckOfficer = selectedRoles.includes('Sĩ quan boong (Deck Officer)');
    const hasChiefEngineer = selectedRoles.includes('Máy trưởng (Chief Engineer)');
    const allCoreRoles = hasCaptain && hasChiefOfficer && hasDeckOfficer && hasChiefEngineer;

    return {
      count,
      min,
      max,
      percent,
      isUnderMin,
      isOverMax,
      isValid,
      hasCaptain,
      hasChiefOfficer,
      hasDeckOfficer,
      hasChiefEngineer,
      allCoreRoles,
    };
  }, [validCrews, selectedShipCapacity]);

  const currentCargoTotal = useMemo(() => {
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
    return { weight: tWeight, volume: tVolume };
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
      const autoRole = selectedCrew ? mapPositionToRole(selectedCrew.position, selectedCrew.department) : '';
      setCrewList(crewList.map((c) => (c.id === id ? { ...c, crewId: value, role: autoRole } : c)));
    } else {
      setCrewList(crewList.map((c) => (c.id === id ? { ...c, [name]: value } : c)));
    }
  };

  // ===== Excel Import helpers =====
  const downloadTemplate = () => {
    const rows = [
      ['Tên thuốc / vật tư', 'Số lượng', 'Hạn sử dụng (YYYY-MM-DD hoặc Không có hạn sử dụng)'],
      // Thuốc thông thường
      ['Paracetamol 500mg (viên)', 100, '2027-06-30'],
      ['Ibuprofen 400mg (viên)', 50, '2027-12-31'],
      ['Amoxicillin 500mg (viên)', 60, '2027-06-30'],
      ['Metronidazole 250mg (viên)', 40, '2027-12-31'],
      ['Omeprazole 20mg (viên)', 30, '2027-12-31'],
      ['Loperamide - viên tiêu chảy', 30, '2027-12-31'],
      ['Vitamin C 1000mg (viên)', 100, '2028-12-31'],
      ['Thuốc say sóng Dimenhydrinate', 50, '2028-06-30'],
      ['Dung dịch nhỏ mắt', 5, '2027-06-30'],
      // Vật tư băng bó
      ['Băng gạc vô trùng 10x10cm', 50, 'Không có hạn sử dụng'],
      ['Băng cuộn y tế 5cm', 20, 'Không có hạn sử dụng'],
      ['Băng dán cá nhân (hộp 100 cái)', 3, 'Không có hạn sử dụng'],
      ['Bông y tế (gói 100g)', 5, 'Không có hạn sử dụng'],
      ['Cồn 70° (chai 500ml)', 5, '2027-12-31'],
      ['Povidone Iodine (chai 60ml)', 5, '2027-12-31'],
      ['Oxy già (chai 100ml)', 5, '2027-12-31'],
      ['Nước muối sinh lý (gói 10ml)', 30, '2027-06-30'],
      // Dụng cụ sơ cứu
      ['Kéo y tế', 2, 'Không có hạn sử dụng'],
      ['Nhíp y tế', 2, 'Không có hạn sử dụng'],
      ['Nhiệt kế điện tử', 2, 'Không có hạn sử dụng'],
      ['Băng ép cầm máu khẩn cấp', 3, 'Không có hạn sử dụng'],
      ['Găng tay y tế (hộp 100 cái)', 2, '2027-12-31'],
      ['Khẩu trang y tế (hộp 50 cái)', 2, '2027-12-31'],
      ['Mặt nạ hô hấp nhân tạo', 2, '2027-12-31'],
      ['Túi chườm lạnh khẩn cấp', 5, '2027-12-31'],
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
        message.warning('Tệp không có dữ liệu hoặc sai định dạng!');
          return;
        }

        const errors = [];
        const imported = [];
        const startId = equipmentList.length > 0 ? Math.max(...equipmentList.map(e => e.id)) + 1 : 1;
        const seenSupplyKeys = new Set(
          equipmentList.map((equipment) => equipmentIdentityKey(equipment, false)),
        );

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

          // --- Cột C: Hạn sử dụng YYYY-MM-DD hoặc "Không có hạn sử dụng" ---
          const expiryNote = parseExcelExpiryDate(r[2]);
          if (expiryNote === undefined) {
            rowErrors.push('Hạn sử dụng không hợp lệ (dùng YYYY-MM-DD hoặc Không có hạn sử dụng)');
          } else if (!isEquipmentExpiryAllowed(expiryNote)) {
            rowErrors.push('Hạn sử dụng phải sau ngày hiện tại hoặc chọn Không có hạn sử dụng');
          }

          const supplyKey = equipmentIdentityKey({ name }, false);
          if (name && seenSupplyKeys.has(supplyKey)) {
            rowErrors.push('Tên vật tư y tế bị trùng với dòng khác');
          }

          if (rowErrors.length > 0) {
            errors.push({ rowNum, rowErrors });
          } else {
            seenSupplyKeys.add(supplyKey);
            imported.push({ id: startId + imported.length, name, type: VOYAGE_EQ_TYPE, location: '', quantity, expiryNote });
          }
        });

        // Hiển thị chi tiết lỗi nếu có
        if (errors.length > 0) {
          const errorMessages = errors.map(({ rowNum, rowErrors }) =>
            `Dòng ${rowNum}: ${rowErrors.join('; ')}`
          );
          Modal.warning({
            title: `Tệp nhập có ${errors.length} dòng lỗi — đã bỏ qua`,
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
          message.success(`Đã nhập ${imported.length} mặt hàng hợp lệ${errors.length > 0 ? `, bỏ qua ${errors.length} dòng lỗi` : ''}!`);
        } else {
          message.error('Không có dòng nào hợp lệ để nhập. Vui lòng kiểm tra lại tệp!');
        }
      } catch {
        message.error('Không đọc được tệp. Hãy kiểm tra đúng định dạng xlsx/xls.');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // ngăn antd upload tự post
  };

  // Equipment handlers
  const addEquipment = () => {
    const newId = equipmentList.length > 0 ? Math.max(...equipmentList.map((e) => e.id)) + 1 : 1;
    setEquipmentList([...equipmentList, { id: newId, name: '', type: VOYAGE_EQ_TYPE, location: '', quantity: 1, expiryNote: null }]);
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
        <Input placeholder="VD: Thuốc paracetamol, băng gạc, ..." value={value}
          maxLength={255} showCount
          onChange={(e) => handleEquipmentChange(record.id, 'name', e.target.value)} />
      ),
    },
    {
      title: <span>Số lượng <span style={{ color: 'red' }}>*</span></span>, dataIndex: 'quantity', width: 120,
      render: (value, record) => (
        <InputNumber min={1} max={MAX_EQUIPMENT_QUANTITY} step={1} precision={0} style={{ width: '100%' }} placeholder="VD: 50" value={value || 1}
          onChange={(v) => handleEquipmentChange(record.id, 'quantity', v)} />
      ),
    },
    {
      title: 'Hạn sử dụng', dataIndex: 'expiryNote', width: 245,
      render: (value, record) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày hết hạn"
            value={value ? dayjs(value, DATE_FORMAT) : null}
            disabled={!value}
            disabledDate={(current) => current && !current.isAfter(dayjs(), 'day')}
            onChange={(date) => handleEquipmentChange(
              record.id,
              'expiryNote',
              date ? date.format(DATE_FORMAT) : null,
            )}
          />
          <Checkbox
            checked={!value}
            onChange={(event) => handleEquipmentChange(
              record.id,
              'expiryNote',
              event.target.checked ? null : dayjs().add(1, 'year').format(DATE_FORMAT),
            )}
          >
            Không có hạn sử dụng
          </Checkbox>
        </Space>
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
        `Tổng trọng lượng hàng (${currentCargoTotal.weight} tấn) vượt quá tải trọng của tàu (${selectedShipCapacity.maxWeight} tấn)! Vui lòng điều chỉnh.`
      );
    }
    if (currentCargoTotal.volume > selectedShipCapacity.maxVolume) {
      setActiveTab('cargo');
      return notifyWarning(
        `Tổng thể tích hàng (${currentCargoTotal.volume} m³) vượt quá dung tích của tàu (${selectedShipCapacity.maxVolume} m³)! Vui lòng điều chỉnh.`
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
      { id: 'Thủy thủ (Crew)', name: 'Thủy thủ' },
      { id: 'Thợ máy (Engine Crew)', name: 'Thợ máy' },
    ];

    const missingRoles = requiredRoles.filter((r) => !selectedRoles.includes(r.id));
    if (missingRoles.length > 0) {
      const missingText = missingRoles.map((r) => r.name).join(', ');
      setActiveTab('crew');
      return notifyWarning(
        `Không thể tạo hải trình! Chuyến đi bắt buộc phải có đầy đủ Thuyền trưởng và các sĩ quan. Hiện đang thiếu: ${missingText}.`
      );
    }

    const duplicateMedicalSupply = findDuplicateEquipment(equipmentList, false);
    if (duplicateMedicalSupply) {
      setActiveTab('supplies');
      return notifyWarning(`Vật tư y tế "${duplicateMedicalSupply.name.trim()}" bị trùng tên.`);
    }

    const invalidExpirySupply = equipmentList.find(
      (equipment) => normalizeEquipmentExpiryDate(equipment.expiryNote) === undefined,
    );
    if (invalidExpirySupply) {
      setActiveTab('supplies');
      return notifyWarning(`Hạn sử dụng của vật tư "${invalidExpirySupply.name.trim()}" không hợp lệ.`);
    }
    const nonFutureExpirySupply = equipmentList.find(
      (equipment) => !isEquipmentExpiryAllowed(equipment.expiryNote),
    );
    if (nonFutureExpirySupply) {
      setActiveTab('supplies');
      return notifyWarning(`Hạn sử dụng của vật tư "${nonFutureExpirySupply.name.trim()}" phải sau ngày hiện tại hoặc chọn Không có hạn sử dụng.`);
    }

    // Mỗi tên vật tư hợp lệ được tính là một loại.
    const validMedicalTypes = new Set(
      equipmentList
        .filter((item) => item.name?.trim() && Number(item.quantity) >= 1)
        .map((item) => item.name.trim().toLocaleLowerCase('vi-VN')),
    );
    if (validMedicalTypes.size === 0) {
      setActiveTab('supplies');
      return notifyWarning('Hải trình chưa có vật tư y tế nào! Vui lòng thêm ít nhất 5 loại vật tư y tế.');
    }
    if (validMedicalTypes.size < 5) {
      setActiveTab('supplies');
      return notifyWarning(`Hiện chỉ có ${validMedicalTypes.size} loại vật tư y tế hợp lệ. Vui lòng bổ sung đủ ít nhất 5 loại.`);
    }

    // Validate tất cả phải có tên và số lượng
    const invalidEq = equipmentList.filter(e => !e.name || !e.name.trim() || !e.quantity || e.quantity < 1);
    if (invalidEq.length > 0) {
      setActiveTab('supplies');
      return notifyWarning('Vật tư y tế bắt buộc phải có tên và số lượng hợp lệ!');
    }

    try {
      const normalizedEquipmentList = equipmentList.map((equipment) => ({
        ...equipment,
        expiryNote: normalizeEquipmentExpiryDate(equipment.expiryNote),
      }));
      const data = { shipId, routeInfo, cargoList, crewList, equipmentList: normalizedEquipmentList };
      console.log('Dữ liệu tạo hải trình:', data);
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
      <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
        <PageHeader
          icon={<NodeIndexOutlined />}
          breadcrumb="Hải trình / Tạo mới"
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
          message='Trạng thái hiện tại là bản nháp; sau khi khởi tạo, hải trình sẽ chuyển sang đang lên kế hoạch.'
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
                          label: `${ship.shipName} (IMO: ${ship.imoNumber})${ship.status === 'OnVoyage' || ship.status === 'Đang làm việc' ? ' - Đang bận' : ''}`,
                          disabled: ship.status === 'OnVoyage' || ship.status === 'Đang làm việc',
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
                        options={portList.map(port => ({
                          label: port.portName,
                          value: port.portName,
                          disabled: port.portName === routeInfo.destinationPort
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
                        options={portList.map(port => ({
                          label: port.portName,
                          value: port.portName,
                          disabled: port.portName === routeInfo.departurePort
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
                title={<span>Lô hàng Dự kiến <span style={{ color: '#ef4444' }}>*</span></span>}
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
                        <Text type="danger">Hải trình bắt buộc phải có ít nhất một lô hàng.</Text>
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
                              <strong>Kiểm tra tải trọng:</strong>
                              <span style={{ color: overWeight ? 'red' : 'green', fontWeight: 'bold' }}>
                                {currentCargoTotal.weight.toFixed(2)} / {selectedShipCapacity.maxWeight} tấn
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong>Kiểm tra thể tích:</strong>
                              <span style={{ color: overVolume ? 'red' : 'green', fontWeight: 'bold' }}>
                                {currentCargoTotal.volume.toFixed(2)} / {selectedShipCapacity.maxVolume} m³
                              </span>
                            </div>
                          </Space>
                        }
                      />
                    )}

                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                      {cargoList.map((cargo) => (
                        <Row key={cargo.id} gutter={8} align="bottom" >
                          <Col flex="1">
                            <Form.Item label="Chọn Lô hàng" style={{ marginBottom: 0 }}>
                              <Select
                                placeholder="Chọn lô hàng từ hệ thống..."
                                value={cargo.cargoId || undefined}
                                onChange={(value) => handleCargoChange(cargo.id, 'cargoId', value)}
                                options={availableCargos.map((ac) => ({
                                  value: ac.id,
                                  label: `${ac.cargoName || `Lô hàng số ${ac.id}`} - ${cargoTypeLabel(ac.cargoType)} (${ac.totalWeight} tấn | ${ac.totalVolume} m³)`,
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
                label: (
                  <Space size={6}>
                    <span>Nhân sự</span>
                    {shipId && (
                      <Tag
                        color={crewStats.isOverMax ? 'error' : crewStats.isValid ? 'success' : 'warning'}
                        style={{ margin: 0, borderRadius: 10, fontSize: 11, padding: '0 6px' }}
                      >
                        {crewStats.count}/{crewStats.max}
                      </Tag>
                    )}
                  </Space>
                ),
                children: (
                  <>
                    {/* Thanh theo dõi định biên & khả năng chở nhân sự của tàu đã chọn */}
                    {!shipId ? (
                      <Alert
                        type="warning"
                        showIcon
                        message="Chưa chọn tàu vận chuyển"
                        description="Vui lòng quay lại tab 'Định danh & Tuyến đường' để chọn tàu. Hệ thống sẽ tự động tải định biên an toàn tối thiểu và sức chứa thuyền viên tối đa của tàu đó."
                        style={{ marginBottom: 20, borderRadius: 8 }}
                      />
                    ) : (
                      <Card
                        style={{
                          marginBottom: 20,
                          borderRadius: 10,
                          background: '#f8fafc',
                          borderColor: crewStats.isOverMax ? '#fca5a5' : crewStats.isValid ? '#86efac' : '#fde047',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                        styles={{ body: { padding: '16px 20px' } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <Space>
                              <TeamOutlined style={{ fontSize: 18, color: '#6366f1' }} />
                              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                                Định biên Thuyền viên: {selectedShip?.shipName} (IMO: {selectedShip?.imoNumber})
                              </Text>
                            </Space>
                          </div>
                          <div>
                            {crewStats.isOverMax ? (
                              <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ padding: '4px 10px', fontSize: 13, borderRadius: 6, fontWeight: 500 }}>
                                Vượt sức chứa ({crewStats.count}/{crewStats.max} người - Vượt {crewStats.count - crewStats.max} người)
                              </Tag>
                            ) : crewStats.isUnderMin ? (
                              <Tag color="warning" icon={<WarningOutlined />} style={{ padding: '4px 10px', fontSize: 13, borderRadius: 6, fontWeight: 500 }}>
                                Chưa đủ định biên tối thiểu ({crewStats.count}/{crewStats.min} người - Thiếu {crewStats.min - crewStats.count} người)
                              </Tag>
                            ) : (
                              <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '4px 10px', fontSize: 13, borderRadius: 6, fontWeight: 500 }}>
                                Đạt chuẩn an toàn ({crewStats.count}/{crewStats.max} người)
                              </Tag>
                            )}
                          </div>
                        </div>

                        {/* Thanh Tiến Trình / Progress Bar Thuyền Viên */}
                        <div style={{ margin: '14px 0 8px' }}>
                          <Progress
                            percent={crewStats.percent}
                            status={crewStats.isOverMax ? 'exception' : crewStats.isUnderMin ? 'active' : 'success'}
                            strokeColor={
                              crewStats.isOverMax ? '#ef4444' : crewStats.isUnderMin ? '#eab308' : '#22c55e'
                            }
                            format={() => `${crewStats.count} / ${crewStats.max} Thuyền viên`}
                          />
                        </div>

                        {/* Các chỉ số Min / Max */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                          <span>
                            Tối thiểu an toàn (Safe Manning): <strong>{crewStats.min} người</strong>
                          </span>
                          <span>
                            Đã phân công: <strong style={{ color: crewStats.isOverMax ? '#dc2626' : crewStats.isUnderMin ? '#d97706' : '#16a34a', fontSize: 13 }}>{crewStats.count} người</strong>
                          </span>
                          <span>
                            Sức chứa tối đa (Max Capacity): <strong>{crewStats.max} người</strong>
                          </span>
                        </div>

                        {/* 4 Chức danh Sĩ quan bắt buộc */}
                        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 10, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 12px' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <strong>Sĩ quan cốt lõi bắt buộc:</strong>
                          </Text>
                          <Tag color={crewStats.hasCaptain ? 'success' : 'default'} style={{ borderRadius: 4 }}>
                            {crewStats.hasCaptain ? '✓' : '○'} Thuyền trưởng
                          </Tag>
                          <Tag color={crewStats.hasChiefOfficer ? 'success' : 'default'} style={{ borderRadius: 4 }}>
                            {crewStats.hasChiefOfficer ? '✓' : '○'} Đại phó
                          </Tag>
                          <Tag color={crewStats.hasDeckOfficer ? 'success' : 'default'} style={{ borderRadius: 4 }}>
                            {crewStats.hasDeckOfficer ? '✓' : '○'} Sĩ quan boong
                          </Tag>
                          <Tag color={crewStats.hasChiefEngineer ? 'success' : 'default'} style={{ borderRadius: 4 }}>
                            {crewStats.hasChiefEngineer ? '✓' : '○'} Máy trưởng
                          </Tag>
                        </div>
                      </Card>
                    )}

                    <Card
                      title="Danh sách Nhân sự được phân công"
                      extra={
                        <Button type="primary" ghost icon={<PlusOutlined />} onClick={addCrew}>
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
                                Bấm nút "+ Thêm Nhân sự" ở trên để chọn Thuyền trưởng và các thuyền viên.
                              </Text>
                            </div>
                          }
                        />
                      ) : (
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                          {crewList.map((crew) => (
                            <Row key={crew.id} gutter={8} align="bottom" >
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
                                      label: `${ac.fullName} (${ac.email}) - ${positionLabel(ac.position)}`,
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
                                      disabled: !MULTI_ALLOWED_ROLES.includes(opt.value) && crewList.some(c => c.role === opt.value && c.id !== crew.id)
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
                  </>
                ),
              },
              {
                key: 'supplies',
                label: 'Vật tư y tế',
                children: (
              <Card
                title={<span><ToolOutlined /> Vật tư y tế</span>}
                extra={
                  <Space size="small">
                    <Tooltip title="Tải tệp Excel mẫu về, điền dữ liệu rồi nhập lên">
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
                        Nhập từ Excel
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
                        <p style={{ margin: 0, fontWeight: 500 }}>Chưa có vật tư y tế nào.</p>
                        <Text type="secondary">Hải trình <strong>bắt buộc</strong> phải có ít nhất 5 loại vật tư y tế.</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>Thêm thuốc, băng gạc, dụng cụ sơ cấp cứu...</Text>
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
