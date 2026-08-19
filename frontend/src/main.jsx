import { createRoot } from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import viVN from 'antd/locale/vi_VN'
import './index.css'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'

// ===== Ocean Professional — nguồn CHÂN LÝ DUY NHẤT cho theme =====
// Mọi tinh chỉnh màu / bo góc / typography đặt ở đây. KHÔNG dùng !important
// trong CSS để "che" thứ antd đã có (xem CLAUDE.md mục 6).
const FONT_STACK =
  "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const maritimeTheme = {
  token: {
    // Thương hiệu
    colorPrimary: '#0E5FB5', // marine blue
    colorInfo: '#0E5FB5',
    colorSuccess: '#0F9D6E',
    colorWarning: '#E8A21C',
    colorError: '#E5484D',
    // Chữ
    colorTextBase: '#1E293B',
    colorTextHeading: '#0C2340',
    // Nền / viền
    colorBgBase: '#ffffff',
    colorBgLayout: '#F4F6FA', // nền trung tính dịu mắt
    colorBorderSecondary: '#E6EBF1',
    // Hình khối / chữ
    borderRadius: 8,
    fontFamily: FONT_STACK,
    wireframe: false,
  },
  components: {
    // Sider navy đồng bộ với logo CargoOps
    Layout: {
      bodyBg: '#F4F6FA',
      siderBg: '#0B1A2C',
      headerBg: '#ffffff',
    },
    Menu: {
      darkItemBg: '#0B1A2C',
      darkPopupBg: '#0B1A2C',
      darkItemSelectedBg: '#0E5FB5',
    },
    Card: {
      borderRadiusLG: 12,
      headerBg: 'transparent',
      headerFontSize: 16,
      colorBorderSecondary: '#E6EBF1',
    },
    Table: {
      headerBg: '#F1F5F9',
      headerColor: '#334155',
      headerSplitColor: 'transparent',
      rowHoverBg: '#F1F6FB',
      borderColor: '#EDF1F5',
      borderRadius: 10,
    },
    Button: {
      controlHeight: 36,
      fontWeight: 500,
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Input: { controlHeight: 36 },
    InputNumber: { controlHeight: 36 },
    Select: { controlHeight: 36 },
    DatePicker: { controlHeight: 36 },
    Tag: { borderRadiusSM: 10 },
    Tabs: {
      itemColor: '#475569',
      itemSelectedColor: '#0E5FB5',
      itemHoverColor: '#0E5FB5',
    },
  },
};

createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={viVN} theme={maritimeTheme}>
    <AntdApp>
      <App />
    </AntdApp>
  </ConfigProvider>,
)
