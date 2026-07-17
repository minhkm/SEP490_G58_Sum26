import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
import { Spin } from 'antd';
import './MasterDashboard.css';
import MasterLayout from '../components/MasterLayout';
import NotificationBell from '../components/NotificationBell';
import { notifyInfo, notifyError } from '../utils/feedback';
import { dashboardService } from '../services/api';

export default function MasterDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {
    fullName: 'Nguyễn Viết Dương',
    role: 'MASTER',
    id: '3',
  };

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await dashboardService.getMasterDashboardData();
        setDashboardData(data); // data can be null if no active voyage
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        notifyError('Lỗi khi tải dữ liệu dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

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

  const voyage = dashboardData?.voyage;
  const stats = dashboardData?.stats;

  return (
    <MasterLayout hideTopbar>
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
          <NotificationBell />
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
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <div className="dashboard-title-section">
              <div className="title-left">
                <span className="subtitle">TỔNG QUAN HOẠT ĐỘNG</span>
                <h1 className="main-title">
                  {voyage 
                    ? `Hải trình #${voyage.id}: ${voyage.departurePort || '---'} ➔ ${voyage.destinationPort || '---'}`
                    : 'Chưa có chuyến đi nào đang hoạt động'}
                </h1>
              </div>
              <div className="title-right">
                <div className={`status-badge ${voyage ? 'status-active' : 'status-waiting'}`} style={{ backgroundColor: voyage ? '#ecfdf5' : '', color: voyage ? '#10b981' : '' }}>
                  <span className="status-dot" style={{ backgroundColor: voyage ? '#10b981' : '' }}></span>
                  {voyage ? voyage.status : 'Chưa có dữ liệu'}
                </div>
                <div className="utc-badge">
                  UTC {new Date().toISOString().substring(11, 16)}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <ProfileOutlined className="stat-icon" />
                <span className="stat-label">TÀU HIỆN TẠI</span>
                <span className={`stat-value ${!voyage ? 'empty-text' : ''}`}>
                  {voyage?.Ship?.shipName ? `${voyage.Ship.shipName}` : 'Không có dữ liệu'}
                </span>
              </div>
              <div className="stat-card">
                <FileTextOutlined className="stat-icon" />
                <span className="stat-label">TẢI TRỌNG HÀNG HÓA</span>
                <span className={`stat-value ${!stats ? 'empty-text' : ''}`}>
                  {stats ? `${stats.totalWeight} MT` : 'Trống'}
                </span>
              </div>
              <div className="stat-card">
                <ThunderboltOutlined className="stat-icon" />
                <span className="stat-label">TÌNH TRẠNG THIẾT BỊ</span>
                <span className={`stat-value ${!stats ? 'empty-text' : ''}`}>
                  {stats?.equipmentStatus || 'Không có dữ liệu'}
                </span>
              </div>
              <div className="stat-card">
                <TeamOutlined className="stat-icon" />
                <span className="stat-label">THUYỀN VIÊN HẢI TRÌNH</span>
                <span className={`stat-value ${!stats ? 'empty-text' : ''}`}>
                  {stats?.totalCrewCount ? `${stats.totalCrewCount} thuyền viên` : '-- / --'}
                </span>
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
                  {voyage ? (
                    <div className="dash-panel-body" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div>
                          <p style={{ color: '#64748b', marginBottom: '4px' }}>Cảng khởi hành</p>
                          <h4 style={{ fontSize: '18px', margin: 0 }}>{voyage.departurePort}</h4>
                          <p style={{ color: '#94a3b8', fontSize: '13px' }}>{voyage.departureDate}</p>
                        </div>
                        <div style={{ textAlign: 'center', color: '#cbd5e1' }}>
                          <RightOutlined style={{ fontSize: '24px', marginTop: '10px' }}/>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ color: '#64748b', marginBottom: '4px' }}>Cảng đến</p>
                          <h4 style={{ fontSize: '18px', margin: 0 }}>{voyage.destinationPort}</h4>
                          <p style={{ color: '#94a3b8', fontSize: '13px' }}>ETA: {voyage.arrivalDate}</p>
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: 0, color: '#334155' }}>
                          <strong>Trạng thái:</strong> {voyage.status}
                        </p>
                        {voyage.issueReason && (
                          <p style={{ margin: '8px 0 0 0', color: '#ef4444' }}>
                            <strong>Vấn đề:</strong> {voyage.issueReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>

                {/* Cargo List */}
                <div className="dash-panel mt-20">
                  <div className="dash-panel-header">
                    <h3><InboxOutlined /> Danh sách Hàng hóa</h3>
                  </div>
                  {voyage && voyage.Cargos && voyage.Cargos.length > 0 ? (
                    <div className="dash-panel-body" style={{ padding: 0 }}>
                      <table className="cargo-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: 600 }}>Tên hàng</th>
                            <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: 600 }}>Cảng xếp</th>
                            <th style={{ padding: '12px 24px', color: '#64748b', fontWeight: 600 }}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {voyage.Cargos.map(cargo => (
                            <tr key={cargo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 24px', fontWeight: 500, color: '#0f172a' }}>{cargo.cargoName}</td>
                              <td style={{ padding: '12px 24px', color: '#475569' }}>{cargo.loadPort}</td>
                              <td style={{ padding: '12px 24px' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: cargo.status === 'Completed' ? '#dcfce7' : '#fef9c3', color: cargo.status === 'Completed' ? '#166534' : '#854d0e' }}>
                                  {cargo.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="dash-panel-body empty-state-large">
                      <div className="empty-icon-circle">
                        <InboxOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
                      </div>
                      <h4>Chưa có hàng hóa nào được gán</h4>
                      <p>Tàu hiện tại chưa có danh sách vận đơn cho chuyến đi này.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column */}
              <div className="grid-col-right">

                {/* Journey Details */}
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <h3><NodeIndexOutlined /> Chi tiết hành trình</h3>
                  </div>
                  {voyage ? (
                    <div className="dash-panel-body" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginTop: '6px' }}></div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Khởi hành từ {voyage.departurePort}</p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{voyage.departureDate}</p>
                          </div>
                        </div>
                        <div style={{ borderLeft: '2px dashed #e2e8f0', marginLeft: '3px', paddingLeft: '17px', paddingBottom: '16px' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Đang di chuyển...</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #cbd5e1', marginTop: '6px' }}></div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Dự kiến đến {voyage.destinationPort}</p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{voyage.arrivalDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="dash-panel-body empty-state-medium">
                      <ClockCircleOutlined style={{ fontSize: 32, color: '#cbd5e1' }} className="mb-12" />
                      <p className="italic-text">Không có dữ liệu hành trình hiện tại</p>
                    </div>
                  )}
                </div>

                {/* Reports & Orders */}
                <div className="dash-panel mt-20">
                  <div className="dash-panel-header">
                    <h3><FileTextOutlined /> Báo cáo & Lệnh</h3>
                  </div>
                  <div className="dash-panel-body">
                    <div className="success-box">
                      <CheckCircleOutlined style={{ fontSize: 24, color: '#10b981' }} className="mb-8" />
                      <p>Hệ thống giám sát đang hoạt động bình thường.</p>
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
          </>
        )}
      </div>
    </MasterLayout>
  );
}

