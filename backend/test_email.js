require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"CargoOps System" <${process.env.EMAIL_USER}>`,
      to: 'cargoops36@gmail.com', // Send to self just to test
      subject: 'Test Email CargoOps',
      html: `<p>Test successful</p>`
    };

    console.log('Sending email...');
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
  } catch (err) {
    console.error('Lỗi gửi email:', err);
  }
}

testEmail();
