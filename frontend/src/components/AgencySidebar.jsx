import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ship,
  Users,
  Navigation,
  Package,
  Settings,
  LogOut,
  User as UserIcon,
  Gauge
} from 'lucide-react';
import { CARGO_ROLES } from '../config/roles';

export default function AgencySidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user')) || {
    fullName: 'Admin',
    username: 'admin@vinhquang.vn',
    role: 'ADMIN'
  };

  const role = user.role || '';

  const isActive = (path) => {
    if (path === '/vessels' && location.pathname.startsWith('/vessels')) return 'active';
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="agency-sidebar">
      <div className="agency-sidebar-top">
        <div className="agency-logo-container" onClick={() => navigate('/agency-dashboard')} style={{ cursor: 'pointer' }}>
          <div className="agency-logo-icon-wrapper">
            <Ship className="agency-logo-icon" size={24} color="#ffffff" />
          </div>
          <div className="agency-logo-text">
            <h2 className="agency-logo-title">CargoOps</h2>
            <span className="agency-logo-subtitle">Logistics Hàng hải</span>
          </div>
        </div>

        <nav className="agency-nav-menu">
          <div className={`agency-nav-item ${isActive('/agency-dashboard')}`} onClick={() => navigate('/agency-dashboard')}>
            <LayoutDashboard size={20} />
            <span>Bảng điều khiển</span>
          </div>
          <div className={`agency-nav-item ${isActive('/vessels')}`} onClick={() => navigate('/vessels')}>
            <Ship size={20} />
            <span>Quản lý Đội tàu</span>
          </div>
          <div className={`agency-nav-item ${isActive('/crews')}`} onClick={() => navigate('/crews')}>
            <Users size={20} />
            <span>Quản lý Thủy thủ đoàn</span>
          </div>
          <div className={`agency-nav-item ${isActive('/voyages')}`} onClick={() => navigate('/voyages')}>
            <Navigation size={20} />
            <span>Chuyến hải trình</span>
          </div>

          {/* Hàng hóa — chỉ role được phép (trong layout này thực tế là Admin) */}
          {CARGO_ROLES.includes(role) && (
            <div className={`agency-nav-item ${isActive('/cargos')}`} onClick={() => navigate('/cargos')}>
              <Package size={20} />
              <span>Hàng hóa</span>
            </div>
          )}

          <div className={`agency-nav-item ${isActive('/settings')}`} onClick={() => navigate('/settings')}>
            <Settings size={20} />
            <span>Cài đặt Công ty</span>
          </div>
        </nav>
      </div>

      <div className="agency-sidebar-bottom">
        <div className="agency-user-profile">
          <div className="agency-user-avatar">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username || 'Admin')}&background=0b1a2c&color=fff`} alt="User" />
          </div>
          <div className="agency-user-info">
            <span className="agency-user-name">{user.fullName || user.username}</span>
            <span className="agency-user-role">Quản trị viên</span>
          </div>
          <button className="agency-logout-btn" onClick={handleLogout} title="Đăng xuất">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
