import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Clock, User, Ship, CheckCircle, Eye, Play, Shield, FileText } from 'lucide-react';
import MasterLayout from '../components/MasterLayout';
import { repairService, engineLogService } from '../services/api';
import './RepairTaskPage.css';

const STATUS_MAP = {
  Reported: 'Đã báo lỗi', Assigned: 'Chờ sửa', InProgress: 'Đang sửa',
  Completed: 'Chờ E/O kiểm tra', Verified: 'Đã ghi nhận', Reviewed: 'Master đã duyệt'
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
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(null);
  const [formData, setFormData] = useState({ 
    engineId: '', description: '', priority: 'Medium', 
    note: '', engineStatus: 'Operational', standbyEngineId: '' 
  });

  const isEngineOfficer = role === 'EngineOfficer' || role === 'ChiefEngineer';
  const isEngineCrew = role === 'EngineCrew';
  const isMaster = role === 'Master' || role === 'ChiefOfficer';

  // Load data
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

  // Khi chọn engine → load standby generators nếu là máy đèn
  const handleEngineSelect = async (engineId) => {
    setFormData(prev => ({ ...prev, engineId, standbyEngineId: '' }));
    const engine = engines.find(e => e.id === parseInt(engineId));
    if (engine && !isMainEngine(engine)) {
      try {
        const generators = await repairService.getStandbyGenerators(
          engine.shipId || activeVoyage?.Ship?.id, engineId
        );
        setStandbyGenerators(generators);
      } catch (err) { setStandbyGenerators([]); }
    } else {
      setStandbyGenerators([]);
    }
  };

  const isMainEngine = (engine) => 
    engine.engineType === 'Diesel 2-kỳ' || engine.engineType === 'Main Engine';
  const selectedEngine = engines.find(e => e.id === parseInt(formData.engineId));

  // === ACTIONS ===

  // Engine Officer tạo lệnh sửa (dựa trên note của thợ máy)
  const handleCreateTask = async () => {
    if (!formData.engineId) return alert('Chọn máy cần sửa chữa');
    try {
      const result = await repairService.createTask({
        engineId: parseInt(formData.engineId),
        description: formData.description,
        priority: formData.priority,
        standbyEngineId: formData.standbyEngineId ? parseInt(formData.standbyEngineId) : null
      });
      setShowCreateModal(false);
      resetForm();
      loadTasks();
      loadEngines();
      alert(result.message);
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.message || err.message)); }
  };

  // Thợ máy bắt đầu sửa (cả nhóm cùng sửa)
  const handleStart = async (taskId) => {
    try { await repairService.startRepair(taskId); loadTasks(); } 
    catch (err) { alert('Lỗi: ' + err.message); }
  };

  // Thợ máy gửi báo cáo sửa chữa (ghi lại cái gì hỏng, sửa ra sao)
  const handleSubmitLog = async () => {
    if (!formData.note) return alert('Vui lòng ghi lại chi tiết sửa chữa');
    try {
      await repairService.submitRepairLog(showActionModal.task.id, { repairNote: formData.note });
      setShowActionModal(null);
      loadTasks();
      alert('✅ Đã gửi báo cáo sửa chữa cho Sỹ quan máy');
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  // Engine Officer kiểm tra máy + ghi nhận kết quả
  const handleVerify = async () => {
    try {
      const result = await repairService.verifyAndRecord(showActionModal.task.id, {
        verifyNote: formData.note,
        engineStatus: formData.engineStatus
      });
      setShowActionModal(null);
      loadTasks();
      loadEngines();
      alert(result.message);
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  // Thuyền trưởng duyệt báo cáo
  const handleReview = async () => {
    try {
      await repairService.masterReview(showActionModal.task.id, { reviewNote: formData.note });
      setShowActionModal(null);
      loadTasks();
      alert('✅ Đã duyệt — Tiếp tục hải trình');
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  const resetForm = () => setFormData({ 
    engineId: '', description: '', priority: 'Medium', 
    note: '', engineStatus: 'Operational', standbyEngineId: '' 
  });

  // Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => ['Reported', 'Assigned'].includes(t.status)).length,
    inProgress: tasks.filter(t => t.status === 'InProgress').length,
    done: tasks.filter(t => ['Completed', 'Verified', 'Reviewed'].includes(t.status)).length,
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

  return (
    <MasterLayout>
      <div className="repair-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2><Wrench size={24} /> Sửa chữa & Bảo trì</h2>
          {isEngineOfficer && (
            <button className="btn-report-failure" onClick={() => { resetForm(); setShowCreateModal(true); }}>
              <AlertTriangle size={16} /> Tạo lệnh sửa chữa
            </button>
          )}
        </div>

        {/* Role info */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#64748b' }}>
          {isEngineOfficer && '👨‍✈️ Sỹ quan máy — Tạo lệnh sửa, kiểm tra kết quả, báo cáo thuyền trưởng'}
          {isEngineCrew && '🔧 Thợ máy — Xem lệnh sửa, sửa máy, ghi báo cáo sửa chữa'}
          {isMaster && '🚢 Thuyền trưởng — Duyệt báo cáo sửa chữa để tiếp tục hải trình'}
        </div>

        {/* Stats */}
        <div className="repair-stats">
          <div className="repair-stat-card">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Tổng lệnh</div>
          </div>
          <div className="repair-stat-card danger">
            <div className="stat-num">{stats.pending}</div>
            <div className="stat-label">Chờ xử lý</div>
          </div>
          <div className="repair-stat-card warning">
            <div className="stat-num">{stats.inProgress}</div>
            <div className="stat-label">Đang sửa</div>
          </div>
          <div className="repair-stat-card success">
            <div className="stat-num">{stats.done}</div>
            <div className="stat-label">Hoàn thành</div>
          </div>
        </div>

        {/* Filters */}
        <div className="repair-filters">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="empty-state"><p>Đang tải...</p></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} />
            <p>Không có lệnh sửa chữa nào</p>
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
                        : <span className="task-priority medium">MÁY ĐÈN</span>
                      }
                    </h4>
                    <div className="task-engine-info">
                      <Ship size={12} /> {task.Ship?.shipName || 'N/A'} • {task.Engine?.engineType || ''}
                      {taskIsMain && !['Verified', 'Reviewed'].includes(task.status) && (
                        <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 8 }}>⚠️ Tàu đang dừng</span>
                      )}
                    </div>
                  </div>
                  <span className={`task-badge ${(task.status || '').toLowerCase()}`}>
                    {STATUS_MAP[task.status] || task.status}
                  </span>
                </div>

                <div className="task-desc">{task.description || 'Không có mô tả'}</div>

                {task.repairNote && (
                  <div className="repair-note repair">
                    <strong>📝 Báo cáo sửa chữa (thợ máy):</strong> {task.repairNote}
                  </div>
                )}
                {task.verifyNote && (
                  <div className="repair-note verify">
                    <strong>✅ Sỹ quan máy ghi nhận:</strong> {task.verifyNote}
                  </div>
                )}
                {task.reviewNote && (
                  <div className="repair-note review">
                    <strong>🔍 Thuyền trưởng duyệt:</strong> {task.reviewNote}
                  </div>
                )}

                <div className="task-meta">
                  <span><User size={12} /> E/O: {task.Reporter?.fullName || '—'}</span>
                  <span><Clock size={12} /> {formatDate(task.reportedAt)}</span>
                  {task.completedAt && <span><Clock size={12} /> Sửa xong: {formatDate(task.completedAt)}</span>}
                </div>

                {/* === ACTION BUTTONS theo role === */}
                <div className="task-actions">
                  {/* Thợ máy / E/O: Bắt đầu sửa (khi đã tạo lệnh) */}
                  {(isEngineCrew || isEngineOfficer) && task.status === 'Reported' && (
                    <button className="btn-start" onClick={() => handleStart(task.id)}>
                      <Play size={13} /> Bắt đầu sửa
                    </button>
                  )}

                  {/* Thợ máy / E/O: Gửi báo cáo sửa chữa (khi đang sửa) */}
                  {(isEngineCrew || isEngineOfficer) && task.status === 'InProgress' && (
                    <button className="btn-complete" onClick={() => { setFormData(p => ({...p, note: ''})); setShowActionModal({ type: 'submitLog', task }); }}>
                      <FileText size={13} /> Gửi báo cáo sửa
                    </button>
                  )}

                  {/* E/O: Kiểm tra máy + ghi nhận (khi thợ máy đã gửi báo cáo) */}
                  {isEngineOfficer && task.status === 'Completed' && (
                    <button className="btn-verify" onClick={() => { setFormData(p => ({...p, note: '', engineStatus: 'Operational'})); setShowActionModal({ type: 'verify', task }); }}>
                      <Shield size={13} /> Kiểm tra & Ghi nhận
                    </button>
                  )}

                  {/* Thuyền trưởng: Duyệt (khi E/O đã ghi nhận) */}
                  {isMaster && task.status === 'Verified' && (
                    <button className="btn-review" onClick={() => { setFormData(p => ({...p, note: ''})); setShowActionModal({ type: 'review', task }); }}>
                      <Eye size={13} /> Duyệt báo cáo
                    </button>
                  )}
                </div>
              </div>
            );})}
          </div>
        )}

        {/* ===== CREATE REPAIR TASK MODAL (E/O only) ===== */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3><Wrench size={20} style={{ color: '#dc2626' }} /> Tạo lệnh sửa chữa</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                Dựa trên báo cáo từ thợ máy trong ca trực, tạo lệnh sửa chữa.
              </p>

              <label>Máy cần sửa chữa</label>
              <select value={formData.engineId} onChange={e => handleEngineSelect(e.target.value)}>
                <option value="">-- Chọn máy --</option>
                {engines.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.engineName} ({e.engineType}) {e.status === 'Failed' ? '⚠️ Đang hỏng' : ''}
                  </option>
                ))}
              </select>

              {/* Cảnh báo máy chính */}
              {selectedEngine && isMainEngine(selectedEngine) && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
                  <strong>⚠️ MÁY CHÍNH — Chỉ có 1:</strong> Tàu sẽ <strong>bắt buộc dừng</strong> để sửa chữa. Hải trình chuyển sang Suspended.
                </div>
              )}

              {/* Máy đèn hỏng → chọn máy đèn dự phòng */}
              {selectedEngine && !isMainEngine(selectedEngine) && standbyGenerators.length > 0 && (
                <>
                  <label>🔄 Chuyển sang máy đèn dự phòng</label>
                  <select value={formData.standbyEngineId} onChange={e => setFormData(p => ({...p, standbyEngineId: e.target.value}))}>
                    <option value="">-- Không chuyển --</option>
                    {standbyGenerators.map(g => (
                      <option key={g.id} value={g.id}>{g.engineName} ({g.status})</option>
                    ))}
                  </select>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: -8 }}>
                    Máy đèn có nhiều cái — hỏng 1 sẽ chuyển sang cái còn lại
                  </p>
                </>
              )}

              <label>Mức độ ưu tiên</label>
              <select value={formData.priority} onChange={e => setFormData(p => ({...p, priority: e.target.value}))}>
                <option value="High">🔴 Khẩn cấp</option>
                <option value="Medium">🟡 Trung bình</option>
                <option value="Low">🟢 Thấp</option>
              </select>

              <label>Mô tả sự cố (từ note thợ máy trong ca trực)</label>
              <textarea 
                placeholder="VD: Thông số nhiệt độ vượt ngưỡng 95°C, máy phát tiếng kêu lạ..." 
                value={formData.description} 
                onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
              />
              
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button className="btn-danger" onClick={handleCreateTask}>
                  {selectedEngine && isMainEngine(selectedEngine) ? '⚠️ Dừng tàu & Tạo lệnh' : '🔧 Tạo lệnh sửa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== ACTION MODALS ===== */}
        {showActionModal && (
          <div className="modal-overlay" onClick={() => setShowActionModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              
              {/* Thợ máy gửi báo cáo sửa chữa */}
              {showActionModal.type === 'submitLog' && (<>
                <h3><FileText size={20} style={{ color: '#16a34a' }} /> Báo cáo sửa chữa</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>
                  #{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}
                </p>
                <p style={{ color: '#475569', fontSize: 13, marginBottom: 12 }}>
                  Ghi lại chi tiết: cái gì hỏng và đã sửa như thế nào.
                </p>
                <label>Chi tiết sửa chữa</label>
                <textarea 
                  placeholder="VD: Bộ phận bơm dầu bị kẹt, đã thay seal mới, vệ sinh đường ống, kiểm tra áp suất ổn định 3.5 bar..." 
                  value={formData.note} 
                  onChange={e => setFormData(p => ({...p, note: e.target.value}))}
                  style={{ minHeight: 120 }}
                />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-complete" onClick={handleSubmitLog}>📝 Gửi báo cáo</button>
                </div>
              </>)}

              {/* E/O kiểm tra & ghi nhận */}
              {showActionModal.type === 'verify' && (<>
                <h3><Shield size={20} style={{ color: '#7c3aed' }} /> Kiểm tra & Ghi nhận</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>
                  #{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}
                </p>
                {showActionModal.task.repairNote && (
                  <div className="repair-note repair" style={{ marginBottom: 14 }}>
                    <strong>📝 Báo cáo từ thợ máy:</strong> {showActionModal.task.repairNote}
                  </div>
                )}
                <label>Trạng thái máy sau kiểm tra</label>
                <select value={formData.engineStatus} onChange={e => setFormData(p => ({...p, engineStatus: e.target.value}))}>
                  <option value="Operational">✅ Hoạt động bình thường</option>
                  <option value="Standby">⏸️ Dự phòng</option>
                </select>
                <label>Nhận xét của Sỹ quan máy</label>
                <textarea 
                  placeholder="Máy đã hoạt động ổn định, thông số trong ngưỡng cho phép..." 
                  value={formData.note} 
                  onChange={e => setFormData(p => ({...p, note: e.target.value}))} 
                />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-verify" onClick={handleVerify}>✅ Ghi nhận & Báo cáo thuyền trưởng</button>
                </div>
              </>)}

              {/* Thuyền trưởng duyệt */}
              {showActionModal.type === 'review' && (<>
                <h3><Eye size={20} style={{ color: '#2563eb' }} /> Thuyền trưởng duyệt</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>
                  #{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}
                </p>
                {showActionModal.task.repairNote && (
                  <div className="repair-note repair" style={{ marginBottom: 8 }}>
                    <strong>📝 Thợ máy:</strong> {showActionModal.task.repairNote}
                  </div>
                )}
                {showActionModal.task.verifyNote && (
                  <div className="repair-note verify" style={{ marginBottom: 14 }}>
                    <strong>✅ Sỹ quan máy:</strong> {showActionModal.task.verifyNote}
                  </div>
                )}
                <label>Nhận xét của thuyền trưởng</label>
                <textarea 
                  placeholder="Phê duyệt, ghi chú thêm..." 
                  value={formData.note} 
                  onChange={e => setFormData(p => ({...p, note: e.target.value}))} 
                />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-review" onClick={handleReview}>🔍 Duyệt & Tiếp tục hải trình</button>
                </div>
              </>)}
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
}
