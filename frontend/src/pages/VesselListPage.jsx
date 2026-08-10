import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Row, Col } from 'antd';
import { PlusOutlined, DatabaseOutlined, CompassOutlined, CheckCircleOutlined } from '@ant-design/icons';
import AdminLayout from '../components/AdminLayout';
import { vesselService } from '../services/api';
import { PageHeader, PageContainer, StatCard, StatusTag, RowActions, confirmDelete, notifyError, notifySuccess } from '../components/common';

export default function VesselListPage() {
  const navigate = useNavigate();
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVessels = async () => {
    try {
      setLoading(true);
      const data = await vesselService.getAll();
      setVessels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi tải danh sách tàu:', error);
      notifyError('Không thể tải danh sách tàu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVessels();
  }, []);

  const stats = useMemo(() => {
    const total = vessels.length;
    const onVoyage = vessels.filter((v) => v.status === 'OnVoyage').length;
    const available = vessels.filter(
      (v) => v.status === 'Active' || v.status === 'Hoạt động'
    ).length;
    return { total, onVoyage, available };
  }, [vessels]);

  const handleDelete = async (id, name) => {
    const ok = await confirmDelete({
      title: 'Xác nhận xóa tàu',
      content: `Bạn có chắc chắn muốn xoá tàu ${name} khỏi hệ thống không?`,
    });
    if (!ok) return;
    try {
      await vesselService.delete(id);
      notifySuccess('Đã xoá tàu thành công!');
      fetchVessels();
    } catch (error) {
      console.error('Lỗi xoá tàu:', error);
      notifyError('Có lỗi xảy ra khi xoá tàu.');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      render: (id) => `#${id}`,
    },
    {
      title: 'Tên Tàu',
      dataIndex: 'shipName',
      render: (shipName) => <strong>{shipName}</strong>,
    },
    {
      title: 'Mã số IMO',
      dataIndex: 'imoNumber',
    },
    {
      title: 'Quốc tịch',
      dataIndex: 'flag',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => (
        <StatusTag
          status={status === 'OnVoyage' ? 'Đang trên hải trình' : (status === 'Hoạt động' || status === 'Active' ? 'Sẵn sàng' : status)}
          color={status === 'OnVoyage' ? 'blue' : (status === 'Hoạt động' || status === 'Active' ? 'green' : undefined)}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      render: (_, v) => {
        const isOnVoyage = v.status === 'OnVoyage';
        return (
          <RowActions
            onView={() => navigate(`/vessels/view/${v.id}`)}
            onEdit={isOnVoyage ? undefined : () => navigate(`/vessels/edit/${v.id}`)}
            onDelete={isOnVoyage ? undefined : () => handleDelete(v.id, v.shipName)}
            deleteTitle="Xoá tàu"
          />
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader
          title="Quản lý Đội tàu"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/vessels/new')}>
              Thêm tàu mới
            </Button>
          }
        />

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <StatCard title="Tổng số tàu" value={stats.total} icon={<DatabaseOutlined />} tone="blue" />
          </Col>
          <Col xs={24} sm={8}>
            <StatCard title="Đang trên hải trình" value={stats.onVoyage} icon={<CompassOutlined />} tone="cyan" />
          </Col>
          <Col xs={24} sm={8}>
            <StatCard title="Sẵn sàng" value={stats.available} icon={<CheckCircleOutlined />} tone="green" />
          </Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={vessels}
          loading={loading}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: 'Chưa có tàu nào trong hệ thống. Hãy thêm tàu mới!' }}
        />
      </PageContainer>
    </AdminLayout>
  );
}
