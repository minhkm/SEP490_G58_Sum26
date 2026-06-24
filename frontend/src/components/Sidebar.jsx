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

  const dashboardPath = isMasterOrChief ? '/master-dashboard' : '/crew-dashboard';

  const items = [
    { key: dashboardPath, icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/voyages', icon: <CompassOutlined />, label: 'Hải Trình' },
    CARGO_ROLES.includes(role) && { key: '/cargos', icon: <InboxOutlined />, label: 'Hàng hóa' },
    isCrewRole && { key: 'ca-truc', icon: <ClockCircleOutlined />, label: 'Ca trực', disabled: true },
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
