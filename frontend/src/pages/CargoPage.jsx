import React, { useState, useEffect } from 'react';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import { 
  Package, 
  Truck, 
  Box, 
  AlertTriangle, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Edit2,
  Trash2,
  X,
  Plus
} from 'lucide-react';
import { cargoService, voyageService } from '../services/api';
import './CargoPage.css';

export default function CargoPage() {
  const [cargos, setCargos] = useState([]);
  const [stats, setStats] = useState({
    totalWeight: 0,
    inTransit: 0,
    remainingCapacityPercent: 0,
    remainingCapacity: 0,
    delayed: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCargo, setSelectedCargo] = useState(null);
  
  // CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [voyages, setVoyages] = useState([]);
  const [formData, setFormData] = useState({
    voyageId: '',
    cargoName: '',
    cargoType: '',
    totalWeight: '',
    status: 'Registered'
  });

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cargoRes, voyageRes] = await Promise.all([
        cargoService.getAllCargos(),
        voyageService.getAll().catch(() => [])
      ]);
      
      if (cargoRes.success) {
        setCargos(cargoRes.data);
        setStats(cargoRes.stats);
        if (cargoRes.data.length > 0 && !selectedCargo) {
          setSelectedCargo(cargoRes.data[0]);
        }
      }
      
      // voyageRes is directly an array from the backend API
      if (Array.isArray(voyageRes)) {
        setVoyages(voyageRes);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (cargo = null) => {
    if (cargo) {
      setEditingId(cargo.id);
      setFormData({
        voyageId: cargo.voyageId || '',
        cargoName: cargo.cargoName || '',
        cargoType: cargo.cargoType || '',
        totalWeight: cargo.totalWeight || '',
        status: cargo.status || 'Registered'
      });
    } else {
      setEditingId(null);
      setFormData({ voyageId: '', cargoName: '', cargoType: '', totalWeight: '', status: 'Registered' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await cargoService.update(editingId, formData);
      } else {
        await cargoService.create(formData);
      }
      closeModal();
      fetchData();
    } catch (err) {
      alert("Có lỗi xảy ra: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xoá lô hàng này? Dữ liệu liên quan cũng sẽ bị xoá.")) {
      try {
        await cargoService.delete(id);
        if (selectedCargo?.id === id) {
          setSelectedCargo(null);
        }
        fetchData();
      } catch (err) {
        alert("Lỗi xoá lô hàng");
      }
    }
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('đang di chuyển') || s.includes('transit')) return 'status-transit';
    if (s.includes('đã xếp') || s.includes('loaded')) return 'status-loaded';
    if (s.includes('chậm trễ') || s.includes('delayed')) return 'status-delayed';
    return 'status-pending';
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <Layout>
      <div className="cargo-page">
        {/* Header */}
        <div className="cargo-header">
          <div className="cargo-title">
            <h1>Quản lý Hàng hóa</h1>
            <p>Tổng quan lô hàng và phân bổ hầm tàu</p>
          </div>
          <button className="btn-add-cargo" onClick={() => openModal()}>
            <Plus size={16} /> Thêm Lô hàng Mới
          </button>
        </div>

        {/* KPI Cards */}
        <div className="cargo-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-title">
              <Package size={16} /> TỔNG KHỐI LƯỢNG
            </div>
            <div className="kpi-card-value">
              {formatNumber(stats.totalWeight)} <span>tấn</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-title">
              <Truck size={16} /> ĐANG VẬN CHUYỂN
            </div>
            <div className="kpi-card-value">
              {formatNumber(stats.inTransit)} <span>lô hàng</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-title">
              <Box size={16} /> DUNG TÍCH HẦM CÒN LẠI
            </div>
            <div className="kpi-card-value">
              {stats.remainingCapacityPercent}% <span>khoảng {formatNumber(stats.remainingCapacity)} tấn</span>
            </div>
            <div className="kpi-progress">
              <div className="kpi-progress-bar" style={{ width: `${100 - stats.remainingCapacityPercent}%` }}></div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-title warning">
              <AlertTriangle size={16} /> CẦN LƯU Ý
            </div>
            <div className="kpi-card-value" style={{ color: '#dc2626' }}>
              {stats.delayed} <span>lô hàng chậm trễ</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="cargo-main-layout">
          {/* List Section */}
          <div className="cargo-list-section">
            <div className="cargo-filters">
              <div className="search-box">
                <Search size={16} color="#94a3b8" />
                <input type="text" placeholder="Tìm ID hoặc tên lô hàng..." />
              </div>
              <button className="filter-btn">Tất cả Loại hàng</button>
              <button className="filter-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Tất cả Trạng thái <Filter size={14} />
              </button>
            </div>

            <div className="cargo-table-container">
              {loading ? (
                <div className="empty-state">Đang tải dữ liệu...</div>
              ) : cargos.length === 0 ? (
                <div className="empty-state">
                  <Package size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                  <h3>Chưa có lô hàng nào</h3>
                  <p>Hệ thống hiện tại chưa có dữ liệu hàng hóa. Vui lòng thêm lô hàng mới.</p>
                </div>
              ) : (
                <table className="cargo-table">
                  <thead>
                    <tr>
                      <th>ID Lô hàng</th>
                      <th>Tên & Loại</th>
                      <th>Khối lượng</th>
                      <th>Hành trình</th>
                      <th>Vị trí hầm</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargos.map((cargo) => (
                      <tr 
                        key={cargo.id} 
                        className={selectedCargo?.id === cargo.id ? 'active-row' : ''}
                        onClick={() => setSelectedCargo(cargo)}
                      >
                        <td className="col-id">C60-{cargo.id}</td>
                        <td>
                          <div className="col-name">{cargo.cargoName || 'Chưa cập nhật'}</div>
                          <div className="col-type">{cargo.cargoType || 'N/A'}</div>
                        </td>
                        <td className="col-weight">{formatNumber(cargo.totalWeight)} T</td>
                        <td>
                          {cargo.Voyage ? (
                            <div className="col-route">
                              {cargo.Voyage.departurePort || '?'} 
                              <span className="route-arrow">→</span> 
                              {cargo.Voyage.destinationPort || '?'}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Chưa xếp lịch</span>
                          )}
                        </td>
                        <td>
                          {cargo.CargoAllocations && cargo.CargoAllocations.length > 0 ? (
                            <div className="col-hold">
                              Hold {cargo.CargoAllocations.map(a => a.CargoHold?.holdName || `#${a.cargoHoldId}`).join(', ')}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Chưa phân bổ</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(cargo.status)}`}>
                            {cargo.status || 'Chờ xử lý'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {cargos.length > 0 && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                <span>Hiển thị 1-{cargos.length} trong số {cargos.length} lô hàng</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-icon"><ChevronLeft size={16} /></button>
                  <button className="btn-icon"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedCargo && (
            <div className="cargo-detail-panel">
              <div className="detail-header">
                <div>
                  <h3>Chi tiết Lô hàng</h3>
                  <span>ID: C60-{selectedCargo.id}</span>
                </div>
                <div className="detail-actions">
                  <button className="btn-icon" onClick={() => openModal(selectedCargo)} title="Sửa lô hàng"><Edit2 size={16} /></button>
                  <button className="btn-icon" onClick={() => handleDelete(selectedCargo.id)} title="Xóa lô hàng"><Trash2 size={16} color="#dc2626" /></button>
                  <button className="btn-icon" onClick={() => setSelectedCargo(null)} title="Đóng"><X size={16} /></button>
                </div>
              </div>

              <div className="detail-body">
                <h4 className="detail-section-title">PHÂN BỔ HẦM TÀU (CARGO ALLOCATION)</h4>
                <div className="allocation-diagram">
                  <div className="ship-holds-container">
                    {/* Render mock holds 1 to 5 to simulate ship diagram */}
                    {[1, 2, 3, 4, 5].map(num => {
                      const isActive = selectedCargo.CargoAllocations?.some(a => 
                        a.CargoHold?.holdName?.includes(num.toString()) || a.CargoHold?.id === num
                      );
                      return (
                        <div key={num} className={`hold-box ${isActive ? 'active' : ''}`}>
                          HOLD {num}
                        </div>
                      );
                    })}
                  </div>
                  <div className="ship-name-label">
                    Tàu: {selectedCargo.Voyage?.Ship?.shipName || 'Chưa xác định'}
                  </div>
                </div>

                <div className="detail-info-grid">
                  <div className="info-item">
                    <label>TÊN HÀNG HÓA</label>
                    <p>{selectedCargo.cargoName || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <label>LOẠI HÀNG</label>
                    <p>{selectedCargo.cargoType || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <label>KHỐI LƯỢNG (NET)</label>
                    <p>{formatNumber(selectedCargo.totalWeight)} Tấn</p>
                  </div>
                </div>

                <h4 className="detail-section-title">THÔNG TIN HÀNH TRÌNH</h4>
                {selectedCargo.Voyage ? (
                  <div className="route-info">
                    <div className="route-point">
                      <p>Cảng đi: {selectedCargo.Voyage.departurePort || 'N/A'}</p>
                      <span>ETD: {selectedCargo.Voyage.departureDate || 'Chưa có'}</span>
                    </div>
                    <div className="route-point">
                      <p>Cảng đến: {selectedCargo.Voyage.destinationPort || 'N/A'}</p>
                      <span>ETA: {selectedCargo.Voyage.arrivalDate || 'Chưa có'}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Lô hàng chưa được xếp vào hải trình nào.</p>
                )}
              </div>

              <div className="detail-footer">
                <button className="btn-outline">Sửa phân bổ</button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Thêm/Sửa */}
        {isModalOpen && (
          <div className="cargo-modal-overlay">
            <div className="cargo-modal-content">
              <div className="cargo-modal-header">
                <h2>{editingId ? 'Cập nhật Lô hàng' : 'Thêm Lô hàng Mới'}</h2>
                <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="cargo-modal-form">
                <div className="form-group">
                  <label>Tên Lô Hàng</label>
                  <input 
                    type="text" 
                    name="cargoName" 
                    value={formData.cargoName} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="VD: Vietnam White Rice..."
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Loại Hàng</label>
                    <input 
                      type="text" 
                      name="cargoType" 
                      value={formData.cargoType} 
                      onChange={handleInputChange} 
                      placeholder="VD: Rice, Coal..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Tổng Khối Lượng (Tấn)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="totalWeight" 
                      value={formData.totalWeight} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Trạng Thái</label>
                    <select name="status" value={formData.status} onChange={handleInputChange}>
                      <option value="Registered">Registered (Đã đăng ký)</option>
                      <option value="Loaded">Loaded (Đã xếp hàng)</option>
                      <option value="InProgress">In Progress (Đang vận chuyển)</option>
                      <option value="Discharged">Discharged (Đã dỡ hàng)</option>
                      <option value="Delayed">Delayed (Chậm trễ)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Hải Trình (Voyage)</label>
                    <select name="voyageId" value={formData.voyageId} onChange={handleInputChange} required>
                      <option value="">-- Chọn Hải Trình --</option>
                      {voyages.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.id} - {v.departurePort || 'N/A'} → {v.destinationPort || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="cargo-modal-actions">
                  <button type="button" className="btn-cancel" onClick={closeModal}>Hủy</button>
                  <button type="submit" className="btn-submit">
                    {editingId ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
