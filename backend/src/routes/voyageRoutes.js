const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sequelize, Voyage, User, CrewProfile, VoyageCrew, Ship, Attendance, Cargo, CargoItem } = require('../models');
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

// Lấy danh sách thuyền viên của một chuyến đi (kèm điểm danh)
router.get('/:id/crew', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const crewList = await VoyageCrew.findAll({
      where: { voyageId: id },
      include: [
        {
          model: CrewProfile,
          attributes: ['id', 'fullName', 'position', 'department']
        }
      ]
    });

    const attendances = await Attendance.findAll({
      where: { voyageId: id }
    });
    
    const result = crewList.map(vc => {
      const crewProfile = vc.CrewProfile || {};
      const att = attendances.find(a => a.crewId === vc.crewId);
      return {
        crewId: vc.crewId,
        fullName: crewProfile.fullName,
        position: vc.role || crewProfile.position,
        isPresent: att ? (att.status === 'Present') : false
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thuyền viên:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách thuyền viên', error: error.message });
  }
});

// Lấy danh sách hàng hóa của một chuyến đi
router.get('/:id/cargo', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const cargos = await Cargo.findAll({
      where: { voyageId: id },
      include: [
        {
          model: CargoItem,
          attributes: ['id', 'itemName', 'quantity', 'weight', 'isLoaded']
        }
      ]
    });

    let result = [];
    for (const cargo of cargos) {
      if (cargo.CargoItems && cargo.CargoItems.length > 0) {
         cargo.CargoItems.forEach(item => {
           result.push({
             cargoId: cargo.id,
             cargoName: cargo.cargoName,
             cargoType: cargo.cargoType,
             itemId: item.id,
             itemName: item.itemName,
             quantity: item.quantity,
             weight: item.weight,
             isLoaded: item.isLoaded
           });
         });
      } else {
         result.push({
           cargoId: cargo.id,
           cargoName: cargo.cargoName,
           cargoType: cargo.cargoType,
           itemId: null,
           itemName: 'Chưa có chi tiết',
           quantity: 0,
           weight: cargo.totalWeight,
           isLoaded: false
         });
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hàng hóa:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách hàng hóa', error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const rawUserRole = req.user.role || '';
    const userRole = rawUserRole.replace(/\s+/g, '').toLowerCase();
    const profileId = req.user.profileId;

    const voyage = await Voyage.findByPk(id);
    if (!voyage) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến đi' });
    }

    // Check authorization
    if (userRole !== 'admin' && userRole !== 'agency') {
      if (userRole !== 'chiefofficer') {
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

    const { status, departureDate, arrivalDate, isCargoLoaded, issueReason, attendanceList, cargoList } = req.body;

    if (status) voyage.status = status;
    if (departureDate) voyage.departureDate = departureDate;
    if (arrivalDate) voyage.arrivalDate = arrivalDate;
    if (isCargoLoaded !== undefined) voyage.isCargoLoaded = isCargoLoaded;
    if (issueReason !== undefined) voyage.issueReason = issueReason;

    // Process attendanceList if provided
    if (attendanceList && Array.isArray(attendanceList)) {
      let allPresent = attendanceList.length > 0;
      for (const item of attendanceList) {
        if (!item.isPresent) allPresent = false;
        
        const existingAtt = await Attendance.findOne({
          where: { voyageId: id, crewId: item.crewId }
        });

        if (existingAtt) {
          existingAtt.status = item.isPresent ? 'Present' : 'Absent';
          existingAtt.recordedAt = new Date();
          await existingAtt.save();
        } else {
          await Attendance.create({
            voyageId: id,
            crewId: item.crewId,
            status: item.isPresent ? 'Present' : 'Absent',
            recordedAt: new Date()
          });
        }
      }
      voyage.isCrewSufficient = allPresent;
    } else {
      if (req.body.isCrewSufficient !== undefined) {
         voyage.isCrewSufficient = req.body.isCrewSufficient;
      }
    }

    // Process cargoList if provided
    if (cargoList && Array.isArray(cargoList)) {
      if (cargoList.length > 0) {
        let allCargoLoaded = true;
        for (const item of cargoList) {
          if (!item.isLoaded) allCargoLoaded = false;
          
          if (item.itemId) {
             const cargoItem = await CargoItem.findByPk(item.itemId);
             if (cargoItem) {
               cargoItem.isLoaded = item.isLoaded;
               await cargoItem.save();
             }
          }
        }
        voyage.isCargoLoaded = allCargoLoaded;
      }
    } else if (req.body.isCargoLoaded !== undefined) {
      voyage.isCargoLoaded = req.body.isCargoLoaded;
    }

    await voyage.save();

    res.json({ message: 'Cập nhật chuyến đi thành công', voyage });
  } catch (error) {
    console.error('Lỗi khi cập nhật chuyến đi:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật chuyến đi', error: error.message });
  }
});

module.exports = router;
