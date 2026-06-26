import { Layout } from 'antd';
import { useLocation } from 'react-router-dom';
import AgencySidebar from './AgencySidebar';

const { Content } = Layout;

export default function AgencyLayout({ children }) {
  const location = useLocation();
  // Các trang này đã tự quản lý thanh cuộn bên trong (để giữ Header đứng im)
  const isSharedPage = location.pathname.includes('/voyages') || location.pathname.includes('/cargos');

  return (
    <Layout style={{ height: '100vh' }}>
      <AgencySidebar />
      <Content style={{ overflowY: isSharedPage ? 'hidden' : 'auto', overflowX: 'hidden' }}>
        {children}
      </Content>
    </Layout>
  );
}
