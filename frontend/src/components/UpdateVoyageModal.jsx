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
    }
  }, [voyage]);

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
      await voyageService.updateVoyage(voyage.id, formData);
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

          <div className="form-row two-cols">
            <div className="form-group radio-group">
              <label>Tình trạng nhân sự:</label>
              <div className="radio-options">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isCrewSufficient"
                    checked={formData.isCrewSufficient === true}
                    onChange={() => setFormData({ ...formData, isCrewSufficient: true })}
                  />
                  <span>Đã đủ</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isCrewSufficient"
                    checked={formData.isCrewSufficient === false}
                    onChange={() => setFormData({ ...formData, isCrewSufficient: false })}
                  />
                  <span>Chưa đủ</span>
                </label>
              </div>
            </div>
            
            <div className="form-group radio-group">
              <label>Tình trạng hàng hóa:</label>
              <div className="radio-options">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isCargoLoaded"
                    checked={formData.isCargoLoaded === true}
                    onChange={() => setFormData({ ...formData, isCargoLoaded: true })}
                  />
                  <span>Đã lên đủ</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isCargoLoaded"
                    checked={formData.isCargoLoaded === false}
                    onChange={() => setFormData({ ...formData, isCargoLoaded: false })}
                  />
                  <span>Chưa lên đủ</span>
                </label>
              </div>
            </div>
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
