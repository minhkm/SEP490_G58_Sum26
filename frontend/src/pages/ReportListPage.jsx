import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table, Button, Card, Tag, Select, Segmented, Space, Modal, Form, Input, Typography, DatePicker, Alert,
} from 'antd';
import { PlusOutlined, BarChartOutlined, ReloadOutlined, SearchOutlined, LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import MasterLayout from '../components/MasterLayout';
import { reportService, profileService } from '../services/api';
import { PageHeader, StatusTag, RowActions, notifySuccess, notifyError } from '../components/common';
import { roleLabel, canCreateReport, canHandleReport, reportTypeOptions } from '../config/roles';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

// Nhãn hiển thị
const CATEGORY_LABEL = { Routine: 'Thường nhật', Incident: 'Sự cố' };
const STATUS_LABEL = {
  Open: 'Chờ xử lý', InProgress: 'Đang xử lý', Resolved: 'Đã xử lý', Closed: 'Đã đóng', Rejected: 'Từ chối',
};
const PRIORITY_LABEL = { Normal: 'Bình thường', High: 'Cao', Urgent: 'Khẩn cấp' };
const PRIORITY_COLOR = { Normal: 'default', High: 'gold', Urgent: 'red' };
const TYPE_LABEL = {
  Leave: 'Xin nghỉ', ShiftSwap: 'Xin đổi ca', ShiftException: 'Ngoại lệ ca trực',
  Breakdown: 'Hỏng hóc máy', ShipIssue: 'Sự cố tàu', Other: 'Khác',
};

const fmtDate = (d) => (d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function ReportListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Lấy role từ localStorage
  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; }
  }, []);
  const role = storedUser.role || '';
  const canCreate = canCreateReport(role);
  const canHandle = canHandleReport(role);

  // Me profile (department, crewId thật) — gọi 1 lần khi mount
  const [me, setMe] = useState(null);

  // Scope & filters
  const defaultScope = canHandle ? 'inbox' : 'mine';
  const [scope, setScope] = useState(defaultScope);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Client-side filters (D)
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [filterReportType, setFilterReportType] = useState('');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [createCategory, setCreateCategory] = useState('Routine');
  const [saving, setSaving] = useState(false);

  // Shift context (F)
  const [shiftContext, setShiftContext] = useState(null);
  const [shiftIdForCreate, setShiftIdForCreate] = useState(null);
  const [shiftModalOpened, setShiftModalOpened] = useState(false);

  // Danh sách loại báo cáo theo bộ phận (E)
  const typeOpts = useMemo(() => {
    const dept = me?.department || (role === 'EngineOfficer' || role === 'EngineCrew' ? 'Engine' : null);
    return reportTypeOptions(dept);
  }, [me, role]);

  // Tất cả loại (để lọc trên danh sách)
  const allTypeValues = useMemo(() => [...new Set([...typeOpts.Routine, ...typeOpts.Incident])], [typeOpts]);

  // Mount: lấy profile
  useEffect(() => {
    profileService.getMe()
      .then((res) => { if (res.success) setMe(res.data); })
      .catch(() => { /* fallback: me stays null, suy từ role */ });
  }, []);

  // Kẹp scope về tab hợp lệ
  useEffect(() => {
    if (!canHandle && scope === 'inbox') setScope('mine');
    if (!canCreate && !canHandle && scope !== 'mine') setScope('mine');
  }, [scope, canHandle, canCreate]);

  // Fetch
  const fetchData = useCallback(() => {
    setLoading(true);
    reportService.getReports({ scope, category, status })
      .then((res) => setReports(res.success && Array.isArray(res.data) ? res.data : []))
      .catch(() => notifyError('Không thể tải danh sách báo cáo.'))
      .finally(() => setLoading(false));
  }, [scope, category, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // (F) Deep-link từ ShiftViewPage: ?shiftId=X
  useEffect(() => {
    if (shiftModalOpened || !me) return; // đợi me load xong; chỉ mở 1 lần
    const paramShiftId = searchParams.get('shiftId');
    if (!paramShiftId) return;
    const sid = Number(paramShiftId);
    if (!sid) return;

    setShiftIdForCreate(sid);
    setShiftModalOpened(true);
    // Clear param ngay (tránh mở lại khi refresh)
    setSearchParams({}, { replace: true });

    // Lấy preview
    reportService.getShiftContext(sid)
      .then((res) => { if (res.success) setShiftContext(res.data); })
      .catch(() => { /* preview thất bại → vẫn cho tạo, chỉ không hiện preview */ });

    // Mở modal
    setCreateCategory('Incident');
    const dept = me?.department || null;
    const opts = reportTypeOptions(dept);
    const firstIncidentType = opts.Incident[0] || 'Other';
    createForm.setFieldsValue({
      reportCategory: 'Incident',
      reportType: firstIncidentType,
      priority: 'Urgent',
      title: '',
      content: '',
    });
    setCreateOpen(true);
  }, [me, searchParams, shiftModalOpened, createForm, setSearchParams]);

  const openCreate = () => {
    setShiftIdForCreate(null);
    setShiftContext(null);
    setCreateCategory('Routine');
    const firstType = typeOpts.Routine[0] || 'Other';
    createForm.setFieldsValue({ reportCategory: 'Routine', reportType: firstType, priority: 'Normal', title: '', content: '' });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      const payload = {
        reportCategory: values.reportCategory,
        reportType: values.reportType,
        priority: values.priority,
        title: values.title.trim(),
        content: values.content.trim(),
      };
      if (shiftIdForCreate) payload.shiftId = shiftIdForCreate;
      const res = await reportService.create(payload);
      setCreateOpen(false);
      setShiftIdForCreate(null);
      setShiftContext(null);
      notifySuccess('Đã tạo báo cáo và gửi tới cấp phụ trách.');
      if (res?.data?.id) navigate(`/reports/${res.data.id}`);
      else fetchData();
    } catch (err) {
      if (err?.errorFields) return;
      notifyError(err.response?.data?.message || 'Không thể tạo báo cáo.');
    } finally {
      setSaving(false);
    }
  };

  // Client-side filtering (D)
  const filteredReports = useMemo(() => {
    let list = reports;
    // Text search
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((r) =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q) ||
        (TYPE_LABEL[r.reportType] || r.reportType || '').toLowerCase().includes(q) ||
        (r.CrewProfile?.fullName || '').toLowerCase().includes(q) ||
        (r.Ship?.shipName || '').toLowerCase().includes(q)
      );
    }
    // Date range
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day').valueOf();
      const end = dateRange[1].endOf('day').valueOf();
      list = list.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        return t >= start && t <= end;
      });
    }
    // Report type
    if (filterReportType) {
      list = list.filter((r) => r.reportType === filterReportType);
    }
    return list;
  }, [reports, searchText, dateRange, filterReportType]);

  // Tabs
  const tabOptions = useMemo(() => {
    const opts = [];
    if (canHandle) opts.push({ label: 'Cần tôi xử lý', value: 'inbox' });
    if (canCreate || !canHandle) opts.push({ label: 'Báo cáo của tôi', value: 'mine' });
    // Nếu chỉ có 1 tab thì không cần hiện Segmented — nhưng vẫn trả mảng để render
    return opts;
  }, [canCreate, canHandle]);

  const columns = [
    {
      title: 'Tiêu đề', dataIndex: 'title', key: 'title',
      render: (title, r) => (
        <a onClick={() => navigate(`/reports/${r.id}`)}>
          <strong>{title}</strong>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{TYPE_LABEL[r.reportType] || r.reportType || '—'}</div>
        </a>
      ),
    },
    {
      title: 'Loại', dataIndex: 'reportCategory', key: 'category', width: 110,
      render: (c) => <Tag color={c === 'Incident' ? 'red' : 'blue'}>{CATEGORY_LABEL[c] || c}</Tag>,
    },
    {
      title: 'Mức độ', dataIndex: 'priority', key: 'priority', width: 110,
      render: (p) => <Tag color={PRIORITY_COLOR[p] || 'default'}>{PRIORITY_LABEL[p] || p}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s) => <StatusTag status={s} text={STATUS_LABEL[s] || s} />,
    },
    {
      title: 'Đang ở cấp', key: 'handler', width: 170,
      render: (_, r) => (
        <span>
          {roleLabel(r.currentHandlerRole)}
          {r.Handler?.fullName && <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.Handler.fullName}</div>}
        </span>
      ),
    },
    {
      title: 'Người tạo', key: 'creator', width: 150,
      render: (_, r) => r.CrewProfile?.fullName || '—',
    },
    { title: 'Cập nhật', dataIndex: 'updatedAt', key: 'updatedAt', width: 150, render: fmtDate },
    {
      title: 'Thao tác', key: 'actions', align: 'center', width: 90,
      render: (_, r) => <RowActions onView={() => navigate(`/reports/${r.id}`)} />,
    },
  ];

  return (
    <MasterLayout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader
          title={<><BarChartOutlined style={{ color: '#6366f1', marginRight: 8 }} />Quản lý Báo cáo</>}
          extra={canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo báo cáo</Button>}
        />

        <Card
          title={
            tabOptions.length > 1 ? (
              <Segmented
                value={scope}
                onChange={setScope}
                options={tabOptions}
              />
            ) : (
              <span style={{ fontWeight: 600 }}>{tabOptions[0]?.label || 'Báo cáo'}</span>
            )
          }
          extra={
            <Space wrap>
              <Select
                value={category} onChange={setCategory} style={{ width: 150 }}
                options={[
                  { label: 'Tất cả loại', value: '' },
                  { label: 'Thường nhật', value: 'Routine' },
                  { label: 'Sự cố', value: 'Incident' },
                ]}
              />
              <Select
                value={status} onChange={setStatus} style={{ width: 150 }}
                options={[
                  { label: 'Tất cả trạng thái', value: '' },
                  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ label, value })),
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={fetchData} />
            </Space>
          }
        >
          {/* Bộ lọc nâng cao (D) */}
          <Space wrap style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="Tìm tiêu đề, nội dung, người tạo, tàu..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={setSearchText}
              style={{ width: 320 }}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            />
            <RangePicker
              placeholder={['Từ ngày', 'Đến ngày']}
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={setDateRange}
              allowClear
            />
            <Select
              placeholder="Loại hình"
              value={filterReportType || undefined}
              onChange={(v) => setFilterReportType(v || '')}
              allowClear
              style={{ width: 160 }}
              options={Object.entries(TYPE_LABEL)
                .filter(([k]) => allTypeValues.includes(k) || !filterReportType)
                .map(([value, label]) => ({ label, value }))}
            />
          </Space>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredReports}
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `Hiển thị ${range[0]}–${range[1]} trong số ${total} báo cáo`,
            }}
            locale={{ emptyText: scope === 'inbox' ? 'Không có báo cáo nào cần bạn xử lý.' : 'Bạn chưa tạo báo cáo nào.' }}
          />
        </Card>
      </div>

      <Modal
        title="Tạo báo cáo mới"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); setShiftIdForCreate(null); setShiftContext(null); }}
        okText="Gửi báo cáo"
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnHidden
      >
        {shiftIdForCreate && (
          <Alert
            type="info"
            showIcon
            icon={<LinkOutlined />}
            message={`Đính kèm số liệu ca trực #${shiftIdForCreate}`}
            description={
              shiftContext?.shift ? (
                <span>
                  {shiftContext.shift.crew?.fullName || '—'} ·{' '}
                  {shiftContext.shift.startTime ? dayjs(shiftContext.shift.startTime).format('HH:mm') : ''} –{' '}
                  {shiftContext.shift.endTime ? dayjs(shiftContext.shift.endTime).format('HH:mm') : ''} ·{' '}
                  Nhật ký: {shiftContext.logType === 'Engine' ? 'Máy' : shiftContext.logType === 'Deck' ? 'Boong' : 'Chưa có'}
                </span>
              ) : 'Đang tải...'
            }
            style={{ marginBottom: 16 }}
          />
        )}
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Báo cáo sẽ tự động được chuyển tới cấp trên trực tiếp của bạn để xử lý.
        </Typography.Paragraph>
        <Form
          form={createForm}
          layout="vertical"
          onValuesChange={(changed) => {
            if (changed.reportCategory) {
              setCreateCategory(changed.reportCategory);
              const opts = typeOpts[changed.reportCategory] || typeOpts.Routine;
              const firstType = opts[0] || 'Other';
              createForm.setFieldsValue({
                reportType: firstType,
                priority: changed.reportCategory === 'Incident' ? 'Urgent' : 'Normal',
              });
            }
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="Loại báo cáo" name="reportCategory" rules={[{ required: true }]}>
              <Select options={[{ label: 'Thường nhật', value: 'Routine' }, { label: 'Sự cố / Khẩn cấp', value: 'Incident' }]} />
            </Form.Item>
            <Form.Item label="Hình thức" name="reportType" rules={[{ required: true }]}>
              <Select options={(typeOpts[createCategory] || typeOpts.Routine).map((v) => ({ label: TYPE_LABEL[v] || v, value: v }))} />
            </Form.Item>
          </div>
          <Form.Item label="Mức độ ưu tiên" name="priority" rules={[{ required: true }]}>
            <Select options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ label, value }))} />
          </Form.Item>
          <Form.Item label="Tiêu đề" name="title" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input placeholder="VD: Xin đổi ca trực ngày..." />
          </Form.Item>
          <Form.Item label="Nội dung" name="content" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
            <TextArea rows={4} placeholder="Mô tả chi tiết nội dung báo cáo..." />
          </Form.Item>
        </Form>
      </Modal>
    </MasterLayout>
  );
}
