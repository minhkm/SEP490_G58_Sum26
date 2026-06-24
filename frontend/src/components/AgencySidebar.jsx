import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Button } from 'antd';
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

export default function AgencySidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user')) || {
    fullName: 'Admin',
    username: 'admin@vinhquang.vn',
    role: 'ADMIN',
  };

  const role = user.role || '';

  const items = [
    { key: '/agency-dashboard', icon: <DashboardOutlined />, label: 'Bảng điều khiển' },
    { key: '/vessels', icon: <ContainerOutlined />, label: 'Quản lý Đội tàu' },
    { key: '/crews', icon: <TeamOutlined />, label: 'Quản lý Thủy thủ đoàn' },
    { key: '/voyages', icon: <CompassOutlined />, label: 'Chuyến hải trình' },
    CARGO_ROLES.includes(role) && { key: '/cargos', icon: <InboxOutlined />, label: 'Hàng hóa' },
    role === 'Admin' && { key: '/settings', icon: <SettingOutlined />, label: 'Cài đặt' },
  ].filter(Boolean);

  const selectedKey =
    items
      .map((it) => it.key)
      .find((k) => location.pathname === k || location.pathname.startsWith(k + '/')) || '/agency-dashboard';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <Sider theme="dark" width={260} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        onClick={() => navigate('/agency-dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px', cursor: 'pointer', color: '#fff' }}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }}>🚢</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 18 }}>CargoOps</strong>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Logistics Hàng hải</span>
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

      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
        <Avatar
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
            user.fullName || user.username || 'Admin'
          )}&background=0b1a2c&color=fff`}
        />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.fullName || user.username}
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Quản trị viên</span>
        </div>
        <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} title="Đăng xuất" style={{ color: '#fff' }} />
      </div>
    </Sider>
  );
}
