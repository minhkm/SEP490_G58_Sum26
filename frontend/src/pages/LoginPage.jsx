import { useState } from "react";
import { Form, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setApiError("");
    try {
      const response = await authService.login(email, password);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      if (response.user.role === 'Master') {
        navigate("/master-dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError("Đã có lỗi xảy ra khi đăng nhập.");
      }
    }
  };

  return (
    <div className="login-page">
      <img src="/images/image.png" alt="Ship Background" className="login-page-bg" />
      <div className="login-overlay"></div>

      <div className="login-content-wrapper">
        <div className="login-left-content">
          <h1 className="hero-title">Hệ thống quản lí hải trình và hàng hóa tàu vận tải biển</h1>
          <p className="hero-subtitle">Giải pháp tối ưu hóa lộ trình và giám sát trọng tải thời gian thực, đảm bảo an toàn và hiệu suất vượt trội cho đội tàu vận tải biển của bạn.</p>
        </div>

        <div className="login-right-content">
          <div className="login-form-container">
            {/* Header */}
            <div className="login-form-header">
              <div className="login-logo">
                <span className="logo-icon">⚓</span>
                <span className="logo-text">CargoOps</span>
              </div>
              <h2 className="login-form-title">Chào mừng trở lại</h2>
              <p className="login-form-subtitle">
                Vui lòng nhập thông tin để truy cập hệ thống.
              </p>
            </div>

            {apiError && (
              <div className="alert alert-danger" style={{ fontSize: "0.9rem", padding: "10px", marginBottom: "20px", borderRadius: "6px" }}>
                {apiError}
              </div>
            )}

            {/* Form */}
            <Form onSubmit={handleLogin} className="login-form">
              {/* Email Input */}
              <Form.Group className="login-form-group">
                <Form.Label className="login-form-label">Email </Form.Label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </span>
                  <input
                    type="text"
                    placeholder="example@cargoops.com"
                    className="login-form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </Form.Group>

              {/* Password Input */}
              <Form.Group className="login-form-group">
                <div className="password-label-row">
                  <Form.Label className="login-form-label mb-0">Mật khẩu</Form.Label>
                  <a href="#" className="login-forgot-link">Quên mật khẩu?</a>
                </div>
                <div className="input-with-icon password-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="login-form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </Form.Group>

              {/* Remember */}
              <div className="login-form-actions">
                <Form.Check
                  type="checkbox"
                  label="Ghi nhớ đăng nhập"
                  className="login-checkbox"
                  id="remember"
                />
              </div>

              {/* Login Button */}
              <button type="submit" className="login-submit-btn">
                Đăng nhập <span>→</span>
              </button>
            </Form>

            {/* Sign Up Link */}
            <div className="login-signup-section">
              <span className="signup-text">Bạn là Thuyền trưởng mới? </span>
              <a href="#" className="signup-link" onClick={(e) => { e.preventDefault(); navigate("/register"); }}>
                Đăng ký hệ thống tại đây
              </a>
            </div>

            {/* Support Link */}
            <div className="login-support-section">
              <span className="support-text"> </span>
              <a href="#" className="support-link">

              </a>
            </div>

            <button type="button" className="login-back-link" onClick={() => navigate("/")}>
              ← Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>

      <div className="login-footer">
        <span>© 2026 CARGOOPS ENTERPRISE</span>
        <span>HỆ THỐNG CargoOps</span>
        <span>V3.4.1 BUILD-STABLE</span>
      </div>
    </div>
  );
}
