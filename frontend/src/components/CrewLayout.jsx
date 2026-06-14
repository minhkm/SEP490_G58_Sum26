import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Ship, Gauge, ClipboardList, LogOut, Settings
} from 'lucide-react';

export default function CrewLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const isEngineRole = ['EngineOfficer'].includes(user.role);
  const isDeckRole = ['ChiefOfficer', 'DeckOfficer', 'Sailor'].includes(user.role);

  const getRoleDisplay = (role) => {
    const map = {
      'ChiefOfficer': 'Đại phó',
      'DeckOfficer': 'Sỹ quan Boong',
      'EngineOfficer': 'Sỹ quan Máy',
      'Sailor': 'Thủy thủ',
      'Master': 'Thuyền trưởng'
    };
    return map[role] || role;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Sidebar */}
      <aside className="crew-sidebar">
        <div className="crew-sidebar-top">
          <div className="crew-logo" onClick={() => navigate('/crew-dashboard')}>
            <div className="crew-logo-icon"><Ship size={22} color="#fff" /></div>
            <div>
              <h2 className="crew-logo-title">CargoOps</h2>
              <span className="crew-logo-sub">Crew Portal</span>
            </div>
          </div>

          <nav className="crew-nav">
            <div className={`crew-nav-item ${isActive('/crew-dashboard')}`} onClick={() => navigate('/crew-dashboard')}>
              <ClipboardList size={20} /> <span>Bảng điều khiển</span>
            </div>

            {isEngineRole && (
              <div className={`crew-nav-item ${isActive('/engine-logs')}`} onClick={() => navigate('/engine-logs')}>
                <Gauge size={20} /> <span>Nhật ký Kiểm tra Máy</span>
              </div>
            )}

            {isDeckRole && (
              <div className="crew-nav-item disabled">
                <ClipboardList size={20} /> <span>Nhật ký Boong (Sắp ra mắt)</span>
              </div>
            )}
          </nav>
        </div>

        <div className="crew-sidebar-bottom">
          <div className="crew-user-section">
            <div className="crew-user-avatar">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'Crew')}&background=0b1a2c&color=fff`} alt="avatar" />
            </div>
            <div className="crew-user-info">
              <span className="crew-user-name">{user.fullName || user.username}</span>
              <span className="crew-user-role">{getRoleDisplay(user.role)}</span>
            </div>
            <button className="crew-logout-btn" onClick={handleLogout} title="Đăng xuất">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: 260, padding: 32 }}>
        {children}
      </main>
    </div>
  );
}
