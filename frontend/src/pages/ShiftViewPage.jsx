import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Switch, DatePicker, Spin, Result, Modal, Descriptions, Tag, Typography, Space, Tooltip } from 'antd';
import { ClockCircleOutlined, LeftOutlined, RightOutlined, EditOutlined, SwapOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import MasterLayout from '../components/MasterLayout';
import { PageHeader, StatusTag } from '../components/common';
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
            {isMine(detail) && (
              <Space style={{ marginTop: 16 }}>
                <Tooltip title="Sẽ làm sau (bàn giao ca khi gần giờ trực)">
                  <Button icon={<SwapOutlined />} disabled>Bàn giao ca</Button>
                </Tooltip>
                <Tooltip title="Sẽ làm sau (từ chối → báo cáo)">
                  <Button icon={<StopOutlined />} disabled danger>Từ chối ca</Button>
                </Tooltip>
              </Space>
            )}
          </>
        )}
      </Modal>
    </MasterLayout>
  );
}
