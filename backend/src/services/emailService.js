const RESEND_API_URL = 'https://api.resend.com/emails';

const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error('Thiếu biến môi trường RESEND_API_KEY');
  }

  if (!from) {
    throw new Error('Thiếu biến môi trường RESEND_FROM_EMAIL');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to: [to], subject, html })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = result.message || `Resend trả về HTTP ${response.status}`;
    throw new Error(message);
  }

  console.log(`Email sent to ${to} via Resend: ${result.id}`);
  return result;
};

const sendCrewCredentialsEmail = async (email, password, role, details = {}) => {
  const { fullName, department, position } = details;
  const departmentLabel = department === 'Deck'
    ? 'Boong (Deck)'
    : department === 'Engine'
      ? 'Máy (Engine)'
      : department === 'None'
        ? 'Không thuộc bộ phận'
        : department || 'Chưa cập nhật';

  try {
    await sendEmail({
      to: email,
      subject: 'Tài khoản đăng nhập hệ thống CargoOps',
      html: `
        <h3>Chào mừng ${fullName || 'bạn'} gia nhập đội ngũ CargoOps,</h3>
        <p>Tài khoản đăng nhập hệ thống nội bộ của bạn đã được khởi tạo thành công.</p>
        <ul style="color: #334155; line-height: 1.6;">
          <li><strong>Bộ phận công tác:</strong> ${departmentLabel}</li>
          <li><strong>Chức danh:</strong> ${position || 'Chưa cập nhật'}</li>
          <li><strong>Quyền hệ thống:</strong> ${role || 'Sailor'}</li>
        </ul>
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin-top: 0;"><strong>Tên đăng nhập (Email):</strong> ${email}</p>
          <p style="margin-bottom: 0;"><strong>Mật khẩu tạm thời:</strong> <span style="color: #0284c7; font-weight: bold; letter-spacing: 1px;">${password}</span></p>
        </div>
        <p style="color: #dc2626;"><strong>Lưu ý quan trọng:</strong> Vui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên.</p>
        <br><p>Trân trọng,<br>CargoOps System</p>
      `
    });
    return true;
  } catch (error) {
    console.error(`Error sending email to ${email} via Resend:`, error.message);
    return false;
  }
};

const sendRouteApprovalEmail = async (email, voyageId, departurePort, destinationPort, applicantName) => {
  try {
    await sendEmail({
      to: email,
      subject: `Yêu cầu phê duyệt lộ trình chuyến đi VY-${String(voyageId).padStart(4, '0')}`,
      html: `
        <h2>Yêu cầu phê duyệt lộ trình</h2>
        <p>Đại phó <strong>${applicantName || 'trên tàu'}</strong> đã thiết lập xong lộ trình cho chuyến đi <strong>VY-${String(voyageId).padStart(4, '0')}</strong>.</p>
        <p><strong>Cảng đi:</strong> ${departurePort}</p>
        <p><strong>Cảng đến:</strong> ${destinationPort}</p>
        <p>Vui lòng đăng nhập CargoOps để kiểm tra và phê duyệt lộ trình.</p>
        <br><p>Trân trọng,<br>CargoOps Team</p>
      `
    });
    return true;
  } catch (error) {
    console.error(`Error sending email to ${email} via Resend:`, error.message);
    return false;
  }
};

const sendSewageApprovalEmail = async (email, applicantName, voyageId) => {
  try {
    await sendEmail({
      to: email,
      subject: `Yêu cầu phê duyệt Xả nước thải MARPOL chuyến đi VY-${String(voyageId).padStart(4, '0')}`,
      html: `
        <h2>Yêu cầu phê duyệt Xả nước thải</h2>
        <p>Đại phó <strong>${applicantName || 'trên tàu'}</strong> đã tạo yêu cầu xả nước thải cho chuyến đi <strong>VY-${String(voyageId).padStart(4, '0')}</strong>.</p>
        <p>Vui lòng đăng nhập CargoOps để kiểm tra các điều kiện và tiến hành phê duyệt.</p>
        <br><p>Trân trọng,<br>CargoOps Team</p>
      `
    });
    return true;
  } catch (error) {
    console.error(`Error sending email to ${email} via Resend:`, error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendCrewCredentialsEmail,
  sendRouteApprovalEmail,
  sendSewageApprovalEmail
};
