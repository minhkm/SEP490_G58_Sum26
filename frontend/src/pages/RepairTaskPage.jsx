import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Clock, User, Ship, CheckCircle, Eye, FileText } from 'lucide-react';
import MasterLayout from '../components/MasterLayout';
import { repairService, engineLogService } from '../services/api';
import './RepairTaskPage.css';

const STATUS_MAP = {
  Repairing: 'Đang sửa chữa',
  Completed: 'Chờ thuyền trưởng duyệt',
  Reviewed: 'Đã duyệt'
};

export default function RepairTaskPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || '';

  const [tasks, setTasks] = useState([]);
  const [engines, setEngines] = useState([]);
  const [activeVoyage, setActiveVoyage] = useState(null);
  const [standbyGenerators, setStandbyGenerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  
  const [showModal, setShowModal] = useState(null); // 'startRepair' | { type: 'report'|'review', task }
  const [formData, setFormData] = useState({ 
    engineId: '', issue: '', standbyEngineId: '',
    repairNote: '', engineStatus: 'Operational', reviewNote: ''
  });

  const isEngineOfficer = role === 'EngineOfficer' || role === 'ChiefEngineer';
  const isMaster = role === 'Master' || role === 'ChiefOfficer';

  const loadTasks = async () => {
    try {
      const data = await repairService.getTasks(filterStatus ? { status: filterStatus } : {});
      setTasks(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadEngines = async () => {
    try {
      const data = await engineLogService.getActiveVoyage();
      setActiveVoyage(data);
      if (data?.Ship?.Engines) setEngines(data.Ship.Engines);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadTasks(); loadEngines(); }, [filterStatus]);

  const isMainEngine = (engine) => 
    engine.engineType === 'Diesel 2-kỳ' || engine.engineType === 'Main Engine';

  const selectedEngine = engines.find(e => e.id === parseInt(formData.engineId));

  const handleEngineSelect = async (engineId) => {
    setFormData(prev => ({ ...prev, engineId, standbyEngineId: '' }));
    const engine = engines.find(e => e.id === parseInt(engineId));
    if (engine && !isMainEngine(engine)) {
      try {
        const gens = await repairService.getStandbyGenerators(
          engine.shipId || activeVoyage?.Ship?.id, engineId
        );
        setStandbyGenerators(gens);
      } catch { setStandbyGenerators([]); }
    } else {
      setStandbyGenerators([]);
    }
  };

  // E/O bắt đầu sửa máy
  const handleStartRepair = async () => {
    if (!formData.engineId) return alert('Chọn máy cần sửa');
    try {
      const result = await repairService.startRepair({
        engineId: parseInt(formData.engineId),
        issue: formData.issue,
        standbyEngineId: formData.standbyEngineId ? parseInt(formData.standbyEngineId) : null
      });
      setShowModal(null);
      resetForm();
      loadTasks();
      loadEngines();
      alert(result.message);
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.message || err.message)); }
  };

  // E/O sửa xong → viết báo cáo
  const handleSubmitReport = async () => {
    if (!formData.repairNote) return alert('Vui lòng ghi chi tiết sửa chữa');
    try {
      const result = await repairService.submitReport(showModal.task.id, {
        repairNote: formData.repairNote,
        engineStatus: formData.engineStatus
      });
      setShowModal(null);
      loadTasks();
      loadEngines();
      alert(result.message);
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  // Thuyền trưởng duyệt
  const handleReview = async () => {
    try {
      const result = await repairService.masterReview(showModal.task.id, { 
        reviewNote: formData.reviewNote 
      });
      setShowModal(null);
      loadTasks();
      alert(result.message);
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  const resetForm = () => setFormData({ 
    engineId: '', issue: '', standbyEngineId: '',
    repairNote: '', engineStatus: 'Operational', reviewNote: ''
  });

  const stats = {
    total: tasks.length,
    repairing: tasks.filter(t => t.status === 'Repairing').length,
    waiting: tasks.filter(t => t.status === 'Completed').length,
    done: tasks.filter(t => t.status === 'Reviewed').length,
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

  return (
    <MasterLayout>
      <div className="repair-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2><Wrench size={24} /> Sửa chữa & Bảo trì</h2>
          {isEngineOfficer && (
            <button className="btn-report-failure" onClick={() => { resetForm(); setShowModal('startRepair'); }}>
              <AlertTriangle size={16} /> Bắt đầu sửa máy
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="repair-stats">
          <div className="repair-stat-card">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Tổng</div>
          </div>
          <div className="repair-stat-card danger">
            <div className="stat-num">{stats.repairing}</div>
            <div className="stat-label">Đang sửa</div>
          </div>
          <div className="repair-stat-card warning">
            <div className="stat-num">{stats.waiting}</div>
            <div className="stat-label">Chờ duyệt</div>
          </div>
          <div className="repair-stat-card success">
            <div className="stat-num">{stats.done}</div>
            <div className="stat-label">Đã duyệt</div>
          </div>
        </div>

        {/* Filter */}
        <div className="repair-filters">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="empty-state"><p>Đang tải...</p></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} />
            <p>Chưa có lịch sử sửa chữa</p>
          </div>
        ) : (
          <div className="repair-task-list">
            {tasks.map(task => {
              const taskIsMain = task.Engine && isMainEngine(task.Engine);
              return (
              <div className="repair-task-card" key={task.id}>
                <div className="task-header">
                  <div>
                    <h4>
                      #{task.id} — {task.Engine?.engineName || 'N/A'}
                      {taskIsMain 
                        ? <span className="task-priority high">MÁY CHÍNH</span>
                        : <span className="task-priority medium">MÁY ĐÈN</span>}
                    </h4>
                    <div className="task-engine-info">
                      <Ship size={12} /> {task.Ship?.shipName}
                      {taskIsMain && task.status === 'Repairing' && (
                        <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 8 }}>⚠️ Tàu đang dừng</span>
                      )}
                    </div>
                  </div>
                  <span className={`task-badge ${(task.status || '').toLowerCase()}`}>
                    {STATUS_MAP[task.status] || task.status}
                  </span>
                </div>

                {/* Vấn đề */}
                <div className="task-desc">
                  <strong>Vấn đề:</strong> {task.description}
                </div>

                {/* Báo cáo sửa chữa của E/O */}
                {task.repairNote && (
                  <div className="repair-note repair">
                    <strong>🔧 Trưởng máy báo cáo:</strong> {task.repairNote}
                  </div>
                )}

                {/* Thuyền trưởng duyệt */}
                {task.reviewNote && (
                  <div className="repair-note review">
                    <strong>🚢 Thuyền trưởng:</strong> {task.reviewNote}
                  </div>
                )}

                <div className="task-meta">
                  <span><User size={12} /> Trưởng máy: {task.Reporter?.fullName || '—'}</span>
                  <span><Clock size={12} /> {formatDate(task.reportedAt)}</span>
                  {task.completedAt && <span><Clock size={12} /> Xong: {formatDate(task.completedAt)}</span>}
                </div>

                {/* Actions */}
                <div className="task-actions">
                  {/* E/O: Sửa xong → viết báo cáo */}
                  {isEngineOfficer && task.status === 'Repairing' && (
                    <button className="btn-complete" onClick={() => { 
                      setFormData(p => ({...p, repairNote: '', engineStatus: 'Operational'})); 
                      setShowModal({ type: 'report', task }); 
                    }}>
                      <FileText size={13} /> Sửa xong — Viết báo cáo
                    </button>
                  )}

                  {/* Thuyền trưởng: Duyệt */}
                  {isMaster && task.status === 'Completed' && (
                    <button className="btn-review" onClick={() => { 
                      setFormData(p => ({...p, reviewNote: ''})); 
                      setShowModal({ type: 'review', task }); 
                    }}>
                      <Eye size={13} /> Duyệt & Tiếp tục hải trình
                    </button>
                  )}
                </div>
              </div>
            );})}
          </div>
        )}

        {/* ===== MODAL: Bắt đầu sửa máy ===== */}
        {showModal === 'startRepair' && (
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3><Wrench size={20} style={{ color: '#dc2626' }} /> Sửa chữa máy</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                Dựa trên thông tin từ nhật ký kiểm tra máy (note của thợ máy trực ca).
              </p>

              <label>Máy cần sửa</label>
              <select value={formData.engineId} onChange={e => handleEngineSelect(e.target.value)}>
                <option value="">-- Chọn máy --</option>
                {engines.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.engineName} ({e.engineType})
                  </option>
                ))}
              </select>

              {selectedEngine && isMainEngine(selectedEngine) && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
                  ⚠️ <strong>Máy chính chỉ có 1</strong> — Tàu sẽ bắt buộc dừng để sửa.
                </div>
              )}

              {selectedEngine && !isMainEngine(selectedEngine) && standbyGenerators.length > 0 && (
                <>
                  <label>🔄 Chuyển sang máy đèn dự phòng</label>
                  <select value={formData.standbyEngineId} onChange={e => setFormData(p => ({...p, standbyEngineId: e.target.value}))}>
                    <option value="">-- Chọn --</option>
                    {standbyGenerators.map(g => (
                      <option key={g.id} value={g.id}>{g.engineName} ({g.status})</option>
                    ))}
                  </select>
                </>
              )}

              <label>Mô tả vấn đề (từ nhật ký thợ máy)</label>
              <textarea 
                placeholder="VD: Nhiệt độ nước làm mát vượt 95°C, áp suất dầu thấp..." 
                value={formData.issue} 
                onChange={e => setFormData(p => ({...p, issue: e.target.value}))} 
              />
              
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(null)}>Hủy</button>
                <button className="btn-danger" onClick={handleStartRepair}>
                  🔧 Bắt đầu sửa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== MODAL: E/O viết báo cáo sau sửa ===== */}
        {showModal?.type === 'report' && (
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3><FileText size={20} style={{ color: '#16a34a' }} /> Báo cáo sửa chữa</h3>
              <p style={{ color: '#64748b', fontSize: 13 }}>
                #{showModal.task.id} — {showModal.task.Engine?.engineName}
              </p>
              <div style={{ background: '#fef2f2', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
                <strong>Vấn đề:</strong> {showModal.task.description}
              </div>

              <label>Chi tiết sửa chữa</label>
              <textarea 
                placeholder="VD: Đã thay seal bơm dầu, vệ sinh bộ lọc, kiểm tra áp suất ổn định 3.5 bar. Nhiệt độ sau sửa: 75°C..." 
                value={formData.repairNote} 
                onChange={e => setFormData(p => ({...p, repairNote: e.target.value}))}
                style={{ minHeight: 120 }}
              />

              <label>Trạng thái máy sau sửa</label>
              <select value={formData.engineStatus} onChange={e => setFormData(p => ({...p, engineStatus: e.target.value}))}>
                <option value="Operational">✅ Hoạt động bình thường</option>
                <option value="Standby">⏸️ Dự phòng</option>
              </select>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(null)}>Hủy</button>
                <button className="btn-complete" onClick={handleSubmitReport}>📝 Gửi báo cáo cho thuyền trưởng</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== MODAL: Thuyền trưởng duyệt ===== */}
        {showModal?.type === 'review' && (
          <div className="modal-overlay" onClick={() => setShowModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3><Eye size={20} style={{ color: '#2563eb' }} /> Duyệt báo cáo sửa chữa</h3>
              <p style={{ color: '#64748b', fontSize: 13 }}>
                #{showModal.task.id} — {showModal.task.Engine?.engineName}
              </p>

              <div style={{ background: '#fef2f2', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13, color: '#991b1b' }}>
                <strong>Vấn đề:</strong> {showModal.task.description}
              </div>
              {showModal.task.repairNote && (
                <div className="repair-note repair" style={{ marginBottom: 14 }}>
                  <strong>🔧 Trưởng máy:</strong> {showModal.task.repairNote}
                </div>
              )}

              <label>Nhận xét của thuyền trưởng</label>
              <textarea 
                placeholder="Phê duyệt, ghi chú thêm nếu cần..." 
                value={formData.reviewNote} 
                onChange={e => setFormData(p => ({...p, reviewNote: e.target.value}))} 
              />
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(null)}>Hủy</button>
                <button className="btn-review" onClick={handleReview}>✅ Duyệt & Tiếp tục hải trình</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
}
