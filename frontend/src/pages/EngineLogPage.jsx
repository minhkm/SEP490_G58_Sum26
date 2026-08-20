import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Select, Input, InputNumber, Button, Table, Card, Tag, Spin, Empty, Typography, Space, Row, Col, Alert, DatePicker, Upload, Modal, Image, Timeline } from 'antd';
import { DashboardOutlined, SaveOutlined, ClockCircleOutlined, CompassOutlined, CalendarOutlined, UploadOutlined, EditOutlined, HistoryOutlined, PictureOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { engineLogService, vesselService } from '../services/api';
import { PageHeader, notifyWarning, notifySuccess, notifyError } from '../components/common';
import dayjs from 'dayjs';
import { SHIFT_SLOTS, slotFromStart } from '../config/shifts';
import {
  engineParameterLabel,
  engineNameLabel,
  engineTypeLabel,
  isOperationalEngineStatus,
  normalizeEngineStatus,
} from '../utils/engine';
import './EngineLogPage.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
const REQUIRED_PARAMETER_NAMES = new Set([
  'Áp suất dầu nhiên liệu (kg/cm²)',
  'Nhiệt độ khí xả XL2 (°C)',
  'Nhiệt độ nước làm mát (°C)',
]);
const isRequiredParameter = (name) => REQUIRED_PARAMETER_NAMES.has(engineParameterLabel(name));
const voyageStatusLabel = (status) => ({
  Planning: 'Đang lập kế hoạch',
  Loading: 'Đang làm hàng',
  Loaded: 'Đã làm hàng xong',
  Underway: 'Đang hành trình',
  Arrived: 'Đã cập bến',
  Discharge: 'Đang dỡ hàng',
  Discharged: 'Đã dỡ hàng xong',
  'Homeward Bounding': 'Đang quay về',
  Anchored: 'Neo đậu',
  'At Anchor': 'Neo đậu',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
}[status] || status);
const shiftStatusLabel = (status) => ({
  Scheduled: 'Đã lên lịch',
  Active: 'Đang trực',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
}[status] || status);
const isWithinEditWindow = (log) => {
  const createdAt = dayjs(log?.createdAt);
  if (!createdAt.isValid()) return false;
  const ageInHours = dayjs().diff(createdAt, 'hour', true);
  return ageInHours >= 0 && ageInHours <= 24;
};
const parsePreviousContent = (content) => {
  try { return JSON.parse(content) || {}; } catch { return {}; }
};

export default function EngineLogPage() {
  const [voyages, setVoyages] = useState([]);
  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [engines, setEngines] = useState([]);
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [paramValues, setParamValues] = useState({});
  const [note, setNote] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fileList, setFileList] = useState([]);
  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editValues, setEditValues] = useState({});
  const [editEngineParams, setEditEngineParams] = useState([]);
  // Edit history modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editHistoryData, setEditHistoryData] = useState([]);

  // ===== Tính toán ngày =====
  const today = dayjs().startOf('day');
  const isToday = selectedDate && selectedDate.startOf('day').isSame(today);
  const isPastDate = selectedDate && selectedDate.startOf('day').isBefore(today);
  const daysDiff = isPastDate ? today.diff(selectedDate.startOf('day'), 'day') : 0;
  const hasEditableLog = history.some(isWithinEditWindow);
  const isCompleted = selectedVoyage?.status === 'Completed';

  const [searchParams] = useSearchParams();

  // ===== BƯỚC 1: Lấy danh sách hải trình (tự chọn sẵn nếu có tham số từ màn ca trực) =====
  useEffect(() => {
    const initVoyageId = searchParams.get('voyageId');
    const activeVoyageId = localStorage.getItem('activeVoyageId');
    const initDate = searchParams.get('date');
    const initShiftId = searchParams.get('shiftId');
    const init = async () => {
      try {
        const data = await engineLogService.getMyVoyages();
        setVoyages(data);
        if (data.length === 0) return;
        const voyage = (initVoyageId && data.find(v => v.id === Number(initVoyageId)))
          || (activeVoyageId && data.find(v => v.id === Number(activeVoyageId)))
          || data.find(v => v.status !== 'Completed') || data[0];
        setSelectedVoyage(voyage);

        if (voyage) {
          const includedEngines = voyage.Ship?.Engines;
          if (includedEngines) {
            setEngines(includedEngines);
          } else {
            try {
              const vessel = await vesselService.getById(voyage.shipId);
              setEngines(vessel.Engines || []);
            } catch (e) {
              console.error('Không thể tải danh sách máy của tàu', e);
            }
          }
        }
        const date = initDate ? dayjs(initDate) : dayjs();
        setSelectedDate(date);
        const shiftsData = await engineLogService.getShifts(voyage.id, date.format('YYYY-MM-DD'));
        setShifts(shiftsData);
        if (initShiftId) {
          const shift = shiftsData.find(s => s.id === Number(initShiftId));
          if (shift) {
            setSelectedShift(shift);
            try { setHistory(await engineLogService.getHistoryByShift(shift.id)); } catch (e) { console.error(e); }
          }
        }
      } catch (error) {
        console.error('Không tìm thấy hải trình:', error);
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
    localStorage.setItem('activeVoyageId', String(voyageId));
    setSelectedVoyage(v);
    setSelectedShift(null);
    setHistory([]);
    setSelectedEngine(null);
    setParamValues({});
    setNote('');
    setFileList([]);
    if (v) {
      const includedEngines = v.Ship?.Engines;
      if (includedEngines) {
        setEngines(includedEngines);
      } else {
        try {
          const vessel = await vesselService.getById(v.shipId);
          setEngines(vessel.Engines || []);
        } catch (e) {
          console.error('Không thể tải danh sách máy của tàu', e);
          setEngines([]);
        }
      }
      const shiftsData = await engineLogService.getShifts(v.id, selectedDate.format('YYYY-MM-DD'));
      setShifts(shiftsData);
    }
  };

  // Khi đổi ngày
  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setSelectedShift(null);
    setHistory([]);
    setSelectedEngine(null);
    if (selectedVoyage && date) {
      const shiftsData = await engineLogService.getShifts(selectedVoyage.id, date.format('YYYY-MM-DD'));
      setShifts(shiftsData);
    }
  };

  const handleShiftChange = async (shiftId) => {
    if (!shiftId) {
      setSelectedShift(null);
      setHistory([]);
      return;
    }
    const shift = shifts.find(s => s.id === parseInt(shiftId));
    setSelectedShift(shift);
    setSelectedEngine(null);
    setParamValues({});
    setNote('');
    setFileList([]);
    try {
      const logs = await engineLogService.getHistoryByShift(shiftId);
      setHistory(logs);
    } catch (error) {
      console.error('Lỗi lấy lịch sử:', error);
    }
  };

  const handleSelectEngine = (engine) => {
    if (!isOperationalEngineStatus(engine.status)) return; // Block non-operational engines
    setSelectedEngine(engine);
    const defaultValues = {};
    if (engine.EngineParameters) {
      engine.EngineParameters.forEach(p => { defaultValues[p.id] = ''; });
    }
    setParamValues(defaultValues);
    setNote('');
    setFileList([]);
  };

  const handleParamChange = (paramId, value) => {
    setParamValues({ ...paramValues, [paramId]: value });
  };

  const getValueStatus = (param, value) => {
    if (value === '' || value === null || value === undefined) return '';
    const numVal = parseFloat(value);
    if (!Number.isFinite(numVal)) return '';
    if (param.maxValue && numVal > param.maxValue) return 'danger';
    if (param.maxValue && numVal > param.maxValue * 0.9) return 'warning';
    return 'ok';
  };

  // ===== Lưu nhật ký =====
  const handleSubmit = async () => {
    if (!selectedShift || !selectedEngine) {
      notifyWarning('Vui lòng chọn ca trực và máy cần kiểm tra');
      return;
    }
    // Kiểm tra ca trực đã bắt đầu chưa
    if (new Date() < new Date(selectedShift.startTime)) {
      notifyWarning('Ca trực chưa bắt đầu, chưa thể ghi nhật ký');
      return;
    }
    const values = Object.entries(paramValues)
      .filter(([, val]) => val !== '' && val !== null)
      .map(([paramId, value]) => ({ parameterId: parseInt(paramId), value: parseFloat(value) }));
    if (values.length < 3) {
      notifyWarning('Vui lòng nhập ít nhất 3 thông số máy');
      return;
    }
    const mainParamIds = selectedEngine.EngineParameters
      .filter(p => isRequiredParameter(p.name))
      .map(p => p.id);
      
    const filledMainParams = values.filter(v => mainParamIds.includes(v.parameterId));

    if (mainParamIds.length > 0 && filledMainParams.length < mainParamIds.length) {
      notifyWarning('Vui lòng nhập đủ các thông số chính');
      return;
    }

    try {
      const result = await engineLogService.create({
        shiftId: selectedShift.id,
        engineId: selectedEngine.id,
        note, values
      });

      // Upload ảnh nếu có — lỗi upload không làm mất nhật ký
      if (fileList.length > 0 && result.shiftLog?.id) {
        const files = fileList.map(f => f.originFileObj);
        try {
          await engineLogService.uploadImages(result.shiftLog.id, files);
        } catch (uploadErr) {
          console.error('Lỗi tải ảnh lên:', uploadErr);
          notifyWarning('Nhật ký đã lưu nhưng tải ảnh lên dịch vụ lưu trữ thất bại. Vui lòng kiểm tra kết nối mạng.');
        }
      }

      notifySuccess(`Ghi nhận kiểm tra "${engineNameLabel(selectedEngine.engineName)}" thành công!`);
      const logs = await engineLogService.getHistoryByShift(selectedShift.id);
      setHistory(logs);
      setSelectedEngine(null);
      setParamValues({});
      setNote('');
      setFileList([]);
    } catch (error) {
      console.error('Lỗi:', error);
      notifyError(error.response?.data?.message || 'Có lỗi xảy ra khi lưu nhật ký');
    }

  };

  // ===== Mở modal chỉnh sửa =====
  const openEditModal = (log) => {
    setEditingLog(log);
    setEditNote(log.EngineLog?.note || log.content || '');
    setEditReason('');
    const vals = {};
    log.EngineLog?.EngineLogValues?.forEach(v => { vals[v.parameterId] = v.value; });
    setEditValues(vals);

    // Get all parameters for this engine
    const engineName = log.EngineLog?.Engine?.engineName;
    const fullEngine = engines.find(e => e.engineName === engineName);
    setEditEngineParams(fullEngine?.EngineParameters || []);

    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editReason.trim()) {
      notifyWarning('Vui lòng nhập lý do chỉnh sửa');
      return;
    }
    try {
      const values = Object.entries(editValues)
        .filter(([, val]) => val !== '' && val !== null)
        .map(([paramId, value]) => ({ parameterId: parseInt(paramId), value: parseFloat(value) }));
      if (values.length < 3) {
        notifyWarning('Vui lòng duy trì ít nhất 3 thông số máy');
        return;
      }

      const mainParamIds = editEngineParams
        .filter(p => isRequiredParameter(p.name))
        .map(p => p.id);
      
      const filledMainParams = values.filter(v => mainParamIds.includes(v.parameterId));

      if (mainParamIds.length > 0 && filledMainParams.length < mainParamIds.length) {
        notifyWarning('Vui lòng nhập đủ các thông số chính');
        return;
      }

      await engineLogService.update(editingLog.id, {
        note: editNote, 
        values, 
        editReason: editReason.trim()
      });
      notifySuccess('Cập nhật nhật ký thành công');
      setEditModalOpen(false);
      const logs = await engineLogService.getHistoryByShift(selectedShift.id);
      setHistory(logs);
    } catch (error) {
      console.error('Lỗi:', error);
      notifyError(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật');
    }
  };

  // ===== Xem lịch sử chỉnh sửa =====
  const openEditHistory = (log) => {
    setEditHistoryData(log.LogEditHistories || []);
    setHistoryModalOpen(true);
  };

  const formatTime = (d) => d ? dayjs(d).format('HH:mm') : '';
  const formatDateTime = (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '';

  const statusBorderColor = (status) =>
    status === 'danger' ? '#dc2626' : status === 'warning' ? '#f59e0b' : undefined;

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
        <div style={{ padding: 'clamp(12px, 4vw, 32px)' }}>
          <PageHeader icon={<DashboardOutlined />} breadcrumb="Nhật ký máy" title="Nhật ký Kiểm tra Máy" />
          <Card>
            <Empty description={<div><p>Không có hải trình nào.</p></div>} />
          </Card>
        </div>
      </MasterLayout>
    );
  }

  const historyColumns = [
    { title: 'Thời gian', dataIndex: 'createdAt', width: 100, render: (d) => formatTime(d) },
    { title: 'Máy', key: 'engine', width: 120, render: (_, log) => <strong>{engineNameLabel(log.EngineLog?.Engine?.engineName) || 'Không có'}</strong> },
    {
      title: 'Thông số đo', key: 'values',
      render: (_, log) => log.EngineLog?.EngineLogValues?.map(v => {
        const param = v.EngineParameter;
        const color = param?.maxValue && v.value > param.maxValue ? 'red' : param?.maxValue && v.value > param.maxValue * 0.9 ? 'orange' : 'green';
        return <Tag key={v.id} color={color} style={{ marginBottom: 4 }}>{param?.name}: {v.value}</Tag>;
      }),
    },
    { title: 'Ghi chú', key: 'note', render: (_, log) => log.EngineLog?.note || log.content },
    {
      title: 'Ảnh', key: 'images', width: 140,
      render: (_, log) => log.LogImages?.length > 0 ? (
        <Image.PreviewGroup>
          {log.LogImages.map(img => (
            <Image key={img.id} width={60} height={60} style={{ objectFit: 'cover', borderRadius: 6, marginRight: 4 }}
              src={img.imageUrl?.startsWith('http') ? img.imageUrl : `${API_URL}${img.imageUrl}`} />
          ))}
        </Image.PreviewGroup>
      ) : <Text type="secondary">—</Text>
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_, log) => (
        <Space size={4}>
          {isWithinEditWindow(log) && !isCompleted && (
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
      <div style={{ padding: 'clamp(12px, 4vw, 32px)' }}>
        <PageHeader icon={<DashboardOutlined />} breadcrumb="Nhật ký máy" title="Nhật ký Kiểm tra Máy" />

        {/* Chọn Hải trình, Ngày, Ca trực */}
        <Card style={{ marginBottom: 16 }}>
          <Space size={16} wrap align="start" style={{ overflowX: 'auto', width: '100%' }}>
            <div style={{ minWidth: 280 }}>
              <div style={{ marginBottom: 6 }}><Text type="secondary"><CompassOutlined /> Chọn Hải trình</Text></div>
              <Select style={{ width: '100%' }} value={selectedVoyage?.id || undefined} onChange={handleVoyageChange}
                options={voyages.map(v => ({ value: v.id, label: `${v.Ship?.shipName} | ${v.departurePort} → ${v.destinationPort} (${voyageStatusLabel(v.status)})` }))} />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text type="secondary"><CalendarOutlined /> Chọn Ngày</Text></div>
              <DatePicker value={selectedDate} onChange={handleDateChange} format="DD/MM/YYYY" allowClear={false}
                style={{ width: 160 }} disabledDate={(current) => current && current.isAfter(dayjs().endOf('day'))} />
            </div>
            <div style={{ minWidth: 320 }}>
              <div style={{ marginBottom: 6 }}><Text type="secondary"><ClockCircleOutlined /> Chọn Ca trực</Text></div>
              <Select style={{ width: '100%' }} placeholder="-- Chọn ca trực --" allowClear value={selectedShift?.id || undefined} onChange={handleShiftChange}
                options={shifts.map(s => {
                  const slot = SHIFT_SLOTS.find(sl => sl.slot === slotFromStart(s.startTime));
                  const timeLabel = slot ? slot.label : `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`;
                  return { value: s.id, label: `${s.CrewProfile?.fullName} | ${timeLabel} (${shiftStatusLabel(s.status)})` };
                })} />
            </div>
          </Space>
        </Card>

        {/* Cảnh báo */}
        {isCompleted && selectedShift && (
          <Alert message="Hải trình này đã kết thúc" description="Bạn chỉ có thể xem lại lịch sử kiểm tra chứ không thể thêm mới." type="warning" showIcon style={{ marginBottom: 16 }} />
        )}
        {isPastDate && !isCompleted && selectedShift && (
          <Alert
            message={hasEditableLog ? `Ngày đã qua (${daysDiff} ngày trước) — Nhật ký được tạo chưa quá 24 giờ vẫn có thể chỉnh sửa và phải ghi lý do` : 'Các nhật ký hiện tại đã quá 24 giờ — Chỉ xem, không chỉnh sửa được'}
            type={hasEditableLog ? 'info' : 'warning'} showIcon style={{ marginBottom: 16 }} />
        )}

        {/* Cảnh báo ca đã kết thúc */}
        {selectedShift && !isCompleted && isToday && new Date() > new Date(selectedShift.endTime) && (
          <Alert
            message="Ca trực đã kết thúc"
            description={history.length > 0
              ? 'Giờ trực đã qua, không thể ghi nhật ký mới. Bạn có thể xem và chỉnh sửa lịch sử ghi chép bên dưới.'
              : 'Giờ trực đã qua, không thể ghi nhật ký mới cho ca này.'}
            type="warning" showIcon style={{ marginBottom: 16 }} />
        )}

        {/* Chọn máy + Form */}
        {selectedShift && !isCompleted && isToday && new Date() <= new Date(selectedShift.endTime) && (
          <>
            {/* Cảnh báo ca chưa bắt đầu */}
            {new Date() < new Date(selectedShift.startTime) && (
              <Alert
                message="Ca trực chưa bắt đầu"
                description={`Ca này bắt đầu lúc ${formatTime(selectedShift.startTime)}. Chưa thể ghi nhật ký.`}
                type="warning" showIcon style={{ marginBottom: 16 }} />
            )}
            <Title level={5} style={{ marginBottom: 12 }}>Chọn máy đang hoạt động để kiểm tra</Title>
            <Row gutter={[16, 16]}>
              {engines.filter(engine => isOperationalEngineStatus(engine.status)).map(engine => {
                const isSelected = selectedEngine?.id === engine.id;
                return (
                  <Col xs={24} sm={12} lg={8} key={engine.id}>
                  <Card
                    hoverable
                    onClick={() => handleSelectEngine(engine)}
                    style={{
                      borderColor: isSelected ? '#1677ff' : undefined,
                      borderWidth: isSelected ? 2 : 1,
                      cursor: 'pointer',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0 }}>{engineNameLabel(engine.engineName)}</h4>
                      <Tag color={engineTypeLabel(engine) === 'Máy chính' ? 'blue' : 'gold'}>{engineTypeLabel(engine)}</Tag>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Tag color="green">{normalizeEngineStatus(engine.status)}</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {`${engine.EngineParameters?.length || 0} thông số cần kiểm tra`}
                    </Text>
                  </Card>
                  </Col>
                );
              })}
            </Row>
          </>
        )}

        {/* Form nhập thông số */}
        {selectedEngine && !isCompleted && isToday && new Date() <= new Date(selectedShift?.endTime) && (
          <Card style={{ marginTop: 16 }} title={`Kiểm tra: ${engineNameLabel(selectedEngine.engineName)} (${engineTypeLabel(selectedEngine)})`}>
            <Row gutter={[16, 16]}>
              {selectedEngine.EngineParameters?.map((param) => {
                const status = getValueStatus(param, paramValues[param.id]);
                const isMain = isRequiredParameter(param.name);
                return (
                  <Col xs={24} sm={12} lg={8} key={param.id}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {engineParameterLabel(param.name)} {isMain && <span style={{ color: 'red' }}>*</span>}
                    </div>
                    <InputNumber style={{ width: '100%', borderColor: statusBorderColor(status) }} placeholder="Nhập giá trị" min={0}
                      max={param.maxValue ? param.maxValue * 2 : undefined}
                      value={paramValues[param.id] === '' ? null : paramValues[param.id]}
                      onChange={value => handleParamChange(param.id, value === null ? '' : value)} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{param.maxValue != null && `Tối đa: ${param.maxValue}`}</Text>
                  </Col>
                );
              })}
            </Row>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>Ghi chú</label>
              <TextArea rows={3} placeholder="VD: Máy chạy ổn định..." maxLength={500} showCount value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>
                <PictureOutlined /> Đính kèm ảnh (tối đa 5 ảnh, mỗi ảnh ≤ 5MB)
              </label>
              <Upload listType="picture-card" fileList={fileList} onChange={({ fileList: fl }) => setFileList(fl.slice(0, 5))}
                beforeUpload={() => false} accept="image/jpeg,image/png,image/webp">
                {fileList.length < 5 && <div><UploadOutlined /><div style={{ marginTop: 8 }}>Chọn ảnh</div></div>}
              </Upload>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setSelectedEngine(null)}>Hủy</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>Lưu Nhật ký</Button>
            </div>
          </Card>
        )}

        {/* Lịch sử */}
        {selectedShift && (
          <Card title={`Lịch sử kiểm tra — ${selectedDate.format('DD/MM/YYYY')}`} style={{ marginTop: 16 }}>
            <Table
              rowKey="id"
              columns={historyColumns}
              dataSource={history}
              scroll={{ x: 900 }}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} bản ghi`,
              }}
              locale={{ emptyText: 'Chưa có kiểm tra nào trong ca trực này.' }}
            />
          </Card>
        )}
      </div>

      {/* Modal chỉnh sửa */}
      <Modal title="Chỉnh sửa Nhật ký" open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={handleUpdate}
        okText="Lưu chỉnh sửa" cancelText="Hủy" width={600}>
        <Alert message="Bạn đang chỉnh sửa nhật ký đã ghi. Vui lòng cung cấp lý do chỉnh sửa." type="info" showIcon style={{ marginBottom: 16 }} />
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Lý do chỉnh sửa <span style={{ color: 'red' }}>*</span></label>
          <TextArea rows={2} placeholder="VD: Nhập sai số liệu, bổ sung thông tin..." maxLength={500} showCount value={editReason} onChange={e => setEditReason(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Ghi chú</label>
          <TextArea rows={2} maxLength={500} showCount value={editNote} onChange={e => setEditNote(e.target.value)} />
        </div>

        {editEngineParams.map(param => {
          const isMain = isRequiredParameter(param.name);
          return (
            <div key={param.id} style={{ marginBottom: 8 }}>
              <Text strong>{engineParameterLabel(param.name)} {isMain && <span style={{ color: 'red' }}>*</span>}: </Text>
              <InputNumber style={{ width: '100%' }} min={0}
                max={param.maxValue ? param.maxValue * 2 : undefined}
                value={editValues[param.id]} onChange={val => setEditValues(p => ({ ...p, [param.id]: val }))} />
            </div>
          );
        })}
      </Modal>

      {/* Modal lịch sử chỉnh sửa */}
      <Modal title="Lịch sử chỉnh sửa" open={historyModalOpen} onCancel={() => setHistoryModalOpen(false)} footer={null} width={600}>
        {editHistoryData.length === 0 ? (
          <Empty description="Chưa có lịch sử chỉnh sửa" />
        ) : (
          <Timeline items={editHistoryData.map(h => {
            const prev = parsePreviousContent(h.previousContent);
            return {
              color: 'blue',
              children: (
                <div>
                  <div><Text strong>{h.CrewProfile?.fullName}</Text> — <Text type="secondary">{formatDateTime(h.editedAt)}</Text></div>
                  <div style={{ marginTop: 4 }}><Tag color="orange">Lý do:</Tag> {h.editReason}</div>
                  <div style={{ marginTop: 4, background: '#f8fafc', padding: 8, borderRadius: 4, fontSize: 13 }}>
                    <div><strong>Nội dung trước khi sửa:</strong></div>
                    <div>Ghi chú: {prev.note || '(trống)'}</div>
                    {prev.values?.map((v, i) => (
                      <Tag key={i} style={{ marginTop: 2 }}>{v.parameterName}: {v.value}</Tag>
                    ))}
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
