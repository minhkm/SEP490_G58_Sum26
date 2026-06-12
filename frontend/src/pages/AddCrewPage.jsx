import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Save, Users, ArrowLeft } from 'lucide-react';
import AgencyLayout from '../components/AgencyLayout';
import { crewService } from '../services/api';
import './AddCrewPage.css';

export default function AddCrewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cccd: '',
    department: 'Deck',
    position: '',
    role: 'Sailor',
    status: 'Active',
    password: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      fetchCrew();
    }
  }, [id]);

  const fetchCrew = async () => {
    try {
      const data = await crewService.getById(id);
      setFormData({
        fullName: data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        cccd: data.cccd || '',
        department: data.department || 'Deck',
        position: data.position || '',
        role: data.User?.role || 'Sailor',
        status: data.User?.status || 'Active',
      });
    } catch (error) {
      console.error('Lỗi khi lấy thông tin:', error);
      setErrorMsg('Không thể tải thông tin thủy thủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.fullName) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên và Email.');
      return;
    }

    try {
      if (isEditMode) {
        await crewService.update(id, formData);
        setSuccessMsg('Cập nhật thông tin thủy thủ thành công!');
      } else {
        await crewService.create(formData);
        setSuccessMsg('Thêm thủy thủ mới thành công!');
      }
    } catch (error) {
      console.error('Lỗi lưu thủy thủ:', error);
      setErrorMsg(error.response?.data?.message || 'Có lỗi hệ thống xảy ra khi lưu thông tin thủy thủ.');
    }
  };

  const handleSuccessClose = () => {
    setSuccessMsg('');
    navigate('/crews');
  };

  if (loading) return <AgencyLayout><div style={{ padding: '40px' }}>Đang tải dữ liệu...</div></AgencyLayout>;

  return (
    <AgencyLayout>
      {/* ERROR MODAL */}
      {errorMsg && (
        <div className="v-error-modal-overlay">
          <div className="v-error-modal">
            <div className="v-error-modal-header">
              <div className="v-error-modal-icon">
                <AlertTriangle size={20} />
              </div>
              <h3>Lỗi Cập nhật</h3>
            </div>
            <div className="v-error-modal-body">
              {errorMsg.split('\n').map((line, idx) => (
                <p key={idx} style={{ margin: '0 0 8px 0' }}>{line}</p>
              ))}
            </div>
            <div className="v-error-modal-footer">
              <button type="button" onClick={() => setErrorMsg('')} className="v-btn-error-close">
                Đã hiểu & Sửa lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {successMsg && (
        <div className="v-error-modal-overlay">
          <div className="v-error-modal">
            <div className="v-success-modal-header">
              <div className="v-success-modal-icon">
                <CheckCircle size={20} />
              </div>
              <h3>Thành công</h3>
            </div>
            <div className="v-error-modal-body">
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#0f172a' }}>{successMsg}</p>
            </div>
            <div className="v-error-modal-footer">
              <button type="button" onClick={handleSuccessClose} className="v-btn-success-close">
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="add-crew-layout">
        <header className="add-crew-header">
          <div className="header-left" onClick={() => navigate('/crews')} style={{ cursor: 'pointer' }}>
            <ArrowLeft size={24} color="#64748b" />
            <div className="header-title-box">
              <h1 className="header-title">{isEditMode ? 'Cập nhật Thủy thủ' : 'Thêm Thủy thủ mới'}</h1>
              <span className="header-subtitle">Điền thông tin hồ sơ và tài khoản đăng nhập</span>
            </div>
          </div>
        </header>

        <form className="add-crew-content" onSubmit={handleSubmit}>
          <div className="crew-form-grid">
            
            {/* THÔNG TIN CÁ NHÂN */}
            <div className="crew-card">
              <div className="crew-card-header">
                <Users size={18} />
                <h2>Thông tin Cá nhân</h2>
              </div>
              <div className="crew-card-body">
                <div className="form-group">
                  <label>Họ và Tên *</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="Ví dụ: Nguyễn Văn A" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Hộ chiếu / CCCD</label>
                    <input type="text" name="cccd" value={formData.cccd} onChange={handleChange} placeholder="Mã định danh" />
                  </div>
                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+84..." />
                  </div>
                </div>
              </div>
            </div>

            {/* THÔNG TIN CÔNG VIỆC */}
            <div className="crew-card">
              <div className="crew-card-header">
                <Users size={18} />
                <h2>Phân công Công tác</h2>
              </div>
              <div className="crew-card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Bộ phận</label>
                    <select name="department" value={formData.department} onChange={handleChange}>
                      <option value="Deck">Bộ phận Boong (Deck)</option>
                      <option value="Engine">Bộ phận Máy (Engine)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Chức vụ (Position)</label>
                    <input type="text" name="position" value={formData.position} onChange={handleChange} placeholder="Ví dụ: Máy trưởng" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quyền hệ thống (Role)</label>
                    <select name="role" value={formData.role} onChange={handleChange}>
                      <option value="Master">Thuyền trưởng (Master)</option>
                      <option value="ChiefOfficer">Đại phó (Chief Officer)</option>
                      <option value="DeckOfficer">Sĩ quan boong (Deck Officer)</option>
                      <option value="EngineOfficer">Sĩ quan máy (Engine Officer)</option>
                      <option value="Sailor">Thủy thủ (Sailor)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Trạng thái</label>
                    <select name="status" value={formData.status} onChange={handleChange}>
                      <option value="Active">Đang công tác (Active)</option>
                      <option value="Inactive">Tạm nghỉ (Inactive)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* TÀI KHOẢN ĐĂNG NHẬP */}
            <div className="crew-card">
              <div className="crew-card-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
                <AlertTriangle size={18} color="#dc2626" />
                <h2 style={{ color: '#991b1b' }}>Tài khoản Đăng nhập</h2>
              </div>
              <div className="crew-card-body">
                <div className="form-group">
                  <label>Email (Tên đăng nhập) *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="abc@cargoops.vn" disabled={isEditMode} style={{ backgroundColor: isEditMode ? '#f1f5f9' : 'white' }} />
                </div>
                {isEditMode ? (
                  <div className="form-group">
                    <label>Mật khẩu mới (Bỏ trống nếu không đổi)</label>
                    <input type="text" name="password" value={formData.password || ''} onChange={handleChange} placeholder="Tự nhập mật khẩu" />
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginTop: '8px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
                      <strong>Bảo mật tài khoản:</strong> Mật khẩu sẽ được hệ thống tự động sinh ngẫu nhiên (chống đoán ngược) và gửi trực tiếp về địa chỉ Email trên.<br/>
                      Thủy thủ sẽ <strong>bắt buộc phải đổi mật khẩu</strong> ở lần đăng nhập đầu tiên vào hệ thống.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="crew-bottom-bar">
            <button type="button" className="c-btn-cancel" onClick={() => navigate('/crews')}>Hủy bỏ</button>
            <button type="submit" className="c-btn-save">
              <Save size={18} />
              {isEditMode ? 'Lưu thay đổi' : 'Khởi tạo Thủy thủ'}
            </button>
          </div>
        </form>
      </div>
    </AgencyLayout>
  );
}
