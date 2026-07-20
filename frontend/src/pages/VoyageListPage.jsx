import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Card, Row, Col, Statistic, Space, Typography, Tooltip, Modal, Select, DatePicker, message } from 'antd';
import { PlusOutlined, ReloadOutlined, TeamOutlined, ArrowRightOutlined, CompassOutlined, FileExcelOutlined } from '@ant-design/icons';
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
  const [reportVoyage, setReportVoyage] = useState(null);
  const [reportPeriodType, setReportPeriodType] = useState('voyage');
  const [reportDate, setReportDate] = useState(null);
  const [exporting, setExporting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const activeVoyageRole = localStorage.getItem('activeVoyageRole');
  const userRole = (activeVoyageRole || user.role || '').replace(/\s+/g, '').toLowerCase();
  const canEdit = ['admin', 'agency', 'chiefofficer', 'master'].includes(userRole);
  const canAttendance = ['master', 'chiefofficer'].includes(userRole);
  const canExportReport = ['admin', 'agency', 'master', 'chiefofficer', 'deckofficer'].includes(userRole);
  const canCreate = ['admin', 'agency'].includes(userRole);

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

  const openExportModal = (voyage) => {
    setReportVoyage(voyage);
    setReportPeriodType('voyage');
    setReportDate(null);
  };

  const handleExportExcel = async () => {
    if (!reportVoyage) return;
    if (reportPeriodType !== 'voyage' && !reportDate) {
      message.warning('Vui lòng chọn thời gian cần xuất báo cáo.');
      return;
    }

    try {
      setExporting(true);
      const params = { periodType: reportPeriodType };
      if (reportPeriodType !== 'voyage') params.date = reportDate.format('YYYY-MM-DD');
      const response = await voyageService.exportOperationReport(reportVoyage.id, params);
      const disposition = response.headers?.['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = filenameMatch?.[1] || `Cargo_Attendance_Voyage-${reportVoyage.id}.xlsx`;
      const url = window.URL.createObjectURL(new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Đã xuất báo cáo Excel thành công.');
      setReportVoyage(null);
    } catch (error) {
      console.error('Unable to export operation report:', error);
      message.error('Không thể xuất báo cáo Excel. Vui lòng kiểm tra backend và thử lại.');
    } finally {
      setExporting(false);
    }
  };

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
    ...(canEdit || canAttendance || canExportReport
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            render: (_, voyage) => (
              <RowActions
                onEdit={canEdit ? () => setSelectedVoyage(voyage) : undefined}
                editTitle="Cập nhật thông tin chuyến đi"
              >
                {canExportReport && voyage.status !== 'Cancelled' && (
                  <Tooltip title="Xuất báo cáo Excel">
                    <Button
                      type="text"
                      icon={<FileExcelOutlined style={{ color: '#16a34a' }} />}
                      onClick={() => openExportModal(voyage)}
                    />
                  </Tooltip>
                )}
                {canAttendance && ['Loaded', 'Underway', 'Discharged'].includes(voyage.status) && (
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
            canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/voyages/new')}>
                Tạo hải trình
              </Button>
            )
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

      <Modal
        title={`Xuất báo cáo Excel - VY-${String(reportVoyage?.id || '').padStart(4, '0')}`}
        open={Boolean(reportVoyage)}
        onCancel={() => !exporting && setReportVoyage(null)}
        onOk={handleExportExcel}
        okText="Xuất Excel"
        cancelText="Hủy"
        confirmLoading={exporting}
        okButtonProps={{ icon: <FileExcelOutlined /> }}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Phạm vi báo cáo</div>
          <Select
            value={reportPeriodType}
            onChange={(value) => {
              setReportPeriodType(value);
              setReportDate(null);
            }}
            style={{ width: '100%' }}
            options={[
              { value: 'day', label: 'Theo ngày' },
              { value: 'week', label: 'Theo tuần' },
              { value: 'month', label: 'Theo tháng' },
              { value: 'voyage', label: 'Toàn bộ hải trình' },
            ]}
          />
        </div>
        {reportPeriodType !== 'voyage' && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {reportPeriodType === 'day' ? 'Chọn ngày' : reportPeriodType === 'week' ? 'Chọn tuần' : 'Chọn tháng'}
            </div>
            <DatePicker
              value={reportDate}
              onChange={setReportDate}
              picker={reportPeriodType === 'week' ? 'week' : reportPeriodType === 'month' ? 'month' : 'date'}
              format={reportPeriodType === 'month' ? 'MM/YYYY' : reportPeriodType === 'week' ? 'wo [năm] YYYY' : 'DD/MM/YYYY'}
              style={{ width: '100%' }}
              allowClear={false}
            />
          </div>
        )}
      </Modal>
    </Layout>
  );
}
