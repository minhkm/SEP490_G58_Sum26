import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Bell,
  HelpCircle,
  Settings,
  Plus,
  UserPlus,
  Ship,
  Users,
  Navigation,
  ClipboardList,
  MoreVertical
} from 'lucide-react';
import AgencyLayout from '../components/AgencyLayout';
import { dashboardService } from '../services/api';
import './AgencyDashboard.css';

export default function AgencyDashboard() {
  const navigate = useNavigate();

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const [data, setData] = useState({
    totalVessels: 0,
    totalCrews: 0,
    voyagesInProgress: 0,
    pendingApprovals: 0,
    recentVessels: [],
    newCrews: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const result = await dashboardService.getAgencyDashboardData();
        setData(result);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu dashboard:', error);
      }
    };
    fetchDashboardData();
  }, []);

  // Helper cho giao diện tàu
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'moving'; // giả định
      case 'Maintenance': return 'delayed';
      case 'Inactive': return 'port';
      default: return 'ontime';
    }
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 'Active': return 'Đang hoạt động';
      case 'Maintenance': return 'Bảo trì';
      case 'Inactive': return 'Ngừng h.động';
      default: return status || 'Bình thường';
    }
  };

  // Tính giờ cho crew
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Gần đây';
    const diff = Math.floor((new Date() - new Date(dateString)) / 3600000);
    if (diff < 24) return `${diff} giờ trước`;
    return `${Math.floor(diff / 24)} ngày trước`;
  };

  return (
    <AgencyLayout>
      <div className="agency-dashboard-container">
        
        {/* Header */}
        <header className="agency-dash-header">
          <div className="header-title-section">
            <h1 className="header-title">Bảng điều khiển Đại lý</h1>
          </div>
          
          <div className="header-actions-section">
            <div className="date-picker-mock">
              <Calendar size={16} />
              <span>{currentDate}</span>
            </div>
            
            <div className="header-icons">
              <div className="icon-wrapper">
                <Bell size={20} />
                <span className="notification-dot"></span>
              </div>
              <div className="icon-wrapper">
                <HelpCircle size={20} />
              </div>
              <div className="icon-wrapper">
                <Settings size={20} />
              </div>
            </div>
            
            <div className="header-buttons">
              <button className="btn-add-vessel" onClick={() => navigate('/vessels/new')}>
                <Plus size={16} /> Thêm tàu mới
              </button>
              <button className="btn-add-crew" onClick={() => navigate('/crews/new')}>
                <UserPlus size={16} /> Tạo tài khoản thuyền viên
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="agency-stats-grid">
          <div className="agency-stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper blue">
                <Ship size={20} />
              </div>
              <span className="stat-badge success">+2 tháng này</span>
            </div>
            <div className="stat-card-body">
              <span className="stat-label">TỔNG SỐ TÀU</span>
              <span className="stat-value">{data.totalVessels}</span>
            </div>
          </div>

          <div className="agency-stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper indigo">
                <Users size={20} />
              </div>
              <span className="stat-badge neutral">Ổn định</span>
            </div>
            <div className="stat-card-body">
              <span className="stat-label">TỔNG THUYỀN VIÊN</span>
              <span className="stat-value">{data.totalCrews}</span>
            </div>
          </div>

          <div className="agency-stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper cyan">
                <Navigation size={20} />
              </div>
              <span className="stat-badge info">Đang vận hành</span>
            </div>
            <div className="stat-card-body">
              <span className="stat-label">CHUYẾN ĐANG ĐI</span>
              <span className="stat-value">{data.voyagesInProgress}</span>
            </div>
          </div>

          <div className="agency-stat-card">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper red">
                <ClipboardList size={20} />
              </div>
              <span className="stat-badge danger">Cần xử lý</span>
            </div>
            <div className="stat-card-body">
              <span className="stat-label">CHỜ PHÊ DUYỆT</span>
              <span className="stat-value text-danger">{data.pendingApprovals < 10 ? `0${data.pendingApprovals}` : data.pendingApprovals}</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="agency-main-grid">
          
          {/* Left Column (8) */}
          <div className="agency-grid-left">
            
            {/* Vessel Overview Table */}
            <div className="agency-panel panel-vessels">
              <div className="panel-header">
                <h3>Tổng quan Đội tàu</h3>
                <div className="panel-search">
                  <input type="text" placeholder="Tìm kiếm tàu..." />
                </div>
              </div>
              <div className="panel-table-wrapper">
                <table className="agency-table">
                  <thead>
                    <tr>
                      <th>TÊN TÀU / IMO</th>
                      <th>LOẠI TÀU</th>
                      <th>TRẠNG THÁI</th>
                      <th>VỊ TRÍ</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentVessels.map(v => (
                      <tr key={v.id}>
                        <td>
                          <div className="vessel-name-cell">
                            <strong>{v.shipName}</strong>
                            <span>IMO: {v.imoNumber}</span>
                          </div>
                        </td>
                        <td>{v.type || 'Tàu chở hàng'}</td>
                        <td>
                          <span className={`status-pill ${getStatusColor(v.status)}`}>
                            <span className="dot"></span> {getStatusText(v.status)}
                          </span>
                        </td>
                        <td>{v.flag}</td>
                        <td>
                          <button className="btn-icon-more">
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel-footer">
                <span>Hiển thị {data.recentVessels.length} trong số {data.totalVessels} tàu</span>
                <div className="pagination">
                  <button disabled>Trước</button>
                  <button>Sau</button>
                </div>
              </div>
            </div>

            {/* Monthly Cargo Chart Mock */}
            <div className="agency-panel panel-chart mt-20">
              <div className="panel-header">
                <div>
                  <h3>Lưu lượng hàng hóa hàng tháng</h3>
                  <span className="panel-subtitle">Dữ liệu tổng hợp từ các chuyến hải hành</span>
                </div>
                <div className="year-selector">
                  <span>Năm 2024</span>
                </div>
              </div>
              <div className="chart-mock">
                <div className="bar-wrapper"><div className="bar" style={{height: '30%'}}></div></div>
                <div className="bar-wrapper"><div className="bar" style={{height: '45%'}}></div></div>
                <div className="bar-wrapper"><div className="bar" style={{height: '60%'}}></div></div>
                <div className="bar-wrapper"><div className="bar" style={{height: '55%'}}></div></div>
                <div className="bar-wrapper"><div className="bar dark" style={{height: '80%'}}></div></div>
                <div className="bar-wrapper"><div className="bar light" style={{height: '15%'}}></div></div>
                <div className="bar-wrapper"><div className="bar light" style={{height: '10%'}}></div></div>
                <div className="bar-wrapper"><div className="bar light" style={{height: '10%'}}></div></div>
                <div className="bar-wrapper"><div className="bar light" style={{height: '10%'}}></div></div>
                <div className="bar-wrapper"><div className="bar light" style={{height: '10%'}}></div></div>
                <div className="bar-wrapper"><div className="bar light" style={{height: '10%'}}></div></div>
                <div className="bar-wrapper"><div className="bar light" style={{height: '10%'}}></div></div>
              </div>
            </div>
          </div>

          {/* Right Column (4) */}
          <div className="agency-grid-right">
            


            {/* System Report Box */}
            <div className="system-report-box">
              <h3>Báo cáo Hệ thống</h3>
              <p>Mọi dịch vụ đang vận hành bình thường. Tốc độ đồng bộ hóa dữ liệu vệ tinh ổn định.</p>
              <div className="system-status">
                <span className="pulse-dot"></span>
                <span>ĐANG KẾT NỐI</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </AgencyLayout>
  );
}
