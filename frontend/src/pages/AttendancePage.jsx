import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Card,
  Tabs,
  Table,
  Radio,
  Button,
  DatePicker,
  Space,
  Typography,
  Empty,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { voyageService } from '../services/api';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import { PageHeader } from '../components/common';
import { notifySuccess, notifyError } from '../utils/feedback';

const { Text } = Typography;
const DATE_FORMAT = 'YYYY-MM-DD';

export default function AttendancePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('Daily'); // PreDeparture, Daily, PostDischarge
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const [crewList, setCrewList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const activeVoyageRole = localStorage.getItem('activeVoyageRole');
  const userRole = (activeVoyageRole || user.role || '').replace(/\s+/g, '').toLowerCase();

  const [voyageStatus, setVoyageStatus] = useState('');

  const fetchVoyageInfo = async () => {
    try {
      const allVoyages = await voyageService.getAll();
      const currentVoyage = allVoyages.find((v) => String(v.id) === String(id));
      if (currentVoyage) {
        setVoyageStatus(currentVoyage.status);
      }
    } catch (error) {
      console.error('Lỗi tải thông tin hải trình:', error);
    }
  };

  useEffect(() => {
    fetchVoyageInfo();
  }, [id]);

  // Master, Admin, Agency can view. Master can edit.
  const canEdit = ['master'].includes(userRole);
  const Layout = userRole === 'admin' || userRole === 'agency' ? AgencyLayout : MasterLayout;

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const data = await voyageService.getAttendances(
        id,
        activeTab,
        activeTab === 'Daily' ? selectedDate : null
      );
      // data: [{ crewId, fullName, position, isPresent, recordedAt }]
      setCrewList(data || []);
    } catch (error) {
      console.error('Lỗi khi tải điểm danh:', error);
      notifyError('Không thể tải danh sách điểm danh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeTab, selectedDate]);

  const handleAttendanceChange = (crewId, isPresent) => {
    if (!canEdit) return;
    setCrewList((prev) => prev.map((c) => (c.crewId === crewId ? { ...c, isPresent } : c)));
  };

  const markAll = (isPresent) => {
    if (!canEdit) return;
    setCrewList((prev) => prev.map((c) => ({ ...c, isPresent })));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        type: activeTab,
        date: activeTab === 'Daily' ? selectedDate : null,
        attendanceList: crewList.map((c) => ({ crewId: c.crewId, isPresent: c.isPresent })),
      };

      await voyageService.saveAttendances(id, payload);
      notifySuccess('Lưu điểm danh thành công!');
      fetchAttendances(); // Refresh data to get recordedAt
    } catch (error) {
      console.error('Lỗi lưu điểm danh:', error);
      notifyError(error.response?.data?.message || 'Có lỗi xảy ra khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const isStatusValidForTab = () => {
    if (activeTab === 'PreDeparture') return voyageStatus === 'Loaded';
    if (activeTab === 'Daily') return ['Underway', 'Homeward Bounding', 'At Anchor'].includes(voyageStatus);
    if (activeTab === 'PostDischarge') return voyageStatus === 'Discharged';
    return false;
  };

  const statusValid = isStatusValidForTab();
  const isLockedDate = activeTab === 'Daily' && selectedDate !== today;
  const rowDisabled = !canEdit || isLockedDate || !statusValid;

  const getStatusWarning = () => {
    if (activeTab === 'PreDeparture') return 'Điểm danh "Trước khi xuất phát" chỉ được thực hiện khi trạng thái hải trình là Đã làm hàng xong (Loaded).';
    if (activeTab === 'Daily') return 'Điểm danh "Hằng ngày" chỉ được thực hiện khi tàu Đang di chuyển (Underway), Đang quay về (Homeward Bounding), hoặc Đang neo đậu (At Anchor).';
    if (activeTab === 'PostDischarge') return 'Điểm danh "Kết thúc chuyến đi" chỉ được thực hiện khi tàu Đã dỡ hàng xong (Discharged).';
    return '';
  };

  const columns = [
    { title: 'STT', key: 'stt', width: 60, render: (_, __, index) => index + 1 },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name) => <strong>{name}</strong>,
    },
    { title: 'Chức vụ', dataIndex: 'position', key: 'position' },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      render: (_, crew) => (
        <Radio.Group
          value={crew.isPresent === true ? 'present' : crew.isPresent === false ? 'absent' : null}
          onChange={(e) => handleAttendanceChange(crew.crewId, e.target.value === 'present')}
          disabled={rowDisabled}
        >
          <Radio value="present">Có mặt</Radio>
          <Radio value="absent">Vắng mặt</Radio>
        </Radio.Group>
      ),
    },
    {
      title: 'Thời gian lưu',
      dataIndex: 'recordedAt',
      key: 'recordedAt',
      render: (recordedAt) => (
        <Text type="secondary" style={{ fontSize: '0.85rem' }}>
          {recordedAt ? new Date(recordedAt).toLocaleString('vi-VN') : 'Chưa điểm danh'}
        </Text>
      ),
    },
  ];

  const tabItems = [
    { key: 'PreDeparture', label: 'Trước khi xuất phát' },
    { key: 'Daily', label: 'Hằng ngày' },
    { key: 'PostDischarge', label: 'Kết thúc chuyến đi' },
  ];

  return (
    <Layout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader
          onBack={() => navigate('/voyages')}
          title={`Điểm danh Thuyền viên - Chuyến VY-${String(id).padStart(4, '0')}`}
        />

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

          {!statusValid && voyageStatus && (
            <Alert
              message="Chưa đủ điều kiện điểm danh"
              description={getStatusWarning()}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {activeTab === 'Daily' ? (
              <Space>
                <CalendarOutlined style={{ color: '#64748b' }} />
                <span>Chọn ngày:</span>
                <DatePicker
                  format={DATE_FORMAT}
                  value={selectedDate ? dayjs(selectedDate, DATE_FORMAT) : null}
                  // Chỉ cho phép chọn tới ngày hiện tại (Realtime)
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                  allowClear={false}
                  onChange={(d) => setSelectedDate(d ? d.format(DATE_FORMAT) : today)}
                />
              </Space>
            ) : (
              <div />
            )}

            {canEdit && statusValid && (
              <Space>
                <Button onClick={() => markAll(true)}>Có mặt tất cả</Button>
                <Button onClick={() => markAll(false)}>Vắng mặt tất cả</Button>
              </Space>
            )}
          </div>

          <Table
            rowKey="crewId"
            columns={columns}
            dataSource={crewList}
            loading={loading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="Chưa có thuyền viên nào được phân công vào chuyến đi này."
                />
              ),
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              disabled={loading || !canEdit || crewList.length === 0 || isLockedDate || !statusValid}
            >
              Lưu điểm danh
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
