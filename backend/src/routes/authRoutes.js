const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, CrewProfile, CrewCertificate } = require('../models');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { username: email } });
    if (!user) {
      return res.status(400).json({ message: 'Tài khoản không tồn tại.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Sai mật khẩu.' });
    }

    const profile = await CrewProfile.findOne({ where: { userId: user.id } });

    const token = jwt.sign({ id: user.id, role: user.role, profileId: profile ? profile.id : null }, JWT_SECRET, {
      expiresIn: '1d'
    });

    res.json({
      message: 'Đăng nhập thành công',
      token,
      requirePasswordChange: user.requiresPasswordChange,
      user: { id: user.id, username: user.username, role: user.role, fullName: profile ? profile.fullName : '' }
    });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// Change First Password
router.post('/change-first-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ where: { username: email } });
    if (!user) {
      return res.status(400).json({ message: 'Tài khoản không tồn tại.' });
    }

    if (!user.requiresPasswordChange) {
      return res.status(400).json({ message: 'Tài khoản này không yêu cầu đổi mật khẩu.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({
      password: hashedPassword,
      requiresPasswordChange: false
    });

    res.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
