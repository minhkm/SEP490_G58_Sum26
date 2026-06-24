import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { voyageService, vesselService } from '../services/api';
import './UpdateVoyageModal.css';

export default function UpdateVoyageModal({ voyage, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    status: '',
    departureDate: '',
    arrivalDate: '',
    isCrewSufficient: false,
    isCargoLoaded: false,
    issueReason: ''
  });
  const [crewList, setCrewList] = useState([]);
  const [cargoList, setCargoList] = useState([]);
  const [originalCargoList, setOriginalCargoList] = useState([]);
  const [fetchingCrew, setFetchingCrew] = useState(false);
  const [fetchingCargo, setFetchingCargo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [holds, setHolds] = useState([]);
  const [fetchingHolds, setFetchingHolds] = useState(false);

  useEffect(() => {
    if (voyage) {
      setFormData({
        status: voyage.status || 'Planning',
        departureDate: voyage.departureDate || '',
        arrivalDate: voyage.arrivalDate || '',
        isCrewSufficient: voyage.isCrewSufficient || false,
        isCargoLoaded: voyage.isCargoLoaded || false,
        issueReason: voyage.issueReason || ''
      });
      fetchCrew(voyage.id);
      fetchCargo(voyage.id);
      fetchHolds(voyage.shipId);
    }
  }, [voyage]);

  const fetchHolds = async (shipId) => {
    if (!shipId) return;
    try {
      setFetchingHolds(true);
      const ship = await vesselService.getById(shipId);
      setHolds(ship.CargoHolds || []);
    } catch (err) {
      console.error('Failed to fetch holds:', err);
    } finally {
      setFetchingHolds(false);
    }
  };

  const fetchCrew = async (id) => {
    try {
      setFetchingCrew(true);
      const data = await voyageService.getVoyageCrew(id);
      setCrewList(data || []);
    } catch (err) {
      console.error('Failed to fetch crew:', err);
    } finally {
      setFetchingCrew(false);
    }
  };

  const fetchCargo = async (id) => {
    try {
      setFetchingCargo(true);
      const data = await voyageService.getVoyageCargo(id);
      setCargoList(data || []);
      setOriginalCargoList(JSON.parse(JSON.stringify(data || [])));
    } catch (err) {
      console.error('Failed to fetch cargo:', err);
    } finally {
      setFetchingCargo(false);
    }
  };

  const handleAttendanceChange = (crewId, isPresent) => {
    setCrewList(prevList => 
      prevList.map(crew => 
        crew.crewId === crewId ? { ...crew, isPresent } : crew
      )
    );
  };

  const handleCargoLoadChange = (itemId, isLoaded) => {
    setCargoList(prevList =>
      prevList.map(cargo =>
        cargo.itemId === itemId ? { ...cargo, isLoaded } : cargo
      )
    );
  };

  const handleCargoHoldChange = (itemId, holdId) => {
    setCargoList(prevList =>
      prevList.map(cargo =>
        cargo.itemId === itemId ? { ...cargo, holdId } : cargo
      )
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      const payload = {
        ...formData,
        attendanceList: crewList.map(c => ({ crewId: c.crewId, isPresent: c.isPresent })),
        cargoList: cargoList.map(c => ({ itemId: c.itemId, isLoaded: c.isLoaded, holdId: c.holdId, weight: c.weight }))
      };

      await voyageService.updateVoyage(voyage.id, payload);
      onUpdate(); // refresh list
      onClose(); // close modal
    } catch (err) {
      console.error('Failed to update voyage:', err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật chuyến đi.');
    } finally {
      setLoading(false);
    }
  };

  if (!voyage) return null;

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userRole = (user.role || '').replace(/\s+/g, '').toLowerCase();
  
  const isShipStaff = userRole === 'chiefofficer' || userRole === 'master';
  const isAttendanceAllowed = (formData.status === 'Loaded' || formData.status === 'Discharged') && isShipStaff;
  const isCargoLoadAllowed = formData.status === 'Loading' && isShipStaff;

  const STATUS_OPTIONS = [
    { value: 'Planning', label: 'Đang lên kế hoạch (Planning)', roles: ['admin', 'agency'] },
    { value: 'Loading', label: 'Đang làm hàng (Loading)', roles: ['master'] },
    { value: 'Loaded', label: 'Đã làm hàng xong (Loaded)', roles: ['master'] },
    { value: 'Underway', label: 'Đang di chuyển (Underway)', roles: ['master'] },
    { value: 'Arrived', label: 'Cập bến (Arrived)', roles: ['master'] },
    { value: 'Discharge', label: 'Dỡ hàng (Discharge)', roles: ['master'] },
    { value: 'Discharged', label: 'Đã dỡ hàng xong (Discharged)', roles: ['master'] },
    { value: 'Homeward Bounding', label: 'Đang quay về cảng xuất phát (Homeward Bounding)', roles: ['master'] },
    { value: 'At Anchor', label: 'Đang neo đậu (At Anchor)', roles: ['master'] },
    { value: 'Completed', label: 'Đã hoàn thành (Completed)', roles: ['admin', 'agency'] },
    { value: 'Cancelled', label: 'Đã hủy (Cancelled)', roles: ['admin', 'agency', 'master'] }
  ];

  const allowedStatusOptions = STATUS_OPTIONS.filter(opt => 
    opt.roles.includes(userRole) || opt.value === voyage.status
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content update-voyage-modal">
        <header className="modal-header">
          <h2>Cập nhật chuyến đi VY-{String(voyage.id).padStart(4, '0')}</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        {error && (
          <div className="error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="update-voyage-form">
          <div className="form-row">
            <div className="form-group">
              <label>Trạng thái</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                {allowedStatusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row two-cols">
            <div className="form-group">
              <label>Ngày đi dự kiến/thực tế</label>
              <input
                type="date"
                name="departureDate"
                value={formData.departureDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Ngày đến dự kiến/thực tế</label>
              <input
                type="date"
                name="arrivalDate"
                value={formData.arrivalDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Danh sách điểm danh thuyền viên:</label>
            {fetchingCrew ? (
              <p className="loading-text" style={{ fontSize: '0.85rem', color: '#64748b' }}>Đang tải danh sách thuyền viên...</p>
            ) : crewList.length === 0 ? (
              <p className="empty-text" style={{ fontSize: '0.85rem', color: '#64748b' }}>Chưa có thuyền viên nào được phân công.</p>
            ) : (
              <div className="crew-attendance-table-wrapper">
                <table className="crew-attendance-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Họ và tên</th>
                      <th>Chức vụ</th>
                      <th style={{ textAlign: 'center' }}>Có mặt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crewList.map((crew, idx) => (
                      <tr key={crew.crewId}>
                        <td>{idx + 1}</td>
                        <td>{crew.fullName}</td>
                        <td>{crew.position}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={crew.isPresent}
                            onChange={(e) => handleAttendanceChange(crew.crewId, e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: isAttendanceAllowed ? 'pointer' : 'not-allowed' }}
                            disabled={!isAttendanceAllowed}
                            title={!isAttendanceAllowed ? 'Chỉ được điểm danh khi trạng thái là Loaded hoặc Discharged và bạn là thuyền trưởng' : ''}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            
          <div className="form-group">
            <label>Danh sách kiểm tra hàng hóa:</label>
            {fetchingCargo ? (
              <p className="loading-text" style={{ fontSize: '0.85rem', color: '#64748b' }}>Đang tải danh sách hàng hóa...</p>
            ) : cargoList.length === 0 ? (
              <p className="empty-text" style={{ fontSize: '0.85rem', color: '#64748b' }}>Chưa có hàng hóa nào được đăng ký cho chuyến đi này.</p>
            ) : (
              <div className="crew-attendance-table-wrapper">
                <table className="crew-attendance-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Lô hàng</th>
                      <th>Chi tiết / Quy cách</th>
                      <th>Số lượng</th>
                      <th>Khối lượng</th>
                      <th>Chọn khoang</th>
                      <th style={{ textAlign: 'center' }}>Đã lên tàu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargoList.map((cargo, idx) => (
                      <tr key={cargo.itemId || idx}>
                        <td>{idx + 1}</td>
                        <td>{cargo.cargoName}</td>
                        <td>{cargo.itemName}</td>
                        <td>{cargo.quantity}</td>
                        <td>{cargo.weight} MT</td>
                        <td>
                          <select 
                            value={cargo.holdId || ''} 
                            onChange={(e) => handleCargoHoldChange(cargo.itemId, e.target.value)}
                            disabled={!isCargoLoadAllowed}
                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="">-- Chọn --</option>
                            {holds.map(h => (
                              <option key={h.id} value={h.id}>{h.holdName}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={cargo.isLoaded}
                            onChange={(e) => handleCargoLoadChange(cargo.itemId, e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: isCargoLoadAllowed ? 'pointer' : 'not-allowed' }}
                            disabled={!cargo.itemId || !isCargoLoadAllowed}
                            title={!isCargoLoadAllowed ? 'Chỉ được đánh dấu hàng lên tàu khi Trạng thái chuyến đi đang là Loading (Đang làm hàng)' : ''}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>Bản đồ hầm hàng (Stowage Plan):</label>
            {fetchingHolds ? (
              <p className="loading-text" style={{ fontSize: '0.85rem', color: '#64748b' }}>Đang tải sơ đồ hầm hàng...</p>
            ) : holds.length === 0 ? (
              <p className="empty-text" style={{ fontSize: '0.85rem', color: '#64748b' }}>Tàu chưa được cấu hình hầm hàng.</p>
            ) : (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
                {holds.map(hold => {
                  const maxCap = hold.maxCapacity || 0;
                  
                  // Calculate simulated usage
                  let simulatedUsage = hold.currentUsage || 0;
                  cargoList.forEach(c => {
                    const orig = originalCargoList.find(o => o.itemId === c.itemId);
                    if ((!orig || !orig.isLoaded) && c.isLoaded && String(c.holdId) === String(hold.id)) {
                      simulatedUsage += c.weight;
                    }
                    if (orig && orig.isLoaded && String(orig.holdId) === String(hold.id) && !c.isLoaded) {
                      simulatedUsage -= c.weight;
                    }
                    if (orig && orig.isLoaded && String(orig.holdId) === String(hold.id) && c.isLoaded && String(c.holdId) !== String(hold.id)) {
                      simulatedUsage -= c.weight;
                    }
                    if (orig && orig.isLoaded && String(orig.holdId) !== String(hold.id) && c.isLoaded && String(c.holdId) === String(hold.id)) {
                      simulatedUsage += c.weight;
                    }
                  });
                  if (simulatedUsage < 0) simulatedUsage = 0;

                  const percentage = maxCap > 0 ? (simulatedUsage / maxCap) * 100 : 0;
                  
                  let progressColor = '#22c55e'; // green
                  if (percentage > 90) progressColor = '#ef4444'; // red
                  else if (percentage > 70) progressColor = '#eab308'; // yellow

                  return (
                    <div key={hold.id} style={{
                      flex: '1 1 calc(50% - 16px)',
                      minWidth: '200px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px',
                      backgroundColor: '#f8fafc'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '500' }}>
                        <span>{hold.holdName}</span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {simulatedUsage.toLocaleString('en-US')} / {maxCap.toLocaleString('en-US')} MT
                        </span>
                      </div>
                      <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(percentage, 100)}%`,
                          height: '100%',
                          backgroundColor: progressColor,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', marginTop: '4px', color: '#64748b' }}>
                        {percentage.toFixed(1)}% đầy
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(!formData.isCrewSufficient || !formData.isCargoLoaded) && (
            <div className="form-group">
              <label>Nguyên nhân thiếu sót (Nếu có)</label>
              <textarea
                name="issueReason"
                rows="3"
                placeholder="Nhập lý do tại sao chưa đủ nhân sự hoặc hàng hóa..."
                value={formData.issueReason}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Save size={16} />
              {loading ? 'Đang lưu...' : 'Lưu cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
