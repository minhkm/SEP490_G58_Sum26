import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Input, Card, Avatar, Space, Typography, Tooltip, Row, Col, Grid } from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  CompassOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import AdminLayout from '../components/AdminLayout';
import { crewService } from '../services/api';
import { PageHeader, PageContainer, StatCard, StatusTag, RowActions, notifyError, confirmDelete } from '../components/common';
import { roleLabel, departmentLabel } from '../config/roles';

const { Text } = Typography;

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
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    crewService.getAll()
      .then((data) => {
        if (isMounted) setCrews(Array.isArray(data) ? data : []);
      })
      .catch((error) => console.error('Lỗi khi lấy danh sách thủy thủ:', error))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
      (c) => c.fullName && c.fullName.toLowerCase().includes(keyword)
    );
  }, [crews, searchTerm]);

  const stats = useMemo(() => {
    const total = crews.length;
    const deck = crews.filter((c) => c.department === 'Deck').length;
    const engine = crews.filter((c) => c.department === 'Engine').length;
    return { total, deck, engine };
  }, [crews]);

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
                <Tooltip title="Thuyền trưởng">
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
          {departmentLabel(department, 'Chưa rõ')}
        </Tag>
      ),
    },
    // Cột "Chức vụ" đã bỏ: chức vụ được suy ra từ Quyền hệ thống nên hiển thị trùng lặp.
    {
      title: 'Quyền hệ thống',
      key: 'role',
      render: (_, crew) => (
        <span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>
          {roleLabel(crew.User?.role) || '---'}
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
      render: (_, crew) => {
        const isOnVoyage = crew.User?.status === 'OnVoyage';
        return (
          <RowActions
            onEdit={() => navigate(`/crews/edit/${crew.id}`)}
            editDisabled={isOnVoyage}
            editDisabledTooltip="Thuyền viên đang tham gia hải trình, không thể chỉnh sửa"
            onDelete={() => handleDelete(crew.id, crew.fullName)}
            deleteDisabled={isOnVoyage}
            deleteDisabledTooltip="Thuyền viên đang tham gia hải trình, không thể xóa"
          />
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <PageContainer>
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

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <StatCard title="Tổng thuyền viên" value={stats.total} icon={<TeamOutlined />} tone="blue" />
          </Col>
          <Col xs={24} sm={8}>
            <StatCard title="Bộ phận Boong" value={stats.deck} icon={<CompassOutlined />} tone="cyan" />
          </Col>
          <Col xs={24} sm={8}>
            <StatCard title="Bộ phận Máy" value={stats.engine} icon={<ToolOutlined />} tone="gold" />
          </Col>
        </Row>

        <Card
          extra={
            <Input.Search
              placeholder="Tìm kiếm theo họ và tên..."
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
            scroll={screens.lg ? undefined : { x: 'max-content' }}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trong số ${total} thủy thủ`,
            }}
            locale={{ emptyText: 'Không tìm thấy thủy thủ nào phù hợp.' }}
          />
        </Card>
      </PageContainer>
    </AdminLayout>
  );
}
