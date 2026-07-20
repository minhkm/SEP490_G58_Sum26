import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Table,
  Checkbox,
  Alert,
  Button,
  Spin,
  Typography,
  Card,
  Progress,
  Space,
  Tabs,
  Row,
  Col,
  Empty,
  Tag,
  Tooltip,
  Popconfirm,
} from 'antd';
import { 
  SaveOutlined, CalendarOutlined, TeamOutlined, InboxOutlined,
  FileTextOutlined, SyncOutlined, CheckCircleOutlined, SendOutlined, 
  EnvironmentOutlined, FlagOutlined, CloseCircleOutlined, PushpinOutlined, RollbackOutlined, CompassOutlined
} from '@ant-design/icons';
import { voyageService, vesselService } from '../services/api';

const { TextArea } = Input;
const { Text } = Typography;

const DATE_FORMAT = 'YYYY-MM-DD';
// Chuyển string 'YYYY-MM-DD' (API) <-> dayjs (DatePicker)
const toDayjs = (value) => (value ? dayjs(value, DATE_FORMAT) : null);

const STATUS_OPTIONS = [
  { value: 'Planning', label: 'Đang lên kế hoạch (Planning)', roles: ['admin', 'agency'] },
  { value: 'Loading', label: 'Đang làm hàng (Loading)', roles: ['master'] },
  { value: 'Loaded', label: 'Đã làm hàng xong (Loaded)', roles: ['master'] },
  { value: 'Underway', label: 'Đang di chuyển (Underway)', roles: ['master'] },
  { value: 'Arrived', label: 'Cập bến (Arrived)', roles: ['master'] },
  { value: 'Discharge', label: 'Dỡ hàng (Discharge)', roles: ['master'] },
  { value: 'Discharged', label: 'Đã dỡ hàng xong (Discharged)', roles: ['master'] },
  { value: 'Homeward Bounding', label: 'Đang quay về cảng xuất phát (Homeward Bounding)', roles: ['master'] },
  { value: 'At Anchor', label: 'Đang neo đậu (At Anchor)', roles: ['master'] },
  { value: 'Completed', label: 'Đã hoàn thành (Completed)', roles: ['admin', 'agency'] },
  { value: 'Cancelled', label: 'Đã hủy (Cancelled)', roles: ['admin', 'agency', 'master'] },
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
  'At Anchor': { color: 'error', icon: <PushpinOutlined />, text: '#dc2626', bg: '#fef2f2' },
  Completed: { color: 'success', icon: <FlagOutlined />, text: '#16a34a', bg: '#f0fdf4' },
  Cancelled: { color: 'error', icon: <CloseCircleOutlined />, text: '#dc2626', bg: '#fef2f2' },
};

const STATUS_WORKFLOW = {
  'Planning': ['Loading', 'Cancelled'],
  'Loading': ['Loaded', 'Cancelled'],
  'Loaded': ['Underway', 'Cancelled'],
  'Underway': ['Arrived', 'At Anchor', 'Cancelled'],
  'Arrived': ['Discharge', 'Cancelled'],
  'Discharge': ['Discharged', 'Cancelled'],
  'Discharged': ['Homeward Bounding', 'Cancelled'],
  'Homeward Bounding': ['Completed', 'Cancelled'],
  'At Anchor': ['Underway', 'Arrived', 'Cancelled'],
  'Completed': [],
  'Cancelled': []
};

const AllocationModal = ({ open, cargo, holds, onClose, onSave }) => {
  const [allocations, setAllocations] = useState([]);

  useEffect(() => {
    if (open && cargo) {
      setAllocations(JSON.parse(JSON.stringify(cargo.allocations || [])));
    }
  }, [open, cargo]);

  const handleAdd = () => {
    setAllocations([...allocations, { holdId: null, weight: '' }]);
  };

  const handleRemove = (idx) => {
    const newAllo = [...allocations];
    newAllo.splice(idx, 1);
    setAllocations(newAllo);
  };

  const handleChange = (idx, field, value) => {
    const newAllo = [...allocations];
    newAllo[idx][field] = value;
    setAllocations(newAllo);
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.weight || 0), 0);
  const isOver = totalAllocated > (cargo?.weight || 0);

  return (
    <Modal
      open={open}
      title={`Phân bổ: ${cargo?.itemName || ''} (${cargo?.weight} MT)`}
      onCancel={onClose}
      onOk={() => {
        if (isOver) {
           // Not allowed to over-allocate
           return;
        }
        // Filter out empty rows
        const valid = allocations.filter((a) => a.holdId && Number(a.weight) > 0);
        onSave(cargo.itemId, valid);
      }}
      okButtonProps={{ disabled: isOver }}
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <Text strong>Tổng khối lượng: {cargo?.weight} MT</Text>
        <br />
        <Text type={isOver ? 'danger' : 'success'}>
          Đã phân bổ: {totalAllocated} MT
        </Text>
      </div>

      <Table
        dataSource={allocations}
        pagination={false}
        rowKey={(_, idx) => idx}
        size="small"
        columns={[
          {
            title: 'Khoang',
            dataIndex: 'holdId',
            render: (_, record, idx) => (
              <Select
                style={{ width: '100%' }}
                placeholder="Chọn khoang"
                value={record.holdId}
                onChange={(v) => handleChange(idx, 'holdId', v)}
                options={holds.map((h) => ({ value: h.id, label: h.holdName }))}
              />
            ),
          },
          {
            title: 'Khối lượng (MT)',
            dataIndex: 'weight',
            width: 150,
            render: (_, record, idx) => (
              <Input
                type="number"
                min={1}
                placeholder="MT"
                value={record.weight}
                onChange={(e) => handleChange(idx, 'weight', e.target.value)}
              />
            ),
          },
          {
            title: '',
            width: 50,
            render: (_, record, idx) => (
              <Button danger type="text" onClick={() => handleRemove(idx)}>X</Button>
            ),
          },
        ]}
      />
      <Button type="dashed" style={{ width: '100%', marginTop: 16 }} onClick={handleAdd}>
        + Thêm khoang
      </Button>
    </Modal>
  );
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
  const [cargoList, setCargoList] = useState([]);
  const [originalCargoList, setOriginalCargoList] = useState([]);
  const [holds, setHolds] = useState([]);
  const [fetchingCrew, setFetchingCrew] = useState(false);
  const [fetchingCargo, setFetchingCargo] = useState(false);
  const [fetchingHolds, setFetchingHolds] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allocatingCargoItem, setAllocatingCargoItem] = useState(null);

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
      fetchCargo(voyage.id);
      fetchHolds(voyage.shipId);
    }
  }, [voyage]);

  const fetchHolds = async (shipId) => {
    if (!shipId) return;
    try {
      setFetchingHolds(true);
      const ship = await vesselService.getById(shipId);
      setHolds(ship.CargoHolds || []);
    } catch (err) {
      console.error('Failed to fetch holds:', err);
    } finally {
      setFetchingHolds(false);
    }
  };

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

  const fetchCargo = async (id) => {
    try {
      setFetchingCargo(true);
      const data = await voyageService.getVoyageCargo(id);
      const formattedData = (data || []).map((c) => ({
        ...c,
        allocations: c.allocations || (c.holdId ? [{ holdId: c.holdId, weight: c.weight }] : []),
      }));
      setCargoList(formattedData);
      setOriginalCargoList(JSON.parse(JSON.stringify(formattedData)));
    } catch (err) {
      console.error('Failed to fetch cargo:', err);
    } finally {
      setFetchingCargo(false);
    }
  };

  const handleAttendanceChange = (crewId, isPresent) => {
    setCrewList((prevList) =>
      prevList.map((crew) => (crew.crewId === crewId ? { ...crew, isPresent } : crew))
    );
  };

  const handleCargoLoadChange = (itemId, isLoaded) => {
    setCargoList((prevList) =>
      prevList.map((cargo) => (cargo.itemId === itemId ? { ...cargo, isLoaded } : cargo))
    );
  };

  const handleCargoDischarge = async (itemId) => {
    try {
      setLoading(true);
      await voyageService.dischargeCargoItem(voyage.id, itemId, true);
      message.success('Đã dỡ hàng thành công!');
      
      // Fetch both cargo and holds to sync everything
      await fetchCargo(voyage.id);
      await fetchHolds(voyage.shipId);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi dỡ hàng!');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllocations = (itemId, allocations) => {
    setCargoList((prevList) =>
      prevList.map((cargo) => (cargo.itemId === itemId ? { ...cargo, allocations } : cargo))
    );
    setAllocatingCargoItem(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const payload = {
        ...formData,
        cargoList: cargoList.map((c) => ({
          itemId: c.itemId,
          isLoaded: c.isLoaded,
          allocations: c.allocations,
          weight: c.weight,
        })),
      };

      await voyageService.updateVoyage(voyage.id, payload);
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

  const isShipStaff = userRole === 'chiefofficer' || userRole === 'master';
  const isChiefOfficer = userRole === 'chiefofficer';
  const isAttendanceAllowed =
    (formData.status === 'Loaded' || formData.status === 'Discharged') && isShipStaff;
  const isCargoLoadAllowed = formData.status === 'Loading' && isChiefOfficer;

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

  const crewColumns = [
    { title: 'STT', key: 'stt', width: 60, render: (_, __, idx) => idx + 1 },
    { title: 'Họ và tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Chức vụ', dataIndex: 'position', key: 'position' },
  ];

  if (userRole !== 'admin') {
    crewColumns.push({
      title: 'Có mặt',
      key: 'isPresent',
      align: 'center',
      width: 90,
      render: (_, crew) => (
        <Checkbox
          checked={crew.isPresent}
          onChange={(e) => handleAttendanceChange(crew.crewId, e.target.checked)}
          disabled={!isAttendanceAllowed}
          title={
            !isAttendanceAllowed
              ? 'Chỉ được điểm danh khi trạng thái là Loaded hoặc Discharged và bạn là thuyền trưởng'
              : ''
          }
        />
      ),
    });
  }

  const cargoColumns = [
    { title: 'STT', key: 'stt', width: 60, render: (_, __, idx) => idx + 1 },
    { title: 'Lô hàng', dataIndex: 'cargoName', key: 'cargoName' },
    { title: 'Chi tiết / Quy cách', dataIndex: 'itemName', key: 'itemName' },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
    {
      title: 'Khối lượng',
      key: 'weight',
      render: (_, cargo) => `${cargo.weight} MT`,
    },
  ];

  if (userRole !== 'admin') {
    if (formData.status === 'Discharge' || formData.status === 'Arrived' || formData.status === 'Completed') {
      // Discharge UI
      cargoColumns.push(
        {
          title: 'Trạng thái dỡ',
          key: 'dischargeStatus',
          align: 'center',
          width: 150,
          render: (_, cargo) => {
            if (cargo.isDischarged) {
              return <Tag color="success">Đã dỡ xong</Tag>;
            }
            if (userRole !== 'chiefofficer') {
              return <Tag color="default">Chưa dỡ</Tag>;
            }
            return (
              <Popconfirm
                title="Xác nhận dỡ hàng?"
                description={`Bạn có chắc chắn đã dỡ toàn bộ lô ${cargo.itemName} khỏi hầm?`}
                onConfirm={() => handleCargoDischarge(cargo.itemId)}
                okText="Xác nhận"
                cancelText="Hủy"
                disabled={formData.status === 'Completed'}
              >
                <Button type="primary" size="small" style={{ background: '#fa8c16', borderColor: '#fa8c16' }}>
                  Tiến hành dỡ
                </Button>
              </Popconfirm>
            );
          },
        }
      );
    } else {
      // Loading UI
      cargoColumns.push(
        {
          title: 'Phân bổ khoang',
          key: 'allocations',
          width: 180,
          render: (_, cargo) => {
            const totalAllocated = (cargo.allocations || []).reduce(
              (sum, a) => sum + Number(a.weight),
              0
            );
            return (
              <Space direction="vertical" size="small">
                <Button
                  size="small"
                  type="primary"
                  disabled={!cargo.itemId || !isCargoLoadAllowed}
                  onClick={() => setAllocatingCargoItem(cargo)}
                >
                  Phân bổ ({(cargo.allocations || []).length} khoang)
                </Button>
                {totalAllocated > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Đã PB: {totalAllocated} MT
                  </Text>
                )}
              </Space>
            );
          },
        },
        {
          title: 'Đã lên tàu',
          key: 'isLoaded',
          align: 'center',
          width: 100,
          render: (_, cargo) => {
            const totalAllocated = (cargo.allocations || []).reduce(
              (sum, a) => sum + Number(a.weight),
              0
            );
            const isFullyAllocated = totalAllocated === Number(cargo.weight);
            return (
              <Tooltip title={!isFullyAllocated && !cargo.isLoaded ? "Vui lòng phân bổ đủ khối lượng vào khoang trước khi đánh dấu" : ""}>
                <Checkbox
                  checked={cargo.isLoaded}
                  onChange={(e) => handleCargoLoadChange(cargo.itemId, e.target.checked)}
                  disabled={!cargo.itemId || !isCargoLoadAllowed || (!isFullyAllocated && !cargo.isLoaded)}
                />
              </Tooltip>
            );
          },
        }
      );
    }
  }

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
                  disabled={isChiefOfficer}
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
                  disabled={isChiefOfficer}
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
    {
      key: '3',
      label: (
        <span>
          <InboxOutlined /> Hàng hóa & Hầm hàng
        </span>
      ),
      children: (
        <div style={{ paddingTop: 24 }}>
          <Typography.Title level={5} style={{ marginTop: 0, color: '#334155' }}>Danh sách hàng hóa</Typography.Title>
          {fetchingCargo ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" /></div>
          ) : cargoList.length === 0 ? (
            <Empty description="Chưa có hàng hóa nào được đăng ký." />
          ) : (
            <Table
              rowKey={(record) => record.itemId || record.cargoName}
              size="small"
              columns={cargoColumns}
              dataSource={cargoList}
              pagination={false}
              scroll={{ x: 'max-content' }}
              bordered
              style={{ marginBottom: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 8, overflow: 'hidden' }}
            />
          )}
          {userRole !== 'admin' && (
            <>
              <Typography.Title level={5} style={{ color: '#334155' }}>Bản đồ Hầm hàng (Stowage Plan)</Typography.Title>
              {fetchingHolds ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" /></div>
              ) : holds.length === 0 ? (
                <Empty description="Tàu chưa được cấu hình hầm hàng." />
              ) : (
                <Row gutter={[20, 20]}>
                  {holds.map((hold) => {
                    const maxCap = hold.maxCapacity || 0;
                    let simulatedUsage = hold.currentUsage || 0;
                    cargoList.forEach((c) => {
                      const orig = originalCargoList.find((o) => o.itemId === c.itemId);
                      const origWeight = orig?.isLoaded && !orig?.isDischarged
                        ? (orig.allocations || [])
                            .filter((a) => String(a.holdId) === String(hold.id))
                            .reduce((s, a) => s + Number(a.weight), 0)
                        : 0;
                      const newWeight = c.isLoaded && !c.isDischarged
                        ? (c.allocations || [])
                            .filter((a) => String(a.holdId) === String(hold.id))
                            .reduce((s, a) => s + Number(a.weight), 0)
                        : 0;
                      simulatedUsage += (newWeight - origWeight);
                    });
                    if (simulatedUsage < 0) simulatedUsage = 0;

                    const percentage = maxCap > 0 ? (simulatedUsage / maxCap) * 100 : 0;
                    let strokeColor = '#10b981'; // green
                    if (percentage > 90) strokeColor = '#ef4444'; // red
                    else if (percentage > 70) strokeColor = '#f59e0b'; // yellow

                    return (
                      <Col xs={24} sm={12} md={8} key={hold.id}>
                        <Card 
                          size="small" 
                          bordered={false}
                          style={{ 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            borderRadius: 16,
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 16, color: '#1e293b' }}>{hold.holdName}</Text>
                            <Text type="secondary" style={{ fontSize: 13, background: '#f1f5f9', padding: '4px 10px', borderRadius: 16, fontWeight: 500, color: '#64748b' }}>
                              {simulatedUsage.toLocaleString('en-US')} / {maxCap.toLocaleString('en-US')} MT
                            </Text>
                          </div>
                          <Progress
                            percent={Math.min(percentage, 100)}
                            strokeColor={strokeColor}
                            trailColor="#f1f5f9"
                            strokeWidth={10}
                            format={() => <Text strong style={{ color: strokeColor }}>{percentage.toFixed(1)}%</Text>}
                          />
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </>
          )}
        </div>
      ),
    },
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
            Hủy
          </Button>
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
        </div>
      }
    >
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16, borderRadius: 8 }} />
      )}
      <Form layout="vertical">
        <Tabs defaultActiveKey="1" items={tabItems} size="large" animated />
      </Form>
      
      <AllocationModal
        open={!!allocatingCargoItem}
        cargo={allocatingCargoItem}
        holds={holds}
        onClose={() => setAllocatingCargoItem(null)}
        onSave={handleSaveAllocations}
      />
    </Modal>
  );
}
