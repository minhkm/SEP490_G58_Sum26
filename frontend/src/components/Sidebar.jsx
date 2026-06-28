import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  CompassOutlined,
  InboxOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  SendOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { CARGO_ROLES } from '../config/roles';

const { Sider } = Layout;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || '';

  const isMasterOrChief = role === 'Master' || role === 'ChiefOfficer';
  const isCrewRole = !isMasterOrChief && role !== 'Admin' && role !== 'Agency';
  const isEngine = role === 'EngineOfficer' || role === 'EngineCrew' || role === 'ChiefEngineer';
  const isDeck = role === 'Sailor' || role === 'ChiefOfficer' || role === 'Master';

  const dashboardPath = isMasterOrChief ? '/master-dashboard' : '/crew-dashboard';

  const items = [
    { key: dashboardPath, icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/voyages', icon: <CompassOutlined />, label: 'Hải Trình' },
    CARGO_ROLES.includes(role) && { key: '/cargos', icon: <InboxOutlined />, label: 'Hàng hóa' },
    isCrewRole && { key: 'ca-truc', icon: <ClockCircleOutlined />, label: 'Ca trực', disabled: true },
    isDeck && { key: '/deck-logs', icon: <FileTextOutlined />, label: 'Nhật ký Trực boong' },
    isEngine && { key: '/engine-logs', icon: <ToolOutlined />, label: 'Nhật ký Kiểm tra Máy' },
    { key: 'bao-cao', icon: <BarChartOutlined />, label: 'Báo cáo', disabled: !isMasterOrChief },
    { key: '/crew-profile', icon: <UserOutlined />, label: 'Hồ sơ của tôi' },
    isMasterOrChief && { key: 'cai-dat', icon: <SettingOutlined />, label: 'Cài đặt', disabled: true },
  ].filter(Boolean);

  // Chọn key đang active dựa trên đường dẫn hiện tại
  const selectedKey =
    items
      .map((it) => it.key)
      .filter((k) => k.startsWith('/'))
      .find((k) => location.pathname === k || location.pathname.startsWith(k + '/')) || dashboardPath;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const onMenuClick = ({ key }) => {
    if (key.startsWith('/')) navigate(key);
  };

  return (
    <Sider theme="dark" width={260} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        onClick={() => navigate(dashboardPath)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px', cursor: 'pointer', color: '#fff' }}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }}>🚢</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 18 }}>CargoOps</strong>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Maritime Logistics</span>
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

          {/* Ca trực — DeckOfficer, EngineOfficer, Sailor, EngineCrew */}
          {isCrewRole && (
            <div
              className={`nav-item ${isActive('/shifts')}`}
              onClick={() => navigate('/shifts')}
              style={{ cursor: 'pointer' }}
            >
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

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items}
        onClick={onMenuClick}
        style={{ flex: 1, borderInlineEnd: 0 }}
      />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isMasterOrChief && (
          <Button type="primary" icon={<SendOutlined />} block>
            Thiết lập lộ trình
          </Button>
        )}
        <Button danger icon={<LogoutOutlined />} block onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>
    </Sider>
  );
}
