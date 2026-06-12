import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Ship, Eye } from 'lucide-react';
import AgencyLayout from '../components/AgencyLayout';
import { vesselService } from '../services/api';

export default function VesselListPage() {
  const navigate = useNavigate();
  const [vessels, setVessels] = useState([]);

  const fetchVessels = async () => {
    try {
      const data = await vesselService.getAll();
      setVessels(data);
    } catch (error) {
      console.error('Lỗi tải danh sách tàu:', error);
    }
  };

  useEffect(() => {
    fetchVessels();
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xoá tàu ${name} khỏi hệ thống không?`)) {
      try {
        await vesselService.delete(id);
        fetchVessels();
      } catch (error) {
        console.error('Lỗi xoá tàu:', error);
        alert('Có lỗi xảy ra khi xoá tàu.');
      }
    }
  };

  return (
    <AgencyLayout>
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Quản lý Đội tàu</h1>
          <button 
            onClick={() => navigate('/vessels/new')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#0d2342', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            <Plus size={16} /> Thêm tàu mới
          </button>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Tên Tàu</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Mã số IMO</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Quốc tịch</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vessels.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.875rem' }}>#{v.id}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Ship size={16} color="#64748b" />
                      {v.shipName}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#334155', fontSize: '0.875rem' }}>{v.imoNumber}</td>
                  <td style={{ padding: '16px 20px', color: '#334155', fontSize: '0.875rem' }}>{v.flag}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      backgroundColor: v.status === 'Hoạt động' ? '#dcfce7' : (v.status === 'Đang sửa chữa' ? '#fef3c7' : '#e2e8f0'),
                      color: v.status === 'Hoạt động' ? '#166534' : (v.status === 'Đang sửa chữa' ? '#b45309' : '#475569')
                    }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        backgroundColor: v.status === 'Hoạt động' ? '#166534' : (v.status === 'Đang sửa chữa' ? '#b45309' : '#475569')
                      }}></span>
                      {v.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <button 
                      onClick={() => navigate(`/vessels/view/${v.id}`)}
                      style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', marginRight: '16px', padding: '4px' }}
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => navigate(`/vessels/edit/${v.id}`)}
                      style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', marginRight: '16px', padding: '4px' }}
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(v.id, v.shipName)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                      title="Xoá tàu"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {vessels.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <Ship size={48} color="#cbd5e1" style={{ margin: '0 auto 16px auto', display: 'block' }} />
                    Chưa có tàu nào trong hệ thống. Hãy thêm tàu mới!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AgencyLayout>
  );
}
