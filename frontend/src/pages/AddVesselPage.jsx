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
  Table,
  Tag,
  Space,
  Typography,
  Radio,
  Divider,
} from 'antd';
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
} from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import { vesselService } from '../services/api';
import { notifyError, notifySuccess, notifyWarning } from '../utils/feedback';

const { Title, Text } = Typography;

export default function AddVesselPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const requiredTag = <span style={{ marginLeft: 6, fontSize: 11, color: '#ea580c', fontWeight: 500, fontStyle: 'italic' }}>(Bắt buộc)</span>;

  // Basic Info State
  const [basicInfo, setBasicInfo] = useState({
    shipName: '',
    imoNumber: '',
    flag: '',
    status: 'Active',
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

  // 3 thông số bắt buộc (fix cứng, không xóa được)
  const REQUIRED_PARAMS = ['Fuel Oil Pressure (kg/cm²)', 'Exhaust Gas Temp XL2 (°C)', 'Cooling Water Temp (°C)'];

  // 9 thông số kỹ thuật bổ sung (tùy chọn thêm)
  const PARAM_OPTIONS = [
    'RPM (Main Engine)',
    'Scavenge Pressure (kg/cm²)',
    'Air Pressure (kg/cm²)',
    'Start Air Pressure (kg/cm²)',
    'Lube Oil Temperature (°C)',
    'Exhaust Gas Temp XL3 (°C)',
    'Exhaust Gas Temp XL4 (°C)',
    'Exhaust Gas Temp XL5 (°C)',
    'Exhaust Gas Temp XL6 (°C)',
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
    engineType: 'Diesel 2-kỳ',
    status: 'Active',
    parameters: makeRequiredParams(),
  });

  const [generatorEngines, setGeneratorEngines] = useState([
    {
      id: 1,
      engineName: '',
      engineType: 'Diesel 4-kỳ',
      status: 'Active',
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
            status: data.status || 'Active',
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
            const me =
              data.Engines.find((e) => e.engineType === 'Main Engine' || e.engineType === 'Diesel 2-kỳ') ||
              data.Engines[0];
            if (me) {
              // Load params từ DB, đánh dấu required
              const dbParams = (me.EngineParameters || []).map((p, i) => ({
                _uid: i + 1,
                id: p.id,
                name: p.name,
                minValue: p.minValue ?? '',
                maxValue: p.maxValue ?? '',
                fixed: REQUIRED_PARAMS.includes(p.name),
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
                engineName: me.engineName,
                engineType: me.engineType,
                status: me.status,
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
                    name: p.name,
                    minValue: p.minValue ?? '',
                    maxValue: p.maxValue ?? '',
                    fixed: REQUIRED_PARAMS.includes(p.name),
                  }));
                  let uid = dbParams.length + 1;
                  for (const rp of REQUIRED_PARAMS) {
                    if (!dbParams.some((p) => p.name === rp)) {
                      dbParams.unshift({ _uid: uid++, name: rp, minValue: '', maxValue: '', fixed: true });
                    }
                  }
                  return {
                    id: g.id,
                    engineName: g.engineName,
                    engineType: g.engineType,
                    status: g.status,
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
                name: h.holdName,
                capacity: h.maxCapacity,
              }))
            );
          }


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
        engineType: 'Diesel 4-kỳ',
        status: 'Active',
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



  const handleSubmit = async () => {
    // Validation: Các trường bắt buộc
    if (!basicInfo.shipName || !basicInfo.imoNumber) {
      notifyWarning('Vui lòng nhập đầy đủ Tên tàu và Mã số IMO.');
      return;
    }

    if (!/^\d{7}$/.test(basicInfo.imoNumber)) {
      notifyWarning('Mã số IMO phải bao gồm chính xác 7 chữ số.');
      return;
    }

    if (!capacity.maxWeight || !capacity.maxVolume) {
      notifyWarning('Vui lòng nhập đầy đủ Tải trọng Max và Thể tích Max.');
      return;
    }

    if (!mainEngine.engineName) {
      notifyWarning('Vui lòng nhập Tên động cơ cho Máy chính.');
      return;
    }

    // Validation: Thông số an toàn bắt buộc cho máy chính
    const missingMainParams = mainEngine.parameters.filter(p => p.fixed && (p.maxValue === '' || p.maxValue === null));
    if (missingMainParams.length > 0) {
      notifyWarning(`Vui lòng nhập đủ các hạn mức chỉ số an toàn bắt buộc cho Máy chính.`);
      return;
    }

    // Validation: Thông số an toàn bắt buộc cho máy đèn
    for (const gen of generatorEngines) {
      if (!gen.engineName) {
        notifyWarning(`Vui lòng nhập Tên máy cho các máy đèn.`);
        return;
      }
      const missingGenParams = gen.parameters.filter(p => p.fixed && (p.maxValue === '' || p.maxValue === null));
      if (missingGenParams.length > 0) {
        notifyWarning(`Vui lòng nhập đủ các hạn mức chỉ số an toàn bắt buộc cho Máy đèn (${gen.engineName || 'chưa có tên'}).`);
        return;
      }
    }

    // Validation: Tổng thể tích khoang KHÔNG ĐƯỢC VƯỢT QUÁ Thể tích Max của tàu
    if (holds && holds.length > 0 && capacity && capacity.maxVolume) {
      const totalHoldsVolume = holds.reduce((sum, h) => sum + (parseFloat(h.capacity) || 0), 0);
      const shipMaxVolume = parseFloat(capacity.maxVolume) || 0;

      if (totalHoldsVolume > shipMaxVolume) {
        notifyWarning(
          `Tổng thể tích các khoang (${totalHoldsVolume.toLocaleString()} m³) đang vượt quá Thể tích Max của tàu (${shipMaxVolume.toLocaleString()} m³). Vui lòng phân bổ lại sức chứa khoang hàng cho hợp lý!`,
          5
        );
        return; // Dừng việc submit
      }
    }

    try {
      const payload = {
        basicInfo,
        capacity,
        mainEngine,
        generatorEngines,
        holds,
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
      notifyError('Có lỗi hệ thống xảy ra khi lưu thông tin tàu. Vui lòng thử lại sau.');
    }
  };

  // Render label cho 3 thông số bắt buộc
  const requiredParamLabel = (name) => {
    if (name === 'Fuel Oil Pressure (kg/cm²)')
      return (
        <Space size={4}>
          <DashboardOutlined /> Fuel Oil Pressure
        </Space>
      );
    if (name === 'Exhaust Gas Temp XL2 (°C)')
      return (
        <Space size={4}>
          <FireOutlined /> Exhaust Gas Temp XL2
        </Space>
      );
    return (
      <Space size={4}>
        <CloudOutlined /> Cooling Water Temp
      </Space>
    );
  };

  const requiredParamPlaceholder = (name) =>
    name === 'Fuel Oil Pressure (kg/cm²)' ? 'vd: 6.0' : name === 'Exhaust Gas Temp XL2 (°C)' ? 'vd: 420' : 'vd: 75';

  // Render khối thông số cho 1 động cơ (dùng chung cho máy chính & máy đèn)
  const renderParameters = (params, onChange, onAdd, onRemove) => {
    const fixedParams = params.filter((p) => p.fixed);
    const extraParams = params.filter((p) => !p.fixed);
    return (
      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
        <Text strong>Hạn mức chỉ số an toàn (Bắt buộc)</Text>
        <Row gutter={12} style={{ marginTop: 8 }}>
          {fixedParams.map((param) => (
            <Col xs={24} sm={8} key={param._uid}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>{requiredParamLabel(param.name)} {requiredTag}</div>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder={requiredParamPlaceholder(param.name)}
                value={param.maxValue === '' ? null : param.maxValue}
                onChange={(value) => onChange(param._uid, 'maxValue', value ?? '')}
              />
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
                placeholder="Max"
                min={0}
                value={param.maxValue === '' ? null : param.maxValue}
                onChange={(value) => onChange(param._uid, 'maxValue', value ?? '')}
              />
            </Col>
            <Col>
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(param._uid)} />
            </Col>
          </Row>
        ))}
      </div>
    );
  };



  const engineStatusOptions = [
    { label: 'Hoạt động', value: 'Active' },
    { label: 'Tạm ngưng', value: 'Inactive' },
  ];

  return (
    <AgencyLayout>
      <div style={{ padding: '24px 32px' }}>
        <Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
          {isEditMode ? 'Cập nhật Thông tin Tàu' : 'Thêm Tàu Mới'}
        </Title>

        <Row gutter={24}>
          {/* LEFT COLUMN */}
          <Col xs={24} lg={14}>
            {/* Card: Basic Info */}
            <Card
              title={
                <Space>
                  <InfoCircleOutlined /> THÔNG TIN CƠ BẢN (SHIP)
                </Space>
              }
              style={{ marginBottom: 20 }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, fontWeight: 600 }}>
                    Tên Tàu {requiredTag}
                  </div>
                  <Input
                    placeholder="Ví dụ: Blue Atlantic Voyager"
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
                  <div style={{ marginBottom: 4 }}>Quốc tịch (Flag)</div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Chọn quốc gia treo cờ"
                    allowClear
                    value={basicInfo.flag || undefined}
                    onChange={(value) => setBasicInfo({ ...basicInfo, flag: value || '' })}
                    options={[
                      { label: 'Việt Nam', value: 'VN' },
                      { label: 'Panama', value: 'PA' },
                      { label: 'Liberia', value: 'LR' },
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
                      { label: 'Active', value: 'Active' },
                      { label: 'Bảo trì', value: 'Maintenance' },
                      { label: 'Ngừng h.động', value: 'Inactive' },
                    ]}
                  />
                </Col>
              </Row>
            </Card>

            {/* Card: Tech Specs & Equipment */}
            <Card
              title={
                <Space>
                  <SettingOutlined /> THÔNG SỐ KỸ THUẬT & THIẾT BỊ
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
                      options={engineStatusOptions}
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

              {/* Generator Engine Section */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Máy đèn (Generator)
                  </Title>
                  <Button type="link" icon={<PlusOutlined />} onClick={addGeneratorEngine}>
                    Thêm máy đèn
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
                      <Text strong>Máy đèn #{index + 1}</Text>
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
                          options={engineStatusOptions}
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
          </Col>

          {/* RIGHT COLUMN */}
          <Col xs={24} lg={10}>
            {/* Card: Capacity */}
            <Card
              title={
                <Space>
                  <InboxOutlined /> SỨC CHỨA & TẢI TRỌNG
                </Space>
              }
              style={{ marginBottom: 20 }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, fontWeight: 600 }}>Tải trọng Max (Tấn) {requiredTag}</div>
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="50000"
                    value={capacity.maxWeight === '' ? null : capacity.maxWeight}
                    onChange={(value) => setCapacity({ ...capacity, maxWeight: value ?? '' })}
                  />
                </Col>
                <Col xs={24} sm={12} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, fontWeight: 600 }}>Thể tích Max (m³) {requiredTag}</div>
                  <InputNumber
                    style={{ width: '100%' }}
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
                  <Text strong>Khoang chứa (Cargo Holds)</Text>
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
                          value={hold.name}
                          onChange={(e) => handleHoldChange(hold.id, 'name', e.target.value)}
                        />
                        <Space size={4}>
                          <Text type="secondary">Sức chứa:</Text>
                          <InputNumber
                            style={{ width: 120 }}
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
          </Col>
        </Row>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button onClick={() => navigate(-1)}>Hủy bỏ</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
            Lưu hồ sơ tàu
          </Button>
        </div>
      </div>
    </AgencyLayout>
  );
}
