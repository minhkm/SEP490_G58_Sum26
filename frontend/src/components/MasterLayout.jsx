import { Layout } from 'antd';
import Sidebar from './Sidebar';

const { Content } = Layout;

export default function MasterLayout({ children }) {
  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar />
      <Content style={{ backgroundColor: '#f4f7fb', overflowY: 'auto' }}>
        {children}
      </Content>
    </Layout>
  );
}
