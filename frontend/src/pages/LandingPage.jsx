import { Navbar, Container, Nav, Button, Row, Col, Card } from "react-bootstrap";
import "./LandingPage.css";

// Trang chào CargoOps — React Bootstrap (+ ít CSS riêng cho hero & dashboard mock).
// onEnterSystem: hàm chạy khi bấm đăng nhập. Khi có react-router: () => navigate("/login")
export default function LandingPage({ onEnterSystem }) {
  const goLogin = onEnterSystem || (() => (window.location.href = "/login"));

  return (
    <div className="lp">
      {/* ---------- Header ---------- */}
      <Navbar expand="lg" variant="dark" className="lp-nav py-3" fixed="top">
        <Container>
          <Navbar.Brand href="/" className="lp-brand d-flex align-items-center gap-2">
            <ShipIcon />
            <span>CargoOps</span>
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="light" size="sm" className="fw-semibold" onClick={goLogin}>
              Đăng nhập
            </Button>
          </Nav>
        </Container>
      </Navbar>

      {/* ---------- Hero ---------- */}
      <section className="lp-hero text-center text-white">
        <div className="lp-hero__overlay" />
        <Container className="lp-hero__inner">
          <span className="lp-badge">Hệ thống Quản lý Nội bộ</span>
          <h1 className="lp-hero__title">
            Số hóa vận hành tàu biển với <span className="lp-accent">CargoOps</span>
          </h1>
          <p className="lp-hero__subtitle mx-auto">
            Nền tảng toàn diện quản lý hàng hóa thương mại, số hóa ca trực và theo dõi nhân sự —
            thiết kế chuyên biệt cho Thuyền trưởng và thủy thủ đoàn để đảm bảo vận hành chính xác 24/7.
          </p>
          <Button variant="light" size="lg" className="lp-cta-btn fw-semibold" onClick={goLogin}>
            Đăng nhập Hệ thống <span className="lp-arrow">→</span>
          </Button>
        </Container>
      </section>

      {/* ---------- Giải pháp ---------- */}
      <section className="lp-section">
        <Container>
          <div className="text-center mx-auto mb-5" style={{ maxWidth: 640 }}>
            <h2 className="lp-h2 fw-bold mb-3">Giải pháp Vận hành Toàn diện</h2>
            <p className="lp-muted">Hệ thống lõi số hóa quy trình từ boong tàu đến buồng máy.</p>
          </div>
          <Row className="g-4">
            {FEATURES.map((f) => (
              <Col md={4} key={f.title}>
                <Card className="lp-feature h-100 border-0">
                  <Card.Body className="p-4">
                    <div className="lp-icon mb-3">{f.icon}</div>
                    <Card.Title className="lp-card-title fw-bold">{f.title}</Card.Title>
                    <Card.Text className="lp-muted">{f.desc}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ---------- Dashboard theo vai trò ---------- */}
      <section className="lp-roles-section">
        <Container>
          <Row className="align-items-center g-5">
            <Col lg={6}>
              <h2 className="lp-h2 fw-bold mb-3">Dashboard Chuyên biệt theo Vai trò</h2>
              <p className="lp-muted mb-4">
                Mỗi thành viên phi hành đoàn được trang bị một không gian làm việc tối ưu hóa cho
                nhiệm vụ cụ thể, đảm bảo luồng thông tin thông suốt và ra quyết định nhanh chóng.
              </p>
              <ul className="lp-roles list-unstyled">
                {ROLES.map((r) => (
                  <li key={r.title} className="d-flex gap-3 mb-3">
                    <span className="lp-roles__dot">{r.icon}</span>
                    <div>
                      <strong className="d-block">{r.title}</strong>
                      <span className="lp-muted">{r.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Col>
            <Col lg={6}>
              <DashboardMock />
            </Col>
          </Row>
        </Container>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="lp-cta text-center text-white">
        <Container>
          <h2 className="lp-h2 fw-bold mb-3">Bắt đầu ca trực của bạn</h2>
          <p className="mx-auto mb-4" style={{ maxWidth: 540 }}>
            Hệ thống chỉ dành cho nhân sự được cấp phép. Vui lòng đăng nhập để truy cập dữ liệu vận
            hành và bắt đầu ca làm việc.
          </p>
          <Button variant="light" size="lg" className="lp-cta-btn fw-semibold" onClick={goLogin}>
            Vào Hệ Thống
          </Button>
        </Container>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="lp-footer text-center">
        © {new Date().getFullYear()} CargoOps Internal System. Phân quyền truy cập nghiêm ngặt.
      </footer>
    </div>
  );
}

/* ===== Nội dung ===== */
const FEATURES = [
  { title: "Quản lý Hàng hóa Thương mại", desc: "Số hóa luồng hàng hóa, bản đồ hầm hàng (hold maps) và báo cáo bốc dỡ thời gian thực. Giám sát trọng tải và phân bổ tối ưu.", icon: <BoxIcon /> },
  { title: "Số hóa Ca trực (Deck & Engine)", desc: "Quản lý chu trình trực ca trên boong và buồng máy 24/7. Ghi nhận nhật ký tự động, bàn giao ca liền mạch và cảnh báo an toàn.", icon: <ClockIcon /> },
  { title: "Quản lý Nhân sự & An toàn", desc: "Theo dõi chứng chỉ thuyền viên, chấm công và vòng đời trang thiết bị an toàn. Cảnh báo hết hạn chứng chỉ tự động.", icon: <ShieldIcon /> },
];

const ROLES = [
  { title: "Master Dashboard", desc: "Tổng quan toàn tàu, phê duyệt cuối cùng và theo dõi hành trình.", icon: <ShipIcon small /> },
  { title: "Cargo Admin", desc: "Chi tiết bốc dỡ, sơ đồ hầm hàng và tài liệu hải quan.", icon: <BoxIcon small /> },
  { title: "Engine Admin", desc: "Thông số máy chính, mức tiêu thụ nhiên liệu và lịch bảo dưỡng.", icon: <GearIcon /> },
];

/* ===== Dashboard mock ===== */
function DashboardMock() {
  const bars = [42, 68, 55, 80, 61, 73, 48, 90, 66];
  return (
    <div className="lp-mock">
      <div className="lp-mock__bar-top"><span /><span /><span /></div>
      <div className="lp-mock__grid">
        <div className="lp-mock__panel lp-mock__panel--wide">
          <span className="lp-mock__label">Trọng tải theo hầm hàng</span>
          <div className="lp-mock__chart">
            {bars.map((h, i) => <div key={i} className="lp-mock__col" style={{ height: `${h}%` }} />)}
          </div>
        </div>
        <div className="lp-mock__panel">
          <span className="lp-mock__label">Ca trực</span>
          <div className="lp-mock__ring" />
        </div>
        <div className="lp-mock__panel">
          <span className="lp-mock__label">Chứng chỉ</span>
          <div className="lp-mock__lines"><span /><span /><span /></div>
        </div>
        <div className="lp-mock__panel lp-mock__panel--wide">
          <span className="lp-mock__label">Nhiên liệu (24h)</span>
          <svg viewBox="0 0 200 50" preserveAspectRatio="none" className="lp-mock__spark">
            <polyline points="0,40 25,28 50,33 75,18 100,24 125,10 150,20 175,8 200,14" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ===== Icons (SVG inline) ===== */
function ShipIcon({ small }) {
  const s = small ? 18 : 24;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14l1.5 5.5a2 2 0 0 0 2 1.5h11a2 2 0 0 0 2-1.5L21 14" />
      <path d="M5 14V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5" />
      <path d="M12 7V3M9 3h6M3 14l9-3 9 3" />
    </svg>
  );
}
function BoxIcon({ small }) {
  const s = small ? 18 : 22;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}
