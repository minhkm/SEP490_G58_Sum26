import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  Ship,
  Edit
} from 'lucide-react';
import MasterLayout from '../components/MasterLayout';
import AgencyLayout from '../components/AgencyLayout';
import UpdateVoyageModal from '../components/UpdateVoyageModal';
import { voyageService } from '../services/api';
import './MasterDashboard.css';
import './VoyageListPage.css';

const formatDate = (date) => {
  if (!date) return '--';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(`${date}T00:00:00`));
};

const getStatusClass = (status) => {
  const normalizedStatus = (status || '').toLowerCase();

  if (normalizedStatus === 'completed') return 'completed';
  if (normalizedStatus === 'in progress' || normalizedStatus === 'active') return 'active';
  if (normalizedStatus === 'cancelled') return 'cancelled';
  return 'planned';
};

export default function VoyageListPage() {
  const navigate = useNavigate();
  const [voyages, setVoyages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVoyage, setSelectedVoyage] = useState(null);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const Layout = (user.role === 'Admin' || user.role === 'Agency') ? AgencyLayout : MasterLayout;

  const loadVoyages = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await voyageService.getAll();
      setVoyages(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error('Unable to load voyages:', requestError);
      setError('Không thể tải danh sách hải trình. Vui lòng kiểm tra kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVoyages();
  }, []);

  const filteredVoyages = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return voyages;

    return voyages.filter((voyage) => [
      voyage.id,
      voyage.departurePort,
      voyage.destinationPort,
      voyage.status,
      voyage.Ship?.shipName,
      voyage.Ship?.imoNumber
    ].some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [searchTerm, voyages]);

  return (
    <Layout>
      <div className="voyage-list-page">
        <header className="voyage-list-header">
          <div>
            <div className="v-breadcrumb">
              <Navigation size={12} />
              Voyages
            </div>
            <h1>Danh sách hải trình</h1>
          </div>

          <button className="btn-primary" onClick={() => navigate('/voyages/new')}>
            <Plus size={16} />
            Tạo hải trình
          </button>
        </header>

        <div className="voyage-list-content">
          <div className="voyage-summary">
            <div>
              <span>TỔNG SỐ HẢI TRÌNH</span>
              <strong>{voyages.length}</strong>
            </div>
            <div>
              <span>ĐANG HOẠT ĐỘNG</span>
              <strong>
                {voyages.filter((voyage) => ['active', 'in progress'].includes((voyage.status || '').toLowerCase())).length}
              </strong>
            </div>
            <div>
              <span>ĐÃ LÊN KẾ HOẠCH</span>
              <strong>
                {voyages.filter((voyage) => (voyage.status || '').toLowerCase() === 'planned').length}
              </strong>
            </div>
          </div>

          <section className="voyage-list-card">
            <div className="voyage-list-toolbar">
              <div>
                <h2>Tất cả hải trình</h2>
                <p>Dữ liệu hành trình được lấy trực tiếp từ hệ thống.</p>
              </div>

              <div className="voyage-toolbar-actions">
                <div className="voyage-search">
                  <Search size={17} />
                  <input
                    type="text"
                    placeholder="Tìm tàu, cảng, mã chuyến..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <button className="voyage-refresh-button" onClick={loadVoyages} disabled={loading} title="Tải lại">
                  <RefreshCw size={17} className={loading ? 'spin' : ''} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="voyage-state">
                <RefreshCw size={28} className="spin" />
                <p>Đang tải danh sách hải trình...</p>
              </div>
            ) : error ? (
              <div className="voyage-state voyage-error">
                <AlertCircle size={30} />
                <p>{error}</p>
                <button onClick={loadVoyages}>Thử lại</button>
              </div>
            ) : filteredVoyages.length === 0 ? (
              <div className="voyage-state">
                <Navigation size={34} />
                <h3>{searchTerm ? 'Không tìm thấy hải trình phù hợp' : 'Chưa có hải trình nào'}</h3>
                <p>{searchTerm ? 'Hãy thử một từ khóa khác.' : 'Tạo hải trình đầu tiên để bắt đầu quản lý hành trình.'}</p>
                {!searchTerm && (
                  <button className="btn-primary" onClick={() => navigate('/voyages/new')}>
                    <Plus size={16} />
                    Tạo hải trình
                  </button>
                )}
              </div>
            ) : (
              <div className="voyage-table-wrapper">
                <table className="voyage-table">
                  <thead>
                    <tr>
                      <th>Mã chuyến</th>
                      <th>Tàu vận chuyển</th>
                      <th>Tuyến đường</th>
                      <th>Khởi hành</th>
                      <th>Dự kiến đến</th>
                      <th>Trạng thái</th>
                      {['Admin', 'Agency', 'ChiefOfficer'].includes(user.role) && <th>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVoyages.map((voyage) => (
                      <tr key={voyage.id}>
                        <td><strong>VY-{String(voyage.id).padStart(4, '0')}</strong></td>
                        <td>
                          <div className="voyage-ship-cell">
                            <span><Ship size={16} /></span>
                            <div>
                              <strong>{voyage.Ship?.shipName || `Tàu #${voyage.shipId}`}</strong>
                              <small>{voyage.Ship?.imoNumber || 'Chưa có IMO'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="voyage-route-cell">
                            <span>{voyage.departurePort || '--'}</span>
                            <ArrowRight size={14} />
                            <span>{voyage.destinationPort || '--'}</span>
                          </div>
                        </td>
                        <td><span className="voyage-date"><CalendarDays size={14} />{formatDate(voyage.departureDate)}</span></td>
                        <td><span className="voyage-date"><CalendarDays size={14} />{formatDate(voyage.arrivalDate)}</span></td>
                        <td>
                          <span className={`voyage-status ${getStatusClass(voyage.status)}`}>
                            {voyage.status || 'Planned'}
                          </span>
                        </td>
                        {['Admin', 'Agency', 'ChiefOfficer'].includes(user.role) && (
                          <td>
                            <button
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                              title="Cập nhật thông tin chuyến đi"
                              onClick={() => setSelectedVoyage(voyage)}
                            >
                              <Edit size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
      {selectedVoyage && (
        <UpdateVoyageModal
          voyage={selectedVoyage}
          onClose={() => setSelectedVoyage(null)}
          onUpdate={loadVoyages}
        />
      )}
    </Layout>
  );
}
