import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  Package,
  Ship,
  BarChart2,
  Settings,
  Anchor
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  // Nếu đang ở màn /vessels/new thì Đội tàu sẽ active. 
  // Thêm logic match prefix nếu cần.
  const isVesselActive = location.pathname.startsWith('/vessels') ? 'active' : '';

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo-container" onClick={() => navigate('/master-dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon-wrapper">
            <Ship className="logo-icon" size={24} color="#ffffff" />
          </div>
          <div className="logo-text">
            <h2 className="logo-title">CargoOps</h2>
            <span className="logo-subtitle">Maritime Logistics</span>
          </div>
        </div>
        <nav className="nav-menu">
          <div className={`nav-item ${isActive('/master-dashboard')}`} onClick={() => navigate('/master-dashboard')} style={{ cursor: 'pointer' }}>
            <LayoutDashboard size={20} />
            <span>Tổng quan</span>
          </div>
          <div className={`nav-item ${location.pathname.startsWith('/voyages') ? 'active' : ''}`} onClick={() => navigate('/voyages/new')} style={{ cursor: 'pointer' }}>
            <Navigation size={20} />
            <span>Hải Trình</span>
          </div>
          <div className={`nav-item ${location.pathname.startsWith('/cargos') ? 'active' : ''}`} onClick={() => navigate('/cargos')} style={{ cursor: 'pointer' }}>
            <Package size={20} />
            <span>Hàng hóa</span>
          </div>
          <div className={`nav-item ${isVesselActive}`} onClick={() => navigate('/vessels/new')} style={{ cursor: 'pointer' }}>
            <Ship size={20} />
            <span>Đội tàu</span>
          </div>
          <div className="nav-item">
            <BarChart2 size={20} />
            <span>Báo cáo</span>
          </div>
          <div className="nav-item">
            <Settings size={20} />
            <span>Cài đặt</span>
          </div>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button className="btn-sail-plan">
          <Anchor size={18} />
          Thiết lập lộ trình
        </button>
      </div>
    </aside>
  );
}
