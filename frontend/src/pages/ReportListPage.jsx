import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Card, Tag, Select, Segmented, Space, Modal, Form, Input, Typography,
} from 'antd';
import { PlusOutlined, BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { reportService } from '../services/api';
import { PageHeader, StatusTag, RowActions, notifySuccess, notifyError } from '../components/common';
import { roleLabel } from '../config/roles';

const { TextArea } = Input;

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
const TYPE_OPTIONS = {
  Routine: ['Leave', 'ShiftSwap', 'ShiftException', 'Other'],
  Incident: ['Breakdown', 'ShipIssue', 'Other'],
};

const fmtDate = (d) => (d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function ReportListPage() {
  const navigate = useNavigate();

  const [scope, setScope] = useState('inbox');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [createCategory, setCreateCategory] = useState('Routine');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    reportService.getReports({ scope, category, status })
      .then((res) => setReports(res.success && Array.isArray(res.data) ? res.data : []))
      .catch(() => notifyError('Không thể tải danh sách báo cáo.'))
      .finally(() => setLoading(false));
  }, [scope, category, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setCreateCategory('Routine');
    createForm.setFieldsValue({ reportCategory: 'Routine', reportType: 'Leave', priority: 'Normal', title: '', content: '' });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      const res = await reportService.create({
        reportCategory: values.reportCategory,
        reportType: values.reportType,
        priority: values.priority,
        title: values.title.trim(),
        content: values.content.trim(),
      });
      setCreateOpen(false);
      notifySuccess('Đã tạo báo cáo và gửi tới cấp phụ trách.');
      if (res?.data?.id) navigate(`/reports/${res.data.id}`);
      else fetchData();
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate, giữ modal
      notifyError(err.response?.data?.message || 'Không thể tạo báo cáo.');
    } finally {
      setSaving(false);
    }
  };

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
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo báo cáo</Button>}
        />

        <Card
          title={
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { label: 'Cần tôi xử lý', value: 'inbox' },
                { label: 'Báo cáo của tôi', value: 'mine' },
              ]}
            />
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
          <Table
            rowKey="id"
            columns={columns}
            dataSource={reports}
            loading={loading}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: scope === 'inbox' ? 'Không có báo cáo nào cần bạn xử lý.' : 'Bạn chưa tạo báo cáo nào.' }}
          />
        </Card>
      </div>

      <Modal
        title="Tạo báo cáo mới"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="Gửi báo cáo"
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Báo cáo sẽ tự động được chuyển tới cấp trên trực tiếp của bạn để xử lý.
        </Typography.Paragraph>
        <Form
          form={createForm}
          layout="vertical"
          onValuesChange={(changed) => {
            if (changed.reportCategory) {
              setCreateCategory(changed.reportCategory);
              const firstType = TYPE_OPTIONS[changed.reportCategory][0];
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
              <Select options={TYPE_OPTIONS[createCategory].map((v) => ({ label: TYPE_LABEL[v], value: v }))} />
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
