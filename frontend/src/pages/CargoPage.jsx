import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Card, Space, Typography, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import { cargoService } from '../services/api';
import { PageHeader, StatusTag, RowActions, notifySuccess, notifyError, confirmDelete } from '../components/common';

const { Text } = Typography;

const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '—';
  return new Intl.NumberFormat('en-US').format(num);
};

export default function CargoPage() {
  const navigate = useNavigate();
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;
  // Chỉ Admin được chỉnh sửa/xoá; thuyền trưởng (Master) & thuyền phó (ChiefOfficer) chỉ được xem
  const canEdit = user.role === 'Admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const cargoRes = await cargoService.getAllCargos();
      if (cargoRes.success) {
        setCargos(cargoRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (cargo) => {
    const confirmed = await confirmDelete({
      title: 'Xoá lô hàng?',
      content: `Bạn có chắc chắn muốn xoá lô hàng ${cargo.cargoName || `C60-${cargo.id}`}? Dữ liệu liên quan cũng sẽ bị xoá.`,
    });
    if (!confirmed) return;
    try {
      await cargoService.delete(cargo.id);
      await fetchData();
      notifySuccess('Lô hàng đã được xoá thành công.');
    } catch {
      notifyError('Không thể xoá lô hàng.');
    }
  };

  const filteredCargos = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return cargos;
    return cargos.filter((cargo) =>
      [`C60-${cargo.id}`, cargo.cargoName, cargo.cargoType, cargo.status]
        .some((value) => String(value || '').toLowerCase().includes(keyword))
    );
  }, [searchTerm, cargos]);

  const columns = [
    {
      title: 'ID Lô hàng',
      dataIndex: 'id',
      render: (id) => <strong>C60-{id}</strong>,
    },
    {
      title: 'Tên & Loại',
      key: 'name',
      render: (_, cargo) => (
        <Space>
          <AppstoreOutlined style={{ color: '#6366f1' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{cargo.cargoName || 'Chưa cập nhật'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{cargo.cargoType || 'N/A'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Khối lượng',
      dataIndex: 'totalWeight',
      render: (w) => `${formatNumber(w)} T`,
    },
    {
      title: 'Thể tích',
      dataIndex: 'totalVolume',
      render: (v) => `${formatNumber(v)} m³`,
    },
    {
      title: 'Hành trình',
      key: 'route',
      render: (_, cargo) =>
        cargo.Voyage ? (
          <Space size={6}>
            <span>{cargo.Voyage.departurePort || '?'}</span>
            <span style={{ color: '#94a3b8' }}>→</span>
            <span>{cargo.Voyage.destinationPort || '?'}</span>
          </Space>
        ) : (
          <Text type="secondary">Chưa xếp lịch</Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <StatusTag status={status} text={status || 'Chờ xử lý'} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      render: (_, cargo) => (
        <RowActions
          stopPropagation
          onView={() => navigate(`/cargos/view/${cargo.id}`)}
          onEdit={canEdit && !cargo.Voyage ? () => navigate(`/cargos/edit/${cargo.id}`) : undefined}
          onDelete={canEdit && !cargo.Voyage ? () => handleDelete(cargo) : undefined}
          deleteTitle="Xóa lô hàng"
        >
          {canEdit && cargo.Voyage && (
            <Tooltip title="Lô hàng đã thuộc hải trình nên không thể sửa/xoá">
              <Text type="secondary" italic style={{ fontSize: '0.75rem' }}>Đã khoá</Text>
            </Tooltip>
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <Layout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader
          icon={<AppstoreOutlined />}
          breadcrumb="Tổng quan lô hàng và phân bổ hầm tàu"
          title="Quản lý Hàng hóa"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/cargos/new')}>
              Thêm Lô hàng Mới
            </Button>
          }
        />

        <Card
          title="Danh sách lô hàng"
          extra={
            <Input.Search
              placeholder="Tìm ID hoặc tên lô hàng..."
              allowClear
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 280 }}
            />
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredCargos}
            loading={loading}
            onRow={(cargo) => ({
              onClick: () => navigate(`/cargos/view/${cargo.id}`),
              style: { cursor: 'pointer' },
            })}
            pagination={{ pageSize: 10, hideOnSinglePage: true, showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} lô hàng` }}
            locale={{ emptyText: searchTerm ? 'Không tìm thấy lô hàng phù hợp' : 'Chưa có lô hàng nào' }}
          />
        </Card>
      </div>
    </Layout>
  );
}
