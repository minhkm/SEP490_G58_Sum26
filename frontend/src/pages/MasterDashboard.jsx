import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  ProfileOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  PlusOutlined,
  UserOutlined,
  LogoutOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  InboxOutlined,
  NodeIndexOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  FileAddOutlined,
  HistoryOutlined,
  RightOutlined,
} from '@ant-design/icons';
import './MasterDashboard.css';
import MasterLayout from '../components/MasterLayout';
import { notifyInfo } from '../utils/feedback';

export default function MasterDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {
    fullName: 'Nguyễn Viết Dương',
    role: 'MASTER',
    id: '3',
  };

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <MasterLayout>
        {/* Header */}
        <header className="top-header dashboard-header">
          <div className="header-search">
            <SearchOutlined className="search-icon" />
            <input type="text" placeholder="Tìm kiếm mã chuyến đi, hàng..." className="search-input" />
          </div>

          <div className="header-center-logo">
            <span className="center-logo-text">CargoOps</span>
          </div>

          <div className="header-actions">
            <div className="action-icon-wrapper">
              <BellOutlined className="action-icon" />
              <span className="notification-dot"></span>
            </div>
            <QuestionCircleOutlined className="action-icon" />

            <div className="user-profile-wrapper" ref={dropdownRef}>
              <div className="user-profile" onClick={() => setShowDropdown(!showDropdown)}>
                <div className="user-info">
                  <span className="user-name">{user.fullName || user.username}</span>
                  <span className="user-role">
                    {(user.role || 'MASTER').toUpperCase()} • ID: {user.employeeId || user.id || '3'}
                  </span>
                </div>
                <div className="user-avatar">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username || 'User')}&background=0b1a2c&color=fff`} alt="User" />
                </div>
              </div>

              {showDropdown && (
                <div className="user-dropdown">
                  <div className="dropdown-item" onClick={() => {
                    setShowDropdown(false);
                    notifyInfo('Trang profile đang được phát triển!');
                  }}>
                    <UserOutlined />
                    Xem profile
                  </div>
                  <div className="dropdown-item text-danger" onClick={handleLogout}>
                    <LogoutOutlined />
                    Đăng xuất
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">

          <div className="dashboard-title-section">
            <div className="title-left">
              <span className="subtitle">TỔNG QUAN HOẠT ĐỘNG</span>
              <h1 className="main-title">Chưa có chuyến đi nào đang hoạt động</h1>
            </div>
            <div className="title-right">
              <div className="status-badge status-waiting">
                <span className="status-dot"></span>
                Chưa có dữ liệu
              </div>
              <div className="utc-badge">
                UTC --:--
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <ProfileOutlined className="stat-icon" />
              <span className="stat-label">CHUYẾN ĐI HIỆN TẠI</span>
              <span className="stat-value empty-text">Không có dữ liệu</span>
            </div>
            <div className="stat-card">
              <FileTextOutlined className="stat-icon" />
              <span className="stat-label">TẢI TRỌNG HÀNG HÓA</span>
              <span className="stat-value empty-text">Trống</span>
            </div>
            <div className="stat-card">
              <ThunderboltOutlined className="stat-icon" />
              <span className="stat-label">TÌNH TRẠNG THIẾT BỊ</span>
              <span className="stat-value empty-text">Không có dữ liệu</span>
            </div>
            <div className="stat-card">
              <TeamOutlined className="stat-icon" />
              <span className="stat-label">NHÂN SỰ CA TRỰC</span>
              <span className="stat-value empty-text">-- / --</span>
            </div>
          </div>

          {/* Dashboard Main Grid */}
          <div className="dashboard-grid">
            {/* Left Column */}
            <div className="grid-col-left">

              {/* Location & Journey */}
              <div className="dash-panel">
                <div className="dash-panel-header">
                  <h3><EnvironmentOutlined /> Vị trí & Hành trình</h3>
                </div>
                <div className="dash-panel-body empty-state-large">
                  <div className="empty-icon-circle">
                    <GlobalOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
                  </div>
                  <h4>Chưa lập kế hoạch hành trình</h4>
                  <p>Vui lòng khởi tạo lộ trình để bắt đầu theo dõi vị trí và ETA của tàu.</p>
                  <button className="btn-text">
                    <PlusOutlined /> Thiết lập lộ trình mới
                  </button>
                </div>
              </div>

              {/* Cargo List */}
              <div className="dash-panel mt-20">
                <div className="dash-panel-header">
                  <h3><InboxOutlined /> Danh sách Hàng hóa</h3>
                </div>
                <div className="dash-panel-body empty-state-large">
                  <div className="empty-icon-circle">
                    <InboxOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
                  </div>
                  <h4>Chưa có hàng hóa nào được gán</h4>
                  <p>Tàu hiện tại chưa có danh sách vận đơn cho chuyến đi này.</p>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="grid-col-right">

              {/* Journey Details */}
              <div className="dash-panel">
                <div className="dash-panel-header">
                  <h3><NodeIndexOutlined /> Chi tiết hành trình</h3>
                </div>
                <div className="dash-panel-body empty-state-medium">
                  <ClockCircleOutlined style={{ fontSize: 32, color: '#cbd5e1' }} className="mb-12" />
                  <p className="italic-text">Không có dữ liệu hành trình hiện tại</p>
                </div>
              </div>

              {/* Reports & Orders */}
              <div className="dash-panel mt-20">
                <div className="dash-panel-header">
                  <h3><FileTextOutlined /> Báo cáo & Lệnh</h3>
                </div>
                <div className="dash-panel-body">
                  <div className="success-box">
                    <CheckCircleOutlined style={{ fontSize: 24, color: '#10b981' }} className="mb-8" />
                    <p>Tất cả báo cáo đã được xử lý. Không có thông báo khẩn cấp.</p>
                  </div>

                  <div className="quick-actions-section">
                    <span className="section-label">Hành động nhanh</span>
                    <ul className="action-list">
                      <li>
                        <div className="action-item">
                          <FileAddOutlined />
                          <span>Tạo báo cáo mới</span>
                        </div>
                        <RightOutlined className="chevron" />
                      </li>
                      <li>
                        <div className="action-item">
                          <HistoryOutlined />
                          <span>Lịch sử lệnh</span>
                        </div>
                        <RightOutlined className="chevron" />
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </MasterLayout>
  );
}
