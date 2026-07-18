import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Select, Input, InputNumber, Button, Table, Card, Spin, Empty, Typography, Space, Alert, DatePicker, Upload, Modal, Image, Timeline, Tag, Row, Col } from 'antd';
import { FileTextOutlined, SaveOutlined, ClockCircleOutlined, CompassOutlined, CalendarOutlined, UploadOutlined, EditOutlined, HistoryOutlined, PictureOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { deckLogService, voyageService } from '../services/api';
import { PageHeader, notifyWarning, notifySuccess, notifyError } from '../components/common';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ===== Cấu hình 16 cột thông số =====
const ENTRY_FIELDS = [
  { key: 'courseTrue', label: 'Hướng đi Thật', short: 'HĐ Thật', type: 'number', max: 360 },
  { key: 'courseGyro', label: 'LBCQ', short: 'LBCQ', type: 'number', max: 360 },
  { key: 'courseSteer', label: 'LB Lái', short: 'LB Lái', type: 'number', max: 360 },
  { key: 'gyroError', label: 'Sai số LBCQ', short: 'SS LBCQ', type: 'number' },
  { key: 'courseMagnetic', label: 'LB Từ', short: 'LB Từ', type: 'number', max: 360 },
  { key: 'speed', label: 'Tốc độ (Knots)', short: 'Tốc độ', type: 'number' },
  { key: 'rpm', label: 'RPM', short: 'RPM', type: 'number' },
  { key: 'windDirection', label: 'Hướng gió', short: 'H.Gió', type: 'select', options: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'C'] },
  { key: 'windForce', label: 'Sức gió (Bf)', short: 'S.Gió', type: 'number', max: 12 },
  { key: 'weather', label: 'Thời tiết', short: 'T.Tiết', type: 'select', options: ['bc', 'br', 'c', 'f', 'g', 'h', 'o', 'p', 'q', 'r', 's'] },
  { key: 'barometer', label: 'Khí áp (mb)', short: 'Khí áp', type: 'number' },
  { key: 'seaState', label: 'Biển', short: 'Biển', type: 'number', max: 9 },
  { key: 'visibility', label: 'Tầm nhìn (NM)', short: 'Tầm nhìn', type: 'number' },
  { key: 'airTemp', label: 'Nhiệt độ KK (°C)', short: 'T° KK', type: 'number' },
  { key: 'seaTemp', label: 'Nhiệt độ Biển (°C)', short: 'T° Biển', type: 'number' },
];

// Nhóm field theo vị trí ca trực
const HELMSMAN_FIELDS = ['courseTrue', 'courseGyro', 'courseSteer', 'gyroError', 'courseMagnetic', 'speed', 'rpm'];
const LOOKOUT_FIELDS = ['windDirection', 'windForce', 'weather', 'barometer', 'seaState', 'visibility', 'airTemp', 'seaTemp'];

// Tính các giờ thuộc ca trực (VD: ca 00:00-04:00 → giờ 1,2,3,4)
const getShiftHours = (shift) => {
  if (!shift) return [];
  const st = new Date(shift.startTime);
  const et = new Date(shift.endTime);
  const startH = st.getHours();
  const endH = et.getHours() === 0 ? 24 : et.getHours();
  const hours = [];
  for (let h = startH + 1; h <= endH; h++) {
    hours.push(h);
  }
  return hours;
};

// Tạo dòng trống cho mỗi giờ
const createEmptyRow = (hour) => {
  const row = { hour };
  ENTRY_FIELDS.forEach(f => { row[f.key] = null; });
  return row;
};

export default function DeckLogPage() {
  const [voyages, setVoyages] = useState([]);
  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fileList, setFileList] = useState([]);
  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editEntries, setEditEntries] = useState([]);
  // Edit history modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editHistoryData, setEditHistoryData] = useState([]);

  // Equipment selection state
  const [allVoyageEquipments, setAllVoyageEquipments] = useState([]);
  const [selectedEqType, setSelectedEqType] = useState('Tất cả');
  const [selectedEquipments, setSelectedEquipments] = useState([]);
  // Edit equipment state for modal
  const [editEqType, setEditEqType] = useState('Tất cả');
  const [editSelectedEquipments, setEditSelectedEquipments] = useState([]);

  // ===== Tính toán ngày =====
  const today = dayjs().startOf('day');
  const isToday = selectedDate && selectedDate.startOf('day').isSame(today);
  const isPastDate = selectedDate && selectedDate.startOf('day').isBefore(today);
  const daysDiff = isPastDate ? today.diff(selectedDate.startOf('day'), 'day') : 0;
  const canEdit = daysDiff <= 1;
  const isCompleted = selectedVoyage?.status === 'Completed';

  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Nhận tham số từ màn ca trực để tự chọn sẵn hải trình/ngày/ca
    const initVoyageId = searchParams.get('voyageId');
    const initDate = searchParams.get('date');
    const initShiftId = searchParams.get('shiftId');
    const init = async () => {
      try {
        const data = await deckLogService.getMyVoyages();
        setVoyages(data);
        if (data.length === 0) return;
        const voyage = (initVoyageId && data.find(v => v.id === Number(initVoyageId)))
          || data.find(v => v.status !== 'Completed') || data[0];
        setSelectedVoyage(voyage);
        
        try {
          const eqs = await voyageService.getVoyageEquipments(voyage.id);
          setAllVoyageEquipments(eqs || []);
        } catch (e) { console.error(e); }

        const date = initDate ? dayjs(initDate) : dayjs();
        setSelectedDate(date);
        const shiftsData = await deckLogService.getShifts(voyage.id, date.format('YYYY-MM-DD'));
        setShifts(shiftsData);
        if (initShiftId) {
          const shift = shiftsData.find(s => s.id === Number(initShiftId));
          if (shift) {
            setSelectedShift(shift);
            setEntries(getShiftHours(shift).map(h => createEmptyRow(h)));
            try { setHistory(await deckLogService.getHistoryByShift(shift.id)); } catch (e) { console.error(e); }
          }
        }
      } catch (error) {
        console.error('Lỗi:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoyageChange = async (voyageId) => {
    if (!voyageId) return;
    const v = voyages.find(v => v.id === voyageId);
    setSelectedVoyage(v);
    setSelectedShift(null);
    setHistory([]);
    setNote('');
    setFileList([]);
    setEntries([]);
    setSelectedEquipments([]);
    setSelectedEqType('Tất cả');
    if (v) {
      try {
        const eqs = await voyageService.getVoyageEquipments(v.id);
        setAllVoyageEquipments(eqs || []);
      } catch (e) { console.error(e); }
      const shiftsData = await deckLogService.getShifts(v.id, selectedDate.format('YYYY-MM-DD'));
      setShifts(shiftsData);
    }
  };

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setSelectedShift(null);
    setHistory([]);
    setEntries([]);
    if (selectedVoyage && date) {
      const shiftsData = await deckLogService.getShifts(selectedVoyage.id, date.format('YYYY-MM-DD'));
      setShifts(shiftsData);
    }
  };

  const handleShiftChange = async (shiftId) => {
    if (!shiftId) {
      setSelectedShift(null);
      setHistory([]);
      setEntries([]);
      return;
    }
    const shift = shifts.find(s => s.id === parseInt(shiftId));
    setSelectedShift(shift);
    setNote('');
    setFileList([]);

    // Tạo các dòng trống theo giờ của ca
    const hours = getShiftHours(shift);
    setEntries(hours.map(h => createEmptyRow(h)));

    try {
      const logs = await deckLogService.getHistoryByShift(shiftId);
      setHistory(logs);
    } catch (error) {
      console.error('Lỗi:', error);
    }
  };

  // ===== Cập nhật giá trị ô trong bảng =====
  const handleEntryChange = (hour, field, value) => {
    setEntries(prev => prev.map(e => e.hour === hour ? { ...e, [field]: value } : e));
  };

  // ===== Submit =====
  const handleSubmit = async () => {
    if (!selectedShift) { notifyWarning('Vui lòng chọn ca trực'); return; }

    // Check có ít nhất 1 dòng có dữ liệu
    const filledEntries = entries.filter(e => 
      ENTRY_FIELDS.some(f => e[f.key] !== null && e[f.key] !== '' && e[f.key] !== undefined)
    );
    if (filledEntries.length === 0 && (!note || !note.trim())) {
      notifyWarning('Vui lòng nhập ít nhất 1 dòng dữ liệu hoặc ghi chú');
      return;
    }

    try {
      const result = await deckLogService.create({ 
        shiftId: selectedShift.id, 
        note, 
        entries: filledEntries,
        equipmentIds: selectedEquipments
      });

      if (fileList.length > 0 && result.shiftLog?.id) {
        const files = fileList.map(f => f.originFileObj);
        await deckLogService.uploadImages(result.shiftLog.id, files);
      }

      notifySuccess('Ghi nhận nhật ký boong thành công!');
      const logs = await deckLogService.getHistoryByShift(selectedShift.id);
      setHistory(logs);
      setNote('');
      setFileList([]);
      setSelectedEquipments([]);
      setSelectedEqType('Tất cả');
      const hours = getShiftHours(selectedShift);
      setEntries(hours.map(h => createEmptyRow(h)));
    } catch (error) {
      console.error('Lỗi:', error);
      notifyError('Có lỗi xảy ra khi lưu nhật ký');
    }
  };

  // ===== Chỉnh sửa =====
  const openEditModal = (log) => {
    setEditingLog(log);
    setEditNote(log.DeckLog?.note || log.content || '');
    setEditReason('');
    
    // Load equipments associated
    const savedEquipIds = log.Equipments?.map(eq => eq.id) || [];
    setEditSelectedEquipments(savedEquipIds);
    setEditEqType('Tất cả');

    // Load entries hiện tại hoặc tạo dòng trống
    const existingEntries = log.DeckLog?.DeckLogEntries || [];
    if (existingEntries.length > 0) {
      setEditEntries(existingEntries.map(e => ({
        hour: e.hour,
        ...ENTRY_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: e[f.key] }), {})
      })));
    } else {
      const hours = getShiftHours(selectedShift);
      setEditEntries(hours.map(h => createEmptyRow(h)));
    }
    setEditModalOpen(true);
  };

  const handleEditEntryChange = (hour, field, value) => {
    setEditEntries(prev => prev.map(e => e.hour === hour ? { ...e, [field]: value } : e));
  };

  const handleUpdate = async () => {
    if (!editReason.trim()) { notifyWarning('Vui lòng nhập lý do chỉnh sửa'); return; }
    try {
      const filledEntries = editEntries.filter(e =>
        ENTRY_FIELDS.some(f => e[f.key] !== null && e[f.key] !== '' && e[f.key] !== undefined)
      );
      await deckLogService.update(editingLog.id, {
        note: editNote,
        entries: filledEntries,
        editReason: editReason.trim(),
        equipmentIds: editSelectedEquipments
      });
      notifySuccess('Cập nhật nhật ký thành công');
      setEditModalOpen(false);
      const logs = await deckLogService.getHistoryByShift(selectedShift.id);
      setHistory(logs);
    } catch (error) {
      console.error('Lỗi:', error);
      notifyError('Có lỗi xảy ra khi cập nhật');
    }
  };

  const openEditHistory = (log) => {
    setEditHistoryData(log.LogEditHistories || []);
    setHistoryModalOpen(true);
  };

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  // ===== Kiểm tra giờ đã qua chưa (chỉ cho nhập giờ đã qua) =====
  const isHourAllowed = (hour) => {
    if (!selectedShift) return false;
    const now = new Date();
    const shiftDate = new Date(selectedShift.startTime);
    // Nếu không phải hôm nay → cho phép hết (xem lại)
    if (now.toDateString() !== shiftDate.toDateString()) return true;
    return hour <= now.getHours();
  };

  // ===== Kiểm tra field có được phép điền theo vị trí =====
  const isFieldAllowed = (fieldKey) => {
    const pos = selectedShift?.position;
    if (!pos) return true; // Không có position → cho điền hết
    if (pos === 'Lái tàu') return HELMSMAN_FIELDS.includes(fieldKey);
    if (pos === 'Canh boong') return LOOKOUT_FIELDS.includes(fieldKey);
    return true;
  };

  // ===== Render ô nhập liệu cho 1 field =====
  const renderInputCell = (entry, field, onChange, forceDisable = false) => {
    const disabled = forceDisable || !isFieldAllowed(field.key);
    if (field.type === 'select') {
      return (
        <Select size="small" style={{ width: '100%', background: disabled ? '#f5f5f5' : undefined }} allowClear placeholder="—"
          disabled={disabled}
          value={entry[field.key] || undefined}
          onChange={val => onChange(entry.hour, field.key, val || null)}
          options={field.options.map(o => ({ value: o, label: o }))} />
      );
    }
    return (
      <InputNumber size="small" style={{ width: '100%', background: disabled ? '#f5f5f5' : undefined }} placeholder={disabled ? '' : '—'}
        disabled={disabled}
        min={field.key === 'gyroError' ? undefined : 0}
        max={field.max}
        value={entry[field.key]}
        onChange={val => onChange(entry.hour, field.key, val)} />
    );
  };

  // ===== RENDER =====
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
          <PageHeader icon={<FileTextOutlined style={{ color: '#2563eb' }} />} breadcrumb="Deck Log" title="Nhật ký Trực boong" />
          <Card><Empty description={<div><p>Không có hải trình nào.</p></div>} /></Card>
        </div>
      </MasterLayout>
    );
  }

  // ===== Cột lịch sử =====
  const historyColumns = [
    { title: 'Thời gian', dataIndex: 'createdAt', width: 80, render: (d) => formatTime(d) },
    {
      title: 'Dữ liệu hàng hải', key: 'entries', render: (_, log) => {
        const entryList = log.DeckLog?.DeckLogEntries || [];
        if (entryList.length === 0) return <Text type="secondary">Không có dữ liệu giờ</Text>;
        return (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ background: '#f0f5ff' }}>
                  <th style={{ padding: '2px 6px', border: '1px solid #d9d9d9', whiteSpace: 'nowrap' }}>Giờ</th>
                  {ENTRY_FIELDS.map(f => (
                    <th key={f.key} style={{ padding: '2px 6px', border: '1px solid #d9d9d9', whiteSpace: 'nowrap' }}>{f.short}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entryList.sort((a, b) => a.hour - b.hour).map(e => (
                  <tr key={e.hour}>
                    <td style={{ padding: '2px 6px', border: '1px solid #d9d9d9', fontWeight: 600, textAlign: 'center' }}>{e.hour}</td>
                    {ENTRY_FIELDS.map(f => (
                      <td key={f.key} style={{ padding: '2px 6px', border: '1px solid #d9d9d9', textAlign: 'center' }}>
                        {e[f.key] !== null && e[f.key] !== undefined ? e[f.key] : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    },
    {
      title: 'Ghi chú', key: 'note', width: 150,
      render: (_, log) => log.DeckLog?.note || <Text type="secondary">—</Text>
    },
    {
      title: 'Thiết bị sử dụng', key: 'equipments', width: 150,
      render: (_, log) => {
        const eqList = log.Equipments || [];
        if (eqList.length === 0) return <Text type="secondary">—</Text>;
        return (
          <Space wrap>
            {eqList.map(eq => (
              <Tag color="cyan" key={eq.id} title={`${eq.equipmentType} - ${eq.location}`}>
                {eq.equipmentName}
              </Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: 'Ảnh', key: 'images', width: 100,
      render: (_, log) => log.LogImages?.length > 0 ? (
        <Image.PreviewGroup>
          {log.LogImages.map(img => (
            <Image key={img.id} width={36} height={36} style={{ objectFit: 'cover', borderRadius: 4, marginRight: 4 }}
              src={`${API_URL}${img.imageUrl}`} />
          ))}
        </Image.PreviewGroup>
      ) : <Text type="secondary">—</Text>
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_, log) => (
        <Space size={4}>
          {canEdit && !isCompleted && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(log)}>Sửa</Button>
          )}
          {log.LogEditHistories?.length > 0 && (
            <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => openEditHistory(log)}>
              ({log.LogEditHistories.length})
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <MasterLayout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader icon={<FileTextOutlined style={{ color: '#2563eb' }} />} breadcrumb="Deck Log" title="Nhật ký Trực boong" />

        {/* Chọn Hải trình, Ngày, Ca trực */}
        <Card style={{ marginBottom: 16 }}>
          <Space size={32} wrap align="start">
            <div style={{ minWidth: 280 }}>
              <div style={{ marginBottom: 6 }}><Text type="secondary"><CompassOutlined /> Chọn Hải trình</Text></div>
              <Select style={{ width: '100%' }} value={selectedVoyage?.id || undefined} onChange={handleVoyageChange}
                options={voyages.map(v => ({ value: v.id, label: `${v.Ship?.shipName} | ${v.departurePort} → ${v.destinationPort} (${v.status})` }))} />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text type="secondary"><CalendarOutlined /> Chọn Ngày</Text></div>
              <DatePicker value={selectedDate} onChange={handleDateChange} format="DD/MM/YYYY" allowClear={false} style={{ width: 160 }} disabledDate={(current) => current && current.isAfter(dayjs().endOf('day'))} />
            </div>
            <div style={{ minWidth: 320 }}>
              <div style={{ marginBottom: 6 }}><Text type="secondary"><ClockCircleOutlined /> Chọn Ca trực</Text></div>
              <Select style={{ width: '100%' }} placeholder="-- Chọn ca trực --" allowClear value={selectedShift?.id || undefined} onChange={handleShiftChange}
                options={shifts.map(s => ({ value: s.id, label: `${s.CrewProfile?.fullName} | ${formatTime(s.startTime)} - ${formatTime(s.endTime)}${s.position ? ` — ${s.position}` : ''} (${s.status})` }))} />
            </div>
          </Space>
        </Card>

        {/* Cảnh báo */}
        {isCompleted && selectedShift && (
          <Alert message="Hải trình này đã kết thúc" description="Bạn chỉ có thể xem lại lịch sử." type="warning" showIcon style={{ marginBottom: 16 }} />
        )}
        {isPastDate && !isCompleted && selectedShift && (
          <Alert
            message={canEdit ? `Ngày đã qua (${daysDiff} ngày trước) — Chỉnh sửa cần ghi lý do` : `Đã quá 24 giờ — Chỉ xem, không chỉnh sửa được`}
            type={canEdit ? 'info' : 'warning'} showIcon style={{ marginBottom: 16 }} />
        )}

        {/* ===== BẢNG NHẬP LIỆU THEO GIỜ ===== */}
        {selectedShift && !isCompleted && isToday && entries.length > 0 && (
          <Card style={{ marginBottom: 16 }}
            title={<span>📋 Nhật ký Boong — Ca: {formatTime(selectedShift.startTime)} - {formatTime(selectedShift.endTime)} {selectedShift.position && <Tag color={selectedShift.position === 'Lái tàu' ? 'blue' : 'green'}>{selectedShift.position}</Tag>}</span>}>

            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1200 }}>
                <thead>
                  <tr style={{ background: '#e6f4ff' }}>
                    <th style={{ padding: '8px 6px', border: '1px solid #d9d9d9', textAlign: 'center', fontWeight: 600, minWidth: 50 }}>Giờ</th>
                    {ENTRY_FIELDS.map(f => (
                      <th key={f.key} style={{
                        padding: '8px 4px', border: '1px solid #d9d9d9', textAlign: 'center', fontSize: 12, fontWeight: 600, minWidth: 70, whiteSpace: 'nowrap',
                        background: isFieldAllowed(f.key) ? '#e6f4ff' : '#f0f0f0',
                        color: isFieldAllowed(f.key) ? undefined : '#999',
                      }}>
                        {f.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                {entries.map(entry => {
                    const hourDisabled = !isHourAllowed(entry.hour);
                    return (
                    <tr key={entry.hour} style={{ opacity: hourDisabled ? 0.45 : 1 }}>
                      <td style={{ padding: '4px 6px', border: '1px solid #d9d9d9', textAlign: 'center', fontWeight: 700, background: hourDisabled ? '#f0f0f0' : '#fafafa', fontSize: 14 }}>
                        {entry.hour}
                      </td>
                      {ENTRY_FIELDS.map(f => (
                        <td key={f.key} style={{ padding: '2px 2px', border: '1px solid #d9d9d9' }}>
                          {renderInputCell(entry, f, handleEntryChange, hourDisabled)}
                        </td>
                      ))}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Thiết bị sử dụng */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>
                Thiết bị sử dụng trong ca
              </label>
              <Row gutter={8}>
                <Col span={6}>
                  <Select style={{ width: '100%' }} value={selectedEqType} onChange={setSelectedEqType}
                    options={[
                      { value: 'Tất cả', label: 'Tất cả các loại' },
                      ...Array.from(new Set(allVoyageEquipments.map(e => e.equipmentType))).map(t => ({ value: t, label: t }))
                    ]} />
                </Col>
                <Col span={18}>
                  <Select mode="multiple" style={{ width: '100%' }} placeholder="Chọn thiết bị..." value={selectedEquipments} onChange={setSelectedEquipments}
                    options={allVoyageEquipments
                      .filter(e => selectedEqType === 'Tất cả' || e.equipmentType === selectedEqType)
                      .map(e => ({ value: e.id, label: `${e.equipmentName} (${e.equipmentType} - ${e.location})` }))
                    } />
                </Col>
              </Row>
            </div>

            {/* Ghi chú */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>
                Ghi chú
              </label>
              <TextArea rows={3} placeholder="VD: Gặp sóng lớn vùng biển X, đã chuyển hướng tránh..." value={note} onChange={e => setNote(e.target.value)} />
            </div>

            {/* Ảnh */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>
                <PictureOutlined /> Đính kèm ảnh
              </label>
              <Upload listType="picture-card" fileList={fileList} onChange={({ fileList: fl }) => setFileList(fl.slice(0, 5))}
                beforeUpload={() => false} accept="image/jpeg,image/png,image/webp">
                {fileList.length < 5 && <div><UploadOutlined /><div style={{ marginTop: 8 }}>Chọn ảnh</div></div>}
              </Upload>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => {
                const hours = getShiftHours(selectedShift);
                setEntries(hours.map(h => createEmptyRow(h)));
                setNote('');
                setFileList([]);
              }}>Xóa trắng</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>Lưu Nhật ký</Button>
            </div>
          </Card>
        )}

        {/* ===== LỊCH SỬ ===== */}
        {selectedShift && (
          <Card title={`📜 Lịch sử ghi chép — ${selectedDate.format('DD/MM/YYYY')}`}>
            <Table rowKey="id" columns={historyColumns} dataSource={history}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              scroll={{ x: 800 }}
              locale={{ emptyText: 'Chưa có ghi chép nào trong ca trực này.' }} />
          </Card>
        )}
      </div>

      {/* ===== MODAL CHỈNH SỬA ===== */}
      <Modal title="Chỉnh sửa Nhật ký Boong" open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={handleUpdate}
        okText="Lưu chỉnh sửa" cancelText="Hủy" width={1000}>
        <Alert message="Bạn đang chỉnh sửa nhật ký đã ghi. Vui lòng cung cấp lý do." type="info" showIcon style={{ marginBottom: 16 }} />

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Lý do chỉnh sửa <span style={{ color: 'red' }}>*</span></label>
          <TextArea rows={2} placeholder="VD: Bổ sung thông tin, sửa lỗi chính tả..." value={editReason} onChange={e => setEditReason(e.target.value)} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Ghi chú</label>
          <TextArea rows={2} placeholder="Nhập ghi chú..." value={editNote} onChange={e => setEditNote(e.target.value)} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Thiết bị sử dụng trong ca</label>
          <Row gutter={8}>
            <Col span={6}>
              <Select style={{ width: '100%' }} value={editEqType} onChange={setEditEqType}
                options={[
                  { value: 'Tất cả', label: 'Tất cả các loại' },
                  ...Array.from(new Set(allVoyageEquipments.map(e => e.equipmentType))).map(t => ({ value: t, label: t }))
                ]} />
            </Col>
            <Col span={18}>
              <Select mode="multiple" style={{ width: '100%' }} placeholder="Chọn thiết bị..." value={editSelectedEquipments} onChange={setEditSelectedEquipments}
                options={allVoyageEquipments
                  .filter(e => editEqType === 'Tất cả' || e.equipmentType === editEqType)
                  .map(e => ({ value: e.id, label: `${e.equipmentName} (${e.equipmentType} - ${e.location})` }))
                } />
            </Col>
          </Row>
        </div>

        {/* Bảng chỉnh sửa entries */}
        {editEntries.length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1000 }}>
              <thead>
                <tr style={{ background: '#e6f4ff' }}>
                  <th style={{ padding: '6px', border: '1px solid #d9d9d9', textAlign: 'center', minWidth: 40 }}>Giờ</th>
                  {ENTRY_FIELDS.map(f => (
                    <th key={f.key} style={{
                      padding: '4px', border: '1px solid #d9d9d9', textAlign: 'center', fontSize: 11, minWidth: 60, whiteSpace: 'nowrap',
                      background: isFieldAllowed(f.key) ? '#e6f4ff' : '#f0f0f0',
                      color: isFieldAllowed(f.key) ? undefined : '#999',
                    }}>
                      {f.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editEntries.map(entry => (
                  <tr key={entry.hour}>
                    <td style={{ padding: '4px', border: '1px solid #d9d9d9', textAlign: 'center', fontWeight: 700, background: '#fafafa' }}>{entry.hour}</td>
                    {ENTRY_FIELDS.map(f => (
                      <td key={f.key} style={{ padding: '2px', border: '1px solid #d9d9d9' }}>
                        {renderInputCell(entry, f, handleEditEntryChange)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </Modal>

      {/* ===== MODAL LỊCH SỬ CHỈNH SỬA ===== */}
      <Modal title="Lịch sử chỉnh sửa" open={historyModalOpen} onCancel={() => setHistoryModalOpen(false)} footer={null} width={700}>
        {editHistoryData.length === 0 ? (
          <Empty description="Chưa có lịch sử chỉnh sửa" />
        ) : (
          <Timeline items={editHistoryData.map(h => {
            let prev = {};
            try { prev = JSON.parse(h.previousContent); } catch {}
            return {
              color: 'blue',
              children: (
                <div>
                  <div><Text strong>{h.CrewProfile?.fullName}</Text> — <Text type="secondary">{formatDateTime(h.editedAt)}</Text></div>
                  <div style={{ marginTop: 4 }}><Tag color="orange">Lý do:</Tag> {h.editReason}</div>
                  <div style={{ marginTop: 4, background: '#f8fafc', padding: 8, borderRadius: 4, fontSize: 13 }}>
                    <div><strong>Nội dung trước khi sửa:</strong></div>
                    {prev.note && <div>Ghi chú: {prev.note}</div>}
                    {prev.equipmentIds?.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ marginRight: 4 }}>Thiết bị trước đó:</span>
                        <Space wrap>
                          {prev.equipmentIds.map(eqId => {
                            const eq = allVoyageEquipments.find(e => e.id === Number(eqId));
                            return (
                              <Tag color="default" key={eqId}>
                                {eq ? eq.equipmentName : `#${eqId}`}
                              </Tag>
                            );
                          })}
                        </Space>
                      </div>
                    )}
                    {prev.entries?.length > 0 && (
                      <div style={{ overflowX: 'auto', marginTop: 4 }}>
                        <table style={{ fontSize: 11, borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f0f0f0' }}>
                              <th style={{ padding: '2px 4px', border: '1px solid #d9d9d9' }}>Giờ</th>
                              {ENTRY_FIELDS.map(f => (
                                <th key={f.key} style={{ padding: '2px 4px', border: '1px solid #d9d9d9', whiteSpace: 'nowrap' }}>{f.short}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {prev.entries.map((e, i) => (
                              <tr key={i}>
                                <td style={{ padding: '2px 4px', border: '1px solid #d9d9d9', fontWeight: 600, textAlign: 'center' }}>{e.hour}</td>
                                {ENTRY_FIELDS.map(f => (
                                  <td key={f.key} style={{ padding: '2px 4px', border: '1px solid #d9d9d9', textAlign: 'center' }}>
                                    {e[f.key] ?? '—'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {!prev.note && (!prev.entries || prev.entries.length === 0) && <div>(trống)</div>}
                  </div>
                </div>
              )
            };
          })} />
        )}
      </Modal>
    </MasterLayout>
  );
}
