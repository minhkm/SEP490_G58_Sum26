require('dotenv').config();

const { sendEmail } = require('./src/services/emailService');

async function testEmail() {
  const recipient = process.env.EMAIL_TEST_RECIPIENT;

  if (!recipient) {
    throw new Error('Hãy cấu hình EMAIL_TEST_RECIPIENT trước khi chạy kiểm tra');
  }

  const result = await sendEmail({
    to: recipient,
    subject: 'Test Email CargoOps qua Gmail API',
    html: '<h2>Gmail API hoạt động!</h2><p>Email này được gửi từ CargoOps qua HTTPS API.</p>'
  });

  console.log(`Email sent successfully via Gmail API: ${result.id}`);
}

testEmail().catch(error => {
  console.error('Lỗi gửi email:', error.message);
  process.exitCode = 1;
});
