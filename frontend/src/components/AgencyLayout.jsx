import { Layout } from 'antd';
import { useLocation } from 'react-router-dom';
import AgencySidebar from './AgencySidebar';
import NotificationBell from './NotificationBell';
import './AppTopbar.css';

const { Content } = Layout;

export default function AgencyLayout({ children }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.fullName || user.username || 'Admin';
  // Các trang này đã tự quản lý thanh cuộn bên trong (để giữ Header đứng im)
  const isSharedPage = location.pathname.includes('/voyages') || location.pathname.includes('/cargos');

  return (
    <Layout style={{ height: '100vh' }}>
      <AgencySidebar />
      <Content style={{ overflowY: isSharedPage ? 'hidden' : 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="app-topbar">
          <NotificationBell />
          <div className="app-topbar-user">
            <div className="app-topbar-user-info">
              <span className="app-topbar-user-name">{displayName}</span>
              <span className="app-topbar-user-role">{user.role || 'Admin'}</span>
            </div>
            <div className="app-topbar-avatar">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0b1a2c&color=fff`}
                alt={displayName}
              />
            </div>
          </div>
        </div>
        {children}
      </Content>
    </Layout>
  );
}
