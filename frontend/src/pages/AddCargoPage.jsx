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
} from 'antd';
import { AppstoreOutlined, SaveOutlined } from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import MasterLayout from '../components/MasterLayout';
import { cargoService, cargoTypeService } from '../services/api';
import { PageHeader } from '../components/common';
import { notifySuccess, notifyError } from '../utils/feedback';

const { Option } = Select;

const ADD_CARGO_TYPE = '__add__';

export default function AddCargoPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;
  const canEdit = user.role === 'Admin';

  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargoTypes, setCargoTypes] = useState([]);

  // Modal tạo loại hàng mới
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeForm] = Form.useForm();
  const [creatingType, setCreatingType] = useState(false);

  const loadCargoTypes = () =>
    cargoTypeService.getAll()
      .then(res => { if (res.success) setCargoTypes(res.data); })
      .catch(() => {}); // Không chặn form nếu lỗi tải loại hàng

  useEffect(() => {
    loadCargoTypes();

    if (isEditMode) {
      cargoService.getById(id).then(res => {
        if (res.success && res.data) {
          const c = res.data;
          form.setFieldsValue({
            voyageId: c.voyageId || '',
            cargoName: c.cargoName || '',
            cargoType: c.cargoType || undefined,
            totalWeight: c.totalWeight ?? null,
            totalVolume: c.totalVolume ?? null,
            status: c.status || 'Đã ở cảng',
          });
        }
      }).catch(err => {
        console.error('Lỗi tải thông tin lô hàng:', err);
        setError('Không thể tải thông tin lô hàng.');
      });
    }
  }, [id, isEditMode, form]);

  const handleCargoTypeChange = (value) => {
    if (value === ADD_CARGO_TYPE) {
      // Bỏ chọn giá trị giả rồi mở modal tạo loại hàng mới
      form.setFieldValue('cargoType', undefined);
      typeForm.resetFields();
      setTypeModalOpen(true);
    }
  };

  const handleCreateCargoType = async () => {
    try {
      const values = await typeForm.validateFields();
      const payload = { name: values.name.trim(), description: (values.description || '').trim() };
      setCreatingType(true);
      const res = await cargoTypeService.create(payload);
      await loadCargoTypes();
      form.setFieldValue('cargoType', res.data?.name || payload.name);
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
      <div style={{ padding: '24px 32px', maxWidth: '900px', margin: '0 auto' }}>
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

        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ status: 'Đã ở cảng' }}
          >
            <Form.Item
              label="Tên Lô Hàng"
              name="cargoName"
              rules={[{ required: true, message: 'Vui lòng nhập tên lô hàng' }]}
            >
              <Input placeholder="VD: Vietnam White Rice 5% Broken..." />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
              <Form.Item label="Trạng Thái" name="status">
                <Input readOnly disabled />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <Form.Item
                label="Tổng Khối Lượng (Tấn)"
                name="totalWeight"
                rules={[{ required: true, message: 'Vui lòng nhập tổng khối lượng' }]}
              >
                <InputNumber step={0.01} placeholder="VD: 2750" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Tổng Thể Tích (m³)" name="totalVolume">
                <InputNumber step={0.01} placeholder="VD: 3200" style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
              <Button onClick={() => navigate('/cargos')}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                {isEditMode ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </Form>
        </Card>
      </div>

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
        <Form form={typeForm} layout="vertical">
          <Form.Item
            label="Tên loại hàng"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên loại hàng' }]}
          >
            <Input placeholder="Tên loại hàng (VD: Rice)" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input placeholder="Mô tả (tuỳ chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
