const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

let cachedAccessToken = null;
let accessTokenExpiresAt = 0;

const sanitizeHeader = value => String(value).replace(/[\r\n]+/g, ' ').trim();

const getGmailAccessToken = async () => {
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt) {
    return cachedAccessToken;
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Thiếu GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET hoặc GMAIL_REFRESH_TOKEN');
  }

  const response = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error || `Google OAuth trả về HTTP ${response.status}`);
  }

  cachedAccessToken = result.access_token;
  accessTokenExpiresAt = Date.now() + Math.max((result.expires_in || 3600) - 60, 60) * 1000;
  return cachedAccessToken;
};

const sendEmail = async ({ to, subject, html }) => {
  const gmailUser = process.env.GMAIL_USER;
  if (!gmailUser) {
    throw new Error('Thiếu biến môi trường GMAIL_USER');
  }

  const accessToken = await getGmailAccessToken();
  const mimeMessage = [
    `From: CargoOps System <${sanitizeHeader(gmailUser)}>`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64')
  ].join('\r\n');
  const raw = Buffer.from(mimeMessage, 'utf8').toString('base64url');

  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = result.error?.message || result.error_description || `Gmail API trả về HTTP ${response.status}`;
    throw new Error(message);
  }

  console.log(`Email sent to ${to} via Gmail API: ${result.id}`);
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
    console.error(`Error sending email to ${email} via Gmail API:`, error.message);
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
    console.error(`Error sending email to ${email} via Gmail API:`, error.message);
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
    console.error(`Error sending email to ${email} via Gmail API:`, error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendCrewCredentialsEmail,
  sendRouteApprovalEmail,
  sendSewageApprovalEmail
};
