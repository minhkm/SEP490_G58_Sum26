import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MasterLayout from '../components/MasterLayout';
import { shiftService } from '../services/api';
import { SHIFT_SLOTS, LOCATIONS, SHIFT_STATUS, DEPARTMENT_STYLE, slotFromStart } from '../config/shifts';
import { Clock, Ship, CalendarDays, ChevronLeft, ChevronRight, ArrowLeft, Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fmtTime = (t) => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export default function ShiftSchedulePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ctxError, setCtxError] = useState('');
  const [selectedDate, setSelectedDate] = useState(params.get('date') || toYMD(new Date()));
  const [shifts, setShifts] = useState([]);

  // drafts[slot] = [{ tempId, crewId, position }]
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  // sửa inline
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ crewId: '', position: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const myDept = ctx?.me?.department;
  const assignable = ctx?.assignableCrew || [];

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
    if (ctx) { loadShifts(selectedDate); setDrafts({}); setEditingId(null); }
  }, [selectedDate, ctx, loadShifts]);

  const isFuture = (s) => new Date(s.startTime) > new Date();
  const slotShifts = (slot) => shifts.filter(s => slotFromStart(s.startTime) === slot);
  // Slot đã qua giờ bắt đầu trên ngày đang chọn -> không cho thêm ca mới
  const slotIsPast = (slot) => { const d = new Date(selectedDate); d.setHours(slot * 4, 0, 0, 0); return d <= new Date(); };

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(toYMD(d));
  };

  // ── drafts ──
  const addDraft = (slot) =>
    setDrafts(prev => ({ ...prev, [slot]: [...(prev[slot] || []), { tempId: `${slot}-${Date.now()}`, crewId: '', position: '' }] }));
  const setDraft = (slot, tempId, field, value) =>
    setDrafts(prev => ({ ...prev, [slot]: prev[slot].map(d => d.tempId === tempId ? { ...d, [field]: value } : d) }));
  const removeDraft = (slot, tempId) =>
    setDrafts(prev => ({ ...prev, [slot]: prev[slot].filter(d => d.tempId !== tempId) }));

  const draftCount = Object.values(drafts).reduce((n, arr) => n + arr.filter(d => d.crewId).length, 0);

  const handleSaveDrafts = async () => {
    const entries = [];
    Object.entries(drafts).forEach(([slot, arr]) =>
      arr.forEach(d => { if (d.crewId) entries.push({ slot: Number(slot), crewId: d.crewId, position: d.position }); }));
    if (entries.length === 0) {
      Swal.fire('Chưa có ca nào', 'Hãy thêm và chọn người cho ít nhất 1 ca.', 'info');
      return;
    }
    setSaving(true);
    try {
      const res = await shiftService.createBulk({ date: selectedDate, entries });
      setDrafts({});
      await loadShifts(selectedDate);
      Swal.fire({ icon: 'success', title: 'Đã tạo', text: res.message, timer: 1600, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể tạo ca trực.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── edit/delete existing ──
  const startEdit = (s) => { setEditingId(s.id); setEditForm({ crewId: String(s.crewId), position: s.position || '' }); };
  const handleSaveEdit = async (id) => {
    setSavingEdit(true);
    try {
      await shiftService.update(id, { crewId: editForm.crewId, position: editForm.position });
      setEditingId(null);
      await loadShifts(selectedDate);
      Swal.fire({ icon: 'success', title: 'Đã lưu', timer: 1300, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể cập nhật.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };
  const handleDelete = async (s) => {
    const r = await Swal.fire({
      title: 'Xóa ca trực?',
      text: `${fmtTime(s.startTime)}–${fmtTime(s.endTime)} · ${s.position || ''} · ${s.CrewProfile?.fullName || ''}`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Xóa', cancelButtonText: 'Đóng', confirmButtonColor: '#ef4444',
    });
    if (!r.isConfirmed) return;
    try {
      await shiftService.remove(s.id);
      await loadShifts(selectedDate);
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể xóa ca.', 'error');
    }
  };

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

  const depStyle = DEPARTMENT_STYLE[myDept] || { label: myDept, color: '#475569' };

  return (
    <MasterLayout>
      <div style={{ padding: '28px 32px', maxWidth: 1080, margin: '0 auto' }}>

        {/* Header */}
        <button onClick={() => navigate('/shifts')}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 12, padding: 0 }}>
          <ArrowLeft size={16} /> Về lịch trực
        </button>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={22} /> Phân công ca trực — Bộ phận <span style={{ color: depStyle.color }}>{depStyle.label}</span>
          </h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ship size={14} /> {ctx.ship?.shipName} · {ctx.voyage?.departurePort} → {ctx.voyage?.destinationPort}
          </p>
        </div>

        {/* Date nav + save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' }}>
            <button onClick={() => changeDate(-1)} style={navBtn}><ChevronLeft size={18} /></button>
            <CalendarDays size={16} color="#64748b" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
            <button onClick={() => changeDate(1)} style={navBtn}><ChevronRight size={18} /></button>
            <button onClick={() => setSelectedDate(toYMD(new Date()))}
              style={{ ...navBtn, width: 'auto', padding: '0 12px', fontSize: 13, color: '#2563eb' }}>Hôm nay</button>
          </div>
          <button onClick={handleSaveDrafts} disabled={saving || draftCount === 0}
            style={{ marginLeft: 'auto', background: draftCount ? '#2563eb' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', cursor: draftCount ? 'pointer' : 'default', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={16} /> {saving ? 'Đang lưu...' : `Lưu ${draftCount || ''} ca mới`}
          </button>
        </div>

        {/* 6 khung giờ */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
          {SHIFT_SLOTS.map(slot => {
            const existing = slotShifts(slot.slot);
            const slotDrafts = drafts[slot.slot] || [];
            return (
              <div key={slot.slot} style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 120, flexShrink: 0, padding: '16px 18px', background: '#f8fafc', display: 'flex', alignItems: 'flex-start', fontWeight: 700, color: '#334155', fontSize: 13 }}>
                  {slot.label}
                </div>

                <div style={{ flex: 1, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Ca đã có */}
                  {existing.map(s => {
                    const dep = DEPARTMENT_STYLE[s.CrewProfile?.department] || {};
                    const st = SHIFT_STATUS[s.status] || SHIFT_STATUS.Scheduled;
                    const editable = isFuture(s) && s.CrewProfile?.department === myDept;
                    if (editingId === s.id) {
                      return (
                        <div key={s.id} style={rowBox}>
                          <select value={editForm.position} onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))} style={selectStyle}>
                            <option value="">— Vị trí —</option>
                            {LOCATIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <select value={editForm.crewId} onChange={e => setEditForm(f => ({ ...f, crewId: e.target.value }))} style={selectStyle}>
                            {assignable.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                          </select>
                          <button onClick={() => handleSaveEdit(s.id)} disabled={savingEdit} style={iconBtn('#2563eb')}><Save size={16} /></button>
                          <button onClick={() => setEditingId(null)} style={iconBtn('#64748b')}><X size={16} /></button>
                        </div>
                      );
                    }
                    return (
                      <div key={s.id} style={rowBox}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: dep.color || '#475569', minWidth: 64 }}>{s.position || 'Trực ca'}</span>
                        <span style={{ flex: 1, fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{s.CrewProfile?.fullName || '—'}</span>
                        <span style={{ background: st.bg, color: st.color, padding: '2px 9px', borderRadius: 14, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                        {(() => {
                          const reason = s.CrewProfile?.department !== myDept ? 'Khác bộ phận — không sửa được' : 'Ca đã bắt đầu — không sửa được';
                          return (
                            <>
                              <button onClick={() => startEdit(s)} disabled={!editable} title={editable ? 'Sửa' : reason} style={iconBtn(editable ? '#64748b' : '#cbd5e1', !editable)}><Edit2 size={15} /></button>
                              <button onClick={() => handleDelete(s)} disabled={!editable} title={editable ? 'Xóa' : reason} style={iconBtn(editable ? '#ef4444' : '#cbd5e1', !editable)}><Trash2 size={15} /></button>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}

                  {/* Dòng nháp */}
                  {slotDrafts.map(d => (
                    <div key={d.tempId} style={{ ...rowBox, background: '#f8fafc', borderStyle: 'dashed' }}>
                      <select value={d.position} onChange={e => setDraft(slot.slot, d.tempId, 'position', e.target.value)} style={selectStyle}>
                        <option value="">— Vị trí —</option>
                        {LOCATIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <select value={d.crewId} onChange={e => setDraft(slot.slot, d.tempId, 'crewId', e.target.value)} style={selectStyle}>
                        <option value="">— Chọn người —</option>
                        {assignable.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                      </select>
                      <button onClick={() => removeDraft(slot.slot, d.tempId)} title="Bỏ" style={iconBtn('#ef4444')}><X size={16} /></button>
                    </div>
                  ))}

                  {existing.length === 0 && slotDrafts.length === 0 && (
                    <span style={{ color: '#cbd5e1', fontSize: 13 }}>Chưa phân ca</span>
                  )}

                  {slotIsPast(slot.slot) ? (
                    <span style={{ alignSelf: 'flex-start', color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>Đã qua giờ — không thêm ca</span>
                  ) : (
                    <button onClick={() => addDraft(slot.slot)}
                      style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #cbd5e1', color: '#2563eb', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Plus size={14} /> Thêm ca
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 14 }}>
          * Chỉ gán được thủy thủ/thợ máy cấp dưới cùng bộ phận. Ca đã bắt đầu hoặc thuộc bộ phận khác không thể sửa/xóa.
        </p>
      </div>
    </MasterLayout>
  );
}

const navBtn = { width: 32, height: 32, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' };
const selectStyle = { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', minWidth: 150 };
const rowBox = { display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px' };
const iconBtn = (color, disabled = false) => ({ background: 'none', border: 'none', color, cursor: disabled ? 'not-allowed' : 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' });
