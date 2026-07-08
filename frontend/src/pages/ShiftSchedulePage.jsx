import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, DatePicker, Select, Spin, Result, Card, Space, Typography, Tooltip, Tag } from 'antd';
import { ClockCircleOutlined, LeftOutlined, RightOutlined, PlusOutlined, SaveOutlined, EditOutlined, DeleteOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import MasterLayout from '../components/MasterLayout';
import { PageHeader, StatusTag, notifySuccess, notifyError, notifyInfo, confirmDelete } from '../components/common';
import { shiftService } from '../services/api';
import { SHIFT_SLOTS, SHIFT_STATUS, POSITIONS_BY_DEPT, DEPARTMENT_STYLE, slotFromStart } from '../config/shifts';

const { Text } = Typography;
const fmtTime = (t) => dayjs(t).format('HH:mm');
const depTagColor = (dep) => (dep === 'Deck' ? 'green' : dep === 'Engine' ? 'gold' : 'default');

export default function ShiftSchedulePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ctxError, setCtxError] = useState('');
  const [selectedDate, setSelectedDate] = useState(params.get('date') || dayjs().format('YYYY-MM-DD'));
  const [shifts, setShifts] = useState([]);

  // drafts[slot] = [{ tempId, crewId, position }]
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  // sửa inline
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ crewId: undefined, position: undefined });
  const [savingEdit, setSavingEdit] = useState(false);

  const myDept = ctx?.me?.department;
  const assignable = ctx?.assignableCrew || [];
  const crewOptions = assignable.map(c => ({ value: c.id, label: c.fullName }));
  const locationOptions = (POSITIONS_BY_DEPT[myDept] || []).map(p => ({ value: p, label: p }));

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
    if (ctx) { loadShifts(selectedDate); setDrafts({}); setEditingId(null); }
  }, [selectedDate, ctx, loadShifts]);

  const isFuture = (s) => new Date(s.startTime) > new Date();
  const slotShifts = (slot) => shifts.filter(s => slotFromStart(s.startTime) === slot);
  // Slot đã qua giờ bắt đầu trên ngày đang chọn -> không cho thêm ca mới
  const slotIsPast = (slot) => dayjs(selectedDate).hour(slot * 4).minute(0).second(0).millisecond(0).toDate() <= new Date();

  const shiftDay = (delta) => setSelectedDate(dayjs(selectedDate).add(delta, 'day').format('YYYY-MM-DD'));

  // ── drafts ──
  const addDraft = (slot) =>
    setDrafts(prev => ({ ...prev, [slot]: [...(prev[slot] || []), { tempId: `${slot}-${Date.now()}`, crewId: undefined, position: undefined }] }));
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
      notifyInfo('Hãy thêm và chọn người cho ít nhất 1 ca.');
      return;
    }
    setSaving(true);
    try {
      const res = await shiftService.createBulk({ date: selectedDate, entries });
      setDrafts({});
      await loadShifts(selectedDate);
      notifySuccess(res.message || 'Đã tạo ca trực.');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể tạo ca trực.');
    } finally {
      setSaving(false);
    }
  };

  // ── sửa/xóa ca đã có ──
  const startEdit = (s) => { setEditingId(s.id); setEditForm({ crewId: s.crewId, position: s.position || undefined }); };
  const handleSaveEdit = async (id) => {
    setSavingEdit(true);
    try {
      await shiftService.update(id, { crewId: editForm.crewId, position: editForm.position });
      setEditingId(null);
      await loadShifts(selectedDate);
      notifySuccess('Đã lưu thay đổi.');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể cập nhật.');
    } finally {
      setSavingEdit(false);
    }
  };
  const handleDelete = async (s) => {
    const ok = await confirmDelete({
      title: 'Xóa ca trực?',
      content: `${fmtTime(s.startTime)}–${fmtTime(s.endTime)} · ${s.position || ''} · ${s.CrewProfile?.fullName || ''}`,
    });
    if (!ok) return;
    try {
      await shiftService.remove(s.id);
      await loadShifts(selectedDate);
      notifySuccess('Đã xóa ca trực.');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Không thể xóa ca.');
    }
  };

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
          onBack={() => navigate('/shifts')}
          icon={<ClockCircleOutlined />}
          breadcrumb={`${ctx.ship?.shipName || ''} · ${ctx.voyage?.departurePort} → ${ctx.voyage?.destinationPort}`}
          title={`Phân công ca trực — Bộ phận ${DEPARTMENT_STYLE[myDept]?.label || myDept || ''}`}
          extra={
            <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={draftCount === 0} onClick={handleSaveDrafts}>
              Lưu {draftCount || ''} ca mới
            </Button>
          }
        />

        <Space style={{ marginBottom: 20 }}>
          <Button icon={<LeftOutlined />} onClick={() => shiftDay(-1)} />
          <DatePicker value={dayjs(selectedDate)} allowClear={false} format="DD/MM/YYYY"
            onChange={(d) => d && setSelectedDate(d.format('YYYY-MM-DD'))} />
          <Button icon={<RightOutlined />} onClick={() => shiftDay(1)} />
          <Button onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}>Hôm nay</Button>
        </Space>

        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 12, overflow: 'hidden' }}>
          {SHIFT_SLOTS.map((slot, idx) => {
            const existing = slotShifts(slot.slot);
            const slotDrafts = drafts[slot.slot] || [];
            return (
              <div key={slot.slot} style={{ display: 'flex', alignItems: 'stretch', borderTop: idx ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ width: 120, flexShrink: 0, padding: '16px 18px', background: '#fafafa', fontWeight: 600, fontSize: 13, color: '#595959' }}>
                  {slot.label}
                </div>

                <div style={{ flex: 1, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Ca đã có */}
                  {existing.map(s => {
                    const editable = isFuture(s) && s.CrewProfile?.department === myDept;
                    const reason = s.CrewProfile?.department !== myDept ? 'Khác bộ phận — không sửa được' : 'Ca đã bắt đầu — không sửa được';
                    if (editingId === s.id) {
                      return (
                        <Space key={s.id} wrap>
                          <Select placeholder="Vị trí" style={{ width: 150 }} value={editForm.position}
                            onChange={(v) => setEditForm(f => ({ ...f, position: v }))} options={locationOptions} />
                          <Select placeholder="Chọn người" style={{ width: 190 }} value={editForm.crewId}
                            onChange={(v) => setEditForm(f => ({ ...f, crewId: v }))} options={crewOptions} />
                          <Button type="primary" icon={<CheckOutlined />} loading={savingEdit} onClick={() => handleSaveEdit(s.id)} />
                          <Button icon={<CloseOutlined />} onClick={() => setEditingId(null)} />
                        </Space>
                      );
                    }
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 12px' }}>
                        <Tag color={depTagColor(s.CrewProfile?.department)} style={{ minWidth: 56, textAlign: 'center', marginInlineEnd: 0 }}>{s.position || 'Trực ca'}</Tag>
                        <Text strong style={{ flex: 1 }}>{s.CrewProfile?.fullName || '—'}</Text>
                        <StatusTag status={s.status} text={SHIFT_STATUS[s.status]?.label} />
                        <Tooltip title={editable ? 'Sửa' : reason}>
                          <Button type="text" icon={<EditOutlined />} disabled={!editable} onClick={() => startEdit(s)} />
                        </Tooltip>
                        <Tooltip title={editable ? 'Xóa' : reason}>
                          <Button type="text" danger icon={<DeleteOutlined />} disabled={!editable} onClick={() => handleDelete(s)} />
                        </Tooltip>
                      </div>
                    );
                  })}

                  {/* Dòng nháp */}
                  {slotDrafts.map(d => (
                    <Space key={d.tempId} wrap style={{ background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: 8, padding: '8px 12px' }}>
                      <Select placeholder="Vị trí" style={{ width: 150 }} value={d.position}
                        onChange={(v) => setDraft(slot.slot, d.tempId, 'position', v)} options={locationOptions} />
                      <Select placeholder="Chọn người" style={{ width: 190 }} value={d.crewId}
                        onChange={(v) => setDraft(slot.slot, d.tempId, 'crewId', v)} options={crewOptions} />
                      <Button type="text" danger icon={<CloseOutlined />} onClick={() => removeDraft(slot.slot, d.tempId)} />
                    </Space>
                  ))}

                  {existing.length === 0 && slotDrafts.length === 0 && (
                    <Text type="secondary" style={{ fontSize: 13 }}>Chưa phân ca</Text>
                  )}

                  {slotIsPast(slot.slot) ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>Đã qua giờ — không thêm ca</Text>
                  ) : (
                    <Button type="dashed" size="small" icon={<PlusOutlined />} style={{ alignSelf: 'flex-start' }} onClick={() => addDraft(slot.slot)}>
                      Thêm ca
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>

        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 14 }}>
          * Chỉ gán được thủy thủ/thợ máy cấp dưới cùng bộ phận. Ca đã bắt đầu hoặc thuộc bộ phận khác không thể sửa/xóa.
        </Text>
      </div>
    </MasterLayout>
  );
}
