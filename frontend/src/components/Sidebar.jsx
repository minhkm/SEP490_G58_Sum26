import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  CompassOutlined,
  InboxOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  SendOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { CARGO_ROLES, getEffectiveRole } from '../config/roles';
import { voyageService } from '../services/api';
import { useState, useEffect } from 'react';

const { Sider } = Layout;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = getEffectiveRole();

  const isMasterOrChief = role === 'Master' || role === 'ChiefOfficer';
  const isCrewRole = !isMasterOrChief && role !== 'Admin';
  const isEngineOfficer = role === 'EngineOfficer';
  const isEngine = role === 'EngineCrew';
  const isDeck = role === 'Sailor';
  
  const isGlobalRoleNonAdmin = user.role !== 'Admin';

  const [activeVoyageStatus, setActiveVoyageStatus] = useState(null);

  useEffect(() => {
    if (isMasterOrChief) {
      voyageService.getAll()
        .then(data => {
          const activeVoyageId = localStorage.getItem('activeVoyageId');
          if (activeVoyageId) {
            const activeV = (data || []).find(v => v.id.toString() === activeVoyageId.toString());
            if (activeV) {
              setActiveVoyageStatus(activeV.status);
            }
          }
        })
        .catch(err => {
          console.error('Không thể tải hải trình cho thanh điều hướng:', err);
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
      disabled: activeVoyageStatus !== 'Loaded'
    },
    CARGO_ROLES.includes(role) && { key: '/cargos', icon: <InboxOutlined />, label: 'Hàng hóa' },
    isCrewRole && { key: '/shifts', icon: <ClockCircleOutlined />, label: 'Ca trực' },
    isDeck && { key: '/deck-logs', icon: <FileTextOutlined />, label: 'Nhật ký Trực boong' },
    isEngine && { key: '/engine-logs', icon: <ToolOutlined />, label: 'Nhật ký Kiểm tra Máy' },
    isEngineOfficer && { key: '/engine-management', icon: <SettingOutlined />, label: 'Quản lý máy' },
    isMasterOrChief && { 
      key: '/sewage-logs', 
      icon: <FileTextOutlined />, 
      label: 'Nhật ký xả thải',
      disabled: activeVoyageStatus ? !['Underway', 'Arrived', 'Discharge', 'Discharged', 'Homeward Bounding'].includes(activeVoyageStatus) : false
    },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
    isMasterOrChief && { key: '/vessel-supplies', icon: <ToolOutlined />, label: 'Thiết bị và vật tư' },
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
    <Sider theme="dark" width={260} breakpoint="md" collapsedWidth={0} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        onClick={() => navigate(dashboardPath)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px', cursor: 'pointer', color: '#fff' }}
      >
        <img src="/favicon.svg" alt="CargoOps" width={32} height={32} style={{ display: 'block', borderRadius: 7 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 18 }}>CargoOps</strong>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Quản lý hàng hải</span>
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
