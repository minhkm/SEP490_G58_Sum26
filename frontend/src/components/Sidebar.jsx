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
import { voyageService } from '../services/api';
import { useState, useEffect } from 'react';

const { Sider } = Layout;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const activeVoyageRole = localStorage.getItem('activeVoyageRole');
  const role = activeVoyageRole || user.role || '';

  const isMasterOrChief = role === 'Master' || role === 'ChiefOfficer';
  const isCrewRole = !isMasterOrChief && role !== 'Admin' && role !== 'Agency';
  const isEngineOfficer = role === 'EngineOfficer';
  const isEngine = role === 'EngineCrew';
  const isDeck = role === 'Sailor';
  
  const isGlobalRoleNonAdmin = user.role !== 'Admin' && user.role !== 'Agency';

  const [hasValidVoyage, setHasValidVoyage] = useState(true); // default true to avoid flicker

  useEffect(() => {
    if (isMasterOrChief) {
      voyageService.getAll()
        .then(data => {
          // Check if there is any voyage that is Loaded (or beyond, like Underway)
          const valid = (data || []).some(v => v.status === 'Loaded' || v.status === 'Underway');
          setHasValidVoyage(valid);
        })
        .catch(err => {
          console.error('Error fetching voyages for sidebar:', err);
          setHasValidVoyage(false);
        });
    }
  }, [isMasterOrChief]);

  const dashboardPath = isMasterOrChief ? '/master-dashboard' : '/crew-dashboard';

  const items = [
    { key: dashboardPath, icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/voyages', icon: <CompassOutlined />, label: 'Hải Trình' },
    isMasterOrChief && { 
      key: '/route-planner', 
      icon: <SendOutlined />, 
      label: role === 'Master' ? 'Phê duyệt lộ trình' : 'Thiết lập lộ trình',
      disabled: !hasValidVoyage
    },
    CARGO_ROLES.includes(role) && { key: '/cargos', icon: <InboxOutlined />, label: 'Hàng hóa' },
    isCrewRole && { key: '/shifts', icon: <ClockCircleOutlined />, label: 'Ca trực' },
    isDeck && { key: '/deck-logs', icon: <FileTextOutlined />, label: 'Nhật ký Trực boong' },
    isEngine && { key: '/engine-logs', icon: <ToolOutlined />, label: 'Nhật ký Kiểm tra Máy' },
    isEngineOfficer && { key: '/engine-management', icon: <SettingOutlined />, label: 'Quản lý Máy & Thiết bị' },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
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
    localStorage.removeItem('activeVoyageId');
    localStorage.removeItem('activeVoyageRole');
    navigate('/login');
  };

  const handleSwitchVoyage = () => {
    localStorage.removeItem('activeVoyageId');
    localStorage.removeItem('activeVoyageRole');
    navigate('/my-voyages');
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
        {isGlobalRoleNonAdmin && (
          <Button 
            type="default" 
            icon={<CompassOutlined />} 
            block 
            onClick={handleSwitchVoyage}
            style={{ color: '#fff', background: 'transparent', borderColor: '#475569' }}
          >
            Đổi Hải Trình
          </Button>
        )}
        <Button danger icon={<LogoutOutlined />} block onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>
    </Sider>
  );
}
