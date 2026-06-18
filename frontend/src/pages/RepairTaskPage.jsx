import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Clock, User, Ship, CheckCircle, Eye, Play, Send, Shield } from 'lucide-react';
import MasterLayout from '../components/MasterLayout';
import { repairService, engineLogService } from '../services/api';
import './RepairTaskPage.css';

const STATUS_MAP = {
  Reported: 'Đã báo lỗi', Assigned: 'Đã giao việc', InProgress: 'Đang sửa',
  Completed: 'Đã sửa xong', Verified: 'Đã xác nhận', Reviewed: 'Đã duyệt'
};

export default function RepairTaskPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || '';

  const [tasks, setTasks] = useState([]);
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  
  // Modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(null); // { type, task }
  const [formData, setFormData] = useState({ engineId: '', description: '', priority: 'Medium', note: '', assignedTo: '', engineStatus: 'Operational' });

  // Load tasks
  const loadTasks = async () => {
    try {
      const data = await repairService.getTasks(filterStatus ? { status: filterStatus } : {});
      setTasks(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Load engines for report modal
  const loadEngines = async () => {
    try {
      const data = await engineLogService.getActiveVoyage();
      if (data?.Ship?.Engines) setEngines(data.Ship.Engines);
    } catch (err) { console.error('No active voyage:', err); }
  };

  useEffect(() => { loadTasks(); loadEngines(); }, [filterStatus]);

  // === ACTIONS ===
  const handleReportFailure = async () => {
    if (!formData.engineId) return alert('Chọn máy cần báo lỗi');
    try {
      await repairService.reportFailure({
        engineId: parseInt(formData.engineId),
        description: formData.description,
        priority: formData.priority
      });
      setShowReportModal(false);
      setFormData({ engineId: '', description: '', priority: 'Medium', note: '', assignedTo: '', engineStatus: 'Operational' });
      loadTasks();
      alert('✅ Đã báo lỗi máy thành công!');
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.message || err.message)); }
  };

  const handleAssign = async () => {
    if (!formData.assignedTo) return alert('Nhập ID crew được giao');
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

  const handleComplete = async () => {
    try {
      await repairService.completeRepair(showActionModal.task.id, { repairNote: formData.note });
      setShowActionModal(null);
      loadTasks();
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  const handleVerify = async () => {
    try {
      await repairService.verifyRepair(showActionModal.task.id, {
        verifyNote: formData.note,
        engineStatus: formData.engineStatus
      });
      setShowActionModal(null);
      loadTasks();
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  const handleReview = async () => {
    try {
      await repairService.masterReview(showActionModal.task.id, { reviewNote: formData.note });
      setShowActionModal(null);
      loadTasks();
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  // Stats
  const stats = {
    total: tasks.length,
    reported: tasks.filter(t => t.status === 'Reported').length,
    inProgress: tasks.filter(t => ['Assigned', 'InProgress'].includes(t.status)).length,
    completed: tasks.filter(t => ['Completed', 'Verified', 'Reviewed'].includes(t.status)).length,
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

  return (
    <MasterLayout>
      <div className="repair-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2><Wrench size={24} /> Quản lý Sửa chữa & Bảo trì</h2>
          {(role === 'EngineOfficer' || role === 'ChiefEngineer') && (
            <button className="btn-danger" style={{ padding: '10px 20px', borderRadius: 10, border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowReportModal(true)}>
              <AlertTriangle size={16} /> Báo lỗi máy
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="repair-stats">
          <div className="repair-stat-card">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Tổng tickets</div>
          </div>
          <div className="repair-stat-card danger">
            <div className="stat-num">{stats.reported}</div>
            <div className="stat-label">Chờ xử lý</div>
          </div>
          <div className="repair-stat-card warning">
            <div className="stat-num">{stats.inProgress}</div>
            <div className="stat-label">Đang sửa</div>
          </div>
          <div className="repair-stat-card success">
            <div className="stat-num">{stats.completed}</div>
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
            <p>Không có ticket sửa chữa nào</p>
          </div>
        ) : (
          <div className="repair-task-list">
            {tasks.map(task => (
              <div className="repair-task-card" key={task.id}>
                <div className="task-header">
                  <div>
                    <h4>
                      #{task.id} — {task.Engine?.engineName || 'N/A'}
                      <span className={`task-priority ${(task.priority || '').toLowerCase()}`}>{task.priority}</span>
                    </h4>
                    <div className="task-engine-info">
                      <Ship size={12} /> {task.Ship?.shipName || 'N/A'} • {task.Engine?.engineType || ''}
                    </div>
                  </div>
                  <span className={`task-badge ${(task.status || '').toLowerCase()}`}>
                    {STATUS_MAP[task.status] || task.status}
                  </span>
                </div>

                <div className="task-desc">{task.description || 'Không có mô tả'}</div>

                {task.repairNote && (
                  <div className="task-desc" style={{ background: 'rgba(34,197,94,0.08)', padding: 10, borderRadius: 8, borderLeft: '3px solid #22c55e' }}>
                    <strong style={{ color: '#22c55e' }}>📝 Báo cáo sửa:</strong> {task.repairNote}
                  </div>
                )}
                {task.verifyNote && (
                  <div className="task-desc" style={{ background: 'rgba(139,92,246,0.08)', padding: 10, borderRadius: 8, borderLeft: '3px solid #8b5cf6', marginTop: 6 }}>
                    <strong style={{ color: '#8b5cf6' }}>✅ Xác nhận:</strong> {task.verifyNote}
                  </div>
                )}
                {task.reviewNote && (
                  <div className="task-desc" style={{ background: 'rgba(56,189,248,0.08)', padding: 10, borderRadius: 8, borderLeft: '3px solid #38bdf8', marginTop: 6 }}>
                    <strong style={{ color: '#38bdf8' }}>🔍 Master duyệt:</strong> {task.reviewNote}
                  </div>
                )}

                <div className="task-meta">
                  <span><User size={12} /> Báo bởi: {task.Reporter?.fullName || '—'}</span>
                  <span><User size={12} /> Giao cho: {task.Assignee?.fullName || 'Chưa giao'}</span>
                  <span><Clock size={12} /> {formatDate(task.reportedAt)}</span>
                </div>

                {/* Action buttons based on role + status */}
                <div className="task-actions">
                  {/* Engine Officer: Assign (khi Reported) */}
                  {(role === 'EngineOfficer' || role === 'ChiefEngineer') && task.status === 'Reported' && (
                    <button className="btn-assign" onClick={() => { setFormData({...formData, assignedTo: ''}); setShowActionModal({ type: 'assign', task }); }}>
                      <Send size={13} /> Giao việc
                    </button>
                  )}

                  {/* Maintenance/Engine crew: Start (khi Assigned) */}
                  {task.status === 'Assigned' && (
                    <button className="btn-start" onClick={() => handleStart(task.id)}>
                      <Play size={13} /> Bắt đầu sửa
                    </button>
                  )}

                  {/* Maintenance/Engine crew: Complete (khi InProgress) */}
                  {task.status === 'InProgress' && (
                    <button className="btn-complete" onClick={() => { setFormData({...formData, note: ''}); setShowActionModal({ type: 'complete', task }); }}>
                      <CheckCircle size={13} /> Hoàn thành sửa
                    </button>
                  )}

                  {/* Engine Officer: Verify (khi Completed) */}
                  {(role === 'EngineOfficer' || role === 'ChiefEngineer') && task.status === 'Completed' && (
                    <button className="btn-verify" onClick={() => { setFormData({...formData, note: '', engineStatus: 'Operational'}); setShowActionModal({ type: 'verify', task }); }}>
                      <Shield size={13} /> Xác nhận kết quả
                    </button>
                  )}

                  {/* Master: Review (khi Verified) */}
                  {(role === 'Master' || role === 'ChiefOfficer') && task.status === 'Verified' && (
                    <button className="btn-review" onClick={() => { setFormData({...formData, note: ''}); setShowActionModal({ type: 'review', task }); }}>
                      <Eye size={13} /> Duyệt báo cáo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== REPORT FAILURE MODAL ===== */}
        {showReportModal && (
          <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3><AlertTriangle size={20} style={{ color: '#ef4444' }} /> Báo lỗi máy</h3>
              <label>Chọn máy bị lỗi</label>
              <select value={formData.engineId} onChange={e => setFormData({...formData, engineId: e.target.value})}>
                <option value="">-- Chọn máy --</option>
                {engines.map(e => <option key={e.id} value={e.id}>{e.engineName} ({e.engineType})</option>)}
              </select>
              <label>Mức độ ưu tiên</label>
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="High">Cao (High)</option>
                <option value="Medium">Trung bình (Medium)</option>
                <option value="Low">Thấp (Low)</option>
              </select>
              <label>Mô tả lỗi</label>
              <textarea placeholder="Mô tả chi tiết tình trạng lỗi máy..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowReportModal(false)}>Hủy</button>
                <button className="btn-danger" onClick={handleReportFailure}>⚠️ Báo lỗi</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== ACTION MODALS ===== */}
        {showActionModal && (
          <div className="modal-overlay" onClick={() => setShowActionModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              {showActionModal.type === 'assign' && (<>
                <h3><Send size={20} style={{ color: '#f59e0b' }} /> Giao việc sửa chữa</h3>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Ticket #{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}</p>
                <label>Crew ID được giao</label>
                <input type="number" placeholder="Nhập ID crew..." value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-assign" onClick={handleAssign}>Giao việc</button>
                </div>
              </>)}

              {showActionModal.type === 'complete' && (<>
                <h3><CheckCircle size={20} style={{ color: '#22c55e' }} /> Hoàn thành sửa chữa</h3>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Ticket #{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}</p>
                <label>Ghi chú sửa chữa</label>
                <textarea placeholder="Mô tả công việc đã thực hiện..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-complete" onClick={handleComplete}>Xác nhận hoàn thành</button>
                </div>
              </>)}

              {showActionModal.type === 'verify' && (<>
                <h3><Shield size={20} style={{ color: '#8b5cf6' }} /> Xác nhận kết quả sửa chữa</h3>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Ticket #{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}</p>
                <label>Trạng thái máy sau sửa</label>
                <select value={formData.engineStatus} onChange={e => setFormData({...formData, engineStatus: e.target.value})}>
                  <option value="Operational">Hoạt động (Operational)</option>
                  <option value="Standby">Dự phòng (Standby)</option>
                </select>
                <label>Ghi chú xác nhận</label>
                <textarea placeholder="Nhận xét kết quả sửa chữa..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-verify" onClick={handleVerify}>Xác nhận</button>
                </div>
              </>)}

              {showActionModal.type === 'review' && (<>
                <h3><Eye size={20} style={{ color: '#38bdf8' }} /> Master duyệt báo cáo</h3>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Ticket #{showActionModal.task.id} — {showActionModal.task.Engine?.engineName}</p>
                <label>Ghi chú duyệt</label>
                <textarea placeholder="Nhận xét của thuyền trưởng..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowActionModal(null)}>Hủy</button>
                  <button className="btn-review" onClick={handleReview}>Duyệt báo cáo</button>
                </div>
              </>)}
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
}
