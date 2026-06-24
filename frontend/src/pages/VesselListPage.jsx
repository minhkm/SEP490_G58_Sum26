import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import { vesselService } from '../services/api';
import { PageHeader, StatusTag, RowActions, confirmDelete, notifyError, notifySuccess } from '../components/common';

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
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      render: (_, v) => (
        <RowActions
          onView={() => navigate(`/vessels/view/${v.id}`)}
          onEdit={() => navigate(`/vessels/edit/${v.id}`)}
          onDelete={() => handleDelete(v.id, v.shipName)}
          deleteTitle="Xoá tàu"
        />
      ),
    },
  ];

  return (
    <AgencyLayout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader
          title="Quản lý Đội tàu"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/vessels/new')}>
              Thêm tàu mới
            </Button>
          }
        />

        <Table
          rowKey="id"
          columns={columns}
          dataSource={vessels}
          loading={loading}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: 'Chưa có tàu nào trong hệ thống. Hãy thêm tàu mới!' }}
        />
      </div>
    </AgencyLayout>
  );
}
