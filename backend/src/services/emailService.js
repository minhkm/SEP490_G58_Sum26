const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendCrewCredentialsEmail = async (email, password, role) => {
  try {
    const mailOptions = {
      from: `"CargoOps System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Thông tin tài khoản đăng nhập hệ thống CargoOps',
      html: `
        <h2>Chào mừng bạn đến với CargoOps</h2>
        <p>Thuyền trưởng đã thêm bạn vào hệ thống với chức danh: <strong>${role}</strong>.</p>
        <p>Dưới đây là thông tin tài khoản đăng nhập của bạn:</p>
        <ul>
          <li><strong>Tên đăng nhập (Email):</strong> ${email}</li>
          <li><strong>Mật khẩu:</strong> ${password}</li>
        </ul>
        <p>Vui lòng đăng nhập vào hệ thống và đổi mật khẩu sau khi đăng nhập thành công.</p>
        <br/>
        <p>Trân trọng,</p>
        <p>CargoOps Team</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${email}:`, error);
    return false;
  }
};

module.exports = {
  sendCrewCredentialsEmail
};
