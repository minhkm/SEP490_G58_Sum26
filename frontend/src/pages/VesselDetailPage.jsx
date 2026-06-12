import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ship, Info, Settings, Box, AlertCircle } from 'lucide-react';
import AgencyLayout from '../components/AgencyLayout';
import { vesselService } from '../services/api';

export default function VesselDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vessel, setVessel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVessel = async () => {
      try {
        const data = await vesselService.getById(id);
        setVessel(data);
      } catch (error) {
        console.error('Lỗi tải thông tin tàu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVessel();
  }, [id]);

  if (loading) {
    return (
      <AgencyLayout>
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
      </AgencyLayout>
    );
  }

  if (!vessel) {
    return (
      <AgencyLayout>
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
          <h3>Không tìm thấy tàu</h3>
          <button onClick={() => navigate('/vessels')} style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}>Quay lại danh sách</button>
        </div>
      </AgencyLayout>
    );
  }

  return (
    <AgencyLayout>
      <div style={{ padding: '24px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button 
            onClick={() => navigate('/vessels')}
            style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
          >
            <ArrowLeft size={20} color="#334155" />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Ship size={24} color="#0284c7" />
              {vessel.shipName}
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>IMO: {vessel.imoNumber} • Quốc tịch: {vessel.flag}</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{ 
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '0.875rem', 
              fontWeight: 600,
              backgroundColor: vessel.status === 'Hoạt động' ? '#dcfce7' : '#fef3c7',
              color: vessel.status === 'Hoạt động' ? '#166534' : '#b45309'
            }}>
              {vessel.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Card: Thông tin cơ bản */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <Info size={18} color="#0ea5e9" /> Thông tin chung
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tên tàu</span>
                <strong style={{ color: '#0f172a' }}>{vessel.shipName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mã IMO</span>
                <strong style={{ color: '#0f172a' }}>{vessel.imoNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Quốc gia đăng ký (Cờ)</span>
                <strong style={{ color: '#0f172a' }}>{vessel.flag || 'Chưa cập nhật'}</strong>
              </div>
            </div>
          </div>

          {/* Card: Sức chứa */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <Box size={18} color="#f59e0b" /> Sức chứa & Tải trọng
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Trọng tải tối đa</span>
                <strong style={{ color: '#0f172a' }}>{vessel.ShipCapacity?.maxCargoWeight ? `${vessel.ShipCapacity.maxCargoWeight.toLocaleString()} Tấn` : 'Chưa cập nhật'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Thể tích tối đa</span>
                <strong style={{ color: '#0f172a' }}>{vessel.ShipCapacity?.maxCargoVolume ? `${vessel.ShipCapacity.maxCargoVolume.toLocaleString()} m³` : 'Chưa cập nhật'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Thủy thủ đoàn tối đa</span>
                <strong style={{ color: '#0f172a' }}>{vessel.ShipCapacity?.maxCrew ? `${vessel.ShipCapacity.maxCrew} Người` : 'Chưa cập nhật'}</strong>
              </div>
            </div>
          </div>

          {/* Thông số máy chính */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <Settings size={18} color="#6366f1" /> Máy móc
            </h3>
            {vessel.Engines && vessel.Engines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {vessel.Engines.map((engine, idx) => {
                  const isMainEngine = engine.engineType === 'Diesel 2-kỳ';
                  return (
                    <div key={idx} style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: isMainEngine ? '#dbeafe' : '#f1f5f9', color: isMainEngine ? '#1e40af' : '#475569', fontWeight: 600 }}>
                            {isMainEngine ? 'Máy chính' : 'Máy đèn'}
                          </span>
                          <strong style={{ color: '#334155' }}>{engine.engineName}</strong>
                        </div>
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: '#e0e7ff', color: '#4f46e5' }}>{engine.engineType}</span>
                      </div>
                      {engine.EngineParameters && engine.EngineParameters.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem', color: '#64748b', marginTop: '8px', borderTop: '1px solid #cbd5e1', paddingTop: '8px' }}>
                          {engine.EngineParameters.map((p, pIdx) => (
                            <div key={pIdx}>- {p.name}: <strong>{p.maxValue}</strong></div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có dữ liệu máy móc</div>
            )}
          </div>

          {/* Khoang chứa & Thiết bị */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <Box size={18} color="#10b981" /> Khoang hàng (Cargo Holds)
              </h3>
              {vessel.CargoHolds && vessel.CargoHolds.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {vessel.CargoHolds.map((h, idx) => (
                    <div key={idx} style={{ padding: '10px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.9rem' }}>
                      <strong style={{ color: '#166534', display: 'block' }}>{h.holdName}</strong>
                      <span style={{ color: '#15803d' }}>Sức chứa: {h.maxCapacity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có dữ liệu khoang chứa</div>
              )}
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <Info size={18} color="#8b5cf6" /> Trang thiết bị
              </h3>
              {vessel.Equipment && vessel.Equipment.length > 0 ? (
                <ul style={{ paddingLeft: '20px', margin: 0, color: '#475569', fontSize: '0.95rem' }}>
                  {vessel.Equipment.map((e, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>
                      <strong>{e.equipmentName}</strong> ({e.equipmentType}) - Vị trí: {e.location}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có thiết bị</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AgencyLayout>
  );
}
