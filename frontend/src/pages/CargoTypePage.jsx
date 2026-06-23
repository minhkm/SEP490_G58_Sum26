import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import AgencyLayout from '../components/AgencyLayout';
import MasterLayout from '../components/MasterLayout';
import { cargoTypeService } from '../services/api';

export default function CargoTypePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;
  const canEdit = user.role === 'Admin';

  const [cargoTypes, setCargoTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = () =>
    cargoTypeService.getAll()
      .then(res => { if (res.success) setCargoTypes(res.data); })
      .catch(() => setError('Không thể tải danh sách loại hàng.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await cargoTypeService.create({ name: form.name.trim(), description: form.description.trim() });
      setForm({ name: '', description: '' });
      await fetchData();
      Swal.fire({ icon: 'success', title: 'Đã thêm', text: 'Loại hàng đã được thêm.', timer: 1500, showConfirmButton: false });
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi thêm loại hàng.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (type) => {
    const { value: formValues } = await Swal.fire({
      title: 'Sửa loại hàng',
      html:
        `<input id="swal-name" class="swal2-input" placeholder="Tên loại hàng" value="${type.name || ''}">` +
        `<input id="swal-desc" class="swal2-input" placeholder="Mô tả" value="${type.description || ''}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Lưu',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const name = document.getElementById('swal-name').value.trim();
        if (!name) {
          Swal.showValidationMessage('Vui lòng nhập tên loại hàng');
          return false;
        }
        return { name, description: document.getElementById('swal-desc').value.trim() };
      },
    });
    if (!formValues) return;
    try {
      await cargoTypeService.update(type.id, formValues);
      await fetchData();
      Swal.fire({ icon: 'success', title: 'Đã lưu', text: 'Cập nhật loại hàng thành công.', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể cập nhật loại hàng.', 'error');
    }
  };

  const handleDelete = async (type) => {
    const result = await Swal.fire({
      title: 'Xoá loại hàng?',
      html: `Bạn có chắc chắn muốn xoá loại hàng <b>${type.name}</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;
    try {
      await cargoTypeService.delete(type.id);
      await fetchData();
      Swal.fire({ icon: 'success', title: 'Đã xoá', text: 'Loại hàng đã được xoá.', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể xoá loại hàng.', 'error');
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
            <Tag size={24} color="#6366f1" />
            Quản lý Loại Hàng hóa
          </h1>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Add form (Admin only) */}
        {canEdit && (
          <form onSubmit={handleAdd} style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Tên Loại Hàng <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="VD: Rice, Coal..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Mô tả</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="VD: Gạo, Than đá..."
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#0d2342', color: 'white', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1, height: 'fit-content' }}
              >
                <Plus size={16} /> Thêm mới
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : cargoTypes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Tag size={40} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <p>Chưa có loại hàng nào. {canEdit && 'Hãy thêm loại hàng mới ở trên.'}</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Tên Loại Hàng</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Mô tả</th>
                  {canEdit && <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {cargoTypes.map((type) => (
                  <tr key={type.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{type.name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{type.description || '—'}</td>
                    {canEdit && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleEdit(type)}
                          title="Chỉnh sửa"
                          style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }}
                        >
                          <Edit2 size={16} color="#334155" />
                        </button>
                        <button
                          onClick={() => handleDelete(type)}
                          title="Xoá"
                          style={{ background: '#fef2f2', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} color="#dc2626" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
