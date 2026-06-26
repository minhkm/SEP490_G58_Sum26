import { useState, useEffect } from 'react';
import { Select, Input, Button, Table, Card, Spin, Empty, Typography, Space, Alert, DatePicker, Upload, Modal, Image, Timeline, Tag } from 'antd';
import { FileTextOutlined, SaveOutlined, ClockCircleOutlined, CompassOutlined, CalendarOutlined, UploadOutlined, EditOutlined, HistoryOutlined, PictureOutlined } from '@ant-design/icons';
import MasterLayout from '../components/MasterLayout';
import { deckLogService } from '../services/api';
import { PageHeader, notifyWarning, notifySuccess, notifyError } from '../components/common';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function DeckLogPage() {
  const [voyages, setVoyages] = useState([]);
  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fileList, setFileList] = useState([]);
  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editReason, setEditReason] = useState('');
  // Edit history modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editHistoryData, setEditHistoryData] = useState([]);

  // ===== Tính toán ngày =====
  const today = dayjs().startOf('day');
  const isToday = selectedDate && selectedDate.startOf('day').isSame(today);
  const isPastDate = selectedDate && selectedDate.startOf('day').isBefore(today);
  const daysDiff = isPastDate ? today.diff(selectedDate.startOf('day'), 'day') : 0;
  const canEdit = daysDiff <= 3;
  const isCompleted = selectedVoyage?.status === 'Completed';

  useEffect(() => {
    const fetchVoyages = async () => {
      try {
        const data = await deckLogService.getMyVoyages();
        setVoyages(data);
        if (data.length > 0) {
          const active = data.find(v => v.status !== 'Completed') || data[0];
          setSelectedVoyage(active);
          const shiftsData = await deckLogService.getShifts(active.id, dayjs().format('YYYY-MM-DD'));
          setShifts(shiftsData);
        }
      } catch (error) {
        console.error('Lỗi:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVoyages();
  }, []);

  const handleVoyageChange = async (voyageId) => {
    if (!voyageId) return;
    const v = voyages.find(v => v.id === voyageId);
    setSelectedVoyage(v);
    setSelectedShift(null);
    setHistory([]);
    setNote('');
    setFileList([]);
    if (v) {
      const shiftsData = await deckLogService.getShifts(v.id, selectedDate.format('YYYY-MM-DD'));
      setShifts(shiftsData);
    }
  };

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setSelectedShift(null);
    setHistory([]);
    if (selectedVoyage && date) {
      const shiftsData = await deckLogService.getShifts(selectedVoyage.id, date.format('YYYY-MM-DD'));
      setShifts(shiftsData);
    }
  };

  const handleShiftChange = async (shiftId) => {
    if (!shiftId) {
      setSelectedShift(null);
      setHistory([]);
      return;
    }
    const shift = shifts.find(s => s.id === parseInt(shiftId));
    setSelectedShift(shift);
    setNote('');
    setFileList([]);
    try {
      const logs = await deckLogService.getHistoryByShift(shiftId);
      setHistory(logs);
    } catch (error) {
      console.error('Lỗi:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedShift) { notifyWarning('Vui lòng chọn ca trực'); return; }
    if (!note.trim()) { notifyWarning('Vui lòng nhập nội dung nhật ký'); return; }

    try {
      const result = await deckLogService.create({ shiftId: selectedShift.id, note });

      if (fileList.length > 0 && result.shiftLog?.id) {
        const files = fileList.map(f => f.originFileObj);
        await deckLogService.uploadImages(result.shiftLog.id, files);
      }

      notifySuccess('Ghi nhận nhật ký boong thành công!');
      const logs = await deckLogService.getHistoryByShift(selectedShift.id);
      setHistory(logs);
      setNote('');
      setFileList([]);
    } catch (error) {
      console.error('Lỗi:', error);
      notifyError('Có lỗi xảy ra khi lưu nhật ký');
    }
  };

  // ===== Chỉnh sửa =====
  const openEditModal = (log) => {
    setEditingLog(log);
    setEditNote(log.DeckLog?.note || log.content || '');
    setEditReason('');
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editReason.trim()) { notifyWarning('Vui lòng nhập lý do chỉnh sửa'); return; }
    try {
      await deckLogService.update(editingLog.id, { note: editNote, editReason: editReason.trim() });
      notifySuccess('Cập nhật nhật ký thành công');
      setEditModalOpen(false);
      const logs = await deckLogService.getHistoryByShift(selectedShift.id);
      setHistory(logs);
    } catch (error) {
      console.error('Lỗi:', error);
      notifyError('Có lỗi xảy ra khi cập nhật');
    }
  };

  const openEditHistory = (log) => {
    setEditHistoryData(log.LogEditHistories || []);
    setHistoryModalOpen(true);
  };

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  // ===== RENDER =====
  if (loading) {
    return (
      <MasterLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
      </MasterLayout>
    );
  }

  if (!selectedVoyage) {
    return (
      <MasterLayout>
        <div style={{ padding: '24px 32px' }}>
          <PageHeader icon={<FileTextOutlined style={{ color: '#2563eb' }} />} breadcrumb="Deck Log" title="Nhật ký Trực boong" />
          <Card><Empty description={<div><p>Không có hải trình nào.</p></div>} /></Card>
        </div>
      </MasterLayout>
    );
  }

  const historyColumns = [
    { title: 'Thời gian', dataIndex: 'createdAt', width: 100, render: (d) => formatTime(d) },
    { title: 'Nội dung ghi chép', key: 'note', render: (_, log) => log.DeckLog?.note || log.content },
    {
      title: 'Ảnh', key: 'images', width: 120,
      render: (_, log) => log.LogImages?.length > 0 ? (
        <Image.PreviewGroup>
          {log.LogImages.map(img => (
            <Image key={img.id} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4, marginRight: 4 }}
              src={`${API_URL}${img.imageUrl}`} />
          ))}
        </Image.PreviewGroup>
      ) : <Text type="secondary">—</Text>
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_, log) => (
        <Space size={4}>
          {canEdit && !isCompleted && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(log)}>Sửa</Button>
          )}
          {log.LogEditHistories?.length > 0 && (
            <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => openEditHistory(log)}>
              ({log.LogEditHistories.length})
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <MasterLayout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader icon={<FileTextOutlined style={{ color: '#2563eb' }} />} breadcrumb="Deck Log" title="Nhật ký Trực boong" />

        {/* Chọn Hải trình, Ngày, Ca trực */}
        <Card style={{ marginBottom: 16 }}>
          <Space size={32} wrap align="start">
            <div style={{ minWidth: 280 }}>
              <div style={{ marginBottom: 6 }}><Text type="secondary"><CompassOutlined /> Chọn Hải trình</Text></div>
              <Select style={{ width: '100%' }} value={selectedVoyage?.id || undefined} onChange={handleVoyageChange}
                options={voyages.map(v => ({ value: v.id, label: `${v.Ship?.shipName} | ${v.departurePort} → ${v.destinationPort} (${v.status})` }))} />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text type="secondary"><CalendarOutlined /> Chọn Ngày</Text></div>
              <DatePicker value={selectedDate} onChange={handleDateChange} format="DD/MM/YYYY" allowClear={false} style={{ width: 160 }} />
            </div>
            <div style={{ minWidth: 320 }}>
              <div style={{ marginBottom: 6 }}><Text type="secondary"><ClockCircleOutlined /> Chọn Ca trực</Text></div>
              <Select style={{ width: '100%' }} placeholder="-- Chọn ca trực --" allowClear value={selectedShift?.id || undefined} onChange={handleShiftChange}
                options={shifts.map(s => ({ value: s.id, label: `${s.CrewProfile?.fullName} | ${formatTime(s.startTime)} - ${formatTime(s.endTime)} (${s.status})` }))} />
            </div>
          </Space>
        </Card>

        {/* Cảnh báo */}
        {isCompleted && selectedShift && (
          <Alert message="Hải trình này đã kết thúc" description="Bạn chỉ có thể xem lại lịch sử." type="warning" showIcon style={{ marginBottom: 16 }} />
        )}
        {isPastDate && !isCompleted && selectedShift && (
          <Alert
            message={canEdit ? `Ngày đã qua (${daysDiff} ngày trước) — Chỉnh sửa cần ghi lý do` : `Ngày đã qua quá 3 ngày — Chỉ xem, không chỉnh sửa được`}
            type={canEdit ? 'info' : 'warning'} showIcon style={{ marginBottom: 16 }} />
        )}

        {/* Form nhập ghi chú — chỉ cho ngày hôm nay + hải trình chưa kết thúc */}
        {selectedShift && !isCompleted && isToday && (
          <Card style={{ marginBottom: 16 }}
            title={`📋 Ghi chép Nhật ký (Ca: ${formatTime(selectedShift.startTime)} - ${formatTime(selectedShift.endTime)})`}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>
                Nội dung nhật ký (Thông số hành trình, thời tiết, sự kiện...)
              </label>
              <TextArea rows={4} placeholder="VD: Tàu đi đúng hướng 045°, tốc độ 12 knots..." value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>
                <PictureOutlined /> Đính kèm ảnh (tối đa 5 ảnh, mỗi ảnh ≤ 5MB)
              </label>
              <Upload listType="picture-card" fileList={fileList} onChange={({ fileList: fl }) => setFileList(fl.slice(0, 5))}
                beforeUpload={() => false} accept="image/jpeg,image/png,image/webp">
                {fileList.length < 5 && <div><UploadOutlined /><div style={{ marginTop: 8 }}>Chọn ảnh</div></div>}
              </Upload>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => { setNote(''); setFileList([]); }}>Xóa trắng</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>Lưu Nhật ký</Button>
            </div>
          </Card>
        )}

        {/* Lịch sử */}
        {selectedShift && (
          <Card title={`📜 Lịch sử ghi chép — ${selectedDate.format('DD/MM/YYYY')}`}>
            <Table rowKey="id" columns={historyColumns} dataSource={history}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              locale={{ emptyText: 'Chưa có ghi chép nào trong ca trực này.' }} />
          </Card>
        )}
      </div>

      {/* Modal chỉnh sửa */}
      <Modal title="Chỉnh sửa Nhật ký" open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={handleUpdate}
        okText="Lưu chỉnh sửa" cancelText="Hủy" width={600}>
        <Alert message="Bạn đang chỉnh sửa nhật ký đã ghi. Vui lòng cung cấp lý do." type="info" showIcon style={{ marginBottom: 16 }} />
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Lý do chỉnh sửa <span style={{ color: 'red' }}>*</span></label>
          <TextArea rows={2} placeholder="VD: Bổ sung thông tin, sửa lỗi chính tả..." value={editReason} onChange={e => setEditReason(e.target.value)} />
        </div>
        <div>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Nội dung nhật ký</label>
          <TextArea rows={4} value={editNote} onChange={e => setEditNote(e.target.value)} />
        </div>
      </Modal>

      {/* Modal lịch sử chỉnh sửa */}
      <Modal title="Lịch sử chỉnh sửa" open={historyModalOpen} onCancel={() => setHistoryModalOpen(false)} footer={null} width={600}>
        {editHistoryData.length === 0 ? (
          <Empty description="Chưa có lịch sử chỉnh sửa" />
        ) : (
          <Timeline items={editHistoryData.map(h => {
            let prev = {};
            try { prev = JSON.parse(h.previousContent); } catch {}
            return {
              color: 'blue',
              children: (
                <div>
                  <div><Text strong>{h.CrewProfile?.fullName}</Text> — <Text type="secondary">{formatDateTime(h.editedAt)}</Text></div>
                  <div style={{ marginTop: 4 }}><Tag color="orange">Lý do:</Tag> {h.editReason}</div>
                  <div style={{ marginTop: 4, background: '#f8fafc', padding: 8, borderRadius: 4, fontSize: 13 }}>
                    <div><strong>Nội dung trước khi sửa:</strong></div>
                    <div>{prev.note || '(trống)'}</div>
                  </div>
                </div>
              )
            };
          })} />
        )}
      </Modal>
    </MasterLayout>
  );
}
