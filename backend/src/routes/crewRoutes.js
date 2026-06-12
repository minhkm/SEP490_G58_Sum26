const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { CrewProfile, User, CrewCertificate } = require('../models');

const router = express.Router();

// GET /api/crews - Lấy danh sách toàn bộ thủy thủ
router.get('/', async (req, res) => {
  try {
    const crews = await CrewProfile.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'role', 'status']
        },
        {
          model: CrewCertificate
        }
      ],
      order: [['id', 'DESC']]
    });
    res.json(crews);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thủy thủ:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu thủy thủ' });
  }
});

// GET /api/crews/:id - Lấy thông tin một thủy thủ
router.get('/:id', async (req, res) => {
  try {
    const crew = await CrewProfile.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'role', 'status']
        },
        {
          model: CrewCertificate
        }
      ]
    });
    if (!crew) return res.status(404).json({ message: 'Không tìm thấy thủy thủ' });
    res.json(crew);
  } catch (error) {
    console.error('Lỗi lấy chi tiết thủy thủ:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// POST /api/crews - Thêm mới thủy thủ
router.post('/', async (req, res) => {
  try {
    const { email, role, status, fullName, phone, cccd, department, position } = req.body;

    // Check email tồn tại
    const existingUser = await User.findOne({ where: { username: email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được sử dụng cho một tài khoản khác!' });
    }

    // Tự động sinh mật khẩu ngẫu nhiên 8 ký tự
    const generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const newUser = await User.create({
      username: email,
      password: hashedPassword,
      role: role || 'Sailor',
      status: status || 'Active',
      requiresPasswordChange: true
    });

    const newCrew = await CrewProfile.create({
      userId: newUser.id,
      fullName,
      email,
      phone,
      cccd,
      department,
      position
    });

    // Gửi email tự động
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
        to: email,
        subject: 'Tài khoản đăng nhập hệ thống CargoOps',
        html: `
          <h3>Chào mừng ${fullName || 'bạn'} gia nhập đội ngũ CargoOps,</h3>
          <p>Tài khoản đăng nhập hệ thống nội bộ của bạn đã được khởi tạo thành công với các thông tin công tác như sau:</p>
          <ul style="color: #334155; line-height: 1.6;">
            <li><strong>Bộ phận công tác:</strong> ${department === 'Deck' ? 'Boong (Deck)' : (department === 'Engine' ? 'Máy (Engine)' : department)}</li>
            <li><strong>Chức danh:</strong> ${position || 'Chưa cập nhật'}</li>
            <li><strong>Quyền hệ thống:</strong> ${role || 'Sailor'}</li>
          </ul>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin-top: 0;"><strong>Tên đăng nhập (Email):</strong> ${email}</p>
            <p style="margin-bottom: 0;"><strong>Mật khẩu tạm thời:</strong> <span style="color: #0284c7; font-weight: bold; letter-spacing: 1px;">${generatedPassword}</span></p>
          </div>
          <p style="color: #dc2626;"><strong>Lưu ý quan trọng:</strong> Vì lý do bảo mật, hệ thống sẽ yêu cầu bạn đổi mật khẩu ngay trong lần đăng nhập đầu tiên.</p>
          <br>
          <p>Trân trọng,<br>CargoOps System</p>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.error('Lỗi gửi email:', mailError);
      // Vẫn báo thành công nhưng log lỗi email
    }

    res.status(201).json({ message: 'Thêm thủy thủ thành công', crew: newCrew });
  } catch (error) {
    console.error('Lỗi tạo mới thủy thủ:', error);
    res.status(500).json({ message: 'Lỗi server khi tạo mới' });
  }
});

// PUT /api/crews/:id - Cập nhật thủy thủ
router.put('/:id', async (req, res) => {
  try {
    const crewId = req.params.id;
    const { email, password, role, status, fullName, phone, cccd, department, position } = req.body;

    const crew = await CrewProfile.findByPk(crewId);
    if (!crew) return res.status(404).json({ message: 'Không tìm thấy hồ sơ thủy thủ' });

    const user = await User.findByPk(crew.userId);

    // Update CrewProfile
    await crew.update({
      fullName, email, phone, cccd, department, position
    });

    // Update User
    if (user) {
      const updateUserData = { status, role, username: email };
      if (password) {
        updateUserData.password = await bcrypt.hash(password, 10);
      }
      await user.update(updateUserData);
    }

    res.json({ message: 'Cập nhật thành công', crew });
  } catch (error) {
    console.error('Lỗi cập nhật thủy thủ:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật' });
  }
});

// DELETE /api/crews/:id - Xóa thủy thủ
router.delete('/:id', async (req, res) => {
  try {
    const crew = await CrewProfile.findByPk(req.params.id);
    if (!crew) return res.status(404).json({ message: 'Không tìm thấy thủy thủ' });

    // Xóa User -> Sẽ tự động CASCADE xóa CrewProfile
    await User.destroy({ where: { id: crew.userId } });

    res.json({ message: 'Xóa thủy thủ thành công' });
  } catch (error) {
    console.error('Lỗi xóa thủy thủ:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa' });
  }
});

module.exports = router;
