import { Layout } from 'antd';
import Sidebar from './Sidebar';
import { AppTopbar } from './common';
import { roleLabel } from '../config/roles';

const { Content } = Layout;

export default function MasterLayout({ children, hideTopbar = false }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.fullName || user.username || 'Người dùng';
  const displayRole = roleLabel(localStorage.getItem('activeVoyageRole') || user.role || 'Crew');

  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar />
      <Content style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!hideTopbar && <AppTopbar name={displayName} role={displayRole} />}
        {children}
      </Content>
    </Layout>
  );
}
