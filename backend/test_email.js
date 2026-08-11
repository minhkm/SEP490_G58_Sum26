require('dotenv').config();

const { sendEmail } = require('./src/services/emailService');

async function testEmail() {
  const recipient = process.env.RESEND_TEST_EMAIL;

  if (!recipient) {
    throw new Error('Hãy cấu hình RESEND_TEST_EMAIL trước khi chạy kiểm tra');
  }

  const result = await sendEmail({
    to: recipient,
    subject: 'Test Email CargoOps qua Resend',
    html: '<h2>Resend hoạt động!</h2><p>Email này được gửi từ CargoOps qua HTTPS API.</p>'
  });

  console.log(`Email sent successfully: ${result.id}`);
}

testEmail().catch(error => {
  console.error('Lỗi gửi email:', error.message);
  process.exitCode = 1;
});
