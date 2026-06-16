import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  Package,
  Ship,
  BarChart2,
  Settings,
  Anchor,
  UserCircle,
  LogOut,
  Clock,
  Gauge,
} from 'lucide-react';
import { CARGO_ROLES } from '../config/roles';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || '';

  const isActive = (...paths) =>
    paths.some(p => location.pathname === p || location.pathname.startsWith(p + '/')) ? 'active' : '';

  const isMasterOrChief = role === 'Master' || role === 'ChiefOfficer';
  const isCrewRole = !isMasterOrChief && role !== 'Admin' && role !== 'Agency';

  const dashboardPath = isMasterOrChief ? '/master-dashboard' : '/crew-dashboard';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo-container" onClick={() => navigate(dashboardPath)} style={{ cursor: 'pointer' }}>
          <div className="logo-icon-wrapper">
            <Ship className="logo-icon" size={24} color="#ffffff" />
          </div>
          <div className="logo-text">
            <h2 className="logo-title">CargoOps</h2>
            <span className="logo-subtitle">Maritime Logistics</span>
          </div>
        </div>

        <nav className="nav-menu">
          {/* Tổng quan — tất cả roles */}
          <div
            className={`nav-item ${isActive('/master-dashboard', '/crew-dashboard')}`}
            onClick={() => navigate(dashboardPath)}
            style={{ cursor: 'pointer' }}
          >
            <LayoutDashboard size={20} />
            <span>Tổng quan</span>
          </div>

          {/* Hải Trình — tất cả roles */}
          <div
            className={`nav-item ${isActive('/voyages')}`}
            onClick={() => navigate('/voyages')}
            style={{ cursor: 'pointer' }}
          >
            <Navigation size={20} />
            <span>Hải Trình</span>
          </div>

          {/* Hàng hóa — chỉ role được phép */}
          {CARGO_ROLES.includes(role) && (
            <div
              className={`nav-item ${isActive('/cargos')}`}
              onClick={() => navigate('/cargos')}
              style={{ cursor: 'pointer' }}
            >
              <Package size={20} />
              <span>Hàng hóa</span>
            </div>
          )}

          {/* Ca trực — DeckOfficer, EngineOfficer, Sailor (placeholder) */}
          {isCrewRole && (
            <div className="nav-item" style={{ cursor: 'default', opacity: 0.5 }}>
              <Clock size={20} />
              <span>Ca trực</span>
            </div>
          )}

          {/* Nhật ký Kiểm tra Máy — EngineOfficer, EngineCrew, ChiefEngineer */}
          {(role === 'EngineOfficer' || role === 'EngineCrew' || role === 'ChiefEngineer') && (
            <div
              className={`nav-item ${isActive('/engine-logs')}`}
              onClick={() => navigate('/engine-logs')}
              style={{ cursor: 'pointer' }}
            >
              <Gauge size={20} />
              <span>Nhật ký Kiểm tra Máy</span>
            </div>
          )}

          {/* Báo cáo — tất cả */}
          <div className="nav-item" style={{ cursor: 'default', opacity: isMasterOrChief ? 1 : 0.5 }}>
            <BarChart2 size={20} />
            <span>Báo cáo</span>
          </div>

          {/* Hồ sơ — tất cả trừ Master/ChiefOfficer đã có Settings */}
          <div
            className={`nav-item ${isActive('/crew-profile')}`}
            onClick={() => navigate('/crew-profile')}
            style={{ cursor: 'pointer' }}
          >
            <UserCircle size={20} />
            <span>Hồ sơ của tôi</span>
          </div>

          {isMasterOrChief && (
            <div className="nav-item" style={{ cursor: 'default' }}>
              <Settings size={20} />
              <span>Cài đặt</span>
            </div>
          )}
        </nav>
      </div>

      <div className="sidebar-bottom">
        {isMasterOrChief && (
          <button className="btn-sail-plan" style={{ marginBottom: '8px' }}>
            <Anchor size={18} />
            Thiết lập lộ trình
          </button>
        )}
        <button
          className="btn-sail-plan"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
