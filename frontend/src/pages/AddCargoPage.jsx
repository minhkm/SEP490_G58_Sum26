import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Save, AlertCircle } from 'lucide-react';
import AgencyLayout from '../components/AgencyLayout';
import MasterLayout from '../components/MasterLayout';
import { cargoService, voyageService } from '../services/api';

export default function AddCargoPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;

  const [voyages, setVoyages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    voyageId: '',
    cargoName: '',
    cargoType: '',
    totalWeight: '',
    totalVolume: '',
    status: 'Registered'
  });

  useEffect(() => {
    voyageService.getAll().then(data => {
      if (Array.isArray(data)) setVoyages(data);
    }).catch(() => {});

    if (isEditMode) {
      cargoService.getById(id).then(res => {
        if (res.success && res.data) {
          const c = res.data;
          setFormData({
            voyageId: c.voyageId || '',
            cargoName: c.cargoName || '',
            cargoType: c.cargoType || '',
            totalWeight: c.totalWeight ?? '',
            totalVolume: c.totalVolume ?? '',
            status: c.status || 'Registered'
          });
        }
      }).catch(err => {
        console.error('Lỗi tải thông tin lô hàng:', err);
        setError('Không thể tải thông tin lô hàng.');
      });
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEditMode) {
        await cargoService.update(id, formData);
      } else {
        await cargoService.create(formData);
      }
      navigate('/cargos');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu lô hàng.');
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' };
  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' };

  return (
    <Layout>
      <div style={{ padding: '24px 32px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/cargos')}
            style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
          >
            <ArrowLeft size={20} color="#334155" />
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={24} color="#6366f1" />
            {isEditMode ? 'Cập nhật Lô hàng' : 'Thêm Lô hàng Mới'}
          </h1>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Tên Lô Hàng <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="text"
              name="cargoName"
              value={formData.cargoName}
              onChange={handleChange}
              required
              placeholder="VD: Vietnam White Rice 5% Broken..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Loại Hàng</label>
              <input
                type="text"
                name="cargoType"
                value={formData.cargoType}
                onChange={handleChange}
                placeholder="VD: Rice, Coal..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Trạng Thái</label>
              <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
                <option value="Registered">Registered (Đã đăng ký)</option>
                <option value="Loaded">Loaded (Đã xếp hàng)</option>
                <option value="InProgress">In Progress (Đang vận chuyển)</option>
                <option value="Discharged">Discharged (Đã dỡ hàng)</option>
                <option value="Delayed">Delayed (Chậm trễ)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Tổng Khối Lượng (Tấn) <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="number"
                step="0.01"
                name="totalWeight"
                value={formData.totalWeight}
                onChange={handleChange}
                required
                placeholder="VD: 2750"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Tổng Thể Tích (m³)</label>
              <input
                type="number"
                step="0.01"
                name="totalVolume"
                value={formData.totalVolume}
                onChange={handleChange}
                placeholder="VD: 3200"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Hải Trình (Voyage) <span style={{ color: '#dc2626' }}>*</span></label>
            <select name="voyageId" value={formData.voyageId} onChange={handleChange} required style={inputStyle}>
              <option value="">-- Chọn Hải Trình --</option>
              {voyages.map(v => (
                <option key={v.id} value={v.id}>
                  {v.id} - {v.departurePort || 'N/A'} → {v.destinationPort || 'N/A'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <button
              type="button"
              onClick={() => navigate('/cargos')}
              style={{ padding: '10px 20px', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0d2342', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1 }}
            >
              <Save size={16} /> {isEditMode ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
