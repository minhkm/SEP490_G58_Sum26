import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  Form,
  Card,
  Alert,
  Modal,
  Tag,
  Row,
  Col,
  Statistic,
  Tooltip,
  Space,
  Typography,
} from 'antd';
import {
  TagsOutlined,
  PlusOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  DashboardOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import AdminLayout from '../components/AdminLayout';
import MasterLayout from '../components/MasterLayout';
import { cargoTypeService } from '../services/api';
import { PageHeader, PageContainer, RowActions, notifySuccess, notifyError, confirmDelete } from '../components/common';

const { Text } = Typography;
const { Option } = Select;

// Đơn vị tính phổ biến trong hàng hải
const UNIT_OPTIONS = [
  { value: 'MT', label: 'MT (Tấn)' },
  { value: 'CBM', label: 'CBM (m³)' },
  { value: 'TEU', label: 'TEU (Container 20ft)' },
  { value: 'BAG', label: 'BAG (Bao)' },
  { value: 'PCS', label: 'PCS (Kiện / Cái)' },
  { value: 'BBL', label: 'BBL (Thùng phuy)' },
];

export default function CargoTypePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = user.role === 'Admin' ? AdminLayout : MasterLayout;
  const canEdit = user.role === 'Admin';

  const [cargoTypes, setCargoTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tìm kiếm
  const [searchText, setSearchText] = useState('');

  // Modal Thêm loại hàng
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addSaving, setAddSaving] = useState(false);

  // Modal Sửa loại hàng
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = () =>
    cargoTypeService.getAll()
      .then(res => {
        if (res.success) setCargoTypes(res.data || []);
      })
      .catch(() => setError('Không thể tải danh sách loại hàng hóa.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchData();
  }, []);

  // Lọc dữ liệu theo ô tìm kiếm
  const filteredData = useMemo(() => {
    return cargoTypes.filter(item => {
      return (
        !searchText ||
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
      );
    });
  }, [cargoTypes, searchText]);

  // Thống kê nhanh theo chuẩn hàng hải (40 cu.ft/tấn = 1.13 m³/tấn)
  const stats = useMemo(() => {
    const total = cargoTypes.length;
    const heavyCount = cargoTypes.filter(c => (c.stowageFactor ?? 1.0) < 1.13).length;
    const lightCount = cargoTypes.filter(c => (c.stowageFactor ?? 1.0) >= 1.13).length;
    return { total, heavyCount, lightCount };
  }, [cargoTypes]);

  // Xử lý Thêm loại hàng
  const handleAddSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      setAddSaving(true);
      setError('');
      await cargoTypeService.create({
        name: values.name.trim(),
        defaultUnit: values.defaultUnit || 'MT',
        stowageFactor: values.stowageFactor ?? 1.0,
        description: (values.description || '').trim(),
      });
      addForm.resetFields();
      setAddModalOpen(false);
      await fetchData();
      notifySuccess(`Đã thêm loại hàng "${values.name}" thành công.`);
    } catch (err) {
      if (err?.errorFields) return;
      notifyError(err.response?.data?.message || 'Lỗi thêm loại hàng.');
    } finally {
      setAddSaving(false);
    }
  };

  // Mở modal sửa
  const openEdit = (type) => {
    setEditing(type);
    editForm.setFieldsValue({
      name: type.name || '',
      defaultUnit: type.defaultUnit || 'MT',
      stowageFactor: type.stowageFactor ?? 1.0,
      description: type.description || '',
    });
    setEditModalOpen(true);
  };

  // Xử lý Lưu sửa loại hàng
  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      setEditSaving(true);
      await cargoTypeService.update(editing.id, {
        name: values.name.trim(),
        defaultUnit: values.defaultUnit || 'MT',
        stowageFactor: values.stowageFactor ?? 1.0,
        description: (values.description || '').trim(),
      });
      setEditModalOpen(false);
      setEditing(null);
      await fetchData();
      notifySuccess(`Cập nhật loại hàng "${values.name}" thành công.`);
    } catch (err) {
      if (err?.errorFields) return;
      notifyError(err.response?.data?.message || 'Không thể cập nhật loại hàng.');
    } finally {
      setEditSaving(false);
    }
  };

  // Xoá loại hàng
  const handleDelete = async (type) => {
    const confirmed = await confirmDelete({
      title: 'Xoá loại hàng?',
      content: `Bạn có chắc chắn muốn xoá loại hàng "${type.name}" không?`,
    });
    if (!confirmed) return;
    try {
      await cargoTypeService.delete(type.id);
      await fetchData();
      notifySuccess(`Đã xoá loại hàng "${type.name}".`);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể xoá loại hàng.');
    }
  };

  // Cấu hình cột bảng
  const columns = [
    {
      title: 'Tên Loại Hàng',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <TagsOutlined style={{ color: '#6366f1' }} />
          <Text strong style={{ fontSize: '14px' }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Đơn Vị Tính',
      dataIndex: 'defaultUnit',
      key: 'defaultUnit',
      width: 140,
      render: (unit) => (
        <Tag color="blue" style={{ borderRadius: '6px', fontWeight: 500, padding: '2px 8px' }}>
          {unit || 'MT'}
        </Tag>
      ),
    },
    {
      title: (
        <Space size={4} style={{ whiteSpace: 'nowrap' }}>
          <span>Hệ số chất xếp (SF)</span>
          <Tooltip title="Stowage Factor: Thể tích (m³) 1 tấn hàng chiếm chỗ trong hầm tàu. Dùng để tính toán dung tích khoang chứa.">
            <InfoCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'stowageFactor',
      key: 'stowageFactor',
      width: 220,
      render: (sf) => {
        const val = Number(sf ?? 1.0);
        const isHeavy = val < 1.13;
        const badgeColor = isHeavy ? 'volcano' : 'gold';
        const badgeText = isHeavy ? 'Hàng nặng' : 'Hàng nhẹ';
        const tooltipText = isHeavy
          ? 'SF < 1.13 m³/MT (< 40 cu.ft/tấn): Trọng lượng lớn, chiếm ít thể tích (Deadweight Cargo)'
          : 'SF ≥ 1.13 m³/MT (≥ 40 cu.ft/tấn): Trọng lượng nhẹ, chiếm nhiều thể tích hầm (Measurement Cargo)';

        return (
          <Space style={{ whiteSpace: 'nowrap' }}>
            <Text strong style={{ minWidth: 60, display: 'inline-block' }}>
              {val.toFixed(2)} <span style={{ color: '#8c8c8c', fontSize: '12px' }}>m³/MT</span>
            </Text>
            <Tooltip title={tooltipText}>
              <Tag color={badgeColor} style={{ fontSize: '11px', borderRadius: '4px' }}>
                {badgeText}
              </Tag>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'Mô Tả / Đặc Tính',
      dataIndex: 'description',
      key: 'description',
      render: (d) => <span style={{ color: d ? '#4b5563' : '#9ca3af' }}>{d || '—'}</span>,
    },
    ...(canEdit
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            align: 'right',
            width: 100,
            render: (_, type) => (
              <RowActions onEdit={() => openEdit(type)} onDelete={() => handleDelete(type)} />
            ),
          },
        ]
      : []),
  ];

  return (
    <Layout>
      <PageContainer style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <PageHeader
          onBack={() => navigate('/cargos')}
          title={
            <Space>
              <TagsOutlined style={{ color: '#6366f1', fontSize: '24px' }} />
              <span>Quản lý Loại Hàng hóa</span>
            </Space>
          }
          extra={
            canEdit && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  addForm.resetFields();
                  addForm.setFieldsValue({ defaultUnit: 'MT', stowageFactor: 1.0 });
                  setAddModalOpen(true);
                }}
                style={{ borderRadius: '6px' }}
              >
                Thêm loại hàng mới
              </Button>
            )
          }
        />

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 20, borderRadius: '8px' }} />
        )}

        {/* Thống kê nhanh (Mini Stats) */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title="Tổng số loại hàng"
                value={stats.total}
                prefix={<TagsOutlined style={{ color: '#6366f1', marginRight: 6 }} />}
                suffix="loại"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title="Hàng nặng (SF < 1.13)"
                value={stats.heavyCount}
                prefix={<DashboardOutlined style={{ color: '#ef4444', marginRight: 6 }} />}
                suffix="loại"
                valueStyle={{ color: '#dc2626' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title="Hàng nhẹ (SF ≥ 1.13)"
                value={stats.lightCount}
                prefix={<InboxOutlined style={{ color: '#f59e0b', marginRight: 6 }} />}
                suffix="loại"
                valueStyle={{ color: '#d97706' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Thanh tìm kiếm */}
        <Card style={{ marginBottom: 20, borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Input
            placeholder="Tìm theo tên hoặc mô tả loại hàng..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 450 }}
          />
        </Card>

        {/* Bảng dữ liệu */}
        <Card style={{ borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} loại hàng hóa`,
            }}
            locale={{
              emptyText: `Chưa có loại hàng nào phù hợp.${canEdit ? ' Bấm nút "+ Thêm loại hàng mới" để tạo.' : ''}`,
            }}
          />
        </Card>
      </PageContainer>

      {/* Modal Thêm loại hàng mới */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#6366f1' }} />
            <span>Thêm Loại Hàng hóa Mới</span>
          </Space>
        }
        open={addModalOpen}
        onOk={handleAddSubmit}
        onCancel={() => setAddModalOpen(false)}
        okText="Thêm mới"
        cancelText="Hủy"
        confirmLoading={addSaving}
        destroyOnHidden
        width={500}
      >
        <Form
          form={addForm}
          layout="vertical"
          initialValues={{ defaultUnit: 'MT', stowageFactor: 1.0 }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="Tên Loại Hàng"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên loại hàng' }]}
          >
            <Input placeholder="VD: Gạo, Than đá, Sắt thép, Bông sợi, Ngũ cốc..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Đơn Vị Tính Mặc Định"
                name="defaultUnit"
                rules={[{ required: true, message: 'Vui lòng chọn đơn vị tính' }]}
              >
                <Select placeholder="Chọn đơn vị">
                  {UNIT_OPTIONS.map(u => (
                    <Option key={u.value} value={u.value}>{u.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <Space size={4}>
                    <span>Hệ số SF (m³/MT)</span>
                    <Tooltip title="Thể tích (m³) 1 tấn hàng chiếm chỗ trong khoang tàu. VD: Sắt = 0.45, Than = 1.3, Gạo = 1.45, Bông sợi = 2.8">
                      <InfoCircleOutlined style={{ color: '#1677ff', cursor: 'help' }} />
                    </Tooltip>
                  </Space>
                }
                name="stowageFactor"
                rules={[
                  { required: true, message: 'Vui lòng nhập hệ số SF' },
                  { type: 'number', min: 0.05, max: 20, message: 'Hệ số SF từ 0.05 - 20' },
                ]}
              >
                <InputNumber step={0.05} min={0.05} max={20} style={{ width: '100%' }} placeholder="VD: 1.45" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Mô Tả / Ghi Chú Đặc Tính" name="description">
            <Input.TextArea rows={3} placeholder="VD: Gạo xuất khẩu đóng bao 50kg, than đá công nghiệp..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Sửa loại hàng */}
      <Modal
        title={
          <Space>
            <TagsOutlined style={{ color: '#6366f1' }} />
            <span>Cập nhật Loại Hàng hóa</span>
          </Space>
        }
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalOpen(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={editSaving}
        destroyOnHidden
        width={500}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tên Loại Hàng"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên loại hàng' }]}
          >
            <Input placeholder="Tên loại hàng" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Đơn Vị Tính Mặc Định"
                name="defaultUnit"
                rules={[{ required: true, message: 'Vui lòng chọn đơn vị tính' }]}
              >
                <Select placeholder="Chọn đơn vị">
                  {UNIT_OPTIONS.map(u => (
                    <Option key={u.value} value={u.value}>{u.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <Space size={4}>
                    <span>Hệ số SF (m³/MT)</span>
                    <Tooltip title="Thể tích (m³) 1 tấn hàng chiếm chỗ trong khoang tàu. VD: Sắt = 0.45, Than = 1.3, Gạo = 1.45, Bông sợi = 2.8">
                      <InfoCircleOutlined style={{ color: '#1677ff', cursor: 'help' }} />
                    </Tooltip>
                  </Space>
                }
                name="stowageFactor"
                rules={[
                  { required: true, message: 'Vui lòng nhập hệ số SF' },
                  { type: 'number', min: 0.05, max: 20, message: 'Hệ số SF từ 0.05 - 20' },
                ]}
              >
                <InputNumber step={0.05} min={0.05} max={20} style={{ width: '100%' }} placeholder="VD: 1.45" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Mô Tả / Ghi Chú Đặc Tính" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
