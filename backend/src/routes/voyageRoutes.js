const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sequelize, Voyage, User, CrewProfile, VoyageCrew, Ship } = require('../models');
const { sendCrewCredentialsEmail } = require('../services/emailService');
const authMiddleware = require('../middlewares/authMiddleware');

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

// Public endpoint: all users can view the voyage list (Now Protected by RBAC)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userRole = req.user.role;
    let whereClause = {};

    if (userRole !== 'Admin' && userRole !== 'Agency') {
      const profileId = req.user.profileId;
      if (!profileId) {
        return res.json([]); // Thủy thủ chưa có hồ sơ -> Không xem được gì
      }

      // Tìm các voyageId mà người này được phân công
      const userVoyages = await VoyageCrew.findAll({
        where: { crewId: profileId },
        attributes: ['voyageId']
      });
      const voyageIds = userVoyages.map(vc => vc.voyageId);

      whereClause = { id: voyageIds };
    }

    const voyages = await Voyage.findAll({
      where: whereClause,
      include: [
        {
          model: Ship,
          attributes: ["id", "shipName", "imoNumber", "flag", "status"],
        },
      ],
      order: [
        ["departureDate", "DESC"],
        ["id", "DESC"],
      ],
    });

    res.json(voyages);
  } catch (error) {
    console.error("Error fetching voyages:", error);
    res.status(500).json({ message: "Unable to fetch voyage list." });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const profileId = req.user.profileId;

    const voyage = await Voyage.findByPk(id);
    if (!voyage) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến đi' });
    }

    // Check authorization
    if (userRole !== 'Admin' && userRole !== 'Agency') {
      if (userRole !== 'ChiefOfficer') {
        return res.status(403).json({ message: 'Bạn không có quyền cập nhật chuyến đi này' });
      }
      
      // If ChiefOfficer, check if they are part of the voyage
      const isAssigned = await VoyageCrew.findOne({
        where: { voyageId: id, crewId: profileId }
      });
      if (!isAssigned) {
        return res.status(403).json({ message: 'Bạn không được phân công vào chuyến đi này' });
      }
    }

    const { status, departureDate, arrivalDate, isCrewSufficient, isCargoLoaded, issueReason } = req.body;

    if (status) voyage.status = status;
    if (departureDate) voyage.departureDate = departureDate;
    if (arrivalDate) voyage.arrivalDate = arrivalDate;
    if (isCrewSufficient !== undefined) voyage.isCrewSufficient = isCrewSufficient;
    if (isCargoLoaded !== undefined) voyage.isCargoLoaded = isCargoLoaded;
    if (issueReason !== undefined) voyage.issueReason = issueReason;

    await voyage.save();

    res.json({ message: 'Cập nhật chuyến đi thành công', voyage });
  } catch (error) {
    console.error('Lỗi khi cập nhật chuyến đi:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật chuyến đi', error: error.message });
  }
});

module.exports = router;
