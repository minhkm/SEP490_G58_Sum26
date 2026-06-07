const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, CrewProfile, CrewCertificate } = require('../models');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

// Register Master
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, idNumber, certificate, issueDate, expiryDate, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { username: email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được đăng ký.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User with role 'Master'
    const newUser = await User.create({
      username: email,
      password: hashedPassword,
      role: 'Master',
      status: 'Active'
    });

    // Create CrewProfile
    const newProfile = await CrewProfile.create({
      userId: newUser.id,
      fullName: fullName,
      email: email,
      phone: phone,
      cccd: idNumber,
      department: 'Deck',
      position: 'Master'
    });

    // Create CrewCertificate if provided
    if (certificate) {
      await CrewCertificate.create({
        crewId: newProfile.id,
        certificateName: certificate,
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        status: 'Valid'
      });
    }

    res.status(201).json({ 
      message: 'Đăng ký thành công!'
    });
  } catch (error) {
    console.error('Lỗi khi đăng ký:', error);
    res.status(500).json({ message: 'Lỗi server khi đăng ký.', error: error.message, stack: error.stack });
  }
});

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
      user: { id: user.id, username: user.username, role: user.role, fullName: profile ? profile.fullName : '' }
    });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
