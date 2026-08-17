import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
  Alert,
  Modal,
  Row,
  Col,
} from 'antd';
import { AppstoreOutlined, SaveOutlined } from '@ant-design/icons';
import AdminLayout from '../components/AdminLayout';
import MasterLayout from '../components/MasterLayout';
import { cargoService, cargoTypeService } from '../services/api';
import { PageHeader, PageContainer } from '../components/common';
import { notifySuccess, notifyError } from '../utils/feedback';

const { Option } = Select;

const ADD_CARGO_TYPE = '__add__';
const MAX_CARGO_NAME_LENGTH = 255;
const MAX_CARGO_QUANTITY = 999999;
const MAX_CARGO_MEASUREMENT = 999999999;

export default function AddCargoPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = user.role === 'Admin' ? AdminLayout : MasterLayout;
  const canEdit = user.role === 'Admin';

  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargoTypes, setCargoTypes] = useState([]);

  // Modal tạo loại hàng mới
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeForm] = Form.useForm();
  const [creatingType, setCreatingType] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const loadCargoTypes = () =>
    cargoTypeService.getAll()
      .then(res => { if (res.success) setCargoTypes(res.data); })
      .catch(() => {}); // Không chặn form nếu lỗi tải loại hàng

  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      Promise.all([
        cargoTypeService.getAll().catch(() => ({ success: false, data: [] })),
        cargoService.getById(id)
      ]).then(([typesRes, cargoRes]) => {
        const fetchedTypes = typesRes.success ? typesRes.data : [];
        setCargoTypes(fetchedTypes);

        if (cargoRes.success && cargoRes.data) {
          const c = cargoRes.data;
          if (c.Voyage || c.voyageId) {
            notifyError('Lô hàng đã thuộc hải trình nên không thể chỉnh sửa.');
            navigate(`/cargos/view/${id}`, { replace: true });
            return;
          }
          const cType = fetchedTypes.find(t => t.name === c.cargoType);
          if (cType) setSelectedUnit(cType.defaultUnit);
          else if (c.unit) setSelectedUnit(c.unit);

          form.setFieldsValue({
            voyageId: c.voyageId || '',
            cargoName: c.cargoName || '',
            cargoType: c.cargoType || undefined,
            quantity: c.quantity || undefined,
            totalWeight: c.totalWeight ?? null,
            totalVolume: c.totalVolume ?? null,
            status: c.status || 'Đã ở cảng',
          });
        }
      }).catch(err => {
        console.error('Lỗi tải thông tin lô hàng:', err);
        setError('Không thể tải thông tin lô hàng.');
      }).finally(() => setLoading(false));
    } else {
      loadCargoTypes();
    }
  }, [id, isEditMode, form, navigate]);

  const handleCargoTypeChange = (value) => {
    if (value === ADD_CARGO_TYPE) {
      // Bỏ chọn giá trị giả rồi mở modal tạo loại hàng mới
      form.setFieldValue('cargoType', undefined);
      typeForm.resetFields();
      typeForm.setFieldsValue({ defaultUnit: 'MT', stowageFactor: 1.0 });
      setTypeModalOpen(true);
      return;
    }

    // Tự động tính thể tích chiếm chỗ theo SF của loại hàng được chọn
    const selectedType = cargoTypes.find(t => t.name === value);
    if (selectedType) {
      setSelectedUnit(selectedType.defaultUnit);
    } else {
      setSelectedUnit(null);
    }

    const weight = form.getFieldValue('totalWeight');
    if (selectedType && selectedType.stowageFactor && weight !== undefined && weight !== null && weight !== '') {
      const sf = Number(selectedType.stowageFactor) || 1.0;
      const numWeight = Number(weight) || 0;
      if (numWeight > 0) {
        form.setFieldValue('totalVolume', Number((numWeight * sf).toFixed(2)));
      }
    }
  };

  const handleWeightChange = (weight) => {
    const currentType = form.getFieldValue('cargoType');
    const selectedType = cargoTypes.find(t => t.name === currentType);
    if (selectedType && selectedType.stowageFactor && weight !== undefined && weight !== null) {
      const sf = Number(selectedType.stowageFactor) || 1.0;
      const numWeight = Number(weight) || 0;
      if (numWeight > 0) {
        form.setFieldValue('totalVolume', Number((numWeight * sf).toFixed(2)));
      }
    }
  };

  const handleCreateCargoType = async () => {
    try {
      const values = await typeForm.validateFields();
      const payload = {
        name: values.name.trim(),
        defaultUnit: values.defaultUnit || 'MT',
        stowageFactor: values.stowageFactor ?? 1.0,
        description: (values.description || '').trim(),
      };
      setCreatingType(true);
      const res = await cargoTypeService.create(payload);
      await loadCargoTypes();
      form.setFieldValue('cargoType', res.data?.name || payload.name);
      setSelectedUnit(payload.defaultUnit);
      // Tự động tính volume theo SF mới tạo
      const weight = form.getFieldValue('totalWeight');
      if (weight && payload.stowageFactor) {
        form.setFieldValue('totalVolume', Number((weight * payload.stowageFactor).toFixed(2)));
      }
      setTypeModalOpen(false);
      notifySuccess('Loại hàng mới đã được tạo.');
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate form, giữ modal mở
      notifyError(err.response?.data?.message || 'Không thể tạo loại hàng.');
    } finally {
      setCreatingType(false);
    }
  };

  const handleSubmit = async (values) => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        voyageId: values.voyageId || '',
        cargoName: values.cargoName,
        cargoType: values.cargoType || '',
        totalWeight: values.totalWeight ?? '',
        totalVolume: values.totalVolume ?? '',
        quantity: values.quantity ?? null,
        unit: selectedUnit || null,
        status: values.status || 'Đã ở cảng',
      };
      if (isEditMode) {
        await cargoService.update(id, payload);
      } else {
        await cargoService.create(payload);
      }
      navigate('/cargos');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu lô hàng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageContainer style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <PageHeader
          onBack={() => navigate('/cargos')}
          title={
            <>
              <AppstoreOutlined style={{ color: '#6366f1', marginRight: 8 }} />
              {isEditMode ? 'Cập nhật Lô hàng' : 'Thêm Lô hàng Mới'}
            </>
          }
        />

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 20 }} />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: 'Đã ở cảng' }}
        >
          <Card title="Thông tin cơ bản" style={{ marginBottom: 16 }}>
            <Form.Item
              label="Tên Lô Hàng"
              name="cargoName"
              rules={[
                { required: true, whitespace: true, message: 'Vui lòng nhập tên lô hàng' },
                { max: MAX_CARGO_NAME_LENGTH, message: `Tên lô hàng tối đa ${MAX_CARGO_NAME_LENGTH} ký tự` },
              ]}
            >
              <Input maxLength={MAX_CARGO_NAME_LENGTH} showCount placeholder="VD: Gạo trắng 5% tấm..." />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Loại Hàng" name="cargoType">
                  <Select
                    placeholder="-- Chọn loại hàng --"
                    allowClear
                    onChange={handleCargoTypeChange}
                  >
                    {cargoTypes.map(t => (
                      <Option key={t.id} value={t.name}>{t.name}</Option>
                    ))}
                    {canEdit && <Option value={ADD_CARGO_TYPE}>➕ Tạo loại hàng mới…</Option>}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Trạng Thái" name="status">
                  <Input readOnly disabled />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="Khối lượng & Thể tích" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              {['TEU', 'BAG', 'PCS', 'BBL'].includes(selectedUnit) && (
                <Col xs={24} md={12}>
                  <Form.Item
                    label={`Số Lượng (${selectedUnit})`}
                    name="quantity"
                    rules={[
                      { required: true, message: 'Vui lòng nhập số lượng' },
                      { type: 'number', min: 1, max: MAX_CARGO_QUANTITY, message: `Số lượng phải từ 1 đến ${MAX_CARGO_QUANTITY.toLocaleString('vi-VN')}` }
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={MAX_CARGO_QUANTITY}
                      precision={0}
                      placeholder={`VD: 500`}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} md={['TEU', 'BAG', 'PCS', 'BBL'].includes(selectedUnit) ? 12 : 12}>
                <Form.Item
                  label="Tổng Khối Lượng (Tấn)"
                  name="totalWeight"
                  rules={[
                    { required: true, message: 'Vui lòng nhập tổng khối lượng' },
                    { type: 'number', min: 0.01, max: MAX_CARGO_MEASUREMENT, message: `Khối lượng phải từ 0,01 đến ${MAX_CARGO_MEASUREMENT.toLocaleString('vi-VN')} tấn` }
                  ]}
                >
                  <InputNumber
                    step={0.01}
                    min={0.01}
                    max={MAX_CARGO_MEASUREMENT}
                    placeholder="VD: 2750"
                    style={{ width: '100%' }}
                    onChange={handleWeightChange}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Tổng Thể Tích Chiếm Chỗ (m³)"
                  name="totalVolume"
                  extra="Tự động ước tính: Thể tích = Khối lượng × Hệ số SF của loại hàng"
                  rules={[
                    { type: 'number', min: 0.01, max: MAX_CARGO_MEASUREMENT, message: `Thể tích phải từ 0,01 đến ${MAX_CARGO_MEASUREMENT.toLocaleString('vi-VN')} m³` }
                  ]}
                >
                  <InputNumber step={0.01} min={0.01} max={MAX_CARGO_MEASUREMENT} placeholder="VD: 3200" style={{ width: '100%' }} disabled />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
            <Button onClick={() => navigate('/cargos')}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              {isEditMode ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        </Form>
      </PageContainer>

      <Modal
        title="Thêm loại hàng mới"
        open={typeModalOpen}
        onOk={handleCreateCargoType}
        onCancel={() => setTypeModalOpen(false)}
        okText="Tạo"
        cancelText="Hủy"
        confirmLoading={creatingType}
        destroyOnHidden
      >
        <Form
          form={typeForm}
          layout="vertical"
          initialValues={{ defaultUnit: 'MT', stowageFactor: 1.0 }}
        >
          <Form.Item
            label="Tên loại hàng"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên loại hàng' }]}
          >
            <Input placeholder="Tên loại hàng (VD: Gạo, Than đá, Sắt thép, Bông sợi...)" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="Đơn vị tính"
              name="defaultUnit"
              rules={[{ required: true, message: 'Vui lòng chọn đơn vị tính' }]}
            >
              <Select placeholder="Chọn đơn vị">
                <Option value="MT">MT (Tấn)</Option>
                <Option value="TEU">TEU (Cont 20ft)</Option>
                <Option value="BAG">BAG (Bao)</Option>
                <Option value="PCS">PCS (Kiện/Cái)</Option>
                <Option value="BBL">BBL (Thùng phuy)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Hệ số chất xếp (SF - m³/MT)"
              name="stowageFactor"
              rules={[
                { required: true, message: 'Vui lòng nhập hệ số SF' },
                { type: 'number', min: 0.05, max: 20, message: 'Hệ số phải từ 0.05 đến 20' }
              ]}
            >
              <InputNumber step={0.05} min={0.05} max={20} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item label="Mô tả" name="description">
            <Input placeholder="Mô tả (tuỳ chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
