import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation, Save, Calendar, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { voyageService } from '../services/api';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import './AttendancePage.css';

export default function AttendancePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('Daily'); // PreDeparture, Daily, PostDischarge
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  
  const [crewList, setCrewList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userRole = (user.role || '').replace(/\s+/g, '').toLowerCase();
  
  // Master, Admin, Agency can view. Master, ChiefOfficer, DeckOfficer can edit.
  const canEdit = ['master', 'chiefofficer', 'deckofficer'].includes(userRole);
  const Layout = (userRole === 'admin' || userRole === 'agency') ? AgencyLayout : MasterLayout;

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const data = await voyageService.getAttendances(id, activeTab, activeTab === 'Daily' ? selectedDate : null);
      // data: [{ crewId, fullName, position, isPresent, recordedAt }]
      setCrewList(data || []);
    } catch (error) {
      console.error('Lỗi khi tải điểm danh:', error);
      showToast('Không thể tải danh sách điểm danh', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeTab, selectedDate]);

  const handleAttendanceChange = (crewId, isPresent) => {
    if (!canEdit) return;
    setCrewList(prev => prev.map(c => c.crewId === crewId ? { ...c, isPresent } : c));
  };

  const markAll = (isPresent) => {
    if (!canEdit) return;
    setCrewList(prev => prev.map(c => ({ ...c, isPresent })));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        type: activeTab,
        date: activeTab === 'Daily' ? selectedDate : null,
        attendanceList: crewList.map(c => ({ crewId: c.crewId, isPresent: c.isPresent }))
      };
      
      await voyageService.saveAttendances(id, payload);
      showToast('Lưu điểm danh thành công!');
      fetchAttendances(); // Refresh data to get recordedAt
    } catch (error) {
      console.error('Lỗi lưu điểm danh:', error);
      showToast(error.response?.data?.message || 'Có lỗi xảy ra khi lưu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <Layout>
      <div className="attendance-page">
        <header className="attendance-header">
          <div>
            <div className="v-breadcrumb" onClick={() => navigate('/voyages')}>
              <Navigation size={12} />
              Quay lại Danh sách Hải trình
            </div>
            <h1>Điểm danh Thuyền viên - Chuyến VY-{String(id).padStart(4, '0')}</h1>
          </div>
        </header>

        <div className="attendance-card">
          <div className="attendance-tabs">
            <button 
              className={`attendance-tab ${activeTab === 'PreDeparture' ? 'active' : ''}`}
              onClick={() => setActiveTab('PreDeparture')}
            >
              Trước khi xuất phát
            </button>
            <button 
              className={`attendance-tab ${activeTab === 'Daily' ? 'active' : ''}`}
              onClick={() => setActiveTab('Daily')}
            >
              Hằng ngày
            </button>
            <button 
              className={`attendance-tab ${activeTab === 'PostDischarge' ? 'active' : ''}`}
              onClick={() => setActiveTab('PostDischarge')}
            >
              Kết thúc chuyến đi
            </button>
          </div>

          <div className="attendance-content">
            <div className="attendance-controls">
              {activeTab === 'Daily' && (
                <div className="date-picker-group">
                  <Calendar size={18} color="#64748b" />
                  <label>Chọn ngày:</label>
                  <input 
                    type="date" 
                    className="date-input"
                    value={selectedDate}
                    max={today} // Chỉ cho phép chọn tới ngày hiện tại (Realtime)
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              )}
              
              {canEdit && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-secondary" onClick={() => markAll(true)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>
                    Có mặt tất cả
                  </button>
                  <button className="btn-secondary" onClick={() => markAll(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>
                    Vắng mặt tất cả
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="empty-state">
                <p>Đang tải danh sách...</p>
              </div>
            ) : crewList.length === 0 ? (
              <div className="empty-state">
                <Users size={32} />
                <p>Chưa có thuyền viên nào được phân công vào chuyến đi này.</p>
              </div>
            ) : (
              <div className="attendance-table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Họ và tên</th>
                      <th>Chức vụ</th>
                      <th style={{ textAlign: 'center' }}>Trạng thái</th>
                      <th>Thời gian lưu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crewList.map((crew, index) => (
                      <tr key={crew.crewId}>
                        <td>{index + 1}</td>
                        <td><strong>{crew.fullName}</strong></td>
                        <td>{crew.position}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="radio-group">
                            <label className="radio-label">
                              <input 
                                type="radio" 
                                name={`status-${crew.crewId}`} 
                                checked={crew.isPresent === true}
                                onChange={() => handleAttendanceChange(crew.crewId, true)}
                                disabled={!canEdit || (activeTab === 'Daily' && selectedDate !== today)}
                              />
                              Có mặt
                            </label>
                            <label className="radio-label">
                              <input 
                                type="radio" 
                                name={`status-${crew.crewId}`} 
                                checked={crew.isPresent === false}
                                onChange={() => handleAttendanceChange(crew.crewId, false)}
                                disabled={!canEdit || (activeTab === 'Daily' && selectedDate !== today)}
                              />
                              Vắng mặt
                            </label>
                          </div>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                          {crew.recordedAt ? new Date(crew.recordedAt).toLocaleString('vi-VN') : 'Chưa điểm danh'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="attendance-actions">
              <button 
                className="btn-primary" 
                onClick={handleSave}
                disabled={saving || loading || !canEdit || crewList.length === 0 || (activeTab === 'Daily' && selectedDate !== today)}
              >
                <Save size={18} />
                {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <div className={`toast-message ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ marginLeft: '8px' }}>{toast.message}</span>
          </div>
        )}
      </div>
    </Layout>
  );
}
