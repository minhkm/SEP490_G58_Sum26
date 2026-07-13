import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Input, Card, Avatar, Space, Typography, Tooltip } from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import AgencyLayout from '../components/AgencyLayout';
import { crewService } from '../services/api';
import { PageHeader, StatusTag, RowActions, notifyError, confirmDelete } from '../components/common';

const { Text } = Typography;

const roleLabels = {
  Master: 'Thuyền trưởng (Master)',
  ChiefOfficer: 'Đại phó (Chief Officer)',
  DeckOfficer: 'Sĩ quan boong (Deck Officer)',
  EngineOfficer: 'Sĩ quan máy (Engine Officer)',
  Sailor: 'Thủy thủ (Sailor)',
};

const getInitials = (name) => {
  if (!name) return 'CR';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function CrewListPage() {
  const navigate = useNavigate();
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCrews();
  }, []);

  const fetchCrews = async () => {
    try {
      setLoading(true);
      const data = await crewService.getAll();
      setCrews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách thủy thủ:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (
      await confirmDelete({
        content: `Bạn có chắc chắn muốn xóa thủy thủ "${name}" không? Toàn bộ dữ liệu tài khoản sẽ bị mất.`,
      })
    ) {
      try {
        await crewService.delete(id);
        setCrews(crews.filter((c) => c.id !== id));
      } catch (error) {
        console.error('Lỗi khi xóa thủy thủ:', error);
        notifyError('Có lỗi xảy ra khi xóa thủy thủ!');
      }
    }
  };

  const filteredCrews = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    return crews.filter(
      (c) =>
        (c.fullName && c.fullName.toLowerCase().includes(keyword)) ||
        (c.cccd && c.cccd.includes(searchTerm)) ||
        (c.position && c.position.toLowerCase().includes(keyword))
    );
  }, [crews, searchTerm]);

  const columns = [
    {
      title: 'Thủy thủ',
      key: 'crew',
      render: (_, crew) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1677ff' }}>{getInitials(crew.fullName)}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>
              {crew.fullName || 'Chưa cập nhật'}
              {crew.User?.role === 'Master' && (
                <Tooltip title="Thuyền trưởng (Master)">
                  <SafetyCertificateOutlined
                    style={{ marginLeft: 6, color: '#0284c7', verticalAlign: 'middle' }}
                  />
                </Tooltip>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {crew.email || crew.User?.username}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'CCCD',
      dataIndex: 'cccd',
      render: (cccd) => <span style={{ fontWeight: 500 }}>{cccd || '---'}</span>,
    },
    {
      title: 'Bộ phận',
      dataIndex: 'department',
      render: (department) => (
        <Tag color={department === 'Deck' ? 'blue' : department === 'Engine' ? 'orange' : 'default'}>
          {department === 'Deck'
            ? 'Boong (Deck)'
            : department === 'Engine'
            ? 'Máy (Engine)'
            : department || 'Chưa rõ'}
        </Tag>
      ),
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      render: (position) => position || '---',
    },
    {
      title: 'Quyền hệ thống',
      key: 'role',
      render: (_, crew) => (
        <span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>
          {roleLabels[crew.User?.role] || crew.User?.role || '---'}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, crew) => (
        <StatusTag
          status={crew.User?.status === 'OnVoyage' ? 'Đang trên hải trình' : (crew.User?.status === 'Available' ? 'Sẵn sàng' : 'Không xác định')}
          color={crew.User?.status === 'OnVoyage' ? 'blue' : (crew.User?.status === 'Available' ? 'green' : 'default')}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      render: (_, crew) => (
        <RowActions
          onEdit={() => navigate(`/crews/edit/${crew.id}`)}
          onDelete={() => handleDelete(crew.id, crew.fullName)}
          deleteTitle="Xóa"
        />
      ),
    },
  ];

  return (
    <AgencyLayout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader
          title={
            <>
              <TeamOutlined style={{ marginRight: 8 }} />
              Quản lý Thủy thủ
            </>
          }
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/crews/new')}>
              Thêm Thủy thủ
            </Button>
          }
        />

        <Card
          extra={
            <Input.Search
              placeholder="Tìm tên, CCCD, chức vụ..."
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
            dataSource={filteredCrews}
            loading={loading}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: 'Không tìm thấy thủy thủ nào phù hợp.' }}
          />
        </Card>
      </div>
    </AgencyLayout>
  );
}
