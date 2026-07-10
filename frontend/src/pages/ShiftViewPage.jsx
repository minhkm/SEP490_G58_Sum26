import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Switch, DatePicker, Spin, Result, Modal, Descriptions, Tag, Typography, Space, Tooltip, Input, Checkbox } from 'antd';
import { ClockCircleOutlined, LeftOutlined, RightOutlined, EditOutlined, SwapOutlined, StopOutlined, FileTextOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import MasterLayout from '../components/MasterLayout';
import { PageHeader, StatusTag, notifySuccess, notifyError } from '../components/common';
import { shiftService } from '../services/api';
import { SHIFT_SLOTS, SHIFT_STATUS, DEPARTMENT_STYLE, slotFromStart } from '../config/shifts';

const { Text } = Typography;
const fmtTime = (t) => dayjs(t).format('HH:mm');
const depTagColor = (dep) => (dep === 'Deck' ? 'green' : dep === 'Engine' ? 'gold' : 'default');

export default function ShiftViewPage() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ctxError, setCtxError] = useState('');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [shifts, setShifts] = useState([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [deptFilter, setDeptFilter] = useState(null); // null | 'Deck' | 'Engine'
  const [detail, setDetail] = useState(null);
  const [handoverFor, setHandoverFor] = useState(null); // ca A đang mở form bàn giao
  const [handoverNote, setHandoverNote] = useState('');
  const [handoverLateTest, setHandoverLateTest] = useState(false); // chỉ dùng khi dev để giả lập muộn
  const [busy, setBusy] = useState(false);

  const myCrewId = ctx?.me?.crewId;
  const isMine = (s) => s.crewId === myCrewId;
  // Chỉ thủy thủ/thợ máy mới thực sự có ca của mình → sĩ quan không thấy toggle "Chỉ ca của tôi"
  const canHaveShift = ['Sailor', 'EngineCrew'].includes(ctx?.me?.role);

  const loadShifts = useCallback(async (date) => {
    try { setShifts(await shiftService.getShifts(date)); } catch { setShifts([]); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await shiftService.getCurrentVoyage();
        setCtx(data);
        await loadShifts(selectedDate);
      } catch (err) {
        setCtxError(err.response?.data?.message || 'Không tải được dữ liệu hải trình.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ctx) loadShifts(selectedDate);
  }, [selectedDate, ctx, loadShifts]);

  const shiftDay = (delta) => setSelectedDate(dayjs(selectedDate).add(delta, 'day').format('YYYY-MM-DD'));

  // Mở đúng trang ghi nhật ký (boong/máy) với ca đã chọn sẵn
  const goToLog = (s) => {
    const base = s.CrewProfile?.department === 'Engine' ? '/engine-logs' : '/deck-logs';
    const date = dayjs(s.startTime).format('YYYY-MM-DD');
    navigate(`${base}?voyageId=${ctx.voyage.id}&date=${date}&shiftId=${s.id}`);
  };

  // Ca liền kề cùng vị trí (để bàn giao ↔ nhận ca)
  const sameTime = (a, b) => new Date(a).getTime() === new Date(b).getTime();
  const nextShift = (s) => shifts.find(x => x.id !== s.id && x.position === s.position && x.status !== 'Cancelled' && sameTime(x.startTime, s.endTime));

  const submitHandover = async () => {
    setBusy(true);
    try {
      const res = await shiftService.handover(handoverFor.id, handoverNote, { late: handoverLateTest, test: import.meta.env.DEV });
      setHandoverFor(null); setHandoverNote(''); setHandoverLateTest(false); setDetail(null);
      await loadShifts(selectedDate);
      notifySuccess(res.message);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể bàn giao ca.');
    } finally { setBusy(false); }
  };
  const handleReceive = async (s) => {
    setBusy(true);
    try {
      const res = await shiftService.receive(s.id, { test: import.meta.env.DEV });
      setDetail(null);
      await loadShifts(selectedDate);
      notifySuccess(res.message);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể nhận ca.');
    } finally { setBusy(false); }
  };

  // Ca trong 1 khung giờ, sắp xếp theo bộ phận rồi vị trí
  const slotShifts = (slot) =>
    shifts
      .filter(s => slotFromStart(s.startTime) === slot)
      .filter(s => !onlyMine || isMine(s))
      .filter(s => !deptFilter || s.CrewProfile?.department === deptFilter)
      .sort((a, b) =>
        (a.CrewProfile?.department || '').localeCompare(b.CrewProfile?.department || '') ||
        (a.position || '').localeCompare(b.position || ''));

  if (loading) return (
    <MasterLayout><div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div></MasterLayout>
  );
  if (ctxError) return (
    <MasterLayout><Result status="info" title="Không có lịch trực" subTitle={ctxError} /></MasterLayout>
  );

  return (
    <MasterLayout>
      <div style={{ padding: '24px 32px' }}>
        <PageHeader
          icon={<ClockCircleOutlined />}
          breadcrumb={`${ctx.ship?.shipName || ''} · ${ctx.voyage?.departurePort} → ${ctx.voyage?.destinationPort}`}
          title="Lịch trực toàn tàu"
          extra={ctx.canCreate && (
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/shifts/manage?date=${selectedDate}`)}>
              Cập nhật ca trực
            </Button>
          )}
        />

        {/* Điều khiển: ngày, lọc, chú thích */}
        <Space wrap size={16} style={{ marginBottom: 20 }}>
          <Space>
            <Button icon={<LeftOutlined />} onClick={() => shiftDay(-1)} />
            <DatePicker value={dayjs(selectedDate)} allowClear={false} format="DD/MM/YYYY"
              onChange={(d) => d && setSelectedDate(d.format('YYYY-MM-DD'))} />
            <Button icon={<RightOutlined />} onClick={() => shiftDay(1)} />
            <Button onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}>Hôm nay</Button>
          </Space>
          {canHaveShift && (
            <Space>
              <Switch checked={onlyMine} onChange={setOnlyMine} />
              <Text>Chỉ ca của tôi</Text>
            </Space>
          )}
          <Space size={6}>
            <Text type="secondary" style={{ fontSize: 13 }}>Lọc bộ phận:</Text>
            {Object.entries(DEPARTMENT_STYLE).map(([k, v]) => {
              const on = deptFilter === k;
              return (
                <Tag.CheckableTag key={k} checked={on} onChange={(checked) => setDeptFilter(checked ? k : null)}
                  style={{
                    borderRadius: 6, padding: '1px 10px',
                    border: `1px solid ${on ? v.border : '#d9d9d9'}`,
                    background: on ? v.bg : 'transparent',
                    color: on ? v.color : '#595959',
                  }}>
                  {v.label}
                </Tag.CheckableTag>
              );
            })}
          </Space>
        </Space>

        {/* Timetable ngang: 6 cột khung giờ, thẻ ca xếp dọc trong mỗi cột */}
        <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflowX: 'auto' }}>
          <div style={{ display: 'flex', minWidth: 920, alignItems: 'stretch' }}>
            {SHIFT_SLOTS.map((slot, i) => {
              const list = slotShifts(slot.slot);
              return (
                <div key={slot.slot} style={{ flex: 1, minWidth: 150, borderRight: i < SHIFT_SLOTS.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '12px 10px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#595959' }}>
                    {slot.label}
                  </div>
                  <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 220 }}>
                    {list.length === 0 ? (
                      <Text type="secondary" style={{ textAlign: 'center', marginTop: 12, fontSize: 12 }}>—</Text>
                    ) : (
                      list.map(s => {
                        const mine = isMine(s);
                        const dep = DEPARTMENT_STYLE[s.CrewProfile?.department] || { bg: '#fafafa', border: '#f0f0f0', label: '—' };
                        return (
                          <div key={s.id} onClick={() => setDetail(s)}
                            style={{
                              cursor: 'pointer', background: dep.bg,
                              border: `1px solid ${mine ? '#1677ff' : dep.border}`,
                              outline: mine ? '2px solid #1677ff' : 'none',
                              borderRadius: 8, padding: '8px 10px',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Tag color={depTagColor(s.CrewProfile?.department)} style={{ marginInlineEnd: 0 }}>{dep.label}</Tag>
                              {mine && <Tag color="blue" style={{ marginInlineEnd: 0, marginLeft: 'auto' }}>Tôi</Tag>}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#262626', lineHeight: 1.3 }}>{s.CrewProfile?.fullName || '—'}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>{s.position || 'Trực ca'}</Text>
                            <div style={{ marginTop: 4 }}>
                              <StatusTag status={s.status} text={SHIFT_STATUS[s.status]?.label} />
                            </div>
                            {s.handoverLate && (
                              <div style={{ marginTop: 3, fontSize: 11, color: '#cf1322', fontWeight: 600 }}>Ca trực bị muộn</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal chi tiết */}
      <Modal open={!!detail} onCancel={() => setDetail(null)} title="Chi tiết ca trực" footer={null}>
        {detail && (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginTop: 8 }}>
              <Descriptions.Item label="Thời gian">{fmtTime(detail.startTime)} – {fmtTime(detail.endTime)}</Descriptions.Item>
              <Descriptions.Item label="Người đảm nhiệm">{detail.CrewProfile?.fullName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Bộ phận">{(DEPARTMENT_STYLE[detail.CrewProfile?.department] || {}).label || '—'}</Descriptions.Item>
              <Descriptions.Item label="Vị trí">{detail.position || 'Trực ca'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><StatusTag status={detail.status} text={SHIFT_STATUS[detail.status]?.label} /></Descriptions.Item>
            </Descriptions>
            {(() => {
              const started = new Date(detail.startTime) <= new Date();
              const nxt = nextShift(detail);                                       // ca mình bàn giao cho (mình là A)
              const canHandover = isMine(detail) && nxt && !nxt.handedOverAt;
              const canReceive = isMine(detail) && detail.handedOverAt && !detail.receivedAt; // mình là B
              return (
                <div style={{ marginTop: 16 }}>
                  {/* Thông tin bàn giao */}
                  {detail.handoverNote && (
                    <div style={{ marginBottom: 12, padding: 10, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Ghi chú bàn giao từ ca trước:</Text>
                      <div>{detail.handoverNote}</div>
                    </div>
                  )}
                  <Space wrap style={{ marginBottom: (canHandover || canReceive || (isMine(detail) && started)) ? 12 : 0 }}>
                    {detail.handedOverAt && detail.receivedAt && <Tag color="green">Đã bàn giao xong</Tag>}
                    {detail.handoverLate && <Tag color="red">Bàn giao muộn</Tag>}
                    {isMine(detail) && nxt?.handedOverAt && <Tag color="blue">Đã bàn giao cho ca sau</Tag>}
                  </Space>

                  {isMine(detail) && (
                    <Space wrap>
                      {started && (
                        <Button type="primary" icon={<FileTextOutlined />} onClick={() => goToLog(detail)}>
                          Ghi nhật ký trực
                        </Button>
                      )}
                      {canHandover && (
                        <Button icon={<SwapOutlined />} onClick={() => { setHandoverNote(''); setHandoverLateTest(false); setHandoverFor(detail); }}>
                          Bàn giao ca
                        </Button>
                      )}
                      {canReceive && (
                        <Button type="primary" icon={<CheckOutlined />} loading={busy} onClick={() => handleReceive(detail)}>
                          Nhận ca
                        </Button>
                      )}
                      <Tooltip title="Tạo báo cáo ngoại lệ / sự cố từ ca trực này">
                        <Button icon={<StopOutlined />} danger onClick={() => navigate(`/reports?shiftId=${detail.id}`)}>Báo cáo ca trực</Button>
                      </Tooltip>
                    </Space>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </Modal>

      {/* Modal bàn giao ca (ghi chú) */}
      <Modal open={!!handoverFor} onCancel={() => setHandoverFor(null)} title="Bàn giao ca"
        okText="Xác nhận bàn giao" cancelText="Hủy" confirmLoading={busy} onOk={submitHandover}>
        <Text type="secondary">Ghi chú tình trạng bàn giao (thời tiết, thiết bị, lưu ý cho ca sau...)</Text>
        <Input.TextArea rows={4} value={handoverNote} onChange={(e) => setHandoverNote(e.target.value)}
          placeholder="VD: Biển động nhẹ, radar hoạt động bình thường..." style={{ marginTop: 8 }} />
        {import.meta.env.DEV && (
          <Checkbox checked={handoverLateTest} onChange={(e) => setHandoverLateTest(e.target.checked)} style={{ marginTop: 12 }}>
            Giả lập muộn (test)
          </Checkbox>
        )}
      </Modal>
    </MasterLayout>
  );
}
