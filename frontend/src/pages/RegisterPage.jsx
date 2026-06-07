import { useState } from "react";
import { Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { authService } from "../services/api";
import "./RegisterPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    certificate: "",
    issueDate: "",
    expiryDate: "",
    idNumber: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (apiError) setApiError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate phone (10 digits, starts with 0)
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0";
    }

    // Validate CCCD (exactly 12 digits)
    const cccdRegex = /^\d{12}$/;
    if (!cccdRegex.test(formData.idNumber)) {
      newErrors.idNumber = "Số CCCD phải gồm đúng 12 chữ số";
    }

    // Match password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await authService.register(formData);
      
      Swal.fire({
        icon: 'success',
        title: 'Hoàn tất đăng ký!',
        text: 'Tài khoản Thuyền trưởng của bạn đã được tạo thành công. Vui lòng đăng nhập để bắt đầu sử dụng hệ thống.',
        confirmButtonText: 'Đến trang Đăng nhập',
        confirmButtonColor: '#0d2342',
        allowOutsideClick: false
      }).then(() => {
        navigate("/login");
      });
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError("Đã có lỗi xảy ra. Vui lòng thử lại sau.");
      }
    }
  };

  return (
    <div className="register-page">
      <img src="/images/image.png" alt="Ship Background" className="register-page-bg" />
      <div className="register-overlay"></div>

      <div className="register-content-wrapper">
        <div className="register-form-container">
          {/* Header */}
          <div className="register-form-header">
            <div className="register-logo">
              <span className="logo-icon">⚓</span>
              <span className="logo-text">CargoOps</span>
            </div>
            <h2 className="register-form-title">Đăng ký tài khoản Thuyền trưởng</h2>
            <p className="register-form-subtitle">
              Cung cấp thông tin để thiết lập quyền quản trị cao nhất cho tàu của bạn.
            </p>
          </div>

          {apiError && (
            <div className="alert alert-danger" style={{ fontSize: "0.9rem", padding: "10px", marginBottom: "20px", borderRadius: "6px" }}>
              {apiError}
            </div>
          )}

          {/* Form */}
          <Form onSubmit={handleRegister} className="register-form">
            <div className="form-row">
              <Form.Group className="register-form-group col-half">
                <Form.Label className="register-form-label">Họ và tên</Form.Label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </span>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Nhập họ và tên"
                    className="register-form-input"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Form.Group>

              <Form.Group className="register-form-group col-half">
                <Form.Label className="register-form-label">Email </Form.Label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </span>
                  <input
                    type="email"
                    name="email"
                    placeholder="email@company.com"
                    className="register-form-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Form.Group>
            </div>

            <div className="form-row">
              <Form.Group className="register-form-group col-half">
                <Form.Label className="register-form-label">Số điện thoại</Form.Label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </span>
                  <input
                    type="text"
                    name="phone"
                    placeholder="0912345678"
                    className={`register-form-input ${errors.phone ? 'is-invalid' : ''}`}
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
                {errors.phone && <div className="register-error-text">{errors.phone}</div>}
              </Form.Group>

              <Form.Group className="register-form-group half-width">
                <Form.Label className="register-form-label">Mã bằng Thuyền trưởng</Form.Label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10.08 10.08 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </span>
                  <input
                    type="text"
                    name="certificate"
                    placeholder="NHẬP MÃ CHỨNG CHỈ"
                    className="register-form-input"
                    value={formData.certificate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Form.Group>
            </div>

            <div className="form-row">
              <Form.Group className="register-form-group half-width">
                <Form.Label className="register-form-label">Ngày cấp Bằng</Form.Label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </span>
                  <input
                    type="date"
                    name="issueDate"
                    className="register-form-input"
                    value={formData.issueDate}
                    onChange={handleChange}
                  />
                </div>
              </Form.Group>

              <Form.Group className="register-form-group half-width">
                <Form.Label className="register-form-label">Ngày hết hạn Bằng</Form.Label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </span>
                  <input
                    type="date"
                    name="expiryDate"
                    className="register-form-input"
                    value={formData.expiryDate}
                    onChange={handleChange}
                  />
                </div>
              </Form.Group>
            </div>

            <Form.Group className="register-form-group">
              <Form.Label className="register-form-label">Số CCCD</Form.Label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </span>
                <input
                  type="text"
                  name="idNumber"
                  placeholder="Nhập 12 số CCCD"
                  className={`register-form-input ${errors.idNumber ? 'is-invalid' : ''}`}
                  value={formData.idNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              {errors.idNumber && <div className="register-error-text">{errors.idNumber}</div>}
            </Form.Group>

            <div className="form-row">
              <Form.Group className="register-form-group col-half">
                <Form.Label className="register-form-label">Mật khẩu</Form.Label>
                <div className="input-with-icon password-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    className="register-form-input"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Form.Group>

              <Form.Group className="register-form-group col-half">
                <Form.Label className="register-form-label">Xác nhận mật khẩu</Form.Label>
                <div className="input-with-icon password-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="••••••••"
                    className={`register-form-input ${errors.confirmPassword ? 'is-invalid' : ''}`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <div className="register-error-text">{errors.confirmPassword}</div>}
              </Form.Group>
            </div>

            <div className="register-form-actions">
              <Form.Check
                type="checkbox"
                label="Tôi đồng ý với các điều khoản bảo mật ngành hàng hải."
                className="register-checkbox"
                id="agree"
                name="agree"
                checked={formData.agree}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="register-submit-btn">
              Đăng ký ngay <span>→</span>
            </button>
          </Form>

          <div className="register-footer-links">
            <div className="login-signup-section">
              <span className="signup-text">Đã có tài khoản? </span>
              <a href="#" className="signup-link" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>
                Đăng nhập tại đây
              </a>
            </div>

            <div className="login-support-section" style={{ marginTop: "8px", color: "#888", fontSize: "0.85rem" }}>
              <span>🎧 Liên hệ bộ phận IT nếu cần hỗ trợ.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
