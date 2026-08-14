import { Layout } from 'antd';
import AdminSidebar from './AdminSidebar';
import { AppTopbar } from './common';
import { roleLabel } from '../config/roles';

const { Content } = Layout;

export default function AdminLayout({ children }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.fullName || user.username || 'Admin';
  const displayRole = roleLabel(user.role || 'Admin');

  return (
    <Layout style={{ height: '100vh' }}>
      <AdminSidebar />
      <Content style={{ overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AppTopbar name={displayName} role={displayRole} />
        {children}
      </Content>
    </Layout>
  );
}
