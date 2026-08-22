import { useState } from 'react';
import { Layout, Grid, Drawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import AdminSidebar from './AdminSidebar';
import { AppTopbar } from './common';
import { roleLabel } from '../config/roles';

const { Content } = Layout;

export default function AdminLayout({ children }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.fullName || user.username || 'Admin';
  const displayRole = roleLabel(user.role || 'Admin');

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg; // < 992px → dùng drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Layout style={{ height: '100vh' }}>
      {!isMobile && <AdminSidebar />}
      <Content style={{ overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AppTopbar
          name={displayName}
          role={displayRole}
          leftSlot={isMobile ? (
            <Button type="text" aria-label="Mở menu" icon={<MenuOutlined style={{ fontSize: 18 }} />} onClick={() => setDrawerOpen(true)} />
          ) : null}
        />
        {children}
      </Content>

      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <AdminSidebar variant="drawer" onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}
    </Layout>
  );
}
