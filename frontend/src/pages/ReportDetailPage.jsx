import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Timeline, Input, Button, Space, Modal, Typography, Spin, Empty, Row, Col, Alert, Table,
} from 'antd';
import {
  ArrowUpOutlined, CheckOutlined, CloseCircleOutlined, RollbackOutlined, SendOutlined, LockOutlined, DashboardOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import MasterLayout from '../components/MasterLayout';
import { reportService } from '../services/api';
import { PageHeader, StatusTag, notifySuccess, notifyError, confirmAction } from '../components/common';
import { roleLabel, getNextHandlerRole } from '../config/roles';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

const CATEGORY_LABEL = { Routine: 'Thường nhật', Incident: 'Sự cố / Khẩn cấp' };
const STATUS_LABEL = { Open: 'Chờ xử lý', InProgress: 'Đang xử lý', Resolved: 'Đã xử lý', Closed: 'Đã đóng', Rejected: 'Từ chối' };
const PRIORITY_LABEL = { Normal: 'Bình thường', High: 'Cao', Urgent: 'Khẩn cấp' };
const PRIORITY_COLOR = { Normal: 'default', High: 'gold', Urgent: 'red' };
const TYPE_LABEL = {
  Leave: 'Xin nghỉ', ShiftSwap: 'Xin đổi ca', ShiftException: 'Ngoại lệ ca trực',
  Breakdown: 'Hỏng hóc máy', ShipIssue: 'Sự cố tàu', Other: 'Khác',
};
const TIMELINE_COLOR = { reply: 'blue', escalate: 'gold', status: 'green', reject: 'red' };

const fmt = (d) => (d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

// FT-10 v2 (vấn đề #4): Hiển thị số liệu ca trực đóng băng
const THRESHOLD_COLOR = { ok: '#52c41a', warning: '#faad14', danger: '#ff4d4f' };
const THRESHOLD_LABEL = { ok: 'Bình thường', warning: 'Cảnh báo', danger: 'Nguy hiểm' };

function ShiftSnapshotCard({ snapshot }) {
  if (!snapshot) return null;
  const { shift, engine, deck, logType } = snapshot;

  const fmtTime = (t) => (t ? dayjs(t).format('HH:mm DD/MM/YYYY') : '—');

  // Bảng thông số máy
  const engineColumns = [
    { title: 'Thông số', dataIndex: 'name', key: 'name' },
    { title: 'Giá trị', dataIndex: 'value', key: 'value', align: 'right',
      render: (v, r) => <span style={{ color: THRESHOLD_COLOR[r.status] || '#000', fontWeight: r.status !== 'ok' ? 700 : 400 }}>{v}</span>,
    },
    { title: 'Min', dataIndex: 'minValue', key: 'min', align: 'right', render: (v) => v ?? '—' },
    { title: 'Max', dataIndex: 'maxValue', key: 'max', align: 'right', render: (v) => v ?? '—' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110,
      render: (s) => <Tag color={s === 'danger' ? 'red' : s === 'warning' ? 'gold' : 'green'}>{THRESHOLD_LABEL[s] || s}</Tag>,
    },
  ];

  // Bảng nhật ký boong
  const deckColumns = [
    { title: 'Giờ', dataIndex: 'hour', key: 'hour', width: 60 },
    { title: 'Hướng thật', dataIndex: 'courseTrue', key: 'courseTrue' },
    { title: 'LBCQ', dataIndex: 'courseGyro', key: 'courseGyro' },
    { title: 'Tốc độ', dataIndex: 'speed', key: 'speed' },
    { title: 'RPM', dataIndex: 'rpm', key: 'rpm' },
    { title: 'Gió', key: 'wind', render: (_, r) => `${r.windDirection || ''}${r.windForce != null ? ` F${r.windForce}` : ''}` },
    { title: 'Thời tiết', dataIndex: 'weather', key: 'weather' },
    { title: 'Khí áp', dataIndex: 'barometer', key: 'barometer' },
    { title: 'Tầm nhìn', dataIndex: 'visibility', key: 'visibility' },
  ];

  return (
    <Card
      title={<><DashboardOutlined style={{ color: '#6366f1', marginRight: 8 }} />Số liệu ca trực đính kèm</>}
      style={{ marginBottom: 16 }}
    >
      {shift && (
        <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Ca trực">{`#${shift.id}`}</Descriptions.Item>
          <Descriptions.Item label="Thời gian">{fmtTime(shift.startTime)} – {fmtTime(shift.endTime)}</Descriptions.Item>
          <Descriptions.Item label="Người trực">{shift.crew?.fullName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Bộ phận">{shift.crew?.department || '—'}</Descriptions.Item>
        </Descriptions>
      )}

      {logType === 'None' && (
        <Alert type="info" showIcon message="Ca trực chưa có nhật ký tại thời điểm tạo báo cáo." />
      )}

      {logType === 'Engine' && engine?.map((eng, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {eng.engineName || `Máy #${eng.engineId}`} {eng.engineType ? `(${eng.engineType})` : ''}
          </Text>
          {eng.note && <Paragraph type="secondary" style={{ marginBottom: 8 }}>{eng.note}</Paragraph>}
          <Table
            rowKey="parameterId"
            columns={engineColumns}
            dataSource={eng.parameters || []}
            pagination={false}
            size="small"
            bordered
          />
        </div>
      ))}

      {logType === 'Deck' && deck && (
        <>
          {deck.note && <Paragraph type="secondary" style={{ marginBottom: 8 }}>{deck.note}</Paragraph>}
          <Table
            rowKey="hour"
            columns={deckColumns}
            dataSource={deck.entries || []}
            pagination={false}
            size="small"
            bordered
            scroll={{ x: 700 }}
          />
        </>
      )}
    </Card>
  );
}

function eventText(reply) {
  const m = reply.metadata || {};
  if (reply.kind === 'escalate') return `Đẩy lên ${roleLabel(m.toRole)} xử lý`;
  if (reply.kind === 'reject') return 'Từ chối báo cáo';
  if (reply.kind === 'status' || (m.fromStatus && m.toStatus)) {
    return `Chuyển trạng thái: ${STATUS_LABEL[m.fromStatus] || m.fromStatus} → ${STATUS_LABEL[m.toStatus] || m.toStatus}`;
  }
  return null;
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [noteModal, setNoteModal] = useState(null); // { action, title, requireNote }
  const [noteText, setNoteText] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    reportService.getById(id)
      .then((res) => setReport(res.success ? res.data : null))
      .catch(() => notifyError('Không thể tải chi tiết báo cáo.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const perms = report?.permissions || {};

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await reportService.addReply(id, replyText.trim());
      setReplyText('');
      notifySuccess('Đã gửi phản hồi.');
      await fetchData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể gửi phản hồi.');
    } finally {
      setSubmitting(false);
    }
  };

  const doAction = async (action, note) => {
    setSubmitting(true);
    try {
      if (action === 'escalate') await reportService.escalate(id, note);
      else if (action === 'resolve') await reportService.resolve(id, note);
      else if (action === 'close') await reportService.close(id, note);
      else if (action === 'reopen') await reportService.reopen(id, note);
      else if (action === 'reject') await reportService.reject(id, note);
      notifySuccess('Đã cập nhật báo cáo.');
      setNoteModal(null);
      setNoteText('');
      await fetchData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Thao tác thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const openNote = (action, title, requireNote) => {
    setNoteText('');
    setNoteModal({ action, title, requireNote });
  };

  const confirmSimple = async (action, content) => {
    if (await confirmAction({ title: 'Xác nhận', content })) doAction(action);
  };

  if (loading) {
    return <MasterLayout><div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div></MasterLayout>;
  }
  if (!report) {
    return (
      <MasterLayout>
        <div style={{ padding: '24px 32px' }}>
          <PageHeader onBack={() => navigate('/reports')} title="Chi tiết báo cáo" />
          <Empty description="Không tìm thấy báo cáo" />
        </div>
      </MasterLayout>
    );
  }

  const nextRole = getNextHandlerRole(report.currentHandlerRole, report.department);
  const hasActions = perms.canEscalate || perms.canResolve || perms.canClose || perms.canReopen || perms.canReject;

  return (
    <MasterLayout>
      <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <PageHeader
          onBack={() => navigate('/reports')}
          title={report.title}
          extra={<StatusTag status={report.status} text={STATUS_LABEL[report.status] || report.status} />}
        />

        <Row gutter={16}>
          <Col xs={24} md={15}>
            <Card title="Thông tin báo cáo" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Loại">
                  <Tag color={report.reportCategory === 'Incident' ? 'red' : 'blue'}>{CATEGORY_LABEL[report.reportCategory]}</Tag>
                  <span style={{ marginLeft: 4 }}>{TYPE_LABEL[report.reportType] || report.reportType}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Mức độ">
                  <Tag color={PRIORITY_COLOR[report.priority] || 'default'}>{PRIORITY_LABEL[report.priority] || report.priority}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Bộ phận">{report.department || '—'}</Descriptions.Item>
                <Descriptions.Item label="Tàu">{report.Ship?.shipName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Người tạo">{report.CrewProfile?.fullName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">{fmt(report.createdAt)}</Descriptions.Item>
              </Descriptions>
              <Paragraph style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{report.content}</Paragraph>
            </Card>

            {/* FT-10 v2: số liệu ca trực đóng băng */}
            {report.shiftSnapshot && <ShiftSnapshotCard snapshot={report.shiftSnapshot} />}

            <Card title="Diễn tiến & Phản hồi">
              {report.replies?.length ? (
                <Timeline
                  items={report.replies.map((rep) => {
                    const ev = eventText(rep);
                    return {
                      color: TIMELINE_COLOR[rep.kind] || 'blue',
                      children: (
                        <div>
                          <Space size={8} wrap>
                            <Text strong>{rep.CrewProfile?.fullName || 'Ẩn danh'}</Text>
                            {rep.CrewProfile?.position && <Text type="secondary" style={{ fontSize: 12 }}>{rep.CrewProfile.position}</Text>}
                            <Text type="secondary" style={{ fontSize: 12 }}>{fmt(rep.repliedAt)}</Text>
                          </Space>
                          {ev && <div><Text type="secondary" italic>{ev}</Text></div>}
                          {rep.content && <div style={{ whiteSpace: 'pre-wrap' }}>{rep.content}</div>}
                        </div>
                      ),
                    };
                  })}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có phản hồi nào" />
              )}
            </Card>
          </Col>

          <Col xs={24} md={9}>
            <Card title="Trạng thái xử lý" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Đang ở cấp">
                  <Tag color="processing">{roleLabel(report.currentHandlerRole)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Người xử lý">{report.Handler?.fullName || 'Chưa tiếp nhận'}</Descriptions.Item>
              </Descriptions>
              {perms.isHandler && (
                <Alert type="info" showIcon style={{ marginTop: 8 }} message="Báo cáo đang ở cấp của bạn — bạn có quyền xử lý." />
              )}
            </Card>

            {hasActions && (
              <Card title="Hành động" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {perms.canResolve && (
                    <Button block type="primary" icon={<CheckOutlined />} loading={submitting}
                      onClick={() => confirmSimple('resolve', 'Đánh dấu báo cáo này là ĐÃ XỬ LÝ?')}>
                      Đánh dấu đã xử lý
                    </Button>
                  )}
                  {perms.canClose && (
                    <Button block type="primary" icon={<CheckOutlined />} loading={submitting}
                      onClick={() => confirmSimple('close', 'Đóng báo cáo này? Sau khi đóng sẽ không thao tác tiếp được.')}>
                      Đóng báo cáo
                    </Button>
                  )}
                  {perms.canEscalate && (
                    <Button block icon={<ArrowUpOutlined />} loading={submitting}
                      onClick={() => openNote('escalate', `Đẩy lên ${roleLabel(nextRole)}`, false)}>
                      Đẩy lên {roleLabel(nextRole)}
                    </Button>
                  )}
                  {perms.canReopen && (
                    <Button block icon={<RollbackOutlined />} loading={submitting}
                      onClick={() => openNote('reopen', 'Mở lại báo cáo', true)}>
                      Mở lại
                    </Button>
                  )}
                  {perms.canReject && (
                    <Button block danger icon={<CloseCircleOutlined />} loading={submitting}
                      onClick={() => openNote('reject', 'Từ chối báo cáo', true)}>
                      Từ chối
                    </Button>
                  )}
                </Space>
              </Card>
            )}

            <Card title="Gửi phản hồi">
              {perms.canReply ? (
                <>
                  <TextArea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Nhập nội dung phản hồi..." />
                  <Button type="primary" icon={<SendOutlined />} style={{ marginTop: 8 }} loading={submitting} disabled={!replyText.trim()} onClick={handleReply}>
                    Gửi phản hồi
                  </Button>
                </>
              ) : (
                <Text type="secondary"><LockOutlined /> Báo cáo đã kết thúc hoặc bạn không có quyền phản hồi.</Text>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title={noteModal?.title}
        open={!!noteModal}
        onOk={() => doAction(noteModal.action, noteText.trim())}
        onCancel={() => setNoteModal(null)}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={submitting}
        okButtonProps={{ disabled: noteModal?.requireNote && !noteText.trim() }}
        destroyOnHidden
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          {noteModal?.requireNote ? 'Vui lòng nhập lý do:' : 'Ghi chú (không bắt buộc):'}
        </Paragraph>
        <TextArea rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Nhập nội dung..." />
      </Modal>
    </MasterLayout>
  );
}
