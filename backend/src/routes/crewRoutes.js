const express = require('express');
const bcrypt = require('bcrypt');
const { sendCrewCredentialsEmail } = require('../services/emailService');
const { CrewProfile, User, CrewCertificate, Voyage, VoyageCrew } = require('../models');
const { Op } = require('sequelize');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// ================================================================
// /me — endpoints cho crew tự xem/sửa profile của mình
// ================================================================

// GET /api/crews/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const profile = await CrewProfile.findOne({
      where: { userId: req.user.id },
      include: [
        { model: User, attributes: ['id', 'username', 'role', 'status'] },
        { model: CrewCertificate, order: [['expiryDate', 'ASC']] }
      ]
    });
    if (!profile) return res.status(404).json({ message: 'Chưa có hồ sơ.' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PUT /api/crews/me — cập nhật thông tin cá nhân (chỉ các trường tự chỉnh sửa được)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const profile = await CrewProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Chưa có hồ sơ.' });

    if (phone && phone !== profile.phone) {
      const existing = await CrewProfile.findOne({ where: { phone } });
      if (existing) return res.status(400).json({ message: 'Số điện thoại đã được sử dụng.' });
    }

    await profile.update({ fullName, phone });
    res.json({ message: 'Cập nhật thành công.', profile });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PUT /api/crews/me/password
router.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không chính xác.' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });
    
    res.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/crews/me/certificates
router.get('/me/certificates', authMiddleware, async (req, res) => {
  try {
    const profile = await CrewProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Chưa có hồ sơ.' });
    const certs = await CrewCertificate.findAll({
      where: { crewId: profile.id },
      order: [['expiryDate', 'ASC']]
    });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// POST /api/crews/me/certificates
router.post('/me/certificates', authMiddleware, async (req, res) => {
  try {
    const { certificateName, issueDate, expiryDate, fileUrl } = req.body;
    const profile = await CrewProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Chưa có hồ sơ.' });

    const today = new Date().toISOString().split('T')[0];
    const cert = await CrewCertificate.create({
      crewId: profile.id,
      certificateName,
      issueDate,
      expiryDate,
      fileUrl: fileUrl || null,
      status: expiryDate >= today ? 'Valid' : 'Expired'
    });
    res.status(201).json({ message: 'Thêm chứng chỉ thành công.', cert });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PUT /api/crews/me/certificates/:certId
router.put('/me/certificates/:certId', authMiddleware, async (req, res) => {
  try {
    const profile = await CrewProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Chưa có hồ sơ.' });
    const cert = await CrewCertificate.findOne({ where: { id: req.params.certId, crewId: profile.id } });
    if (!cert) return res.status(404).json({ message: 'Không tìm thấy chứng chỉ.' });

    const { certificateName, issueDate, expiryDate, fileUrl } = req.body;
    const today = new Date().toISOString().split('T')[0];
    await cert.update({
      certificateName,
      issueDate,
      expiryDate,
      fileUrl: fileUrl || null,
      status: expiryDate >= today ? 'Valid' : 'Expired',
    });
    res.json({ message: 'Cập nhật chứng chỉ thành công.', cert });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/crews/me/certificates/:certId
router.delete('/me/certificates/:certId', authMiddleware, async (req, res) => {
  try {
    const profile = await CrewProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Chưa có hồ sơ.' });
    const cert = await CrewCertificate.findOne({ where: { id: req.params.certId, crewId: profile.id } });
    if (!cert) return res.status(404).json({ message: 'Không tìm thấy chứng chỉ.' });
    await cert.destroy();
    res.json({ message: 'Đã xóa chứng chỉ.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/crews - Lấy danh sách toàn bộ thủy thủ
router.get('/', async (req, res) => {
  try {
    const { available } = req.query;
    let crews = await CrewProfile.findAll({
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

    const { Op } = require('sequelize');
    const { VoyageCrew, Voyage } = require('../models');
    
    const busyCrews = await VoyageCrew.findAll({
      include: [{
        model: Voyage,
        where: { status: { [Op.notIn]: ['Completed', 'Cancelled'] } },
        required: true
      }]
    });
    const busyCrewIds = busyCrews.map(bc => bc.crewId);

    if (available === 'true') {
      crews = crews.filter(c => !busyCrewIds.includes(c.id) && c.User && c.User.status === 'Available');
    } else {
      crews = crews.map(c => {
        const plain = c.toJSON();
        if (busyCrewIds.includes(plain.id) && plain.User) {
          plain.User.status = 'OnVoyage';
        }
        return plain;
      });
    }

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

    const { Op } = require('sequelize');
    const { VoyageCrew, Voyage } = require('../models');
    const activeAssignment = await VoyageCrew.findOne({
      where: { crewId: req.params.id },
      include: [{
        model: Voyage,
        where: { status: { [Op.notIn]: ['Completed', 'Cancelled'] } },
        required: true
      }]
    });

    const plain = crew.toJSON();
    if (activeAssignment && plain.User) {
      plain.User.status = 'OnVoyage';
      plain.isOnVoyage = true;
    }

    res.json(plain);
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

    // Check CCCD tồn tại
    if (cccd) {
      const existingCccd = await CrewProfile.findOne({ where: { cccd } });
      if (existingCccd) {
        return res.status(400).json({ message: 'CCCD này đã tồn tại trong hệ thống!' });
      }
    }

    // Check SĐT tồn tại
    if (phone) {
      const existingPhone = await CrewProfile.findOne({ where: { phone } });
      if (existingPhone) {
        return res.status(400).json({ message: 'Số điện thoại này đã tồn tại trong hệ thống!' });
      }
    }

    // Tự động sinh mật khẩu ngẫu nhiên 8 ký tự
    const generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const newUser = await User.create({
      username: email,
      password: hashedPassword,
      role: role || 'Sailor',
      status: status || 'Available',
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

    // Chờ Gmail API phản hồi để API có thể báo chính xác trạng thái gửi email.
    const emailSent = await sendCrewCredentialsEmail(email, generatedPassword, role || 'Sailor', {
      fullName,
      department,
      position
    });

    res.status(201).json({
      message: emailSent
        ? 'Thêm thủy thủ và gửi email thành công'
        : 'Thêm thủy thủ thành công nhưng gửi email thất bại',
      crew: newCrew,
      temporaryPassword: generatedPassword,
      emailSent
    });
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

    // Kiểm tra nếu thuyền viên đang tham gia hải trình hoạt động thì KHÔNG cho chỉnh sửa
    const { Op } = require('sequelize');
    const { VoyageCrew, Voyage } = require('../models');
    const activeAssignment = await VoyageCrew.findOne({
      where: { crewId },
      include: [{
        model: Voyage,
        where: {
          status: {
            [Op.notIn]: ['Completed', 'Cancelled']
          }
        },
        required: true
      }]
    });

    if (activeAssignment) {
      return res.status(400).json({
        message: 'Không thể chỉnh sửa thông tin của thuyền viên đang tham gia hải trình hoạt động!'
      });
    }

    // Check email tồn tại (trừ user hiện tại)
    const existingUser = await User.findOne({ where: { username: email } });
    if (existingUser && existingUser.id !== crew.userId) {
      return res.status(400).json({ message: 'Email này đã được sử dụng cho một tài khoản khác!' });
    }

    // Check CCCD tồn tại
    if (cccd) {
      const existingCccd = await CrewProfile.findOne({ where: { cccd } });
      if (existingCccd && existingCccd.id.toString() !== crewId) {
        return res.status(400).json({ message: 'CCCD này đã tồn tại trong hệ thống!' });
      }
    }

    // Check SĐT tồn tại
    if (phone) {
      const existingPhone = await CrewProfile.findOne({ where: { phone } });
      if (existingPhone && existingPhone.id.toString() !== crewId) {
        return res.status(400).json({ message: 'Số điện thoại này đã tồn tại trong hệ thống!' });
      }
    }

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

    // Check if crew is on an active voyage
    const activeAssignment = await VoyageCrew.findOne({
      where: { crewId: req.params.id },
      include: [{
        model: Voyage,
        where: {
          status: {
            [Op.notIn]: ['Completed', 'Cancelled']
          }
        }
      }]
    });

    if (activeAssignment) {
      return res.status(400).json({ message: 'Không thể xóa thủy thủ đang tham gia hải trình đang hoạt động' });
    }

    // Xóa User -> Sẽ tự động CASCADE xóa CrewProfile
    await User.destroy({ where: { id: crew.userId } });

    res.json({ message: 'Xóa thủy thủ thành công' });
  } catch (error) {
    console.error('Lỗi xóa thủy thủ:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa' });
  }
});

module.exports = router;
