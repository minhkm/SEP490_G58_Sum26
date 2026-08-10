import { Layout } from 'antd';
import { useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { AppTopbar } from './common';
import { roleLabel } from '../config/roles';

const { Content } = Layout;

export default function AdminLayout({ children }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.fullName || user.username || 'Admin';
  const displayRole = roleLabel(user.role || 'Admin');
  // Các trang này đã tự quản lý thanh cuộn bên trong (để giữ Header đứng im)
  const isSharedPage = location.pathname.includes('/voyages') || location.pathname.includes('/cargos');

  return (
    <Layout style={{ height: '100vh' }}>
      <AdminSidebar />
      <Content style={{ overflowY: isSharedPage ? 'hidden' : 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AppTopbar name={displayName} role={displayRole} />
        {children}
      </Content>
    </Layout>
  );
}
