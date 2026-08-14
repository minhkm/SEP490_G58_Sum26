import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  CompassOutlined,
  InboxOutlined,
  SettingOutlined,
  TeamOutlined,
  ContainerOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { CARGO_ROLES } from '../config/roles';

const { Sider } = Layout;

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || 'Admin';

  const items = [
    { key: '/admin-dashboard', icon: <DashboardOutlined />, label: 'Bảng điều khiển', className: 'tour-dashboard' },
    { key: '/vessels', icon: <ContainerOutlined />, label: 'Quản lý Đội tàu', className: 'tour-vessels' },
    { key: '/crews', icon: <TeamOutlined />, label: 'Quản lý Thủy thủ đoàn', className: 'tour-crews' },
    { key: '/voyages', icon: <CompassOutlined />, label: 'Chuyến hải trình', className: 'tour-voyages' },
    (CARGO_ROLES.includes(role) || role.toLowerCase() === 'admin') && { key: '/cargos', icon: <InboxOutlined />, label: 'Hàng hóa', className: 'tour-cargos' },
    role.toLowerCase() === 'admin' && { key: '/settings', icon: <SettingOutlined />, label: 'Cấu hình' },
  ].filter(Boolean);

  const isSettingsPage = location.pathname.startsWith('/settings') || location.pathname.startsWith('/cargo-types') || location.pathname.startsWith('/ports');

  const selectedKey = isSettingsPage ? '/settings' :
    items
      .map((it) => it.key)
      .find((k) => location.pathname === k || location.pathname.startsWith(k + '/')) || '/admin-dashboard';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeVoyageId');
    localStorage.removeItem('activeVoyageRole');
    navigate('/login');
  };

  return (
    <Sider theme="dark" width={260} breakpoint="md" collapsedWidth={0} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        onClick={() => navigate('/admin-dashboard')}
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
        onClick={({ key }) => navigate(key)}
        style={{ flex: 1, borderInlineEnd: 0 }}
      />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button danger icon={<LogoutOutlined />} block onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>
    </Sider>
  );
}
