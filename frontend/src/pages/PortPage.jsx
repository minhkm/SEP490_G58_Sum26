import { useState, useEffect, useMemo, useRef } from 'react';
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
  Space,
  Typography,
} from 'antd';
import {
  SettingOutlined,
  PlusOutlined,
  SearchOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import AdminLayout from '../components/AdminLayout';
import MasterLayout from '../components/MasterLayout';
import { portService } from '../services/api';
import { PageHeader, PageContainer, RowActions, notifySuccess, notifyError, confirmDelete } from '../components/common';

// Fix leaflet icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const { Text } = Typography;
const { Option } = Select;

// Component MapSelector để hiển thị vị trí trên bản đồ (View-only)
function MapSelector({ form }) {
  const lat = Form.useWatch('lat', form);
  const lng = Form.useWatch('lng', form);
  const map = useMap();

  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);

  return lat && lng ? <Marker position={[lat, lng]} /> : null;
}

// Component GeoSearchInput để tìm kiếm và tự động điền form
function GeoSearchInput({ form }) {
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const timeoutRef = useRef(null);

  const handleSearch = (value) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!value || value.length < 3) {
      setOptions([]);
      return;
    }
    
    timeoutRef.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5`);
        const data = await res.json();
        const newOptions = data.map(item => ({
          value: item.place_id,
          label: item.display_name,
          raw: item
        }));
        setOptions(newOptions);
      } catch (err) {
        console.error('Geo search error:', err);
      } finally {
        setFetching(false);
      }
    }, 800);
  };

  const handleSelect = (val, opt) => {
    const data = opt.raw;
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lon);
    const country = data.address?.country || '';
    const nameParts = data.display_name.split(', ');
    const portName = nameParts[0] + (country ? ` (${country})` : '');

    form.setFieldsValue({
      portName: form.getFieldValue('portName') || portName,
      country: form.getFieldValue('country') || country,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6))
    });
  };

  return (
    <Select
      showSearch
      placeholder="🔍 Gõ tên cảng để tìm vị trí (VD: Port of Los Angeles...)"
      filterOption={false}
      onSearch={handleSearch}
      onSelect={handleSelect}
      options={options}
      loading={fetching}
      allowClear
      style={{ width: '100%' }}
    />
  );
}

export default function PortPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = user.role === 'Admin' ? AdminLayout : MasterLayout;
  const canEdit = user.role === 'Admin';

  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tìm kiếm
  const [searchText, setSearchText] = useState('');

  // Modal Thêm cảng
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addSaving, setAddSaving] = useState(false);

  // Modal Sửa cảng
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = () =>
    portService.getAllPorts()
      .then(res => {
        if (res.success) setPorts(res.data || []);
      })
      .catch(() => setError('Không thể tải danh sách cảng.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchData();
  }, []);

  // Lọc dữ liệu theo ô tìm kiếm
  const filteredData = useMemo(() => {
    return ports.filter(item => {
      return (
        !searchText ||
        item.portName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.country.toLowerCase().includes(searchText.toLowerCase())
      );
    });
  }, [ports, searchText]);

  const stats = useMemo(() => {
    const total = ports.length;
    const activeCount = ports.filter(c => c.status === 'Active').length;
    const inactiveCount = ports.filter(c => c.status === 'Inactive').length;
    return { total, activeCount, inactiveCount };
  }, [ports]);

  // Xử lý Thêm cảng
  const handleAddSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      setAddSaving(true);
      setError('');
      await portService.createPort({
        portName: values.portName.trim(),
        country: values.country.trim(),
        lat: Number(values.lat),
        lng: Number(values.lng),
        status: values.status || 'Active',
      });
      addForm.resetFields();
      setAddModalOpen(false);
      await fetchData();
      notifySuccess(`Đã thêm cảng "${values.portName}" thành công.`);
    } catch (err) {
      if (err?.errorFields) return;
      notifyError(err.response?.data?.message || 'Lỗi thêm cảng.');
    } finally {
      setAddSaving(false);
    }
  };

  // Mở modal sửa
  const openEdit = (port) => {
    setEditing(port);
    editForm.setFieldsValue({
      portName: port.portName || '',
      country: port.country || '',
      lat: port.lat,
      lng: port.lng,
      status: port.status || 'Active',
    });
    setEditModalOpen(true);
  };

  // Xử lý Lưu sửa cảng
  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      setEditSaving(true);
      await portService.updatePort(editing.id, {
        portName: values.portName.trim(),
        country: values.country.trim(),
        lat: Number(values.lat),
        lng: Number(values.lng),
        status: values.status || 'Active',
      });
      setEditModalOpen(false);
      setEditing(null);
      await fetchData();
      notifySuccess(`Cập nhật cảng "${values.portName}" thành công.`);
    } catch (err) {
      if (err?.errorFields) return;
      notifyError(err.response?.data?.message || 'Không thể cập nhật cảng.');
    } finally {
      setEditSaving(false);
    }
  };

  // Xoá cảng
  const handleDelete = async (port) => {
    const confirmed = await confirmDelete({
      title: 'Xoá cảng?',
      content: `Bạn có chắc chắn muốn xoá cảng "${port.portName}" không? (Lưu ý: Không thể xoá nếu cảng đang được sử dụng ở một hải trình)`,
    });
    if (!confirmed) return;
    try {
      await portService.deletePort(port.id);
      await fetchData();
      notifySuccess(`Đã xoá cảng "${port.portName}".`);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể xoá cảng.');
    }
  };

  // Cấu hình cột bảng
  const columns = [
    {
      title: 'Tên Cảng',
      dataIndex: 'portName',
      key: 'portName',
      width: 300,
      render: (name) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <EnvironmentOutlined style={{ color: '#6366f1' }} />
          <Text strong style={{ fontSize: '14px' }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Quốc Gia',
      dataIndex: 'country',
      key: 'country',
      width: 150,
      render: (country) => (
        <Space>
          <GlobalOutlined style={{ color: '#8c8c8c' }} />
          <span>{country}</span>
        </Space>
      ),
    },
    {
      title: 'Tọa độ (Lat / Lng)',
      key: 'coords',
      width: 200,
      render: (_, record) => (
        <Text type="secondary">
          {record.lat.toFixed(4)} / {record.lng.toFixed(4)}
        </Text>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>
          {status === 'Active' ? 'Đang khai thác' : 'Đóng cảng'}
        </Tag>
      ),
    },
    ...(canEdit
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            align: 'right',
            width: 100,
            render: (_, port) => (
              <RowActions onEdit={() => openEdit(port)} onDelete={() => handleDelete(port)} />
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
          onBack={() => navigate('/settings')}
          title={
            <Space>
              <SettingOutlined style={{ color: '#6366f1', fontSize: '24px' }} />
              <span>Quản lý Cảng (Ports)</span>
            </Space>
          }
          extra={
            canEdit && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  addForm.resetFields();
                  addForm.setFieldsValue({ status: 'Active' });
                  setAddModalOpen(true);
                }}
                style={{ borderRadius: '6px' }}
              >
                Thêm Cảng mới
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
                title="Tổng số cảng"
                value={stats.total}
                prefix={<EnvironmentOutlined style={{ color: '#6366f1', marginRight: 6 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title="Đang khai thác"
                value={stats.activeCount}
                valueStyle={{ color: '#10b981' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title="Đóng cảng"
                value={stats.inactiveCount}
                valueStyle={{ color: '#ef4444' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Thanh tìm kiếm */}
        <Card style={{ marginBottom: 20, borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Input
            placeholder="Tìm theo tên cảng hoặc quốc gia..."
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
              showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} cảng`,
            }}
            locale={{
              emptyText: `Chưa có cảng nào.`,
            }}
          />
        </Card>
      </PageContainer>

      {/* Modal Thêm cảng mới */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#6366f1' }} />
            <span>Thêm Cảng Mới</span>
          </Space>
        }
        open={addModalOpen}
        onOk={handleAddSubmit}
        onCancel={() => setAddModalOpen(false)}
        okText="Thêm mới"
        cancelText="Hủy"
        confirmLoading={addSaving}
        destroyOnHidden
        width={600}
      >
        <Form
          form={addForm}
          layout="vertical"
          initialValues={{ status: 'Active' }}
          style={{ marginTop: 16 }}
        >
          <Alert message="💡 Gõ tên cảng vào ô tìm kiếm bên dưới, hệ thống sẽ tự động tìm trên bản đồ thế giới và điền Toạ độ, Quốc gia giúp bạn." type="info" showIcon style={{ marginBottom: 16 }} />
          
          <Form.Item label="Tìm kiếm thông minh (Auto-fill)">
            <GeoSearchInput form={addForm} />
          </Form.Item>

          <Form.Item
            label="Tên Cảng"
            name="portName"
            rules={[
              { required: true, message: 'Vui lòng nhập tên cảng' },
              { max: 100, message: 'Tên cảng không được vượt quá 100 ký tự' }
            ]}
          >
            <Input maxLength={100} placeholder="VD: Cảng Cát Lái (Hồ Chí Minh, Việt Nam)" />
          </Form.Item>

          <Form.Item
            label="Quốc gia"
            name="country"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập quốc gia hợp lệ' },
              { max: 50, message: 'Quốc gia không được vượt quá 50 ký tự' }
            ]}
          >
            <Input maxLength={50} placeholder="VD: Vietnam, Singapore, Thailand..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Vĩ độ (Latitude)"
                name="lat"
                rules={[
                  { required: true, message: 'Vui lòng chọn từ bản đồ hoặc tìm kiếm' },
                  { type: 'number', message: 'Vĩ độ phải là số' },
                ]}
              >
                <InputNumber style={{ width: '100%', backgroundColor: '#f5f5f5' }} placeholder="Tự động điền" readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Kinh độ (Longitude)"
                name="lng"
                rules={[
                  { required: true, message: 'Vui lòng chọn từ bản đồ hoặc tìm kiếm' },
                  { type: 'number', message: 'Kinh độ phải là số' },
                ]}
              >
                <InputNumber style={{ width: '100%', backgroundColor: '#f5f5f5' }} placeholder="Tự động điền" readOnly />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Chọn vị trí trên bản đồ">
            <div style={{ height: 250, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #d9d9d9' }}>
              <MapContainer center={[14.0, 108.5]} zoom={4} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapSelector form={addForm} />
              </MapContainer>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              📍 Bản đồ này chỉ để xem trước vị trí cảng bạn đã chọn từ Thanh tìm kiếm.
            </Text>
          </Form.Item>

          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select>
              <Option value="Active">Đang khai thác</Option>
              <Option value="Inactive">Đóng cảng</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Sửa cảng */}
      <Modal
        title={
          <Space>
            <EnvironmentOutlined style={{ color: '#6366f1' }} />
            <span>Cập nhật Thông tin Cảng</span>
          </Space>
        }
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalOpen(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={editSaving}
        destroyOnHidden
        width={600}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Alert message="💡 Bạn cũng có thể dùng Tìm kiếm thông minh để thay đổi vị trí cảng này." type="info" showIcon style={{ marginBottom: 16 }} />

          <Form.Item label="Tìm kiếm thông minh (Auto-fill)">
            <GeoSearchInput form={editForm} />
          </Form.Item>

          <Form.Item
            label="Tên Cảng"
            name="portName"
            rules={[
              { required: true, message: 'Vui lòng nhập tên cảng' },
              { max: 100, message: 'Tên cảng không được vượt quá 100 ký tự' }
            ]}
          >
            <Input maxLength={100} placeholder="Tên cảng" />
          </Form.Item>

          <Form.Item
            label="Quốc gia"
            name="country"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập quốc gia hợp lệ' },
              { max: 50, message: 'Quốc gia không được vượt quá 50 ký tự' }
            ]}
          >
            <Input maxLength={50} placeholder="Quốc gia" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Vĩ độ (Latitude)"
                name="lat"
                rules={[
                  { required: true, message: 'Vui lòng chọn từ bản đồ hoặc tìm kiếm' },
                  { type: 'number', message: 'Vĩ độ phải là số' },
                ]}
              >
                <InputNumber style={{ width: '100%', backgroundColor: '#f5f5f5' }} placeholder="Tự động điền" readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Kinh độ (Longitude)"
                name="lng"
                rules={[
                  { required: true, message: 'Vui lòng chọn từ bản đồ hoặc tìm kiếm' },
                  { type: 'number', message: 'Kinh độ phải là số' },
                ]}
              >
                <InputNumber style={{ width: '100%', backgroundColor: '#f5f5f5' }} placeholder="Tự động điền" readOnly />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Chọn vị trí trên bản đồ">
            <div style={{ height: 250, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #d9d9d9' }}>
              <MapContainer center={[14.0, 108.5]} zoom={4} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapSelector form={editForm} />
              </MapContainer>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              📍 Bản đồ này chỉ để xem trước vị trí cảng bạn đã chọn từ Thanh tìm kiếm.
            </Text>
          </Form.Item>

          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select>
              <Option value="Active">Đang khai thác</Option>
              <Option value="Inactive">Đóng cảng</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
