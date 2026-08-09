import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Table,
  Alert,
  Button,
  Spin,
  Empty,
  Tag,
  Row,
  Col,
  Tabs
} from 'antd';
import { 
  SaveOutlined, CalendarOutlined, TeamOutlined,
  FileTextOutlined, SyncOutlined, CheckCircleOutlined, SendOutlined, 
  EnvironmentOutlined, FlagOutlined, CloseCircleOutlined, PushpinOutlined, RollbackOutlined, CompassOutlined
} from '@ant-design/icons';
import { voyageService } from '../services/api';

const { TextArea } = Input;

const DATE_FORMAT = 'YYYY-MM-DD';
const toDayjs = (value) => (value ? dayjs(value, DATE_FORMAT) : null);

const STATUS_OPTIONS = [
  { value: 'Planning', label: 'Đang lên kế hoạch', roles: ['admin'] },
  { value: 'Loading', label: 'Đang làm hàng', roles: ['master'] },
  { value: 'Loaded', label: 'Đã làm hàng xong', roles: ['master'] },
  { value: 'Underway', label: 'Đang di chuyển', roles: ['master'] },
  { value: 'Arrived', label: 'Cập bến', roles: ['master'] },
  { value: 'Discharge', label: 'Đang dỡ hàng', roles: ['master'] },
  { value: 'Discharged', label: 'Đã dỡ hàng xong', roles: ['master'] },
  { value: 'Homeward Bounding', label: 'Đang quay về cảng xuất phát', roles: ['master'] },
  { value: 'Completed', label: 'Đã hoàn thành', roles: ['admin', 'master'] },
  { value: 'At Anchor', label: 'Đang neo đậu', roles: ['master'] },
  { value: 'Cancelled', label: 'Đã hủy', roles: ['admin', 'master'] },
];

const statusConfig = {
  Planning: { color: 'default', icon: <FileTextOutlined />, text: '#475569', bg: '#f1f5f9' },
  Loading: { color: 'processing', icon: <SyncOutlined spin />, text: '#2563eb', bg: '#eff6ff' },
  Loaded: { color: 'success', icon: <CheckCircleOutlined />, text: '#16a34a', bg: '#f0fdf4' },
  Underway: { color: 'processing', icon: <SendOutlined />, text: '#2563eb', bg: '#eff6ff' },
  Arrived: { color: 'success', icon: <EnvironmentOutlined />, text: '#16a34a', bg: '#f0fdf4' },
  Discharge: { color: 'warning', icon: <SyncOutlined spin />, text: '#d97706', bg: '#fffbeb' },
  Discharged: { color: 'success', icon: <CheckCircleOutlined />, text: '#16a34a', bg: '#f0fdf4' },
  'Homeward Bounding': { color: 'processing', icon: <RollbackOutlined />, text: '#2563eb', bg: '#eff6ff' },
  Completed: { color: 'success', icon: <FlagOutlined />, text: '#16a34a', bg: '#f0fdf4' },
  'At Anchor': { color: 'error', icon: <PushpinOutlined />, text: '#dc2626', bg: '#fef2f2' },
  Cancelled: { color: 'error', icon: <CloseCircleOutlined />, text: '#dc2626', bg: '#fef2f2' },
};

const STATUS_WORKFLOW = {
  'Planning': ['Loading', 'Cancelled'],
  'Loading': ['Loaded'],
  'Loaded': ['Underway'],
  'Underway': ['Arrived', 'At Anchor'],
  'Arrived': ['Discharge'],
  'Discharge': ['Discharged'],
  'Discharged': ['Homeward Bounding'],
  'Homeward Bounding': ['Completed', 'At Anchor'],
  'At Anchor': ['Underway', 'Homeward Bounding', 'Arrived', 'Completed'],
  'Completed': [],
  'Cancelled': []
};

export default function UpdateVoyageModal({ voyage, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    status: '',
    departureDate: '',
    arrivalDate: '',
    isCrewSufficient: false,
    isCargoLoaded: false,
    issueReason: '',
  });
  const [crewList, setCrewList] = useState([]);
  const [fetchingCrew, setFetchingCrew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (voyage) {
      setFormData({
        status: voyage.status || 'Planning',
        departureDate: voyage.departureDate || '',
        arrivalDate: voyage.arrivalDate || '',
        isCrewSufficient: voyage.isCrewSufficient || false,
        isCargoLoaded: voyage.isCargoLoaded || false,
        issueReason: voyage.issueReason || '',
      });
      fetchCrew(voyage.id);
    }
  }, [voyage]);

  const fetchCrew = async (id) => {
    try {
      setFetchingCrew(true);
      const data = await voyageService.getVoyageCrew(id);
      setCrewList(data || []);
    } catch (err) {
      console.error('Failed to fetch crew:', err);
    } finally {
      setFetchingCrew(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      await voyageService.updateVoyage(voyage.id, formData);
      onUpdate(); // refresh list
      onClose(); // close modal
    } catch (err) {
      console.error('Failed to update voyage:', err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật chuyến đi.');
    } finally {
      setLoading(false);
    }
  };

  if (!voyage) return null;

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const activeVoyageRole = localStorage.getItem('activeVoyageRole');
  const userRole = (activeVoyageRole || user.role || '').replace(/\s+/g, '').toLowerCase();

  const isChiefOfficer = userRole === 'chiefofficer';

  let allowedStatusOptions = STATUS_OPTIONS.filter(
    (opt) => opt.roles.includes(userRole) || opt.value === voyage.status
  );

  if (userRole === 'admin') {
    allowedStatusOptions = allowedStatusOptions.filter((opt) =>
      ['Planning', 'Cancelled'].includes(opt.value) || opt.value === voyage.status
    );
  }

  const allowedNextStatuses = STATUS_WORKFLOW[voyage.status] || [];

  const lockedForAdminStatuses = [
    'Loading',
    'Loaded',
    'Underway',
    'Arrived',
    'Discharge',
    'Discharged',
    'Homeward Bounding',
    'At Anchor',
    'Completed',
  ];
  const isStatusDisabled = userRole === 'admin' && lockedForAdminStatuses.includes(voyage.status);

  const isDepartureDateLocked = [
    'Underway', 'Arrived', 'Discharge', 'Discharged', 
    'Homeward Bounding', 'At Anchor', 'Completed'
  ].includes(voyage.status);

  const isArrivalDateLocked = [
    'Arrived', 'Discharge', 'Discharged', 
    'Homeward Bounding', 'Completed'
  ].includes(voyage.status);

  const crewColumns = [
    { title: 'STT', key: 'stt', width: 60, render: (_, __, idx) => idx + 1 },
    { title: 'Họ và tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Chức vụ', dataIndex: 'position', key: 'position' },
  ];

  const showIssueReason = !formData.isCrewSufficient || !formData.isCargoLoaded;

  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <CalendarOutlined /> Lịch trình
        </span>
      ),
      children: (
        <div style={{ paddingTop: 24, paddingBottom: 12 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Ngày đi dự kiến/thực tế">
                <DatePicker
                  style={{ width: '100%', borderRadius: 8 }}
                  format={DATE_FORMAT}
                  value={toDayjs(formData.departureDate)}
                  onChange={(d) =>
                    setFormData((prev) => ({ ...prev, departureDate: d ? d.format(DATE_FORMAT) : '' }))
                  }
                  disabled={isChiefOfficer || isDepartureDateLocked || isStatusDisabled}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ngày đến dự kiến/thực tế">
                <DatePicker
                  style={{ width: '100%', borderRadius: 8 }}
                  format={DATE_FORMAT}
                  value={toDayjs(formData.arrivalDate)}
                  onChange={(d) =>
                    setFormData((prev) => ({ ...prev, arrivalDate: d ? d.format(DATE_FORMAT) : '' }))
                  }
                  disabled={isChiefOfficer || isArrivalDateLocked || isStatusDisabled}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<span style={{ fontWeight: 500 }}>Trạng thái hiện tại</span>}>
            <Select
              size="large"
              value={formData.status}
              onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
              disabled={isStatusDisabled}
              style={{ width: '100%' }}
              dropdownStyle={{ padding: 8, borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
              optionLabelProp="label"
            >
              {allowedStatusOptions.map((opt) => {
                const conf = statusConfig[opt.value] || { color: 'default', icon: <CompassOutlined />, text: '#475569', bg: '#f1f5f9' };
                let isOptionDisabled = false;
                let disableReason = '';

                if (userRole !== 'admin' && opt.value !== voyage.status && !allowedNextStatuses.includes(opt.value)) {
                  isOptionDisabled = true;
                  disableReason = 'Phải hoàn thành tuần tự các bước trước đó!';
                }
                
                if (opt.value === 'Underway' && voyage.routeStatus !== 'Approved') {
                  isOptionDisabled = true;
                  disableReason = 'Lộ trình chưa được phê duyệt!';
                }

                return (
                  <Select.Option key={opt.value} value={opt.value} disabled={isOptionDisabled} label={
                    <Tag icon={conf.icon} color={conf.color} style={{ border: 'none', background: 'transparent', fontSize: 14, margin: 0, padding: 0 }}>
                      <span style={{ fontWeight: 500 }}>{opt.label}</span>
                    </Tag>
                  }>
                    <div style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f8fafc', opacity: isOptionDisabled ? 0.5 : 1 }}>
                      <div style={{ 
                        width: 36, height: 36, borderRadius: '50%', 
                        background: conf.bg, color: conf.text,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                      }}>
                        {conf.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: isOptionDisabled ? '#ef4444' : '#64748b' }}>
                          {isOptionDisabled ? disableReason : `Chuyển sang trạng thái ${opt.label.toLowerCase()}`}
                        </div>
                      </div>
                    </div>
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
          {userRole !== 'admin' && showIssueReason && (
            <Form.Item label="Nguyên nhân thiếu sót (Nếu có)">
              <TextArea
                rows={4}
                placeholder="Nhập lý do tại sao chưa đủ nhân sự hoặc hàng hóa..."
                value={formData.issueReason}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, issueReason: e.target.value }))
                }
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          )}
        </div>
      ),
    },
    ...(!isChiefOfficer ? [{
      key: '2',
      label: (
        <span>
          <TeamOutlined /> Thuyền viên
        </span>
      ),
      children: (
        <div style={{ paddingTop: 24 }}>
          {fetchingCrew ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" /></div>
          ) : crewList.length === 0 ? (
            <Empty description="Chưa có thuyền viên nào được phân công." />
          ) : (
            <Table
              rowKey="crewId"
              columns={crewColumns}
              dataSource={crewList}
              pagination={false}
              bordered
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 8, overflow: 'hidden' }}
            />
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <Modal
      open
      title={<div style={{ fontSize: 22, fontWeight: 600, color: '#1e293b' }}>Chi tiết chuyến đi: <span style={{ color: '#2563eb' }}>VY-{String(voyage.id).padStart(4, '0')}</span></div>}
      onCancel={onClose}
      width={960}
      centered
      styles={{ body: { padding: '0 24px 24px' } }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16 }}>
          <Button size="large" onClick={onClose} style={{ borderRadius: 8, fontWeight: 500 }}>
            {isStatusDisabled ? 'Đóng' : 'Hủy'}
          </Button>
          {!isStatusDisabled && (
            <Button
              size="large"
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSubmit}
              style={{ borderRadius: 8, fontWeight: 500, boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' }}
            >
              Lưu cập nhật
            </Button>
          )}
        </div>
      }
    >
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16, borderRadius: 8 }} />
      )}
      <Form layout="vertical">
        <Tabs defaultActiveKey="1" items={tabItems} size="large" animated />
      </Form>
    </Modal>
  );
}
