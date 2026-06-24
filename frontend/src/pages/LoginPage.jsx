import { useState } from "react";
import { Form, Input, Button, Checkbox, Alert, Modal } from "antd";
import { MailOutlined, LockOutlined, ArrowRightOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import { getDashboardPath } from "../config/roles";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePassError, setChangePassError] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");

  const [changePassForm] = Form.useForm();

  const handleLogin = async (values) => {
    const { email, password } = values;
    setApiError("");
    setSubmitting(true);
    try {
      const response = await authService.login(email, password);

      if (response.requirePasswordChange) {
        setTempUser(response);
        setLoginEmail(email);
        setShowChangePasswordModal(true);
        return;
      }

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      navigate(getDashboardPath(response.user.role));
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError("Đã có lỗi xảy ra khi đăng nhập.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (values) => {
    const { newPassword, confirmPassword } = values;
    setChangePassError("");

    if (newPassword !== confirmPassword) {
      setChangePassError("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (newPassword.length < 6) {
      setChangePassError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setChangingPass(true);
    try {
      await authService.changeFirstPassword(loginEmail, newPassword);

      // Thành công -> Lưu token và chuyển hướng
      localStorage.setItem("token", tempUser.token);
      localStorage.setItem("user", JSON.stringify(tempUser.user));

      navigate(getDashboardPath(tempUser.user.role));
    } catch (error) {
      setChangePassError(error.response?.data?.message || "Lỗi đổi mật khẩu.");
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="login-page">
      {/* FORCE CHANGE PASSWORD MODAL */}
      <Modal
        open={showChangePasswordModal}
        title="Bảo mật Tài khoản"
        footer={null}
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
      >
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
          Đây là lần đăng nhập đầu tiên. Bạn bắt buộc phải đổi mật khẩu để tiếp tục sử dụng hệ thống.
        </p>
        {changePassError && (
          <Alert type="error" message={changePassError} showIcon style={{ marginBottom: 16 }} />
        )}
        <Form form={changePassForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="newPassword"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới." },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự." },
            ]}
          >
            <Input.Password placeholder="Mật khẩu mới (ít nhất 6 ký tự)" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            rules={[{ required: true, message: "Vui lòng xác nhận mật khẩu." }]}
          >
            <Input.Password placeholder="Xác nhận mật khẩu mới" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={changingPass}>
            Đổi mật khẩu & Đăng nhập
          </Button>
        </Form>
      </Modal>

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
              <Alert type="error" message={apiError} showIcon style={{ marginBottom: 20 }} />
            )}

            {/* Form */}
            <Form layout="vertical" onFinish={handleLogin} requiredMark={false} initialValues={{ remember: true }}>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ required: true, message: "Vui lòng nhập email." }]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="example@cargoops.com"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="Mật khẩu"
                name="password"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu." }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="••••••••"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>Ghi nhớ đăng nhập</Checkbox>
                  </Form.Item>
                  <a href="#" className="login-forgot-link">Quên mật khẩu?</a>
                </div>
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={submitting}
                icon={<ArrowRightOutlined />}
              >
                Đăng nhập
              </Button>
            </Form>

            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/")}
              style={{ marginTop: 16, paddingLeft: 0 }}
            >
              Quay lại trang chủ
            </Button>
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
