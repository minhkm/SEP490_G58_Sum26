const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sequelize, Voyage, User, CrewProfile, VoyageCrew } = require('../models');
const { sendCrewCredentialsEmail } = require('../services/emailService');

const router = express.Router();

router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { shipId, routeInfo, cargoList, crewList } = req.body;
    
    // 1. Khởi tạo Voyage
    const voyage = await Voyage.create({
      shipId,
      departurePort: routeInfo.departurePort,
      destinationPort: routeInfo.destinationPort,
      departureDate: routeInfo.departureDate,
      arrivalDate: routeInfo.arrivalDate,
      status: 'Planned'
    }, { transaction: t });

    // 2. Phân bổ nhân sự và Tự động tạo tài khoản
    if (crewList && crewList.length > 0) {
      for (const crew of crewList) {
        let user = await User.findOne({ where: { username: crew.email } });
        let profile = null;
        let isNewUser = false;
        let randomPassword = '';

        if (!user) {
          // Tạo ngẫu nhiên 8 ký tự
          randomPassword = crypto.randomBytes(4).toString('hex'); 
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          
          let roleCode = 'Sailor';
          if (crew.role.includes('Deck Officer')) roleCode = 'DeckOfficer';
          else if (crew.role.includes('Chief Officer')) roleCode = 'ChiefOfficer';
          else if (crew.role.includes('Chief Engineer')) roleCode = 'EngineOfficer';
          
          user = await User.create({
            username: crew.email,
            password: hashedPassword,
            role: roleCode
          }, { transaction: t });

          profile = await CrewProfile.create({
            userId: user.id,
            fullName: crew.name,
            email: crew.email,
            department: roleCode === 'EngineOfficer' ? 'Engine' : 'Deck',
            position: crew.role
          }, { transaction: t });
          
          isNewUser = true;
        } else {
          profile = await CrewProfile.findOne({ where: { userId: user.id } });
        }

        // Tạo liên kết vào chuyến đi
        await VoyageCrew.create({
          voyageId: voyage.id,
          crewId: profile ? profile.id : null,
          role: crew.role
        }, { transaction: t });

        // Gửi email báo pass nếu là user mới
        // Đoạn này ta có thể gọi bất đồng bộ hoặc chờ nó gửi xong (await). 
        // Thường nên để nó bất đồng bộ để tránh bị nghẽn (timeout) request
        if (isNewUser) {
          sendCrewCredentialsEmail(crew.email, randomPassword, crew.role).catch(err => {
             console.error("Lỗi khi gửi email:", err);
          });
        }
      }
    }

    // (Tuỳ chọn: Bạn có thể thêm logic xử lý Cargo ở đây sau này)

    await t.commit();
    res.status(201).json({ message: 'Khởi tạo hải trình thành công', voyage });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi khi tạo voyage:', error);
    res.status(500).json({ message: 'Lỗi server khi tạo hải trình', error: error.message });
  }
});

module.exports = router;
