import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Form,
  Card,
  Alert,
  Modal,
} from 'antd';
import {
  TagsOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import MasterLayout from '../components/MasterLayout';
import { cargoTypeService } from '../services/api';
import { PageHeader, RowActions, notifySuccess, notifyError, confirmDelete } from '../components/common';

export default function CargoTypePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;
  const canEdit = user.role === 'Admin';

  const [cargoTypes, setCargoTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addForm] = Form.useForm();

  // Modal sửa loại hàng
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = () =>
    cargoTypeService.getAll()
      .then(res => { if (res.success) setCargoTypes(res.data); })
      .catch(() => setError('Không thể tải danh sách loại hàng.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (values) => {
    setSaving(true);
    setError('');
    try {
      await cargoTypeService.create({ name: values.name.trim(), description: (values.description || '').trim() });
      addForm.resetFields();
      await fetchData();
      notifySuccess('Loại hàng đã được thêm.');
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi thêm loại hàng.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (type) => {
    setEditing(type);
    editForm.setFieldsValue({ name: type.name || '', description: type.description || '' });
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      const payload = { name: values.name.trim(), description: (values.description || '').trim() };
      setEditSaving(true);
      await cargoTypeService.update(editing.id, payload);
      setEditing(null);
      await fetchData();
      notifySuccess('Cập nhật loại hàng thành công.');
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate, giữ modal
      notifyError(err.response?.data?.message || 'Không thể cập nhật loại hàng.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (type) => {
    const confirmed = await confirmDelete({
      title: 'Xoá loại hàng?',
      content: `Bạn có chắc chắn muốn xoá loại hàng ${type.name}?`,
    });
    if (!confirmed) return;
    try {
      await cargoTypeService.delete(type.id);
      await fetchData();
      notifySuccess('Loại hàng đã được xoá.');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể xoá loại hàng.');
    }
  };

  const columns = [
    {
      title: 'Tên Loại Hàng',
      dataIndex: 'name',
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      render: (d) => d || '—',
    },
    ...(canEdit
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            align: 'right',
            render: (_, type) => (
              <RowActions onEdit={() => openEdit(type)} onDelete={() => handleDelete(type)} />
            ),
          },
        ]
      : []),
  ];

  return (
    <Layout>
      <div style={{ padding: '24px 32px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <PageHeader
          onBack={() => navigate('/cargos')}
          title={
            <>
              <TagsOutlined style={{ color: '#6366f1', marginRight: 8 }} />
              Quản lý Loại Hàng hóa
            </>
          }
        />

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 20 }} />
        )}

        {/* Add form (Admin only) */}
        {canEdit && (
          <Card style={{ marginBottom: 20 }}>
            <Form form={addForm} layout="vertical" onFinish={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                <Form.Item
                  label="Tên Loại Hàng"
                  name="name"
                  rules={[{ required: true, message: 'Vui lòng nhập tên loại hàng' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="VD: Rice, Coal..." />
                </Form.Item>
                <Form.Item label="Mô tả" name="description" style={{ marginBottom: 0 }}>
                  <Input placeholder="VD: Gạo, Than đá..." />
                </Form.Item>
                <Form.Item label=" " style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" loading={saving} icon={<PlusOutlined />}>
                    Thêm mới
                  </Button>
                </Form.Item>
              </div>
            </Form>
          </Card>
        )}

        {/* Table */}
        <Card>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={cargoTypes}
            loading={loading}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: `Chưa có loại hàng nào.${canEdit ? ' Hãy thêm loại hàng mới ở trên.' : ''}` }}
          />
        </Card>
      </div>

      <Modal
        title="Sửa loại hàng"
        open={!!editing}
        onOk={handleEditSave}
        onCancel={() => setEditing(null)}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={editSaving}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            label="Tên loại hàng"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên loại hàng' }]}
          >
            <Input placeholder="Tên loại hàng" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input placeholder="Mô tả" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
