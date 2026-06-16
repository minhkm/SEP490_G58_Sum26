import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterLayout from '../components/MasterLayout';
import { profileService } from '../services/api';
import { UserCircle, Navigation, Clock, FileText, Ship, AlertCircle } from 'lucide-react';

const ROLE_LABELS = {
  DeckOfficer:   'Sĩ quan Boong',
  EngineOfficer: 'Sĩ quan Máy',
  Sailor:        'Thủy thủ / Thợ máy',
  ChiefOfficer:  'Đại phó',
  Master:        'Thuyền trưởng',
};

const DEPT_LABELS = {
  Deck:   'Bộ phận Boong',
  Engine: 'Bộ phận Máy',
};

export default function CrewDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [expiredCerts, setExpiredCerts] = useState([]);

  useEffect(() => {
    profileService.getMe()
      .then(data => {
        setProfile(data);
        const today = new Date().toISOString().split('T')[0];
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        const soonStr = soon.toISOString().split('T')[0];
        const warn = (data.CrewCertificates || []).filter(c =>
          c.status === 'Expired' || (c.expiryDate && c.expiryDate <= soonStr)
        );
        setExpiredCerts(warn);
      })
      .catch(() => {});
  }, []);

  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const deptLabel = profile ? (DEPT_LABELS[profile.department] || profile.department) : '';

  const quickLinks = [
    { icon: <UserCircle size={28} />, label: 'Hồ sơ của tôi', sub: 'Xem & cập nhật thông tin', path: '/crew-profile', color: '#3b82f6' },
    { icon: <Navigation size={28} />, label: 'Hải trình',      sub: 'Xem các hải trình',        path: '/voyages',      color: '#10b981' },
    { icon: <Clock size={28} />,      label: 'Ca trực',         sub: 'Lịch & nhật ký ca trực',  path: null,            color: '#f59e0b', disabled: true },
    { icon: <FileText size={28} />,   label: 'Báo cáo',         sub: 'Báo cáo vận hành',        path: null,            color: '#8b5cf6', disabled: true },
  ];

  return (
    <MasterLayout>
      <div style={{ padding: '28px 32px' }}>

        {/* Welcome header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          borderRadius: '16px',
          padding: '28px 32px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          color: '#fff',
        }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '50%', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ship size={32} color="#60a5fa" />
          </div>
          <div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>Chào mừng trở lại</p>
            <h2 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 700 }}>
              {profile?.fullName || user.fullName || user.username}
            </h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ background: '#3b82f6', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{roleLabel}</span>
              {deptLabel && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{deptLabel}</span>}
              {profile?.position && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{profile.position}</span>}
            </div>
          </div>
        </div>

        {/* Cảnh báo chứng chỉ sắp hết hạn */}
        {expiredCerts.length > 0 && (
          <div style={{
            background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 12,
            padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12
          }}>
            <AlertCircle size={20} color="#d97706" />
            <div>
              <strong style={{ color: '#92400e', fontSize: 14 }}>Chứng chỉ cần lưu ý:</strong>
              <span style={{ color: '#78350f', fontSize: 13, marginLeft: 8 }}>
                {expiredCerts.map(c => c.certificateName).join(', ')} — kiểm tra tại <span
                  style={{ textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => navigate('/crew-profile')}
                >Hồ sơ của tôi</span>
              </span>
            </div>
          </div>
        )}

        {/* Quick links */}
        <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 16, fontSize: 16 }}>Truy cập nhanh</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          {quickLinks.map((q, i) => (
            <div
              key={i}
              onClick={() => !q.disabled && q.path && navigate(q.path)}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 24px',
                cursor: q.disabled ? 'default' : 'pointer',
                opacity: q.disabled ? 0.5 : 1,
                transition: 'box-shadow .15s',
              }}
              onMouseEnter={e => !q.disabled && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ color: q.color, marginBottom: 10 }}>{q.icon}</div>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>{q.label}</div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{q.sub}</div>
              {q.disabled && <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, display: 'block' }}>Sắp ra mắt</span>}
            </div>
          ))}
        </div>

        {/* Thông tin tóm tắt hồ sơ */}
        {profile && (
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Thông tin hồ sơ</h4>
              <button
                onClick={() => navigate('/crew-profile')}
                style={{ background: 'none', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 13 }}
              >
                Chỉnh sửa
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 32px' }}>
              {[
                ['Email', profile.User?.username],
                ['Điện thoại', profile.phone || '—'],
                ['CCCD', profile.cccd || '—'],
                ['Chức danh', profile.position || '—'],
                ['Chứng chỉ', `${(profile.CrewCertificates || []).length} chứng chỉ`],
              ].map(([label, value]) => (
                <div key={label}>
                  <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </MasterLayout>
  );
}
