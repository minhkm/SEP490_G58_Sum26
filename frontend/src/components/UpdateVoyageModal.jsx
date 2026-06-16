import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { voyageService } from '../services/api';
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
  const [fetchingCrew, setFetchingCrew] = useState(false);
  const [fetchingCargo, setFetchingCargo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (voyage) {
      setFormData({
        status: voyage.status || 'Planned',
        departureDate: voyage.departureDate || '',
        arrivalDate: voyage.arrivalDate || '',
        isCrewSufficient: voyage.isCrewSufficient || false,
        isCargoLoaded: voyage.isCargoLoaded || false,
        issueReason: voyage.issueReason || ''
      });
      fetchCrew(voyage.id);
      fetchCargo(voyage.id);
    }
  }, [voyage]);

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
        cargoList: cargoList.map(c => ({ itemId: c.itemId, isLoaded: c.isLoaded }))
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
                <option value="Planned">Đã lên kế hoạch (Planned)</option>
                <option value="In Progress">Đang tiến hành (In Progress)</option>
                <option value="Completed">Đã hoàn thành (Completed)</option>
                <option value="Cancelled">Đã hủy (Cancelled)</option>
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
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
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
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={cargo.isLoaded}
                            onChange={(e) => handleCargoLoadChange(cargo.itemId, e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            disabled={!cargo.itemId}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
