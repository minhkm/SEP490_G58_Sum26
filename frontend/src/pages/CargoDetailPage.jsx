import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Info, Navigation, Box, AlertCircle, Edit2 } from 'lucide-react';
import AgencyLayout from '../components/AgencyLayout';
import MasterLayout from '../components/MasterLayout';
import { cargoService } from '../services/api';

export default function CargoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;

  useEffect(() => {
    cargoService.getById(id).then(res => {
      if (res.success) setCargo(res.data);
    }).catch(err => {
      console.error('Lỗi tải chi tiết lô hàng:', err);
    }).finally(() => setLoading(false));
  }, [id]);

  const formatNumber = (num) => (num || num === 0 ? new Intl.NumberFormat('en-US').format(num) : '—');

  const statusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('discharg') || s.includes('delivered')) return { bg: '#dcfce7', fg: '#166534' };
    if (s.includes('transit') || s.includes('progress') || s.includes('underway')) return { bg: '#dbeafe', fg: '#1e40af' };
    if (s.includes('loaded')) return { bg: '#e0e7ff', fg: '#3730a3' };
    if (s.includes('delayed')) return { bg: '#fee2e2', fg: '#991b1b' };
    return { bg: '#e2e8f0', fg: '#475569' };
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
      </Layout>
    );
  }

  if (!cargo) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
          <h3>Không tìm thấy lô hàng</h3>
          <button onClick={() => navigate('/cargos')} style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}>Quay lại danh sách</button>
        </div>
      </Layout>
    );
  }

  const rowStyle = { display: 'flex', justifyContent: 'space-between' };
  const cardStyle = { backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' };
  const titleStyle = { display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' };

  return (
    <Layout>
      <div style={{ padding: '24px 32px' }}>
        {/* Back link */}
        <button
          onClick={() => navigate('/cargos')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '16px' }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>

        {/* Header banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #0b1a2c 0%, #1e3a5f 100%)', borderRadius: '12px', padding: '24px 28px', marginBottom: '24px', boxShadow: '0 8px 24px rgba(11,26,44,0.18)' }}>
          <div style={{ width: '56px', height: '56px', flexShrink: 0, borderRadius: '12px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              {cargo.cargoName || 'Lô hàng chưa đặt tên'}
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '0.875rem' }}>ID: C60-{cargo.id} • Loại: {cargo.cargoType || 'N/A'}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: statusColor(cargo.status).bg, color: statusColor(cargo.status).fg }}>
              {cargo.status || 'Chờ xử lý'}
            </span>
            <button
              onClick={() => navigate(`/cargos/edit/${cargo.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', background: '#ffffff', color: '#0b1a2c', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              <Edit2 size={16} /> Chỉnh sửa
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Card: Thông tin lô hàng */}
          <div style={cardStyle}>
            <h3 style={titleStyle}><Info size={18} color="#0ea5e9" /> Thông tin lô hàng</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={rowStyle}>
                <span style={{ color: '#64748b' }}>Tên hàng hóa</span>
                <strong style={{ color: '#0f172a' }}>{cargo.cargoName || 'Chưa cập nhật'}</strong>
              </div>
              <div style={rowStyle}>
                <span style={{ color: '#64748b' }}>Loại hàng</span>
                <strong style={{ color: '#0f172a' }}>{cargo.cargoType || 'Chưa cập nhật'}</strong>
              </div>
              <div style={rowStyle}>
                <span style={{ color: '#64748b' }}>Tổng khối lượng</span>
                <strong style={{ color: '#0f172a' }}>{formatNumber(cargo.totalWeight)} Tấn</strong>
              </div>
              <div style={rowStyle}>
                <span style={{ color: '#64748b' }}>Tổng thể tích</span>
                <strong style={{ color: '#0f172a' }}>{formatNumber(cargo.totalVolume)} m³</strong>
              </div>
              <div style={rowStyle}>
                <span style={{ color: '#64748b' }}>Trạng thái</span>
                <strong style={{ color: '#0f172a' }}>{cargo.status || 'Chưa cập nhật'}</strong>
              </div>
            </div>
          </div>

          {/* Card: Hành trình */}
          <div style={cardStyle}>
            <h3 style={titleStyle}><Navigation size={18} color="#f59e0b" /> Thông tin hành trình</h3>
            {cargo.Voyage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={rowStyle}>
                  <span style={{ color: '#64748b' }}>Tàu</span>
                  <strong style={{ color: '#0f172a' }}>{cargo.Voyage.Ship?.shipName || 'Chưa xác định'}</strong>
                </div>
                <div style={rowStyle}>
                  <span style={{ color: '#64748b' }}>Cảng đi</span>
                  <strong style={{ color: '#0f172a' }}>{cargo.Voyage.departurePort || 'N/A'}</strong>
                </div>
                <div style={rowStyle}>
                  <span style={{ color: '#64748b' }}>Cảng đến</span>
                  <strong style={{ color: '#0f172a' }}>{cargo.Voyage.destinationPort || 'N/A'}</strong>
                </div>
                <div style={rowStyle}>
                  <span style={{ color: '#64748b' }}>Ngày đi (ETD)</span>
                  <strong style={{ color: '#0f172a' }}>{cargo.Voyage.departureDate || 'Chưa có'}</strong>
                </div>
                <div style={rowStyle}>
                  <span style={{ color: '#64748b' }}>Ngày đến (ETA)</span>
                  <strong style={{ color: '#0f172a' }}>{cargo.Voyage.arrivalDate || 'Chưa có'}</strong>
                </div>
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Lô hàng chưa được xếp vào hải trình nào.</div>
            )}
          </div>

          {/* Card: Phân bổ hầm tàu */}
          <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
            <h3 style={titleStyle}><Box size={18} color="#10b981" /> Phân bổ hầm tàu (Cargo Allocation)</h3>
            {cargo.CargoAllocations && cargo.CargoAllocations.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {cargo.CargoAllocations.map((a, idx) => (
                  <div key={idx} style={{ padding: '12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.9rem' }}>
                    <strong style={{ color: '#166534', display: 'block' }}>{a.CargoHold?.holdName || `Hầm #${a.cargoHoldId}`}</strong>
                    <span style={{ color: '#15803d' }}>Khối lượng: {formatNumber(a.allocatedWeight)} T</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Lô hàng chưa được phân bổ vào hầm tàu nào.</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
