import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import {
  Package,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  Plus
} from 'lucide-react';
import { cargoService } from '../services/api';
import Swal from 'sweetalert2';
import './CargoPage.css';

export default function CargoPage() {
  const navigate = useNavigate();
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;
  // Chỉ Admin được chỉnh sửa/xoá; thuyền trưởng (Master) & thuyền phó (ChiefOfficer) chỉ được xem
  const canEdit = user.role === 'Admin';

  const fetchData = async () => {
    try {
      const cargoRes = await cargoService.getAllCargos();
      if (cargoRes.success) {
        setCargos(cargoRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (cargo) => {
    const result = await Swal.fire({
      title: 'Xoá lô hàng?',
      html: `Bạn có chắc chắn muốn xoá lô hàng <b>${cargo.cargoName || `C60-${cargo.id}`}</b>?<br/>Dữ liệu liên quan cũng sẽ bị xoá.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;
    try {
      await cargoService.delete(cargo.id);
      await fetchData();
      Swal.fire({ icon: 'success', title: 'Đã xoá', text: 'Lô hàng đã được xoá thành công.', timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire('Lỗi', 'Không thể xoá lô hàng.', 'error');
    }
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('discharg') || s.includes('delivered') || s.includes('đã giao') || s.includes('đã dỡ')) return 'status-discharged';
    if (s.includes('transit') || s.includes('progress') || s.includes('underway') || s.includes('đang di chuyển')) return 'status-transit';
    if (s.includes('loaded') || s.includes('đã xếp')) return 'status-loaded';
    if (s.includes('delayed') || s.includes('chậm trễ')) return 'status-delayed';
    if (s.includes('registered') || s.includes('đăng ký')) return 'status-registered';
    return 'status-pending';
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '—';
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
          <button className="btn-add-cargo" onClick={() => navigate('/cargos/new')}>
            <Plus size={16} /> Thêm Lô hàng Mới
          </button>
        </div>

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
                    <th>Tên &amp; Loại</th>
                    <th>Khối lượng</th>
                    <th>Thể tích</th>
                    <th>Hành trình</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {cargos.map((cargo) => (
                    <tr
                      key={cargo.id}
                      onClick={() => navigate(`/cargos/view/${cargo.id}`)}
                    >
                      <td className="col-id">C60-{cargo.id}</td>
                      <td>
                        <div className="cargo-name-cell">
                          <span className="cargo-name-icon"><Package size={16} /></span>
                          <div>
                            <div className="col-name">{cargo.cargoName || 'Chưa cập nhật'}</div>
                            <div className="col-type">{cargo.cargoType || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="col-weight">{formatNumber(cargo.totalWeight)} T</td>
                      <td className="col-weight">{formatNumber(cargo.totalVolume)} m³</td>
                      <td>
                        {cargo.Voyage ? (
                          <div className="col-route">
                            {cargo.Voyage.departurePort || '?'}
                            <span className="route-arrow">→</span>
                            {cargo.Voyage.destinationPort || '?'}
                          </div>
                        ) : (
                          <span className="text-muted">Chưa xếp lịch</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(cargo.status)}`}>
                          {cargo.status || 'Chờ xử lý'}
                        </span>
                      </td>
                      <td className="col-actions">
                        <button
                          className="cargo-action-btn act-view"
                          title="Xem chi tiết"
                          onClick={(e) => { e.stopPropagation(); navigate(`/cargos/view/${cargo.id}`); }}
                        >
                          <Eye size={18} />
                        </button>
                        {canEdit && !cargo.Voyage && (
                          <>
                            <button
                              className="cargo-action-btn act-edit"
                              title="Chỉnh sửa"
                              onClick={(e) => { e.stopPropagation(); navigate(`/cargos/edit/${cargo.id}`); }}
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              className="cargo-action-btn act-delete"
                              title="Xóa lô hàng"
                              onClick={(e) => { e.stopPropagation(); handleDelete(cargo); }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                        {canEdit && cargo.Voyage && (
                          <span className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }} title="Lô hàng đã thuộc hải trình nên không thể sửa/xoá">
                            Đã khoá
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {cargos.length > 0 && (
            <div className="cargo-pagination">
              <span>Hiển thị 1-{cargos.length} trong số {cargos.length} lô hàng</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-icon"><ChevronLeft size={16} /></button>
                <button className="btn-icon"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
