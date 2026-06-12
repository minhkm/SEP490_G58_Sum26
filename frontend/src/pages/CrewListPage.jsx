import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Plus, ShieldCheck, Edit, Trash2 } from 'lucide-react';
import AgencyLayout from '../components/AgencyLayout';
import { crewService } from '../services/api';
import './CrewListPage.css';

export default function CrewListPage() {
  const navigate = useNavigate();
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCrews();
  }, []);

  const fetchCrews = async () => {
    try {
      const data = await crewService.getAll();
      setCrews(data);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách thủy thủ:', error);
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    Master: 'Thuyền trưởng (Master)',
    ChiefOfficer: 'Đại phó (Chief Officer)',
    DeckOfficer: 'Sĩ quan boong (Deck Officer)',
    EngineOfficer: 'Sĩ quan máy (Engine Officer)',
    Sailor: 'Thủy thủ (Sailor)'
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thủy thủ "${name}" không? Toàn bộ dữ liệu tài khoản sẽ bị mất.`)) {
      try {
        await crewService.delete(id);
        setCrews(crews.filter(c => c.id !== id));
      } catch (error) {
        console.error('Lỗi khi xóa thủy thủ:', error);
        alert('Có lỗi xảy ra khi xóa thủy thủ!');
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return 'CR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const filteredCrews = crews.filter(c => 
    (c.fullName && c.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.cccd && c.cccd.includes(searchTerm)) ||
    (c.position && c.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AgencyLayout>
      <div className="crew-page-inner">
        <div className="crew-header">
          <div className="crew-title">
            <div className="crew-title-icon">
              <Users size={28} />
            </div>
            <h1>Quản lý Thủy thủ</h1>
          </div>
          
          <div className="crew-actions">
            <div className="crew-search">
              <Search size={18} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Tìm tên, CCCD, chức vụ..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="crew-btn-primary" onClick={() => navigate('/crews/new')}>
              <Plus size={18} />
              Thêm Thủy thủ
            </button>
          </div>
        </div>

        <div className="crew-table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách thủy thủ...</div>
          ) : (
            <table className="crew-table">
              <thead>
                <tr>
                  <th>Thủy thủ</th>
                  <th>CCCD / Hộ chiếu</th>
                  <th>Bộ phận</th>
                  <th>Chức vụ</th>
                  <th>Quyền hệ thống</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCrews.length > 0 ? (
                  filteredCrews.map(crew => (
                    <tr key={crew.id}>
                      <td>
                        <div className="crew-user-info">
                          <div className="crew-avatar">
                            {getInitials(crew.fullName)}
                          </div>
                          <div>
                            <p className="crew-name">
                              {crew.fullName || 'Chưa cập nhật'}
                              {crew.User?.role === 'Master' && (
                                <ShieldCheck size={14} color="#0284c7" style={{ marginLeft: '6px', verticalAlign: 'middle' }} title="Thuyền trưởng (Master)" />
                              )}
                            </p>
                            <p className="crew-email">{crew.email || crew.User?.username}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{crew.cccd || '---'}</td>
                      <td>
                        <span className={`crew-dept-badge ${crew.department === 'Deck' ? 'bg-deck' : 'bg-engine'}`}>
                          {crew.department === 'Deck' ? 'Boong (Deck)' : (crew.department === 'Engine' ? 'Máy (Engine)' : crew.department || 'Chưa rõ')}
                        </span>
                      </td>
                      <td className="crew-role">{crew.position || '---'}</td>
                      <td style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                        {roleLabels[crew.User?.role] || crew.User?.role || '---'}
                      </td>
                      <td>
                        <span className={`crew-status-dot ${crew.User?.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                          {crew.User?.status === 'Active' ? 'Đang công tác' : 'Tạm nghỉ'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button className="crew-action-btn" title="Chỉnh sửa" onClick={() => navigate(`/crews/edit/${crew.id}`)}>
                          <Edit size={18} />
                        </button>
                        <button className="crew-action-btn" title="Xóa" style={{ color: '#ef4444' }} onClick={() => handleDelete(crew.id, crew.fullName)}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      Không tìm thấy thủy thủ nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AgencyLayout>
  );
}
