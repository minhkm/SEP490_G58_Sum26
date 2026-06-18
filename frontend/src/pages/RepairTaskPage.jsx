import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Clock, User, Ship, CheckCircle, Eye, Play, Send, Shield, Zap } from 'lucide-react';
import MasterLayout from '../components/MasterLayout';
import { repairService, engineLogService } from '../services/api';
import './RepairTaskPage.css';

const STATUS_MAP = {
  Reported: 'Chờ giao việc', Assigned: 'Đã giao việc', InProgress: 'Đang sửa',
  Completed: 'Chờ kiểm tra', Verified: 'Đã ghi nhận', Reviewed: 'Đã duyệt'
};

export default function RepairTaskPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || '';

  const [tasks, setTasks] = useState([]);
  const [engines, setEngines] = useState([]);
  const [activeVoyage, setActiveVoyage] = useState(null);
  const [availableCrew, setAvailableCrew] = useState([]);
  const [standbyGenerators, setStandbyGenerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(null);
  const [formData, setFormData] = useState({ 
    engineId: '', description: '', priority: 'Medium', 
    note: '', assignedTo: '', engineStatus: 'Operational', standbyEngineId: '' 
  });

  const isEngineOfficer = role === 'EngineOfficer' || role === 'ChiefEngineer';
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
        const generators = await repairService.getStandbyGenerators(engine.shipId || activeVoyage?.Ship?.id, engineId);
        setStandbyGenerators(generators);
      } catch (err) { setStandbyGenerators([]); }
    } else {
      setStandbyGenerators([]);
    }
  };

  // Khi mở giao việc → load crew
  const handleOpenAssign = async (task) => {
    setFormData(prev => ({ ...prev, assignedTo: '' }));
    try {
      const crews = await repairService.getAvailableCrew(task.shipId);
      setAvailableCrew(crews);
    } catch (err) { setAvailableCrew([]); }
    setShowActionModal({ type: 'assign', task });
  };

  const isMainEngine = (engine) => engine.engineType === 'Diesel 2-kỳ' || engine.engineType === 'Main Engine';
  const selectedEngine = engines.find(e => e.id === parseInt(formData.engineId));

  // === ACTIONS ===
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
      setFormData({ engineId: '', description: '', priority: 'Medium', note: '', assignedTo: '', engineStatus: 'Operational', standbyEngineId: '' });
      loadTasks();
      loadEngines(); // refresh engine statuses
      alert(result.message);
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.message || err.message)); }
  };

  const handleAssign = async () => {
    if (!formData.assignedTo) return alert('Chọn thợ máy được giao');
    try {
      await repairService.assignTask(showActionModal.task.id, { assignedTo: parseInt(formData.assignedTo) });
      setShowActionModal(null);
      loadTasks();
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  const handleStart = async (taskId) => {
    try { await repairService.startRepair(taskId); loadTasks(); } 
    catch (err) { alert('Lỗi: ' + err.message); }
  };

  const handleSubmitLog = async () => {
    try {
      await repairService.submitRepairLog(showActionModal.task.id, { repairNote: formData.note });
      setShowActionModal(null);
      loadTasks();
      alert('✅ Đã gửi báo cáo sửa chữa');
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

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

  const handleReview = async () => {
    try {
      await repairService.masterReview(showActionModal.task.id, { reviewNote: formData.note });
      setShowActionModal(null);
      loadTasks();
      alert('✅ Đã duyệt báo cáo');
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

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
            <button className="btn-report-failure" onClick={() => setShowCreateModal(true)}>
              <AlertTriangle size={16} /> Tạo lệnh sửa chữa
            </button>
          )}
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
              const taskIsMainEngine = task.Engine && isMainEngine(task.Engine);
              return (
              <div className="repair-task-card" key={task.id}>
                <div className="task-header">
                  <div>
                    <h4>
                      #{task.id} — {task.Engine?.engineName || 'N/A'}
                      {taskIsMainEngine && <span className="task-priority high">MÁY CHÍNH</span>}
                      {!taskIsMainEngine && <span className="task-priority medium">MÁY ĐÈN</span>}
                      <span className={`task-priority ${(task.priority || '').toLowerCase()}`}>{task.priority}</span>
                    </h4>
                    <div className="task-engine-info">
                      <Ship size={12} /> {task.Ship?.shipName || 'N/A'} • {task.Engine?.engineType || ''}
                      {taskIsMainEngine && task.status !== 'Reviewed' && task.status !== 'Verified' && (
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
                    <strong>📝 Báo cáo sửa chữa:</strong> {task.repairNote}
                  </div>
                )}
                {task.verifyNote && (
                  <div className="repair-note verify">
                    <strong>✅ E/O ghi nhận:</strong> {task.verifyNote}
                  </div>
                )}
                {task.reviewNote && (
                  <div className="repair-note review">
                    <strong>🔍 Thuyền trưởng duyệt:</strong> {task.reviewNote}
                  </div>
                )}

                <div className="task-meta">
                  <span><User size={12} /> Tạo bởi: {task.Reporter?.fullName || '—'}</span>
                  <span><User size={12} /> Thợ máy: {task.Assignee?.fullName || 'Chưa giao'}</span>
                  <span><Clock size={12} /> {formatDate(task.reportedAt)}</span>
                </div>

                {/* Actions */}
                <div className="task-actions">
                  {isEngineOfficer && task.status === 'Reported' && (
                    <button className="btn-assign" onClick={() => handleOpenAssign(task)}>
                      <Send size={13} /> Giao thợ máy
                    </button>
                  )}
                  {task.status === 'Assigned' && (
                    <button className="btn-start" onClick={() => handleStart(task.id)}>
                      <Play size={13} /> Bắt đầu sửa
                    </button>
                  )}
                  {task.status === 'InProgress' && (
                    <button className="btn-complete" onClick={() => { setFormData(p => ({...p, note: ''})); setShowActionModal({ type: 'submitLog', task }); }}>
                      <CheckCircle size={13} /> Gửi báo cáo sửa
                    </button>
                  )}
                  {isEngineOfficer && task.status === 'Completed' && (
                    <button className="btn-verify" onClick={() => { setFormData(p => ({...p, note: '', engineStatus: 'Operational'})); setShowActionModal({ type: 'verify', task }); }}>
                      <Shield size={13} /> Kiểm tra & Ghi nhận
                    </button>
                  )}
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

        {/* ===== CREATE REPAIR TASK MODAL ===== */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3><Wrench size={20} style={{ color: '#dc2626' }} /> Tạo lệnh sửa chữa</h3>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                Dựa trên nhật ký ca trực, tạo lệnh sửa chữa cho máy gặp sự cố.
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
                  <strong>⚠️ MÁY CHÍNH:</strong> Nếu tạo lệnh sửa, tàu sẽ <strong>bắt buộc dừng</strong> để sửa chữa. Hải trình sẽ chuyển sang trạng thái Suspended.
                </div>
              )}

              {/* Chọn máy đèn dự phòng */}
              {selectedEngine && !isMainEngine(selectedEngine) && standbyGenerators.length > 0 && (
                <>
                  <label>🔄 Chuyển sang máy đèn dự phòng</label>
                  <select value={formData.standbyEngineId} onChange={e => setFormData(p => ({...p, standbyEngineId: e.target.value}))}>
                    <option value="">-- Không chuyển --</option>
                    {standbyGenerators.map(g => (
                      <option key={g.id} value={g.id}>{g.engineName} ({g.status})</option>
                    ))}
                  </select>
                </>
              )}

              <label>Mức độ ưu tiên</label>
              <select value={formData.priority} onChange={e => setFormData(p => ({...p, priority: e.target.value}))}>
                <option value="High">Cao — Khẩn cấp</option>
                <option value="Medium">Trung bình</option>
                <option value="Low">Thấp</option>
              </select>

              <label>Mô tả sự cố (từ nhật ký ca trực)</label>
              <textarea placeholder="Mô tả chi tiết tình trạng, thông số vượt ngưỡng..." value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} />
              
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
              {/* Giao việc */}
              {showActionModal.type === 'assign' && (<>
                <h3><Send size={20} style={{ color: '#d97706' }} /> Giao thợ máy sửa chữa</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>#{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}</p>
                <label>Chọn thợ máy</label>
                <select value={formData.assignedTo} onChange={e => setFormData(p => ({...p, assignedTo: e.target.value}))}>
                  <option value="">-- Chọn thợ máy --</option>
                  {availableCrew.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} — {c.position}</option>
                  ))}
                </select>
                {availableCrew.length === 0 && (
                  <>
                    <p style={{ color: '#94a3b8', fontSize: 12 }}>Không tìm thấy thợ máy. Nhập ID thủ công:</p>
                    <input type="number" placeholder="Nhập Crew ID..." value={formData.assignedTo} onChange={e => setFormData(p => ({...p, assignedTo: e.target.value}))} />
                  </>
                )}
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-assign" onClick={handleAssign}>Giao việc</button>
                </div>
              </>)}

              {/* Thợ máy gửi báo cáo */}
              {showActionModal.type === 'submitLog' && (<>
                <h3><CheckCircle size={20} style={{ color: '#16a34a' }} /> Gửi báo cáo sửa chữa</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>#{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}</p>
                <label>Mô tả công việc đã thực hiện</label>
                <textarea placeholder="Đã thay thế bộ phận X, kiểm tra lại thông số Y..." value={formData.note} onChange={e => setFormData(p => ({...p, note: e.target.value}))} />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-complete" onClick={handleSubmitLog}>📝 Gửi báo cáo</button>
                </div>
              </>)}

              {/* Engine Officer kiểm tra & ghi nhận */}
              {showActionModal.type === 'verify' && (<>
                <h3><Shield size={20} style={{ color: '#7c3aed' }} /> Kiểm tra & Ghi nhận kết quả</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>#{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}</p>
                {showActionModal.task.repairNote && (
                  <div className="repair-note repair" style={{ marginBottom: 14 }}>
                    <strong>📝 Báo cáo từ thợ máy:</strong> {showActionModal.task.repairNote}
                  </div>
                )}
                <label>Trạng thái máy sau sửa</label>
                <select value={formData.engineStatus} onChange={e => setFormData(p => ({...p, engineStatus: e.target.value}))}>
                  <option value="Operational">✅ Hoạt động bình thường</option>
                  <option value="Standby">⏸️ Dự phòng</option>
                </select>
                <label>Nhận xét của Engine Officer</label>
                <textarea placeholder="Nhận xét kết quả kiểm tra..." value={formData.note} onChange={e => setFormData(p => ({...p, note: e.target.value}))} />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-verify" onClick={handleVerify}>✅ Ghi nhận</button>
                </div>
              </>)}

              {/* Master duyệt */}
              {showActionModal.type === 'review' && (<>
                <h3><Eye size={20} style={{ color: '#2563eb' }} /> Thuyền trưởng duyệt báo cáo</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>#{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}</p>
                {showActionModal.task.repairNote && (
                  <div className="repair-note repair" style={{ marginBottom: 8 }}>
                    <strong>📝 Thợ máy:</strong> {showActionModal.task.repairNote}
                  </div>
                )}
                {showActionModal.task.verifyNote && (
                  <div className="repair-note verify" style={{ marginBottom: 14 }}>
                    <strong>✅ E/O:</strong> {showActionModal.task.verifyNote}
                  </div>
                )}
                <label>Nhận xét của thuyền trưởng</label>
                <textarea placeholder="Nhận xét, phê duyệt..." value={formData.note} onChange={e => setFormData(p => ({...p, note: e.target.value}))} />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-review" onClick={handleReview}>🔍 Duyệt</button>
                </div>
              </>)}
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
}
