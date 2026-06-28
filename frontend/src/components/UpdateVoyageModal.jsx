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
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
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
      setCargoList(data || []);
      setOriginalCargoList(JSON.parse(JSON.stringify(data || [])));
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

  const handleCargoHoldChange = (itemId, holdId) => {
    setCargoList((prevList) =>
      prevList.map((cargo) => (cargo.itemId === itemId ? { ...cargo, holdId } : cargo))
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const payload = {
        ...formData,
        attendanceList: crewList.map((c) => ({ crewId: c.crewId, isPresent: c.isPresent })),
        cargoList: cargoList.map((c) => ({
          itemId: c.itemId,
          isLoaded: c.isLoaded,
          holdId: c.holdId,
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
  const userRole = (user.role || '').replace(/\s+/g, '').toLowerCase();

  const isShipStaff = userRole === 'chiefofficer' || userRole === 'master';
  const isAttendanceAllowed =
    (formData.status === 'Loaded' || formData.status === 'Discharged') && isShipStaff;
  const isCargoLoadAllowed = formData.status === 'Loading' && isShipStaff;

  const allowedStatusOptions = STATUS_OPTIONS.filter(
    (opt) => opt.roles.includes(userRole) || opt.value === voyage.status
  );

  const crewColumns = [
    { title: 'STT', key: 'stt', width: 60, render: (_, __, idx) => idx + 1 },
    { title: 'Họ và tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Chức vụ', dataIndex: 'position', key: 'position' },
    {
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
    },
  ];

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
    {
      title: 'Chọn khoang',
      key: 'holdId',
      width: 160,
      render: (_, cargo) => (
        <Select
          style={{ width: '100%' }}
          placeholder="-- Chọn --"
          allowClear
          value={cargo.holdId || undefined}
          disabled={!isCargoLoadAllowed}
          onChange={(value) => handleCargoHoldChange(cargo.itemId, value)}
          options={holds.map((h) => ({ value: h.id, label: h.holdName }))}
        />
      ),
    },
    {
      title: 'Đã lên tàu',
      key: 'isLoaded',
      align: 'center',
      width: 90,
      render: (_, cargo) => (
        <Checkbox
          checked={cargo.isLoaded}
          onChange={(e) => handleCargoLoadChange(cargo.itemId, e.target.checked)}
          disabled={!cargo.itemId || !isCargoLoadAllowed}
          title={
            !isCargoLoadAllowed
              ? 'Chỉ được đánh dấu hàng lên tàu khi Trạng thái chuyến đi đang là Loading (Đang làm hàng)'
              : ''
          }
        />
      ),
    },
  ];

  const showIssueReason = !formData.isCrewSufficient || !formData.isCargoLoaded;

  return (
    <Modal
      open
      title={`Cập nhật chuyến đi VY-${String(voyage.id).padStart(4, '0')}`}
      onCancel={onClose}
      width={760}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSubmit}
        >
          Lưu cập nhật
        </Button>,
      ]}
    >
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
      )}

      <Form layout="vertical">
        <Form.Item label="Trạng thái">
          <Select
            value={formData.status}
            options={allowedStatusOptions}
            onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
          />
        </Form.Item>

        <Form.Item label="Ngày đi dự kiến/thực tế">
          <DatePicker
            style={{ width: '100%' }}
            format={DATE_FORMAT}
            value={toDayjs(formData.departureDate)}
            onChange={(d) =>
              setFormData((prev) => ({ ...prev, departureDate: d ? d.format(DATE_FORMAT) : '' }))
            }
          />
        </Form.Item>

        <Form.Item label="Ngày đến dự kiến/thực tế">
          <DatePicker
            style={{ width: '100%' }}
            format={DATE_FORMAT}
            value={toDayjs(formData.arrivalDate)}
            onChange={(d) =>
              setFormData((prev) => ({ ...prev, arrivalDate: d ? d.format(DATE_FORMAT) : '' }))
            }
          />
        </Form.Item>

        <Form.Item label="Danh sách điểm danh thuyền viên:">
          {fetchingCrew ? (
            <Spin size="small" />
          ) : crewList.length === 0 ? (
            <Text type="secondary" style={{ fontSize: '0.85rem' }}>
              Chưa có thuyền viên nào được phân công.
            </Text>
          ) : (
            <Table
              rowKey="crewId"
              size="small"
              columns={crewColumns}
              dataSource={crewList}
              pagination={false}
            />
          )}
        </Form.Item>

        <Form.Item label="Danh sách kiểm tra hàng hóa:">
          {fetchingCargo ? (
            <Spin size="small" />
          ) : cargoList.length === 0 ? (
            <Text type="secondary" style={{ fontSize: '0.85rem' }}>
              Chưa có hàng hóa nào được đăng ký cho chuyến đi này.
            </Text>
          ) : (
            <Table
              rowKey={(record) => record.itemId || record.cargoName}
              size="small"
              columns={cargoColumns}
              dataSource={cargoList}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          )}
        </Form.Item>

        <Form.Item label="Bản đồ hầm hàng (Stowage Plan):">
          {fetchingHolds ? (
            <Spin size="small" />
          ) : holds.length === 0 ? (
            <Text type="secondary" style={{ fontSize: '0.85rem' }}>
              Tàu chưa được cấu hình hầm hàng.
            </Text>
          ) : (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {holds.map((hold) => {
                const maxCap = hold.maxCapacity || 0;

                // Calculate simulated usage
                let simulatedUsage = hold.currentUsage || 0;
                cargoList.forEach((c) => {
                  const orig = originalCargoList.find((o) => o.itemId === c.itemId);
                  if ((!orig || !orig.isLoaded) && c.isLoaded && String(c.holdId) === String(hold.id)) {
                    simulatedUsage += c.weight;
                  }
                  if (orig && orig.isLoaded && String(orig.holdId) === String(hold.id) && !c.isLoaded) {
                    simulatedUsage -= c.weight;
                  }
                  if (
                    orig &&
                    orig.isLoaded &&
                    String(orig.holdId) === String(hold.id) &&
                    c.isLoaded &&
                    String(c.holdId) !== String(hold.id)
                  ) {
                    simulatedUsage -= c.weight;
                  }
                  if (
                    orig &&
                    orig.isLoaded &&
                    String(orig.holdId) !== String(hold.id) &&
                    c.isLoaded &&
                    String(c.holdId) === String(hold.id)
                  ) {
                    simulatedUsage += c.weight;
                  }
                });
                if (simulatedUsage < 0) simulatedUsage = 0;

                const percentage = maxCap > 0 ? (simulatedUsage / maxCap) * 100 : 0;

                let strokeColor = '#22c55e'; // green
                if (percentage > 90) strokeColor = '#ef4444'; // red
                else if (percentage > 70) strokeColor = '#eab308'; // yellow

                return (
                  <Card
                    key={hold.id}
                    size="small"
                    style={{ flex: '1 1 calc(50% - 16px)', minWidth: 200 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                        fontWeight: 500,
                      }}
                    >
                      <span>{hold.holdName}</span>
                      <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                        {simulatedUsage.toLocaleString('en-US')} /{' '}
                        {maxCap.toLocaleString('en-US')} MT
                      </Text>
                    </div>
                    <Progress
                      percent={Math.min(percentage, 100)}
                      strokeColor={strokeColor}
                      format={() => `${percentage.toFixed(1)}% đầy`}
                    />
                  </Card>
                );
              })}
            </div>
          )}
        </Form.Item>

        {showIssueReason && (
          <Form.Item label="Nguyên nhân thiếu sót (Nếu có)">
            <TextArea
              rows={3}
              placeholder="Nhập lý do tại sao chưa đủ nhân sự hoặc hàng hóa..."
              value={formData.issueReason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, issueReason: e.target.value }))
              }
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
