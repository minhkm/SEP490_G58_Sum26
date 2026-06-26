import { useState, useEffect } from 'react';
import { Select, Input, InputNumber, Button, Table, Card, Tag, Spin, Empty, Typography, Space, Row, Col, Alert } from 'antd';
import { DashboardOutlined, SaveOutlined, ClockCircleOutlined, CompassOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { engineLogService } from '../services/api';
import { PageHeader, notifyWarning, notifySuccess, notifyError } from '../components/common';
import './EngineLogPage.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function EngineLogPage() {
  // ===== STATE =====
  const [voyages, setVoyages] = useState([]);
  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [engines, setEngines] = useState([]);
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [paramValues, setParamValues] = useState({});
  const [note, setNote] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== BƯỚC 1: Lấy danh sách hải trình =====
  useEffect(() => {
    const fetchVoyages = async () => {
      try {
        const data = await engineLogService.getMyVoyages();
        setVoyages(data);
        if (data.length > 0) {
          const active = data.find(v => v.status !== 'Completed') || data[0];
          setSelectedVoyage(active);
          if (active.Ship && active.Ship.Engines) {
            setEngines(active.Ship.Engines);
          }
          const shiftsData = await engineLogService.getShifts(active.id);
          setShifts(shiftsData);
        }
      } catch (error) {
        console.error('Không tìm thấy hải trình:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVoyages();
  }, []);

  // Khi đổi hải trình
  const handleVoyageChange = async (voyageId) => {
    if (!voyageId) return;
    const v = voyages.find(v => v.id === voyageId);
    setSelectedVoyage(v);
    setSelectedShift(null);
    setHistory([]);
    setSelectedEngine(null);
    setParamValues({});
    setNote('');
    if (v) {
      if (v.Ship && v.Ship.Engines) setEngines(v.Ship.Engines);
      const shiftsData = await engineLogService.getShifts(v.id);
      setShifts(shiftsData);
    }
  };

  // ===== BƯỚC 2: Khi chọn Ca trực -> Load lịch sử =====
  const handleShiftChange = async (shiftId) => {
    if (!shiftId) {
      setSelectedShift(null);
      setHistory([]);
      return;
    }
    const shift = shifts.find((s) => s.id === parseInt(shiftId));
    setSelectedShift(shift);
    setSelectedEngine(null);
    setParamValues({});
    setNote('');

    try {
      const logs = await engineLogService.getHistoryByShift(shiftId);
      setHistory(logs);
    } catch (error) {
      console.error('Lỗi lấy lịch sử ca trực:', error);
    }
  };

  // ===== BƯỚC 3: Chọn máy cần kiểm tra =====
  const handleSelectEngine = (engine) => {
    setSelectedEngine(engine);
    const defaultValues = {};
    if (engine.EngineParameters) {
      engine.EngineParameters.forEach((p) => {
        defaultValues[p.id] = '';
      });
    }
    setParamValues(defaultValues);
    setNote('');
  };

  // ===== BƯỚC 4: Nhập thông số =====
  const handleParamChange = (paramId, value) => {
    setParamValues({ ...paramValues, [paramId]: value });
  };

  // Kiểm tra giá trị có vượt ngưỡng không
  const getValueStatus = (param, value) => {
    if (value === '' || value === null || value === undefined) return '';
    const numVal = parseFloat(value);
    if (isNaN(numVal)) return '';
    if (param.maxValue && numVal > param.maxValue) return 'danger';
    if (param.maxValue && numVal > param.maxValue * 0.9) return 'warning';
    return 'ok';
  };

  // ===== BƯỚC 5: Lưu nhật ký =====
  const handleSubmit = async () => {
    if (!selectedShift || !selectedEngine) {
      notifyWarning('Vui lòng chọn ca trực và máy cần kiểm tra');
      return;
    }

    const values = Object.entries(paramValues)
      .filter(([, val]) => val !== '' && val !== null)
      .map(([paramId, value]) => ({
        parameterId: parseInt(paramId),
        value: parseFloat(value),
      }));

    if (values.length === 0) {
      notifyWarning('Vui lòng nhập ít nhất 1 thông số');
      return;
    }

    try {
      await engineLogService.create({
        shiftId: selectedShift.id,
        engineId: selectedEngine.id,
        note: note,
        values: values,
      });

      notifySuccess(`Ghi nhận kiểm tra "${selectedEngine.engineName}" thành công!`);

      // Refresh lịch sử
      const logs = await engineLogService.getHistoryByShift(selectedShift.id);
      setHistory(logs);

      // Reset form
      setSelectedEngine(null);
      setParamValues({});
      setNote('');
    } catch (error) {
      console.error('Lỗi lưu nhật ký:', error);
      notifyError('Có lỗi xảy ra khi lưu nhật ký');
    }
  };

  // ===== Format =====
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '');
  const formatTime = (d) =>
    d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

  const statusBorderColor = (status) =>
    status === 'danger' ? '#dc2626' : status === 'warning' ? '#f59e0b' : undefined;

  const isCompleted = selectedVoyage?.status === 'Completed';

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
          <PageHeader
            icon={<DashboardOutlined style={{ color: '#2563eb' }} />}
            breadcrumb="Engine Log"
            title="Nhật ký Kiểm tra Máy"
          />
          <Card>
            <Empty
              description={
                <div>
                  <p>Không có hải trình nào.</p>
                  <p>Hệ thống tự động lấy danh sách hải trình mà bạn đã hoặc đang tham gia.</p>
                </div>
              }
            />
          </Card>
        </div>
      </MasterLayout>
    );
  }

  const historyColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      render: (d) => formatTime(d),
    },
    {
      title: 'Máy',
      key: 'engine',
      render: (_, log) => (
        <strong>{log.EngineLog?.Engine?.engineName || 'N/A'}</strong>
      ),
    },
    {
      title: 'Thông số đo',
      key: 'values',
      render: (_, log) =>
        log.EngineLog?.EngineLogValues?.map((v) => {
          const param = v.EngineParameter;
          const color =
            param?.maxValue && v.value > param.maxValue
              ? 'red'
              : param?.maxValue && v.value > param.maxValue * 0.9
              ? 'orange'
              : 'green';
          return (
            <Tag key={v.id} color={color} style={{ marginBottom: 4 }}>
              {param?.name}: {v.value}
            </Tag>
          );
        }),
    },
    {
      title: 'Ghi chú',
      key: 'note',
      render: (_, log) => log.EngineLog?.note || log.content,
    },
  ];

  return (
    <MasterLayout>
      <div style={{ padding: '24px 32px' }}>
        {/* Header */}
        <PageHeader
          icon={<DashboardOutlined style={{ color: '#2563eb' }} />}
          breadcrumb="Engine Log"
          title="Nhật ký Kiểm tra Máy"
        />

        {/* Chọn Hải trình và Ca trực */}
        <Card style={{ marginBottom: 16 }}>
          <Space size={48} wrap align="start">
            <div style={{ minWidth: 320 }}>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary">
                  <CompassOutlined /> Chọn Hải trình
                </Text>
              </div>
              <Select
                style={{ width: '100%' }}
                value={selectedVoyage?.id || undefined}
                onChange={handleVoyageChange}
                options={voyages.map((v) => ({
                  value: v.id,
                  label: `${v.Ship?.shipName} | ${v.departurePort} → ${v.destinationPort} (${v.status})`,
                }))}
              />
            </div>
            <div style={{ minWidth: 320 }}>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary">
                  <ClockCircleOutlined /> Chọn Ca trực
                </Text>
              </div>
              <Select
                style={{ width: '100%' }}
                placeholder="-- Chọn ca trực --"
                allowClear
                value={selectedShift?.id || undefined}
                onChange={handleShiftChange}
                options={shifts.map((s) => ({
                  value: s.id,
                  label: `${s.CrewProfile?.fullName} | ${formatTime(s.startTime)} - ${formatTime(
                    s.endTime
                  )} (${s.status})`,
                }))}
              />
            </div>
          </Space>
        </Card>

        {/* Cảnh báo hải trình đã kết thúc */}
        {isCompleted && selectedShift && (
          <Alert
            message="Hải trình này đã kết thúc"
            description="Bạn chỉ có thể xem lại lịch sử kiểm tra chứ không thể thêm mới."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Danh sách Máy (Chỉ hiện khi đã chọn ca trực và hải trình chưa hoàn thành) */}
        {selectedShift && !isCompleted && (
          <>
            <Title level={5} style={{ marginBottom: 12 }}>
              Chọn máy cần kiểm tra ({engines.length} máy)
            </Title>
            <Row gutter={[16, 16]}>
              {engines.map((engine) => (
                <Col xs={24} sm={12} lg={8} key={engine.id}>
                  <Card
                    hoverable
                    onClick={() => handleSelectEngine(engine)}
                    style={{
                      borderColor: selectedEngine?.id === engine.id ? '#1677ff' : undefined,
                      borderWidth: selectedEngine?.id === engine.id ? 2 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0 }}>{engine.engineName}</h4>
                      <Tag color={engine.engineType?.includes('2') ? 'blue' : 'gold'}>
                        {engine.engineType?.includes('2') ? 'Máy chính' : 'Máy đèn'}
                      </Tag>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Tag>{engine.status}</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {engine.EngineParameters?.length || 0} thông số cần kiểm tra
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}

        {/* Form nhập thông số (Chỉ hiện khi đã chọn máy) */}
        {selectedEngine && !isCompleted && (
          <Card
            style={{ marginTop: 16 }}
            title={`Kiểm tra: ${selectedEngine.engineName} (${selectedEngine.engineType})`}
          >
            <Row gutter={[16, 16]}>
              {selectedEngine.EngineParameters?.map((param) => {
                const status = getValueStatus(param, paramValues[param.id]);
                return (
                  <Col xs={24} sm={12} lg={8} key={param.id}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{param.name}</div>
                    <InputNumber
                      style={{ width: '100%', borderColor: statusBorderColor(status) }}
                      placeholder="Nhập giá trị"
                      min={0}
                      value={paramValues[param.id] === '' ? null : paramValues[param.id]}
                      onChange={(value) => handleParamChange(param.id, value === null ? '' : value)}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {param.maxValue != null && `Max: ${param.maxValue}`}
                    </Text>
                  </Col>
                );
              })}
            </Row>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>
                Ghi chú (Tình trạng máy, vấn đề phát hiện...)
              </label>
              <TextArea
                rows={3}
                placeholder="VD: Máy chạy ổn định, không có tiếng kêu bất thường..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setSelectedEngine(null)}>Hủy</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
                Lưu Nhật ký
              </Button>
            </div>
          </Card>
        )}

        {/* Lịch sử kiểm tra trong ca trực này */}
        {selectedShift && (
          <Card title="Lịch sử kiểm tra trong ca này" style={{ marginTop: 16 }}>
            <Table
              rowKey="id"
              columns={historyColumns}
              dataSource={history}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              locale={{ emptyText: 'Chưa có kiểm tra nào trong ca trực này.' }}
            />
          </Card>
        )}
      </div>
    </MasterLayout>
  );
}
