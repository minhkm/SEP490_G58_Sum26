import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ship, Gauge, ClipboardList, Bell, LogOut, User,
  Clock, CheckCircle, AlertTriangle, Calendar
} from 'lucide-react';
import './CrewDashboard.css';

export default function CrewDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Xác định vai trò hiển thị
  const getRoleDisplay = (role) => {
    const roleMap = {
      'ChiefOfficer': 'Đại phó',
      'DeckOfficer': 'Sỹ quan Boong',
      'EngineOfficer': 'Sỹ quan Máy',
      'Sailor': 'Thủy thủ',
      'Master': 'Thuyền trưởng'
    };
    return roleMap[role] || role;
  };

  // Kiểm tra role có phải Engine không
  const isEngineRole = ['EngineOfficer'].includes(user.role);
  const isDeckRole = ['ChiefOfficer', 'DeckOfficer', 'Sailor'].includes(user.role);

  return (
    <div className="crew-dashboard">
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
            <div className="crew-nav-item active" onClick={() => navigate('/crew-dashboard')}>
              <ClipboardList size={20} /> <span>Bảng điều khiển</span>
            </div>

            {isEngineRole && (
              <div className="crew-nav-item" onClick={() => navigate('/engine-logs')}>
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
      <main className="crew-main">
        <div className="crew-welcome-banner">
          <div>
            <h1 className="crew-welcome-title">
              Xin chào, {user.fullName || user.username}! 👋
            </h1>
            <p className="crew-welcome-sub">
              Vai trò: <strong>{getRoleDisplay(user.role)}</strong> | Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <h3 className="crew-section-title">Truy cập nhanh</h3>
        <div className="crew-action-grid">
          {isEngineRole && (
            <div className="crew-action-card engine" onClick={() => navigate('/engine-logs')}>
              <div className="crew-action-icon"><Gauge size={32} /></div>
              <h4>Nhật ký Kiểm tra Máy</h4>
              <p>Kiểm tra và ghi nhận thông số máy trong ca trực của bạn</p>
              <span className="crew-action-go">Truy cập →</span>
            </div>
          )}

          {isDeckRole && (
            <div className="crew-action-card deck disabled-card">
              <div className="crew-action-icon"><ClipboardList size={32} /></div>
              <h4>Nhật ký Boong</h4>
              <p>Ghi nhận hoạt động trên boong tàu (Đang phát triển)</p>
              <span className="crew-action-go">Sắp ra mắt</span>
            </div>
          )}

          <div className="crew-action-card info">
            <div className="crew-action-icon"><Calendar size={32} /></div>
            <h4>Lịch Ca Trực</h4>
            <p>Xem lịch phân công ca trực của bạn</p>
            <span className="crew-action-go">Sắp ra mắt</span>
          </div>
        </div>

        {/* Info Section */}
        <h3 className="crew-section-title">Thông tin hệ thống</h3>
        <div className="crew-info-cards">
          <div className="crew-info-item">
            <CheckCircle size={20} color="#16a34a" />
            <div>
              <strong>Trạng thái hệ thống</strong>
              <span>Hoạt động bình thường</span>
            </div>
          </div>
          <div className="crew-info-item">
            <Clock size={20} color="#2563eb" />
            <div>
              <strong>Phiên đăng nhập</strong>
              <span>Đang hoạt động</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
