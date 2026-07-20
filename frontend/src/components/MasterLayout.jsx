import { Layout } from 'antd';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import './AppTopbar.css';

const { Content } = Layout;

export default function MasterLayout({ children, hideTopbar = false }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.fullName || user.username || 'User';

  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar />
      <Content style={{ backgroundColor: '#f4f7fb', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!hideTopbar && (
          <div className="app-topbar">
            <NotificationBell />
            <div className="app-topbar-user">
              <div className="app-topbar-user-info">
                <span className="app-topbar-user-name">{displayName}</span>
                <span className="app-topbar-user-role">{localStorage.getItem('activeVoyageRole') || user.role || 'Crew'}</span>
              </div>
              <div className="app-topbar-avatar">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0b1a2c&color=fff`}
                  alt={displayName}
                />
              </div>
            </div>
          </div>
        )}
        {children}
      </Content>
    </Layout>
  );
}
