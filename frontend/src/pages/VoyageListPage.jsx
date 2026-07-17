import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Card, Row, Col, Statistic, Space, Typography, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined, TeamOutlined, ArrowRightOutlined, CompassOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import UpdateVoyageModal from '../components/UpdateVoyageModal';
import { PageHeader, StatusTag, RowActions, notifyError } from '../components/common';
import { voyageService } from '../services/api';

const { Text } = Typography;

const formatDate = (date) => {
  if (!date) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
};

export default function VoyageListPage() {
  const navigate = useNavigate();
  const [voyages, setVoyages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVoyage, setSelectedVoyage] = useState(null);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userRole = (user.role || '').replace(/\s+/g, '').toLowerCase();
  const canEdit = ['admin', 'agency', 'chiefofficer', 'master'].includes(userRole);
  const canAttendance = ['master'].includes(userRole);

  const Layout = userRole === 'admin' || userRole === 'agency' ? AgencyLayout : MasterLayout;

  const loadVoyages = async () => {
    try {
      setLoading(true);
      const data = await voyageService.getAll();
      setVoyages(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error('Unable to load voyages:', requestError);
      notifyError('Không thể tải danh sách hải trình. Vui lòng kiểm tra kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVoyages();
  }, []);

  const filteredVoyages = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return voyages;
    return voyages.filter((voyage) =>
      [
        voyage.id,
        voyage.departurePort,
        voyage.destinationPort,
        voyage.status,
        voyage.Ship?.shipName,
        voyage.Ship?.imoNumber,
      ].some((value) => String(value || '').toLowerCase().includes(keyword))
    );
  }, [searchTerm, voyages]);

  const activeCount = voyages.filter((v) =>
    ['underway', 'homeward bounding', 'active', 'in progress'].includes((v.status || '').toLowerCase())
  ).length;
  const plannedCount = voyages.filter((v) =>
    ['planned', 'planning'].includes((v.status || '').toLowerCase())
  ).length;

  const columns = [
    {
      title: 'Mã chuyến',
      dataIndex: 'id',
      render: (id) => <strong>VY-{String(id).padStart(4, '0')}</strong>,
    },
    {
      title: 'Tàu vận chuyển',
      key: 'ship',
      render: (_, voyage) => (
        <div>
          <div>
            <strong>{voyage.Ship?.shipName || `Tàu #${voyage.shipId}`}</strong>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {voyage.Ship?.imoNumber || 'Chưa có IMO'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tuyến đường',
      key: 'route',
      render: (_, voyage) => (
        <Space size={6}>
          <span>{voyage.departurePort || '--'}</span>
          <ArrowRightOutlined style={{ color: '#94a3b8' }} />
          <span>{voyage.destinationPort || '--'}</span>
        </Space>
      ),
    },
    { title: 'Khởi hành', dataIndex: 'departureDate', render: (d) => formatDate(d) },
    { title: 'Dự kiến đến', dataIndex: 'arrivalDate', render: (d) => formatDate(d) },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <StatusTag status={status} text={status || 'Planning'} />,
    },
    ...(canEdit || canAttendance
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            render: (_, voyage) => (
              <RowActions
                onEdit={canEdit ? () => setSelectedVoyage(voyage) : undefined}
                editTitle="Cập nhật thông tin chuyến đi"
              >
                {canAttendance && (
                  <Tooltip title="Điểm danh thuyền viên">
                    <Button
                      type="text"
                      icon={<TeamOutlined />}
                      onClick={() => navigate(`/voyages/${voyage.id}/attendance`)}
                    />
                  </Tooltip>
                )}
              </RowActions>
            ),
          },
        ]
      : []),
  ];

  return (
    <Layout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader
          icon={<CompassOutlined />}
          breadcrumb="Voyages"
          title="Danh sách hải trình"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/voyages/new')}>
              Tạo hải trình
            </Button>
          }
        />

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic title="TỔNG SỐ HẢI TRÌNH" value={voyages.length} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="ĐANG HOẠT ĐỘNG" value={activeCount} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="ĐÃ LÊN KẾ HOẠCH" value={plannedCount} />
            </Card>
          </Col>
        </Row>

        <Card
          title="Tất cả hải trình"
          extra={
            <Space>
              <Input.Search
                placeholder="Tìm tàu, cảng, mã chuyến..."
                allowClear
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 280 }}
              />
              <Tooltip title="Tải lại">
                <Button icon={<ReloadOutlined />} loading={loading} onClick={loadVoyages} />
              </Tooltip>
            </Space>
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredVoyages}
            loading={loading}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: searchTerm ? 'Không tìm thấy hải trình phù hợp' : 'Chưa có hải trình nào' }}
          />
        </Card>
      </div>

      {selectedVoyage && (
        <UpdateVoyageModal
          voyage={selectedVoyage}
          onClose={() => setSelectedVoyage(null)}
          onUpdate={loadVoyages}
        />
      )}
    </Layout>
  );
}
