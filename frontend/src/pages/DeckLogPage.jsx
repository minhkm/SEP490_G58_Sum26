import React, { useState, useEffect } from 'react';
import { Compass, Save, Clock, Ship, CheckCircle } from 'lucide-react';
import MasterLayout from '../components/MasterLayout';
import { deckLogService } from '../services/api';
import './EngineLogPage.css'; // Reusing EngineLog styles since it's very similar

export default function DeckLogPage() {
  // ===== STATE =====
  const [voyages, setVoyages] = useState([]);
  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // ===== BƯỚC 1: Lấy danh sách hải trình =====
  useEffect(() => {
    const fetchVoyages = async () => {
      try {
        const data = await deckLogService.getMyVoyages();
        setVoyages(data);
        if (data.length > 0) {
          const active = data.find(v => v.status !== 'Completed') || data[0];
          setSelectedVoyage(active);
          const shiftsData = await deckLogService.getShifts(active.id);
          setShifts(shiftsData);
        }
      } catch (error) {
        console.error('Không tìm thấy hải trình:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVoyages();
  }, []);

  // Khi đổi hải trình
  const handleVoyageChange = async (e) => {
    const vId = e.target.value;
    if (!vId) return;
    const v = voyages.find(v => v.id === parseInt(vId));
    setSelectedVoyage(v);
    setSelectedShift(null);
    setHistory([]);
    setNote('');
    if (v) {
      const shiftsData = await deckLogService.getShifts(v.id);
      setShifts(shiftsData);
    }
  };

  // ===== BƯỚC 2: Khi chọn Ca trực -> Load lịch sử =====
  const handleShiftChange = async (e) => {
    const shiftId = e.target.value;
    if (!shiftId) {
      setSelectedShift(null);
      setHistory([]);
      return;
    }
    const shift = shifts.find(s => s.id === parseInt(shiftId));
    setSelectedShift(shift);
    setNote('');

    try {
      const logs = await deckLogService.getHistoryByShift(shiftId);
      setHistory(logs);
    } catch (error) {
      console.error('Lỗi lấy lịch sử ca trực:', error);
    }
  };

  // ===== BƯỚC 3: Lưu nhật ký =====
  const handleSubmit = async () => {
    if (!selectedShift) {
      alert('Vui lòng chọn ca trực');
      return;
    }

    if (!note.trim()) {
      alert('Vui lòng nhập nội dung nhật ký');
      return;
    }

    try {
      await deckLogService.create({
        shiftId: selectedShift.id,
        note: note
      });

      setSuccessMsg('Ghi nhận nhật ký boong thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);

      // Refresh lịch sử
      const logs = await deckLogService.getHistoryByShift(selectedShift.id);
      setHistory(logs);

      // Reset form
      setNote('');
    } catch (error) {
      console.error('Lỗi lưu nhật ký:', error);
      alert('Có lỗi xảy ra khi lưu nhật ký');
    }
  };

  // ===== Format =====
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

  // ===== RENDER =====
  if (loading) return <MasterLayout><div className="el-no-data">Đang tải dữ liệu...</div></MasterLayout>;

  if (!selectedVoyage) {
    return (
      <MasterLayout>
        <div className="el-page-header">
          <h1 className="el-page-title"><Compass size={28} color="#2563eb" /> Nhật ký Trực boong (Deck Log)</h1>
        </div>
        <div className="el-no-data">
          <p>⚠️ Không có hải trình nào đang hoạt động mà bạn tham gia.</p>
          <p>Hệ thống tự động lấy danh sách hải trình mà bạn đã hoặc đang tham gia.</p>
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      {/* Success Toast */}
      {successMsg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, background: '#16a34a', color: 'white',
          padding: '12px 20px', borderRadius: 8, zIndex: 9999, display: 'flex',
          alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="el-page-header">
        <h1 className="el-page-title"><Compass size={28} color="#2563eb" /> Nhật ký Trực boong</h1>
      </div>

      {/* Chọn Hải trình và Ca trực */}
      <div className="el-info-bar">
        <div className="el-info-card shift">
          <div className="el-info-card-label"><Ship size={14} /> Chọn Hải trình</div>
          <select className="el-shift-select" onChange={handleVoyageChange} value={selectedVoyage?.id || ''}>
            {voyages.map(v => (
              <option key={v.id} value={v.id}>
                {v.Ship?.shipName} | {v.departurePort} → {v.destinationPort} ({v.status})
              </option>
            ))}
          </select>
        </div>

        <div className="el-info-card shift">
          <div className="el-info-card-label"><Clock size={14} /> Chọn Ca trực</div>
          <select className="el-shift-select" onChange={handleShiftChange} value={selectedShift?.id || ''}>
            <option value="">-- Chọn ca trực --</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>
                {s.CrewProfile?.fullName} | {formatTime(s.startTime)} - {formatTime(s.endTime)} ({s.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Form nhập ghi chú (Chỉ hiện khi đã chọn ca trực) */}
      {selectedShift && (
        <>
          {selectedVoyage.status === 'Completed' && (
            <div style={{ color: '#ef4444', marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
              ⚠️ Hải trình này đã kết thúc, bạn chỉ có thể xem lại lịch sử ghi chép chứ không thể thêm mới.
            </div>
          )}
          {selectedVoyage.status !== 'Completed' && (
            <div className="el-inspect-panel">
              <div className="el-inspect-header">
                <h3>📋 Ghi chép Nhật ký (Ca trực: {formatTime(selectedShift.startTime)} - {formatTime(selectedShift.endTime)})</h3>
              </div>
              <div className="el-inspect-body">
                <div style={{ marginTop: 0 }}>
                  <label style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8, display: 'block' }}>
                    Nội dung nhật ký (Thông số hành trình, thời tiết, sự kiện...)
                  </label>
                  <textarea
                    className="el-note-textarea"
                    placeholder="VD: Tàu đi đúng hướng 045°, tốc độ 12 knots. Thời tiết tốt, sóng nhẹ..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ minHeight: '120px' }}
                  />
                </div>
              </div>
              <div className="el-inspect-footer">
                <button className="btn-cancel" onClick={() => setNote('')}>Xóa trắng</button>
                <button className="btn-save" onClick={handleSubmit}>
                  <Save size={16} /> Lưu Nhật ký
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Lịch sử kiểm tra trong ca trực này */}
      {selectedShift && (
        <div className="el-history-card">
          <div className="el-history-header">
            <h3>📜 Lịch sử ghi chép trong ca này</h3>
          </div>
          {history.length > 0 ? (
            <table className="el-history-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Thời gian</th>
                  <th>Nội dung ghi chép</th>
                </tr>
              </thead>
              <tbody>
                {history.map(log => (
                  <tr key={log.id}>
                    <td style={{ verticalAlign: 'top' }}>{formatTime(log.createdAt)}</td>
                    <td>{log.DeckLog?.note || log.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="el-no-data">Chưa có ghi chép nào trong ca trực này.</div>
          )}
        </div>
      )}
    </MasterLayout>
  );
}
