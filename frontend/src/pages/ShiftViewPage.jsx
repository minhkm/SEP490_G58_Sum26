import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Switch, DatePicker, Spin, Result, Modal, Descriptions, Tag, Typography, Space, Tooltip, Input, Checkbox } from 'antd';
import { ClockCircleOutlined, LeftOutlined, RightOutlined, EditOutlined, SwapOutlined, StopOutlined, FileTextOutlined, CheckOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import MasterLayout from '../components/MasterLayout';
import { PageHeader, PageContainer, StatusTag, notifySuccess, notifyError } from '../components/common';
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
  const [simulateLate, setSimulateLate] = useState(false); // dev: bỏ qua cửa sổ giờ + đánh dấu muộn
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const myCrewId = ctx?.me?.crewId;
  const isMine = (s) => s.crewId === myCrewId;
  // Chỉ thủy thủ/thợ máy mới thực sự có ca của mình → sĩ quan không thấy toggle "Chỉ ca của tôi"
  const canHaveShift = ['Sailor', 'EngineCrew'].includes(ctx?.me?.role);
  // Lãnh đạo bộ phận được xuất báo cáo trực (boong / máy)
  const canExportDeck = ['DeckOfficer', 'ChiefOfficer', 'Master'].includes(ctx?.me?.role);
  const canExportEngine = ['EngineOfficer', 'Master'].includes(ctx?.me?.role);

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

  // Xuất Excel báo cáo trực (boong / máy)
  const handleExport = async (dept) => {
    setExporting(true);
    try {
      const response = dept === 'engine'
        ? await shiftService.exportEngineReport(ctx.voyage.id)
        : await shiftService.exportDeckReport(ctx.voyage.id);
      const disposition = response.headers?.['content-disposition'] || '';
      const m = disposition.match(/filename="?([^";]+)"?/i);
      const fallback = dept === 'engine'
        ? `Nhat_Ky_Truc_May_Voyage-${ctx.voyage.id}.xlsx`
        : `Nhat_Ky_Truc_Boong_Voyage-${ctx.voyage.id}.xlsx`;
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url; link.download = m?.[1] || fallback;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      notifySuccess('Đã xuất báo cáo Excel.');
    } catch {
      notifyError('Không thể xuất báo cáo Excel.');
    } finally { setExporting(false); }
  };

  // Mở đúng trang ghi nhật ký (boong/máy) với ca đã chọn sẵn
  const goToLog = (s) => {
    const base = s.CrewProfile?.department === 'Engine' ? '/engine-logs' : '/deck-logs';
    const date = dayjs(s.startTime).format('YYYY-MM-DD');
    navigate(`${base}?voyageId=${ctx.voyage.id}&date=${date}&shiftId=${s.id}`);
  };

  // Ca liền kề cùng vị trí (để bàn giao ↔ nhận ca)
  const sameTime = (a, b) => new Date(a).getTime() === new Date(b).getTime();
  // Ca kế tiếp cùng vị trí (để người trực ca này bàn giao cho ca sau)
  const nextShift = (s) => shifts.find(x => x.id !== s.id && x.position === s.position && x.status !== 'Cancelled' && sameTime(x.startTime, s.endTime));

  const submitHandover = async () => {
    setBusy(true);
    try {
      const res = await shiftService.handover(handoverFor.id, handoverNote, { late: simulateLate, test: simulateLate });
      setHandoverFor(null); setHandoverNote(''); setSimulateLate(false); setDetail(null);
      await loadShifts(selectedDate);
      notifySuccess(res.message);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể bàn giao ca.');
    } finally { setBusy(false); }
  };
  const handleReceive = async (s) => {
    setBusy(true);
    try {
      const res = await shiftService.receive(s.id, { late: simulateLate, test: simulateLate });
      setSimulateLate(false); setDetail(null);
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
      <PageContainer>
        <PageHeader
          icon={<ClockCircleOutlined />}
          breadcrumb={`${ctx.ship?.shipName || ''} · ${ctx.voyage?.departurePort} → ${ctx.voyage?.destinationPort}`}
          title="Lịch trực toàn tàu"
          extra={
            <Space wrap>
              <Button onClick={() => navigate(`/deck-logs?voyageId=${ctx.voyage.id}`)} icon={<FileTextOutlined />}>
                Nhật ký Boong
              </Button>
              <Button onClick={() => navigate(`/engine-logs?voyageId=${ctx.voyage.id}`)} icon={<FileTextOutlined />}>
                Nhật ký Máy
              </Button>
              {canExportDeck && (
                <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => handleExport('deck')}>
                  Xuất báo cáo boong
                </Button>
              )}
              {canExportEngine && (
                <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => handleExport('engine')}>
                  Xuất báo cáo máy
                </Button>
              )}
              {ctx.canCreate && (
                <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/shifts/manage?date=${selectedDate}`)}>
                  Cập nhật ca trực
                </Button>
              )}
            </Space>
          }
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
      </PageContainer>

      {/* Modal chi tiết */}
      <Modal open={!!detail} onCancel={() => { setDetail(null); setSimulateLate(false); }} title="Chi tiết ca trực" footer={null}>
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
              const nxt = nextShift(detail);   // ca kế tiếp (mình là người BÀN GIAO)
              // Nhận ca: mình trực ca này & chưa nhận (tạm thời cho nhận kể cả khi không có ca liền trước)
              const canReceive = isMine(detail) && !detail.receivedAt;
              // Bàn giao sau: mình là ca trước, ca sau đã nhận nhưng chưa được bàn giao
              const canHandover = isMine(detail) && nxt && nxt.receivedAt && !nxt.handedOverAt;
              return (
                <div style={{ marginTop: 16 }}>
                  {/* Ghi chú bàn giao (hiện cho người ca sau đọc) */}
                  {detail.handoverNote && (
                    <div style={{ marginBottom: 12, padding: 10, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Ghi chú bàn giao từ ca trước:</Text>
                      <div>{detail.handoverNote}</div>
                    </div>
                  )}
                  <Space wrap style={{ marginBottom: 12 }}>
                    {detail.receivedAt && !detail.handedOverAt && <Tag color="orange">Đã nhận ca, chờ bàn giao</Tag>}
                    {detail.handedOverAt && detail.receivedAt && <Tag color="green">Đã bàn giao xong</Tag>}
                    {detail.handoverLate && <Tag color="red">Bàn giao muộn</Tag>}
                    {isMine(detail) && nxt?.receivedAt && !nxt?.handedOverAt && <Tag color="orange">Ca sau đã nhận — chờ bạn bàn giao</Tag>}
                    {isMine(detail) && nxt?.handedOverAt && <Tag color="blue">Đã bàn giao cho ca sau</Tag>}
                  </Space>

                  {isMine(detail) && (
                    <>
                      {import.meta.env.DEV && (canReceive || canHandover) && (
                        <Checkbox checked={simulateLate} onChange={(e) => setSimulateLate(e.target.checked)} style={{ display: 'block', marginBottom: 10 }}>
                          Giả lập muộn — bỏ qua cửa sổ giờ (test)
                        </Checkbox>
                      )}
                      <Space wrap>
                        <Button type="primary" icon={<FileTextOutlined />} onClick={() => goToLog(detail)}>
                          Ghi nhật ký trực
                        </Button>
                        {canReceive && (
                          <Button type="primary" icon={<CheckOutlined />} loading={busy} onClick={() => handleReceive(detail)}>
                            Nhận ca
                          </Button>
                        )}
                        {canHandover && (
                          <Button icon={<SwapOutlined />} onClick={() => { setHandoverNote(''); setHandoverFor(detail); }}>
                            Bàn giao ca
                          </Button>
                        )}
                        <Tooltip title="Tạo báo cáo ngoại lệ / sự cố từ ca trực này">
                          <Button icon={<StopOutlined />} danger onClick={() => navigate(`/reports?shiftId=${detail.id}`)}>Báo cáo ca trực</Button>
                        </Tooltip>
                      </Space>
                    </>
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
      </Modal>
    </MasterLayout>
  );
}
