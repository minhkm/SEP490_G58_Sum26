import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Slider,
  Button,
  Tag,
  Space,
  Typography,
  Divider,
  Empty,
  Tooltip,
  Upload,
  Tabs,
  Modal,
  message,
  DatePicker,
  Checkbox,
} from 'antd';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  InboxOutlined,
  DashboardOutlined,
  FireOutlined,
  CloudOutlined,
  ToolOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import AdminLayout from '../components/AdminLayout';
import { vesselService } from '../services/api';
import { notifyError, notifySuccess, notifyWarning } from '../utils/feedback';
import * as XLSX from 'xlsx';
import { getData } from 'country-list';
import {
  ENGINE_STATUS,
  ENGINE_TYPE,
  ENGINE_STATUS_OPTIONS,
  engineNameLabel,
  engineParameterLabel,
  engineParameterTypicalMax,
  findDuplicateEngine,
  isMainEngine,
  normalizeEngineStatus,
} from '../utils/engine';
import {
  cargoHoldNameLabel,
  equipmentLocationLabel,
  equipmentNameLabel,
  equipmentTypeLabel,
  normalizeShipStatus,
  equipmentIdentityKey,
  findDuplicateEquipment,
  normalizeEquipmentExpiryDate,
  isEquipmentExpiryAllowed,
} from '../utils/vessel';

const { Title, Text } = Typography;

const REQUIRED_PARAMS = [
  'Áp suất dầu nhiên liệu (kg/cm²)',
  'Nhiệt độ khí xả XL2 (°C)',
  'Nhiệt độ nước làm mát (°C)',
];

// Giới hạn tối đa thực tế cho từng thông số (dựa trên tiêu chuẩn kỹ thuật tàu biển)
const PARAM_MAX_VALUE = {
  'Áp suất dầu nhiên liệu (kg/cm²)': 50,
  'Nhiệt độ khí xả XL2 (°C)': 600,
  'Nhiệt độ nước làm mát (°C)': 95,
  'Vòng quay máy chính (vòng/phút)': 2000,
  'Áp suất khí quét (kg/cm²)': 50,
  'Áp suất khí nén (kg/cm²)': 50,
  'Áp suất khí khởi động (kg/cm²)': 50,
  'Nhiệt độ dầu bôi trơn (°C)': 600,
  'Nhiệt độ khí xả XL3 (°C)': 600,
  'Nhiệt độ khí xả XL4 (°C)': 600,
  'Nhiệt độ khí xả XL5 (°C)': 600,
  'Nhiệt độ khí xả XL6 (°C)': 600,
};
const getParamMax = (name) => PARAM_MAX_VALUE[name] ?? 9999;

const MAX_NAME_LENGTH = 255;
const MAX_EQUIPMENT_QUANTITY = 999999;
const MAX_CAPACITY_VALUE = 999999999;

const parseExcelExpiryDate = (value) => {
  if (value == null || String(value).trim() === '') return null;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return undefined;
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dayjs(value).format('YYYY-MM-DD');
  }
  return normalizeEquipmentExpiryDate(value);
};

export default function AddVesselPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Tab đang mở
  const [activeTab, setActiveTab] = useState('basic');

  const requiredTag = <span style={{ marginLeft: 6, fontSize: 11, color: '#ea580c', fontWeight: 500, fontStyle: 'italic' }}>(Bắt buộc)</span>;

  // Basic Info State
  const [basicInfo, setBasicInfo] = useState({
    shipName: '',
    imoNumber: '',
    flag: '',
    status: 'Hoạt động',
  });

  // Capacity State
  const [capacity, setCapacity] = useState({
    maxWeight: '',
    maxVolume: '',
    minCrew: 10,
    maxCrew: 25,
  });

  // Holds State
  const [holds, setHolds] = useState([]);

  // Ship Equipment State (thiết bị của tàu — không phải hải trình)
  const SHIP_EQ_TYPES = ['Thiết bị cứu sinh', 'Thiết bị chữa cháy', 'Dụng cụ sửa chữa', 'Thiết bị hàng hải', 'Thiết bị liên lạc', 'Khác'];
  const SHIP_EQ_LOCATIONS = ['Boong', 'Buồng máy', 'Buồng lái'];
  const [shipEquipments, setShipEquipments] = useState([]);

  // Countries Options
  const vietnameseRegionNames = new Intl.DisplayNames(['vi'], { type: 'region' });
  const countries = getData().map(({ code, name }) => ({
    label: vietnameseRegionNames.of(code) || name,
    value: name,
  }));

  // 3 thông số bắt buộc (fix cứng, không xóa được)
  // 9 thông số kỹ thuật bổ sung (tùy chọn thêm)
  const PARAM_OPTIONS = [
    'Vòng quay máy chính (vòng/phút)',
    'Áp suất khí quét (kg/cm²)',
    'Áp suất khí nén (kg/cm²)',
    'Áp suất khí khởi động (kg/cm²)',
    'Nhiệt độ dầu bôi trơn (°C)',
    'Nhiệt độ khí xả XL3 (°C)',
    'Nhiệt độ khí xả XL4 (°C)',
    'Nhiệt độ khí xả XL5 (°C)',
    'Nhiệt độ khí xả XL6 (°C)',
  ];

  const makeRequiredParams = () =>
    REQUIRED_PARAMS.map((name, i) => ({
      _uid: i + 1,
      name,
      minValue: '',
      maxValue: '',
      fixed: true,
    }));

  // Engine & Parameters State
  const [mainEngine, setMainEngine] = useState({
    engineName: '',
    engineType: ENGINE_TYPE.MAIN,
    status: ENGINE_STATUS.OPERATIONAL,
    parameters: makeRequiredParams(),
  });

  const [generatorEngines, setGeneratorEngines] = useState([
    {
      id: 1,
      engineName: '',
      engineType: ENGINE_TYPE.AUXILIARY,
      status: ENGINE_STATUS.OPERATIONAL,
      parameters: makeRequiredParams(),
    },
  ]);



  useEffect(() => {
    if (isEditMode) {
      const fetchVessel = async () => {
        try {
          const data = await vesselService.getById(id);
          setBasicInfo({
            shipName: data.shipName || '',
            imoNumber: data.imoNumber || '',
            flag: data.flag || '',
            status: normalizeShipStatus(data.status),
          });
          if (data.ShipCapacity) {
            setCapacity({
              maxWeight: data.ShipCapacity.maxCargoWeight || '',
              maxVolume: data.ShipCapacity.maxCargoVolume || '',
              minCrew: data.ShipCapacity.minCrew || 10,
              maxCrew: data.ShipCapacity.maxCrew || 25,
            });
          }

          if (data.Engines && data.Engines.length > 0) {
            const me = data.Engines.find(isMainEngine) || data.Engines[0];
            if (me) {
              // Load params từ DB, đánh dấu required
              const dbParams = (me.EngineParameters || []).map((p, i) => ({
                _uid: i + 1,
                id: p.id,
                name: engineParameterLabel(p.name),
                minValue: p.minValue ?? '',
                maxValue: p.maxValue ?? '',
                fixed: REQUIRED_PARAMS.includes(engineParameterLabel(p.name)),
              }));
              // Thêm các required param nếu DB chưa có
              let uid = dbParams.length + 1;
              for (const rp of REQUIRED_PARAMS) {
                if (!dbParams.some((p) => p.name === rp)) {
                  dbParams.unshift({ _uid: uid++, name: rp, minValue: '', maxValue: '', fixed: true });
                }
              }
              setMainEngine({
                id: me.id,
                engineName: engineNameLabel(me.engineName),
                engineType: ENGINE_TYPE.MAIN,
                status: normalizeEngineStatus(me.status),
                parameters: dbParams,
              });
            }

            const gens = data.Engines.filter((e) => e.id !== (me ? me.id : null));
            if (gens.length > 0) {
              setGeneratorEngines(
                gens.map((g) => {
                  const dbParams = (g.EngineParameters || []).map((p, i) => ({
                    _uid: i + 1,
                    id: p.id,
                    name: engineParameterLabel(p.name),
                    minValue: p.minValue ?? '',
                    maxValue: p.maxValue ?? '',
                    fixed: REQUIRED_PARAMS.includes(engineParameterLabel(p.name)),
                  }));
                  let uid = dbParams.length + 1;
                  for (const rp of REQUIRED_PARAMS) {
                    if (!dbParams.some((p) => p.name === rp)) {
                      dbParams.unshift({ _uid: uid++, name: rp, minValue: '', maxValue: '', fixed: true });
                    }
                  }
                  return {
                    id: g.id,
                    engineName: engineNameLabel(g.engineName),
                    engineType: ENGINE_TYPE.AUXILIARY,
                    status: normalizeEngineStatus(g.status),
                    parameters: dbParams,
                  };
                })
              );
            }
          }

          if (data.CargoHolds && data.CargoHolds.length > 0) {
            setHolds(
              data.CargoHolds.map((h) => ({
                id: h.id,
                  name: cargoHoldNameLabel(h.holdName),
                capacity: h.maxCapacity,
              }))
            );
          }

          // Load equipment của tàu nếu edit mode
          try {
            const eqs = await vesselService.getShipEquipments(data.id);
            if (eqs && eqs.length > 0) {
              setShipEquipments(eqs.map((e, i) => ({
                _uid: i + 1,
                id: e.id,
                equipmentName: equipmentNameLabel(e.equipmentName),
                equipmentType: equipmentTypeLabel(e.equipmentType),
                location: equipmentLocationLabel(e.location),
                quantity: e.quantity,
                expiryNote: normalizeEquipmentExpiryDate(e.expiryNote) ?? null,
              })));
            }
          } catch (e) { console.error(e); }

        } catch (error) {
          console.error('Lỗi tải thông tin tàu:', error);
          notifyError('Không thể tải thông tin tàu');
        }
      };
      fetchVessel();
    }
  }, [id, isEditMode]);

  // Handlers
  const handleMainEngineChange = (name, value) => {
    setMainEngine({ ...mainEngine, [name]: value });
  };

  const handleGeneratorEngineChange = (engineId, name, value) => {
    setGeneratorEngines(
      generatorEngines.map((engine) => (engine.id === engineId ? { ...engine, [name]: value } : engine))
    );
  };

  // --- Dynamic Parameters Handlers ---
  const addMainParam = () => {
    const newUid = mainEngine.parameters.length > 0 ? Math.max(...mainEngine.parameters.map((p) => p._uid)) + 1 : 1;
    setMainEngine({
      ...mainEngine,
      parameters: [...mainEngine.parameters, { _uid: newUid, name: '', minValue: '', maxValue: '' }],
    });
  };
  const removeMainParam = (uid) => {
    setMainEngine({ ...mainEngine, parameters: mainEngine.parameters.filter((p) => p._uid !== uid) });
  };
  const handleMainParamChange = (uid, field, value) => {
    setMainEngine({
      ...mainEngine,
      parameters: mainEngine.parameters.map((p) => (p._uid === uid ? { ...p, [field]: value } : p)),
    });
  };

  const addGenParam = (genId) => {
    setGeneratorEngines(
      generatorEngines.map((g) => {
        if (g.id !== genId) return g;
        const newUid = g.parameters.length > 0 ? Math.max(...g.parameters.map((p) => p._uid)) + 1 : 1;
        return { ...g, parameters: [...g.parameters, { _uid: newUid, name: '', minValue: '', maxValue: '' }] };
      })
    );
  };
  const removeGenParam = (genId, uid) => {
    setGeneratorEngines(
      generatorEngines.map((g) => (g.id === genId ? { ...g, parameters: g.parameters.filter((p) => p._uid !== uid) } : g))
    );
  };
  const handleGenParamChange = (genId, uid, field, value) => {
    setGeneratorEngines(
      generatorEngines.map((g) =>
        g.id === genId ? { ...g, parameters: g.parameters.map((p) => (p._uid === uid ? { ...p, [field]: value } : p)) } : g
      )
    );
  };

  const addGeneratorEngine = () => {
    const newId = generatorEngines.length > 0 ? Math.max(...generatorEngines.map((e) => e.id)) + 1 : 1;
    setGeneratorEngines([
      ...generatorEngines,
      {
        id: newId,
        engineName: '',
        engineType: ENGINE_TYPE.AUXILIARY,
        status: ENGINE_STATUS.OPERATIONAL,
        parameters: makeRequiredParams(),
      },
    ]);
  };

  const removeGeneratorEngine = (engineId) => {
    setGeneratorEngines(generatorEngines.filter((e) => e.id !== engineId));
  };

  const addHold = () => {
    const newId = holds.length > 0 ? Math.max(...holds.map((h) => h.id)) + 1 : 1;
    setHolds([...holds, { id: newId, name: '', capacity: '' }]);
  };

  const handleHoldChange = (holdId, name, value) => {
    setHolds(holds.map((h) => (h.id === holdId ? { ...h, [name]: value } : h)));
  };

  const removeHold = (holdId) => {
    setHolds(holds.filter((h) => h.id !== holdId));
  };

  // ===== Ship Equipment Handlers =====
  // ===== Excel Import cho Thiết bị tàu =====
  const downloadVesselEqTemplate = () => {
    const rows = [
      ['Tên thiết bị', 'Loại thiết bị', 'Vị trí', 'Số lượng', 'Hạn sử dụng (YYYY-MM-DD hoặc Không có hạn sử dụng)'],
      // Thiết bị cứu sinh
      ['Áo phao cá nhân', 'Thiết bị cứu sinh', 'Boong', 20, '2028-12-31'],
      ['Phao tròn cứu sinh', 'Thiết bị cứu sinh', 'Boong', 6, '2028-12-31'],
      ['Bè cứu sinh tự bơm', 'Thiết bị cứu sinh', 'Boong', 2, '2027-06-30'],
      ['Pháo hiệu tín hiệu', 'Thiết bị cứu sinh', 'Buồng lái', 12, '2027-06-30'],
      ['Đèn cứu sinh cá nhân', 'Thiết bị cứu sinh', 'Boong', 20, '2028-12-31'],
      // Thiết bị chữa cháy
      ['Bình chữa cháy CO2', 'Thiết bị chữa cháy', 'Buồng máy', 4, '2027-06-30'],
      ['Bình chữa cháy bột BC', 'Thiết bị chữa cháy', 'Boong', 6, '2027-06-30'],
      ['Bình chữa cháy bột AFFF', 'Thiết bị chữa cháy', 'Buồng máy', 2, '2027-06-30'],
      ['Vòi rồng chữa cháy 15m', 'Thiết bị chữa cháy', 'Boong', 4, 'Không có hạn sử dụng'],
      ['Bộ đồ phòng cháy chữa cháy', 'Thiết bị chữa cháy', 'Buồng lái', 2, 'Không có hạn sử dụng'],
      // Thiết bị hàng hải
      ['La bàn từ', 'Thiết bị hàng hải', 'Buồng lái', 1, '2031-12-31'],
      ['Ra-đa hàng hải ARPA', 'Thiết bị hàng hải', 'Buồng lái', 1, '2031-12-31'],
      ['Hệ thống AIS', 'Thiết bị hàng hải', 'Buồng lái', 1, '2031-12-31'],
      ['GPS định vị', 'Thiết bị hàng hải', 'Buồng lái', 2, 'Không có hạn sử dụng'],
      // Thiết bị liên lạc
      ['Máy thu phát VHF cầm tay', 'Thiết bị liên lạc', 'Buồng lái', 4, '2029-12-31'],
      ['Hệ thống GMDSS', 'Thiết bị liên lạc', 'Buồng lái', 1, '2031-12-31'],
      ['Còi tín hiệu điện', 'Thiết bị liên lạc', 'Buồng lái', 1, 'Không có hạn sử dụng'],
      // Dụng cụ sửa chữa
      ['Bộ dụng cụ cơ khí (búa, cờ lê, tua vít...)', 'Dụng cụ sửa chữa', 'Buồng máy', 2, 'Không có hạn sử dụng'],
      ['Máy hàn điện', 'Dụng cụ sửa chữa', 'Buồng máy', 1, 'Không có hạn sử dụng'],
      ['Bơm tay chống đắm', 'Dụng cụ sửa chữa', 'Buồng máy', 2, 'Không có hạn sử dụng'],
      ['Bộ vá lỗ khẩn cấp', 'Dụng cụ sửa chữa', 'Buồng máy', 1, 'Không có hạn sử dụng'],
      // Ghi chú các loại/vị trí hợp lệ
      ['', `Loại: ${SHIP_EQ_TYPES.join(' / ')}`, `Vị trí: ${SHIP_EQ_LOCATIONS.join(' / ')}`, '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 38 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ThietBiTau');
    XLSX.writeFile(wb, 'mau-thiet-bi-tau.xlsx');
  };

  const handleImportVesselEq = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // header:1 → mảng thô, defval:'' → ô trống thành chuỗi rỗng
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Bỏ dòng tiêu đề (dòng 0); các cột thừa (> cột E) tự bị bỏ qua vì chỉ đọc index 0-4
        const dataRows = rows.slice(1);
        const nonEmptyRows = dataRows.filter(r => String(r[0] || '').trim());

        if (nonEmptyRows.length === 0) {
          message.warning('Tệp không có dữ liệu hoặc sai định dạng!');
          return;
        }

        const errors = [];   // thu thập lỗi theo dòng
        const imported = [];
        const startUid = shipEquipments.length > 0
          ? Math.max(...shipEquipments.map(eq => eq._uid)) + 1 : 1;
        const seenEquipmentKeys = new Set(
          shipEquipments.map((equipment) => equipmentIdentityKey(equipment, true)),
        );

        nonEmptyRows.forEach((r, i) => {
          const rowNum = i + 2; // +2 vì dòng 1 là header
          const rowErrors = [];

          // --- Cột A: Tên thiết bị (bắt buộc, tối đa 255 ký tự) ---
          const equipmentName = String(r[0] || '').trim();
          if (!equipmentName) {
            rowErrors.push('Tên thiết bị không được để trống');
          } else if (equipmentName.length > 255) {
            rowErrors.push('Tên thiết bị quá dài (tối đa 255 ký tự)');
          }

          // --- Cột B: Loại thiết bị (phải thuộc danh sách cho phép) ---
          const rawType = String(r[1] || '').trim();
          let equipmentType = '';
          if (rawType && !SHIP_EQ_TYPES.includes(rawType)) {
            rowErrors.push(`Loại thiết bị "${rawType}" không hợp lệ (cho phép: ${SHIP_EQ_TYPES.join(', ')})`);
          } else {
            equipmentType = rawType;
          }

          // --- Cột C: Vị trí (phải thuộc danh sách cho phép, mặc định 'Boong') ---
          const rawLocation = String(r[2] || '').trim();
          let location = 'Boong';
          if (rawLocation && !SHIP_EQ_LOCATIONS.includes(rawLocation)) {
            rowErrors.push(`Vị trí "${rawLocation}" không hợp lệ (cho phép: ${SHIP_EQ_LOCATIONS.join(', ')})`);
          } else if (rawLocation) {
            location = rawLocation;
          }

          // --- Cột D: Số lượng (số nguyên dương) ---
          const rawQty = r[3];
          const qty = Number(rawQty);
          let quantity = 1;
          if (rawQty !== '' && rawQty !== null) {
            if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty) || qty > MAX_EQUIPMENT_QUANTITY) {
              rowErrors.push(`Số lượng "${rawQty}" không hợp lệ (phải là số nguyên từ 1 đến ${MAX_EQUIPMENT_QUANTITY.toLocaleString('vi-VN')})`);
            } else {
              quantity = qty;
            }
          }

          // --- Cột E: Hạn sử dụng YYYY-MM-DD hoặc "Không có hạn sử dụng" ---
          const expiryNote = parseExcelExpiryDate(r[4]);
          if (expiryNote === undefined) {
            rowErrors.push('Hạn sử dụng không hợp lệ (dùng YYYY-MM-DD hoặc Không có hạn sử dụng)');
          } else if (!isEquipmentExpiryAllowed(expiryNote)) {
            rowErrors.push('Hạn sử dụng phải sau ngày hiện tại hoặc chọn Không có hạn sử dụng');
          }

          const candidate = {
            equipmentName,
            equipmentType: equipmentType || 'Khác',
          };
          const candidateKey = equipmentIdentityKey(candidate, true);
          if (equipmentName && seenEquipmentKeys.has(candidateKey)) {
            rowErrors.push('Tên và loại thiết bị bị trùng với thiết bị khác');
          }

          if (rowErrors.length > 0) {
            errors.push({ rowNum, rowErrors });
          } else {
            seenEquipmentKeys.add(candidateKey);
            imported.push({ _uid: startUid + imported.length, equipmentName, equipmentType, location, quantity, expiryNote });
          }
        });

        // Hiển thị lỗi nếu có
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
          setShipEquipments(prev => [...prev, ...imported]);
          message.success(`Đã nhập ${imported.length} thiết bị hợp lệ${errors.length > 0 ? `, bỏ qua ${errors.length} dòng lỗi` : ''}!`);
        } else {
          message.error('Không có dòng nào hợp lệ để nhập. Vui lòng kiểm tra lại tệp!');
        }
      } catch {
        message.error('Không đọc được tệp. Hãy kiểm tra đúng định dạng xlsx/xls.');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const addShipEquipment = () => {
    const newUid = shipEquipments.length > 0 ? Math.max(...shipEquipments.map(e => e._uid)) + 1 : 1;
    setShipEquipments([...shipEquipments, { _uid: newUid, equipmentName: '', equipmentType: '', location: 'Boong', quantity: 1, expiryNote: null }]);
  };
  const removeShipEquipment = (uid) => {
    setShipEquipments(shipEquipments.filter(e => e._uid !== uid));
  };
  const handleShipEquipChange = (uid, field, value) => {
    setShipEquipments(shipEquipments.map(e => e._uid === uid ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async () => {
    // Validation: Các trường bắt buộc
    if (!basicInfo.shipName || !basicInfo.imoNumber) {
      setActiveTab('basic');
      notifyWarning('Vui lòng nhập đầy đủ Tên tàu và Mã số IMO.');
      return;
    }

    if (!/^\d{7}$/.test(basicInfo.imoNumber)) {
      setActiveTab('basic');
      notifyWarning('Mã số IMO phải bao gồm chính xác 7 chữ số.');
      return;
    }

    const maxWeight = Number(capacity.maxWeight);
    const maxVolume = Number(capacity.maxVolume);
    if (!Number.isFinite(maxWeight) || maxWeight <= 0 || maxWeight > MAX_CAPACITY_VALUE
      || !Number.isFinite(maxVolume) || maxVolume <= 0 || maxVolume > MAX_CAPACITY_VALUE) {
      setActiveTab('capacity');
      notifyWarning(`Tải trọng tối đa và thể tích tối đa phải từ 0,01 đến ${MAX_CAPACITY_VALUE.toLocaleString('vi-VN')}.`);
      return;
    }

    if (!mainEngine.engineName || !mainEngine.engineName.trim()) {
      setActiveTab('engine');
      notifyWarning('Vui lòng nhập Tên động cơ cho Máy chính.');
      return;
    }

    // Validation: Thông số an toàn bắt buộc cho máy chính
    const missingMainParams = mainEngine.parameters.filter(p => p.fixed && (p.maxValue === '' || p.maxValue === null));
    if (missingMainParams.length > 0) {
      setActiveTab('engine');
      notifyWarning(`Vui lòng nhập đủ các hạn mức chỉ số an toàn bắt buộc cho Máy chính.`);
      return;
    }

    // Validation: Thông số an toàn bắt buộc cho máy đèn
    for (const gen of generatorEngines) {
      if (!gen.engineName || !gen.engineName.trim()) {
        setActiveTab('engine');
        notifyWarning(`Vui lòng nhập Tên máy cho các máy đèn.`);
        return;
      }
      const missingGenParams = gen.parameters.filter(p => p.fixed && (p.maxValue === '' || p.maxValue === null));
      if (missingGenParams.length > 0) {
        setActiveTab('engine');
        notifyWarning(`Vui lòng nhập đủ các hạn mức chỉ số an toàn bắt buộc cho máy phụ (${gen.engineName || 'chưa có tên'}).`);
        return;
      }
    }

    const duplicateEngine = findDuplicateEngine([mainEngine, ...generatorEngines]);
    if (duplicateEngine) {
      setActiveTab('engine');
      notifyWarning(`Tên máy "${duplicateEngine.engineName.trim()}" bị trùng. Mỗi máy trên tàu phải có tên riêng.`);
      return;
    }

    // Validation: Phải có ít nhất 1 khoang hàng và thông tin hợp lệ
    if (!holds || holds.length === 0) {
      setActiveTab('capacity');
      notifyWarning('Vui lòng thêm ít nhất một khoang chứa hàng cho tàu.');
      return;
    }
    const invalidHolds = holds.filter((hold) => {
      const holdCapacity = Number(hold.capacity);
      return !String(hold.name || '').trim()
        || String(hold.name).trim().length > MAX_NAME_LENGTH
        || !Number.isInteger(holdCapacity)
        || holdCapacity <= 0
        || holdCapacity > MAX_CAPACITY_VALUE;
    });
    if (invalidHolds.length > 0) {
      setActiveTab('capacity');
      notifyWarning(`Tên khoang không được vượt quá ${MAX_NAME_LENGTH} ký tự; sức chứa phải là số nguyên từ 1 đến ${MAX_CAPACITY_VALUE.toLocaleString('vi-VN')} m³.`);
      return;
    }

    // Validation: Tổng thể tích khoang KHÔNG ĐƯỢC VƯỢT QUÁ Thể tích Max của tàu
    if (holds && holds.length > 0 && capacity && capacity.maxVolume) {
      const totalHoldsVolume = holds.reduce((sum, h) => sum + (parseFloat(h.capacity) || 0), 0);
      const shipMaxVolume = parseFloat(capacity.maxVolume) || 0;

      if (totalHoldsVolume > shipMaxVolume) {
        setActiveTab('capacity');
        notifyWarning(
          `Tổng thể tích các khoang (${totalHoldsVolume.toLocaleString()} m³) đang vượt quá thể tích tối đa của tàu (${shipMaxVolume.toLocaleString()} m³). Vui lòng phân bổ lại sức chứa khoang hàng cho hợp lý!`,
          5
        );
        return; // Dừng việc submit
      }
    }

    // Validate thiết bị tàu
    if (shipEquipments.length === 0) {
      setActiveTab('equipment');
      notifyWarning('Tàu chưa có thiết bị nào! Vui lòng thêm ít nhất 5 loại thiết bị trước khi lưu.');
      return;
    }
    if (shipEquipments.length < 5) {
      setActiveTab('equipment');
      notifyWarning(`Hiện chỉ có ${shipEquipments.length} thiết bị. Nên bổ sung ít nhất 5 loại!`);
      return;
    }
    const invalidEqs = shipEquipments.filter((equipment) => {
      const name = String(equipment.equipmentName || '').trim();
      return !name || name.length > MAX_NAME_LENGTH;
    });
    if (invalidEqs.length > 0) {
      setActiveTab('equipment');
      notifyWarning(`Tên thiết bị là bắt buộc và không được vượt quá ${MAX_NAME_LENGTH} ký tự.`);
      return;
    }
    const invalidQuantityEqs = shipEquipments.filter((equipment) => {
      const quantity = Number(equipment.quantity);
      return !Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_EQUIPMENT_QUANTITY;
    });
    if (invalidQuantityEqs.length > 0) {
      setActiveTab('equipment');
      notifyWarning(`Số lượng thiết bị phải là số nguyên từ 1 đến ${MAX_EQUIPMENT_QUANTITY.toLocaleString('vi-VN')}.`);
      return;
    }
    const duplicateEquipment = findDuplicateEquipment(
      shipEquipments.map((equipment) => ({
        ...equipment,
        equipmentType: equipment.equipmentType || 'Khác',
      })),
      true,
    );
    if (duplicateEquipment) {
      setActiveTab('equipment');
      notifyWarning(`Thiết bị "${duplicateEquipment.equipmentName.trim()}" bị trùng tên và loại thiết bị.`);
      return;
    }
    const invalidExpiryEquipment = shipEquipments.find(
      (equipment) => normalizeEquipmentExpiryDate(equipment.expiryNote) === undefined,
    );
    if (invalidExpiryEquipment) {
      setActiveTab('equipment');
      notifyWarning(`Hạn sử dụng của thiết bị "${invalidExpiryEquipment.equipmentName.trim()}" không hợp lệ.`);
      return;
    }
    const nonFutureExpiryEquipment = shipEquipments.find(
      (equipment) => !isEquipmentExpiryAllowed(equipment.expiryNote),
    );
    if (nonFutureExpiryEquipment) {
      setActiveTab('equipment');
      notifyWarning(`Hạn sử dụng của thiết bị "${nonFutureExpiryEquipment.equipmentName.trim()}" phải sau ngày hiện tại hoặc chọn Không có hạn sử dụng.`);
      return;
    }

    try {
      // Truyền id vào để backend phân biệt record cần UPDATE vs CREATE mới
      const normalizedEquipments = shipEquipments.map(e => ({
        ...(e.id ? { id: e.id } : {}),
        equipmentName: e.equipmentName.trim(),
        equipmentType: e.equipmentType || 'Khác',
        location: e.location || 'Boong',
        quantity: Number(e.quantity),
        expiryNote: normalizeEquipmentExpiryDate(e.expiryNote),
      }));
      const payload = {
        basicInfo,
        capacity,
        mainEngine,
        generatorEngines,
        holds,
        equipmentList: normalizedEquipments,
      };

      if (isEditMode) {
        await vesselService.update(id, payload);
        notifySuccess('Cập nhật thông tin tàu thành công!');
      } else {
        await vesselService.create(payload);
        notifySuccess('Thêm tàu mới thành công!');
      }
      navigate('/vessels');
    } catch (error) {
      console.error('Lỗi lưu tàu:', error);
      notifyError(
        error?.response?.data?.message
        || error?.message
        || 'Có lỗi hệ thống xảy ra khi lưu thông tin tàu. Vui lòng thử lại sau.'
      );
    }
  };

  // Render label cho 3 thông số bắt buộc
  const requiredParamLabel = (name) => {
    if (name === 'Áp suất dầu nhiên liệu (kg/cm²)')
      return (
        <Space size={4}>
          <DashboardOutlined /> Áp suất dầu nhiên liệu
        </Space>
      );
    if (name === 'Nhiệt độ khí xả XL2 (°C)')
      return (
        <Space size={4}>
          <FireOutlined /> Nhiệt độ khí xả XL2
        </Space>
      );
    return (
      <Space size={4}>
        <CloudOutlined /> Nhiệt độ nước làm mát
      </Space>
    );
  };

  const requiredParamPlaceholder = (name) =>
    name === 'Áp suất dầu nhiên liệu (kg/cm²)' ? 'VD: 6.0' : name === 'Nhiệt độ khí xả XL2 (°C)' ? 'VD: 420' : 'VD: 75';

  // Render khối thông số cho 1 động cơ (dùng chung cho máy chính & máy đèn)
  const renderParameters = (params, onChange, onAdd, onRemove) => {
    const fixedParams = params.filter((p) => p.fixed);
    const extraParams = params.filter((p) => !p.fixed);
    return (
      <div style={{ background: '#edf4fa', padding: 16, borderRadius: 8, border: '1px solid #b8cde2' }}>
        <Text strong>Hạn mức chỉ số an toàn (Bắt buộc)</Text>
        <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
          Mức bên dưới chỉ để tham khảo theo cấu hình mẫu; khi khai báo tàu thật, hãy dùng hạn mức trong tài liệu kỹ thuật của nhà sản xuất máy.
        </Text>
        <Row gutter={12} style={{ marginTop: 8 }}>
          {fixedParams.map((param) => (
            <Col xs={24} sm={8} key={param._uid}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>{requiredParamLabel(param.name)} {requiredTag}</div>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={getParamMax(param.name)}
                placeholder={requiredParamPlaceholder(param.name)}
                value={param.maxValue === '' ? null : param.maxValue}
                onChange={(value) => onChange(param._uid, 'maxValue', value ?? '')}
              />
              <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                Mức tối đa tham khảo: {engineParameterTypicalMax(param.name)}
              </Text>
            </Col>
          ))}
        </Row>

        <Divider style={{ margin: '16px 0' }} dashed />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong>Thông số bổ sung ({extraParams.length})</Text>
          <Button type="link" size="small" icon={<PlusOutlined />} onClick={onAdd}>
            Thêm thông số
          </Button>
        </div>
        {extraParams.length === 0 && (
          <Text type="secondary" italic>
            Chưa có thông số bổ sung nào.
          </Text>
        )}
        {extraParams.map((param) => (
          <Row gutter={8} key={param._uid} style={{ marginBottom: 8 }} align="middle">
            <Col flex="2">
              <Select
                style={{ width: '100%' }}
                placeholder="-- Chọn thông số --"
                value={param.name || undefined}
                onChange={(value) => onChange(param._uid, 'name', value)}
                options={PARAM_OPTIONS.map((opt) => ({
                  label: opt,
                  value: opt,
                  disabled: params.some((p) => p._uid !== param._uid && p.name === opt),
                }))}
              />
            </Col>
            <Col flex="1">
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Giá trị tối đa"
                min={0}
                max={getParamMax(param.name)}
                value={param.maxValue === '' ? null : param.maxValue}
                onChange={(value) => onChange(param._uid, 'maxValue', value ?? '')}
              />
              {param.name && (
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                  Tham khảo: {engineParameterTypicalMax(param.name)}
                </Text>
              )}
            </Col>
            <Col>
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(param._uid)} />
            </Col>
          </Row>
        ))}
      </div>
    );
  };



  // Máy chính mới bắt buộc Hoạt động; máy phụ mới cho phép Hoạt động hoặc Dự phòng.
  // Máy đã tồn tại chỉ hiển thị trạng thái; việc thay đổi thực hiện tại trang Quản lý máy.
  const newAuxiliaryEngineStatusOptions = ENGINE_STATUS_OPTIONS
    .filter(({ value }) => value !== ENGINE_STATUS.MAINTENANCE)
    .map(({ label, value }) => ({ label, value }));
  const newMainEngineStatusOptions = ENGINE_STATUS_OPTIONS
    .filter(({ value }) => value === ENGINE_STATUS.OPERATIONAL)
    .map(({ label, value }) => ({ label, value }));
  const existingEngineStatusOptions = ENGINE_STATUS_OPTIONS
    .map(({ label, value }) => ({ label, value }));
  const engineStatusOptionsFor = (engine) => (
    engine?.id
      ? existingEngineStatusOptions
      : (isMainEngine(engine) ? newMainEngineStatusOptions : newAuxiliaryEngineStatusOptions)
  );

  return (
    <AdminLayout>
      <div style={{ padding: '16px' }}>
        <Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
          {isEditMode ? 'Cập nhật Thông tin Tàu' : 'Thêm Tàu Mới'}
        </Title>

        <Tabs
          type="card"
          size="large"
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'basic',
              label: 'Thông tin cơ bản',
              children: (
            <Card
              title={
                <Space>
                  <InfoCircleOutlined /> THÔNG TIN CƠ BẢN
                </Space>
              }
            >
              <Row gutter={16}>
                <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, fontWeight: 600 }}>
                    Tên Tàu {requiredTag}
                  </div>
                  <Input
                    placeholder="Ví dụ: Hải Trình Biển Đông"
                    value={basicInfo.shipName}
                    onChange={(e) => setBasicInfo({ ...basicInfo, shipName: e.target.value })}
                  />
                </Col>
                <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, fontWeight: 600 }}>
                    Mã số IMO {requiredTag}
                  </div>
                  <Input
                    placeholder="VD: 1234567"
                    maxLength={7}
                    value={basicInfo.imoNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setBasicInfo({ ...basicInfo, imoNumber: val });
                    }}
                  />
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 4 }}>Quốc tịch / Quốc kỳ</div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Chọn quốc gia treo cờ (có thể tìm kiếm)"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={basicInfo.flag || undefined}
                    onChange={(value) => setBasicInfo({ ...basicInfo, flag: value || '' })}
                    options={countries.length > 0 ? countries : [
                      { label: 'Việt Nam', value: 'Vietnam' },
                      { label: 'Panama', value: 'Panama' },
                      { label: 'Liberia', value: 'Liberia' },
                    ]}
                  />
                </Col>
                <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 4 }}>Trạng thái hiện tại</div>
                  <Select
                    style={{ width: '100%' }}
                    value={basicInfo.status}
                    onChange={(value) => setBasicInfo({ ...basicInfo, status: value })}
                    options={[
                      { label: 'Hoạt động', value: 'Hoạt động' },
                      { label: 'Bảo trì', value: 'Bảo trì' },
                      { label: 'Ngừng hoạt động', value: 'Ngừng hoạt động' },
                    ]}
                  />
                </Col>
              </Row>
            </Card>
              ),
            },
            {
              key: 'engine',
              label: 'Máy và thông số',
              children: (
            <Card
              title={
                <Space>
                  <SettingOutlined /> THÔNG SỐ KỸ THUẬT VÀ THIẾT BỊ
                </Space>
              }
            >
              {/* Main Engine Section */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Máy chính
                  </Title>
                  <Tag color="blue">YÊU CẦU</Tag>
                </div>

                <Row gutter={16}>
                  <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 6, fontWeight: 600 }}>Tên động cơ {requiredTag}</div>
                    <Input
                      placeholder="Wärtsilä 14RT"
                      maxLength={255}
                      showCount
                      value={mainEngine.engineName}
                      onChange={(e) => handleMainEngineChange('engineName', e.target.value)}
                    />
                  </Col>
                  <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 4 }}>Trạng thái</div>
                    <Select
                      style={{ width: '100%' }}
                      value={mainEngine.status}
                      onChange={(value) => handleMainEngineChange('status', value)}
                      options={engineStatusOptionsFor(mainEngine)}
                      disabled
                    />
                  </Col>
                </Row>

                {renderParameters(
                  mainEngine.parameters,
                  handleMainParamChange,
                  addMainParam,
                  removeMainParam
                )}
              </div>

              <Divider />

              {/* Máy phụ */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Máy phụ
                  </Title>
                  <Button type="link" icon={<PlusOutlined />} onClick={addGeneratorEngine}>
                    Thêm máy phụ
                  </Button>
                </div>

                {generatorEngines.map((gen, index) => (
                  <div
                    key={gen.id}
                    style={{
                      marginBottom: 24,
                      paddingBottom: 16,
                      borderBottom: index < generatorEngines.length - 1 ? '1px dashed #cbd5e1' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text strong>Máy phụ số {index + 1}</Text>
                      {generatorEngines.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeGeneratorEngine(gen.id)}
                        />
                      )}
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                        <div style={{ marginBottom: 6, fontWeight: 600 }}>Tên máy {requiredTag}</div>
                        <Input
                          placeholder="Caterpillar C32"
                          maxLength={255}
                          showCount
                          value={gen.engineName}
                          onChange={(e) => handleGeneratorEngineChange(gen.id, 'engineName', e.target.value)}
                        />
                      </Col>
                      <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                        <div style={{ marginBottom: 4 }}>Trạng thái</div>
                        <Select
                          style={{ width: '100%' }}
                          value={gen.status}
                          onChange={(value) => handleGeneratorEngineChange(gen.id, 'status', value)}
                          options={engineStatusOptionsFor(gen)}
                          disabled={Boolean(gen.id)}
                        />
                      </Col>
                    </Row>

                    {renderParameters(
                      gen.parameters,
                      (uid, field, value) => handleGenParamChange(gen.id, uid, field, value),
                      () => addGenParam(gen.id),
                      (uid) => removeGenParam(gen.id, uid)
                    )}
                  </div>
                ))}
              </div>


            </Card>
              ),
            },
            {
              key: 'capacity',
              label: 'Sức chứa và khoang hàng',
              children: (
            <Card
              title={
                <Space>
                  <InboxOutlined /> SỨC CHỨA VÀ TẢI TRỌNG
                </Space>
              }
            >
              <Row gutter={16}>
                <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, fontWeight: 600 }}>Tải trọng tối đa (Tấn) {requiredTag}</div>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.01}
                    max={MAX_CAPACITY_VALUE}
                    placeholder="50000"
                    value={capacity.maxWeight === '' ? null : capacity.maxWeight}
                    onChange={(value) => setCapacity({ ...capacity, maxWeight: value ?? '' })}
                  />
                </Col>
                <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, fontWeight: 600 }}>Thể tích tối đa (m³) {requiredTag}</div>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.01}
                    max={MAX_CAPACITY_VALUE}
                    placeholder="75000"
                    value={capacity.maxVolume === '' ? null : capacity.maxVolume}
                    onChange={(value) => setCapacity({ ...capacity, maxVolume: value ?? '' })}
                  />
                </Col>
              </Row>

              <div style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 4 }}>Số thủy thủ (Tối thiểu - Tối đa)</div>
                <Row align="middle" gutter={12}>
                  <Col flex="auto">
                    <Slider
                      range
                      min={1}
                      max={100}
                      value={[Number(capacity.minCrew), Number(capacity.maxCrew)]}
                      onChange={(value) => setCapacity({ ...capacity, minCrew: value[0], maxCrew: value[1] })}
                    />
                  </Col>
                  <Col>
                    <Text strong>{capacity.minCrew} - {capacity.maxCrew}</Text>
                  </Col>
                </Row>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text strong>Khoang chứa hàng</Text>
                  <Button type="link" icon={<PlusOutlined />} onClick={addHold}>
                    Thêm khoang
                  </Button>
                </div>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {holds.map((hold) => (
                    <div
                      key={hold.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 12,
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Input
                          style={{ fontWeight: 600, marginBottom: 8 }}
                          placeholder="Tên khoang..."
                          maxLength={MAX_NAME_LENGTH}
                          showCount
                          value={hold.name}
                          onChange={(e) => handleHoldChange(hold.id, 'name', e.target.value)}
                        />
                        <Space size={4}>
                          <Text type="secondary">Sức chứa:</Text>
                          <InputNumber
                            style={{ width: 120 }}
                            min={1}
                            max={MAX_CAPACITY_VALUE}
                            step={1}
                            precision={0}
                            placeholder="10000"
                            value={hold.capacity === '' ? null : hold.capacity}
                            onChange={(value) => handleHoldChange(hold.id, 'capacity', value ?? '')}
                          />
                          <Text type="secondary">m³</Text>
                        </Space>
                      </div>
                      <Space direction="vertical" align="center">
                        <Tag color="green">TRỐNG</Tag>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeHold(hold.id)} />
                      </Space>
                    </div>
                  ))}
                </Space>
              </div>
            </Card>
              ),
            },
            {
              key: 'equipment',
              label: 'Thiết bị của tàu',
              children: (
        <Card
          title={<Space><ToolOutlined /><span>Thiết bị của tàu</span></Space>}
          extra={
            <Space size="small">
              <Tooltip title="Tải tệp Excel mẫu về, điền dữ liệu rồi nhập lên">
                <Button size="small" icon={<DownloadOutlined />} onClick={downloadVesselEqTemplate}>
                  Tải mẫu
                </Button>
              </Tooltip>
              <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleImportVesselEq}>
                <Button size="small" icon={<UploadOutlined />}>Nhập từ Excel</Button>
              </Upload>
              <Button type="link" icon={<PlusOutlined />} onClick={addShipEquipment}>Thêm thiết bị</Button>
            </Space>
          }
        >
          {shipEquipments.length === 0 ? (
            <Empty description="Chưa có thiết bị nào. Nhấn &lsquo;Thêm thiết bị&rsquo; để bắt đầu." />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {shipEquipments.map((eq) => (
                <div key={eq._uid} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fafbfc' }}>
                  <div style={{ flex: '2 1 200px', minWidth: 150 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Tên thiết bị <span style={{ color: 'red' }}>*</span></div>
                    <Input placeholder="VD: Áo phao cá nhân, ra-đa, bình chữa cháy..." value={eq.equipmentName}
                      maxLength={MAX_NAME_LENGTH}
                      showCount
                      onChange={e => handleShipEquipChange(eq._uid, 'equipmentName', e.target.value)} />
                  </div>
                  <div style={{ flex: '1 1 130px', minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Loại</div>
                    <Select style={{ width: '100%' }} value={eq.equipmentType || undefined} placeholder="Chọn loại"
                      onChange={v => handleShipEquipChange(eq._uid, 'equipmentType', v)}
                      options={SHIP_EQ_TYPES.map(t => ({ value: t, label: t }))} />
                  </div>
                  <div style={{ flex: '0 1 120px', minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Vị trí</div>
                    <Select style={{ width: '100%' }} value={eq.location || 'Boong'}
                      onChange={v => handleShipEquipChange(eq._uid, 'location', v)}
                      options={SHIP_EQ_LOCATIONS.map(l => ({ value: l, label: l }))} />
                  </div>
                  <div style={{ flex: '0 1 90px', minWidth: 80 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Số lượng <span style={{ color: 'red' }}>*</span></div>
                    <InputNumber min={1} max={MAX_EQUIPMENT_QUANTITY} step={1} precision={0} style={{ width: '100%' }} value={eq.quantity || 1}
                      onChange={v => handleShipEquipChange(eq._uid, 'quantity', v)} />
                  </div>
                  <div style={{ flex: '1 1 150px', minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Hạn sử dụng</div>
                    <DatePicker
                      style={{ width: '100%' }}
                      format="DD/MM/YYYY"
                      placeholder="Chọn ngày hết hạn"
                      value={eq.expiryNote ? dayjs(eq.expiryNote, 'YYYY-MM-DD') : null}
                      disabled={!eq.expiryNote}
                      disabledDate={(current) => current && !current.isAfter(dayjs(), 'day')}
                      onChange={(date) => handleShipEquipChange(
                        eq._uid,
                        'expiryNote',
                        date ? date.format('YYYY-MM-DD') : null,
                      )}
                    />
                    <Checkbox
                      style={{ marginTop: 4, fontSize: 11 }}
                      checked={!eq.expiryNote}
                      onChange={(event) => handleShipEquipChange(
                        eq._uid,
                        'expiryNote',
                        event.target.checked ? null : dayjs().add(1, 'year').format('YYYY-MM-DD'),
                      )}
                    >
                      Không có hạn sử dụng
                    </Checkbox>
                  </div>
                  <div style={{ paddingTop: 22 }}>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeShipEquipment(eq._uid)} />
                  </div>
                </div>
              ))}
            </Space>
          )}
        </Card>
              ),
            },
          ]}
        />

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button onClick={() => navigate(-1)}>Hủy bỏ</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
            Lưu hồ sơ tàu
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
