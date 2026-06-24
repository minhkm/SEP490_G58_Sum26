import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterLayout from '../components/MasterLayout';
import { shiftService } from '../services/api';
import { SHIFT_SLOTS, SHIFT_STATUS, DEPARTMENT_STYLE, slotFromStart } from '../config/shifts';
import { Clock, Ship, CalendarDays, ChevronLeft, ChevronRight, AlertCircle, X, UserCheck, Ban, Pencil } from 'lucide-react';

const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fmtTime = (t) => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export default function ShiftViewPage() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ctxError, setCtxError] = useState('');
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const [shifts, setShifts] = useState([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [detail, setDetail] = useState(null);

  const myCrewId = ctx?.me?.crewId;
  const isMine = (s) => s.crewId === myCrewId;

  const loadShifts = useCallback(async (date) => {
    try {
      setShifts(await shiftService.getShifts(date));
    } catch {
      setShifts([]);
    }
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

  const shiftDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(toYMD(d));
  };

  // Ca trong 1 khung giờ, sắp xếp theo bộ phận rồi vị trí
  const slotShifts = (slot) =>
    shifts
      .filter(s => slotFromStart(s.startTime) === slot)
      .filter(s => !onlyMine || isMine(s))
      .sort((a, b) =>
        (a.CrewProfile?.department || '').localeCompare(b.CrewProfile?.department || '') ||
        (a.position || '').localeCompare(b.position || ''));

  if (loading) return (
    <MasterLayout><div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Đang tải...</div></MasterLayout>
  );
  if (ctxError) return (
    <MasterLayout>
      <div style={{ padding: '60px 32px', textAlign: 'center', color: '#64748b' }}>
        <AlertCircle size={42} style={{ opacity: 0.4, marginBottom: 12 }} />
        <p style={{ margin: 0, fontSize: 15 }}>{ctxError}</p>
      </div>
    </MasterLayout>
  );

  return (
    <MasterLayout>
      <div style={{ padding: '28px 32px', maxWidth: 1180, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={22} /> Lịch trực toàn tàu
            </h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Ship size={14} /> {ctx.ship?.shipName} · {ctx.voyage?.departurePort} → {ctx.voyage?.destinationPort}
            </p>
          </div>
          {ctx.canCreate && (
            <button onClick={() => navigate(`/shifts/manage?date=${selectedDate}`)}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pencil size={16} /> Cập nhật ca trực
            </button>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' }}>
            <button onClick={() => shiftDate(-1)} style={navBtn}><ChevronLeft size={18} /></button>
            <CalendarDays size={16} color="#64748b" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
            <button onClick={() => shiftDate(1)} style={navBtn}><ChevronRight size={18} /></button>
            <button onClick={() => setSelectedDate(toYMD(new Date()))}
              style={{ ...navBtn, width: 'auto', padding: '0 12px', fontSize: 13, color: '#2563eb' }}>Hôm nay</button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#334155' }}>
            <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} style={{ width: 16, height: 16 }} />
            Chỉ ca của tôi
          </label>

          {/* Chú thích bộ phận */}
          <div style={{ display: 'flex', gap: 14, marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
            {Object.entries(DEPARTMENT_STYLE).map(([k, v]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: v.bg, border: `1px solid ${v.border}`, display: 'inline-block' }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* Timetable ngang: 6 cột khung giờ, thẻ ca xếp dọc trong mỗi cột */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflowX: 'auto' }}>
          <div style={{ display: 'flex', minWidth: 920, alignItems: 'stretch' }}>
            {SHIFT_SLOTS.map((slot, i) => {
              const list = slotShifts(slot.slot);
              return (
                <div key={slot.slot} style={{ flex: 1, minWidth: 150, borderRight: i < SHIFT_SLOTS.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', flexDirection: 'column' }}>
                  {/* Đầu cột: khung giờ */}
                  <div style={{ padding: '12px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#334155', fontSize: 12.5, letterSpacing: '0.01em' }}>
                    {slot.label}
                  </div>
                  {/* Thân cột: các thẻ xếp dọc */}
                  <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 220 }}>
                    {list.length === 0 ? (
                      <span style={{ color: '#cbd5e1', fontSize: 12, textAlign: 'center', marginTop: 12 }}>—</span>
                    ) : (
                      list.map(s => {
                        const mine = isMine(s);
                        const dep = DEPARTMENT_STYLE[s.CrewProfile?.department] || { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: '—' };
                        const st = SHIFT_STATUS[s.status] || SHIFT_STATUS.Scheduled;
                        return (
                          <button key={s.id} onClick={() => setDetail(s)}
                            style={{
                              textAlign: 'left', cursor: 'pointer', width: '100%',
                              border: `1px solid ${mine ? '#2563eb' : dep.border}`,
                              outline: mine ? '2px solid #2563eb' : 'none',
                              background: dep.bg, borderRadius: 10, padding: '9px 11px',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: dep.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dep.label}</span>
                              {mine && <span style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 6 }}>Tôi</span>}
                            </div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5, lineHeight: 1.25 }}>{s.CrewProfile?.fullName || '—'}</div>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginTop: 2 }}>{s.position || 'Trực ca'}</div>
                            <div style={{ fontSize: 10.5, color: st.color, marginTop: 3 }}>{st.label}</div>
                          </button>
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

      {/* Detail modal */}
      {detail && (
        <div onClick={() => setDetail(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700 }}>Chi tiết ca trực</h3>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {[
                ['Thời gian', `${fmtTime(detail.startTime)} – ${fmtTime(detail.endTime)}`],
                ['Người đảm nhiệm', detail.CrewProfile?.fullName || '—'],
                ['Bộ phận', (DEPARTMENT_STYLE[detail.CrewProfile?.department] || {}).label || '—'],
                ['Vị trí', detail.position || 'Trực ca'],
                ['Trạng thái', (SHIFT_STATUS[detail.status] || SHIFT_STATUS.Scheduled).label],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{k}</span>
                  <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 600 }}>{v}</span>
                </div>
              ))}

              {isMine(detail) && (
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button disabled title="Sẽ làm sau (bàn giao ca khi gần giờ trực)"
                    style={disabledBtn}><UserCheck size={15} /> Bàn giao ca</button>
                  <button disabled title="Sẽ làm sau (từ chối → báo cáo)"
                    style={disabledBtn}><Ban size={15} /> Từ chối ca</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MasterLayout>
  );
}

const navBtn = { width: 32, height: 32, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' };
const disabledBtn = { flex: 1, background: '#f1f5f9', color: '#94a3b8', border: 'none', borderRadius: 8, padding: '10px', cursor: 'not-allowed', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
