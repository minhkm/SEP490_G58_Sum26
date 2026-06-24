import { useNavigate } from 'react-router-dom';
import { Settings, Tag, ChevronRight } from 'lucide-react';
import AgencyLayout from '../components/AgencyLayout';
import MasterLayout from '../components/MasterLayout';

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;

  // Danh mục các mục cài đặt (chỉ Admin truy cập màn này)
  const settingItems = [
    {
      key: 'cargo-types',
      title: 'Loại Hàng hóa',
      description: 'Cấu hình danh mục loại hàng hóa dùng khi thêm lô hàng.',
      icon: Tag,
      path: '/cargo-types',
    },
  ];

  const cardStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '20px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'box-shadow 0.15s, border-color 0.15s',
  };

  return (
    <Layout>
      <div style={{ padding: '24px 32px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Settings size={26} color="#6366f1" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Cài đặt</h1>
        </div>
        <p style={{ color: '#64748b', marginTop: 0, marginBottom: '24px', fontSize: '0.9rem' }}>
          Quản lý cấu hình hệ thống.
        </p>

        {/* Setting cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {settingItems.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                style={cardStyle}
                onClick={() => navigate(item.path)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(99,102,241,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '10px', background: '#eef2ff', flexShrink: 0 }}>
                  <Icon size={24} color="#6366f1" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b' }}>{item.description}</div>
                </div>
                <ChevronRight size={20} color="#94a3b8" />
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
