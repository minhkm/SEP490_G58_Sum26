import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import viVN from 'antd/locale/vi_VN'
import './index.css'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'

const maritimeTheme = {
  token: {
    colorPrimary: '#0284c7',
    colorInfo: '#0284c7',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorTextBase: '#1e293b',
    colorTextHeading: '#0c2340',
    colorBgBase: '#ffffff',
    colorBgLayout: '#d5e0eb',
    fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    borderRadius: 8,
    wireframe: false,
  },
  components: {
    Card: {
      headerBg: 'transparent',
      colorBorderSecondary: '#b4c8db',
      borderRadiusLG: 12,
    },
    Table: {
      headerBg: '#f1f6fa',
      headerColor: '#334155',
      borderColor: '#e2eaf2',
      rowHoverBg: '#eef5fb',
      borderRadius: 10,
    },
    Tabs: {
      cardBg: '#dbe7f2',
      itemSelectedColor: '#0284c7',
      itemColor: '#475569',
    },
    Button: {
      borderRadius: 8,
      controlHeight: 36,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Tag: {
      borderRadiusSM: 12,
    },
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider locale={viVN} theme={maritimeTheme}>
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)