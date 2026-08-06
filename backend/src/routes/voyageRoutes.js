const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sequelize, Voyage, User, CrewProfile, VoyageCrew, Ship, Attendance, Cargo, CargoItem, CargoOperation, ShipCapacity, CargoHold, CargoAllocation, Equipment } = require('../models');
const { sendCrewCredentialsEmail, sendRouteApprovalEmail } = require('../services/emailService');
const { notifyCrewAssignedToVoyage, notifyAttendanceUpdated, notifyVoyageUpdated } = require('../services/notificationService');
const { SHIP_STATUS, normalizeEquipmentLocation, normalizeEquipmentName } = require('../utils/vessel');
const { canonicalVoyageRole } = require('../utils/voyageRole');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { shipId, routeInfo, cargoList, crewList, equipmentList } = req.body;
    const { Op } = require('sequelize');
    const errors = [];

    // 1. Kiểm tra tàu có đang trong hải trình khác không
    const activeVoyageForShip = await Voyage.findOne({
      where: {
        shipId,
        status: { [Op.notIn]: ['Completed', 'Cancelled'] }
      }
    });
    if (activeVoyageForShip) {
      errors.push('Tàu này đang thực hiện một hải trình khác chưa hoàn thành.');
    }

    // 2. Kiểm tra hàng hoá có đang trong hải trình khác không
    if (cargoList && cargoList.length > 0) {
      const cargoIds = cargoList.map(c => c.cargoId).filter(Boolean);
      if (cargoIds.length > 0) {
        const busyCargos = await Cargo.findAll({
          where: { id: cargoIds, voyageId: { [Op.not]: null } },
          include: [{
            model: Voyage,
            where: { status: { [Op.notIn]: ['Completed', 'Cancelled'] } },
            required: true
          }]
        });

        if (busyCargos.length > 0) {
          const busyCargoNames = busyCargos.map(c => c.cargoName).join(', ');
          errors.push(`Các lô hàng sau đang thuộc hải trình khác: ${busyCargoNames}`);
        }
      }
    }

    if (routeInfo && routeInfo.departureDate && routeInfo.arrivalDate) {
      if (routeInfo.arrivalDate <= routeInfo.departureDate) {
        errors.push('Ngày đến dự kiến phải sau ngày khởi hành.');
      }
    }

    const validMedicalSupplies = Array.isArray(equipmentList)
      ? equipmentList.filter((item) => item.name?.trim() && Number(item.quantity) >= 1)
      : [];
    const medicalSupplyTypes = new Set(
      validMedicalSupplies.map((item) => item.name.trim().toLocaleLowerCase('vi-VN')),
    );
    if (medicalSupplyTypes.size < 5) {
      errors.push('Hải trình bắt buộc phải có ít nhất 5 loại vật tư y tế hợp lệ.');
    }

    if (errors.length > 0) {
      await t.rollback();
      return res.status(400).json({ 
        message: `Không thể tạo hải trình!\n- ${errors.join('\n- ')}` 
      });
    }

    // Validate Ship Capacity against selected Cargo
    if (cargoList && cargoList.length > 0) {
      const shipCap = await ShipCapacity.findOne({ where: { shipId } });
      if (shipCap) {
        let totalWeight = 0;
        let totalVolume = 0;
        for (const cargoItem of cargoList) {
          if (!cargoItem.cargoId) continue;
          const cargo = await Cargo.findByPk(cargoItem.cargoId);
          if (cargo) {
            totalWeight += cargo.totalWeight || 0;
            totalVolume += cargo.totalVolume || 0;
          }
        }
        
        if (totalWeight > shipCap.maxCargoWeight) {
          await t.rollback();
          return res.status(400).json({ message: `Vượt quá tải trọng tàu. (Tối đa: ${shipCap.maxCargoWeight} tấn, hiện tại: ${totalWeight} tấn)` });
        }
        if (totalVolume > shipCap.maxCargoVolume) {
          await t.rollback();
          return res.status(400).json({ message: `Vượt quá thể tích tàu. (Tối đa: ${shipCap.maxCargoVolume} m³, hiện tại: ${totalVolume} m³)` });
        }
      }
    }

    // 1. Khởi tạo Voyage
    const voyage = await Voyage.create({
      shipId,
      departurePort: routeInfo.departurePort,
      destinationPort: routeInfo.destinationPort,
      departureDate: routeInfo.departureDate,
      arrivalDate: routeInfo.arrivalDate,
      status: 'Planning'
    }, { transaction: t });

    if (shipId) {
      await Ship.update({ status: 'Đang làm việc' }, { where: { id: shipId }, transaction: t });
    }

    // 2. Phân bổ nhân sự (sử dụng ID thủy thủ đã chọn từ Frontend)
    if (crewList && crewList.length > 0) {
      const crewIds = crewList.map(c => c.crewId).filter(Boolean);
      
      if (crewIds.length > 0) {
        const { Op } = require('sequelize');
        
        // Kiểm tra xem có thủy thủ nào đang bận trong một chuyến đi khác không (trạng thái khác Completed/Cancelled)
        const busyCrews = await VoyageCrew.findAll({
          where: { crewId: crewIds },
          include: [{
            model: Voyage,
            where: { status: { [Op.notIn]: ['Completed', 'Cancelled'] } },
            required: true
          }, {
            model: CrewProfile,
            attributes: ['fullName']
          }]
        });

        if (busyCrews.length > 0) {
          await t.rollback();
          const busyCrewNames = [...new Set(busyCrews.map(bc => bc.CrewProfile.fullName))];
          return res.status(400).json({ 
            message: `Không thể phân công! Các thủy thủ sau đang tham gia hải trình khác: ${busyCrewNames.join(', ')}` 
          });
        }

        const inactiveCrews = await CrewProfile.findAll({
          where: { id: crewIds },
          include: [{ model: User, where: { status: { [Op.ne]: 'Available' } }, required: true }]
        });
        
        if (inactiveCrews.length > 0) {
           await t.rollback();
           const inactiveNames = inactiveCrews.map(c => c.fullName);
           return res.status(400).json({
             message: `Không thể phân công! Các thủy thủ sau đang trong trạng thái tạm nghỉ/không hoạt động: ${inactiveNames.join(', ')}`
           });
        }
      }

      for (const crew of crewList) {
        if (!crew.crewId) continue;
        
        // Tạo liên kết vào chuyến đi
        await VoyageCrew.create({
          voyageId: voyage.id,
          crewId: crew.crewId,
          role: crew.role
        }, { transaction: t });
      }

      await notifyCrewAssignedToVoyage({
        voyage,
        crewList,
        actorUserId: req.user ? req.user.id : null
      }, { transaction: t });
    }

    // (Tuỳ chọn: Logic gán lô hàng vào chuyến đi nếu có cargoId)
    if (cargoList && cargoList.length > 0) {
      for (const cargo of cargoList) {
        if (!cargo.cargoId) continue;
        
        await Cargo.update(
          { voyageId: voyage.id },
          { where: { id: cargo.cargoId }, transaction: t }
        );
      }
    }

    // Tạo Equipment y tế cho hải trình (chỉ cho phép Thiết bị y tế)
    if (validMedicalSupplies.length > 0) {
        const eqData = validMedicalSupplies.map(e => ({
          voyageId: voyage.id,
          shipId: null,
          equipmentName: normalizeEquipmentName(e.name),
          equipmentType: 'Vật tư y tế',   // Chỉ cho phép loại vật tư y tế trong hải trình
          location: normalizeEquipmentLocation(e.location),
          quantity: Number(e.quantity) || 1,
          expiryNote: e.expiryNote || null,
          brokenCount: 0,
          status: 'Hoạt động'
        }));
        await Equipment.bulkCreate(eqData, { transaction: t });
    }

    await t.commit();
    res.status(201).json({ message: 'Khởi tạo hải trình thành công', voyage });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi khi tạo hải trình:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo hải trình' });
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
        attributes: ['voyageId', 'role']
      });
      const voyageIds = userVoyages.map(vc => vc.voyageId);
      
      const roleMap = {};
      userVoyages.forEach(vc => {
        roleMap[vc.voyageId] = vc.role;
      });
      req.voyageRoleMap = roleMap; // Store temporarily to use after fetching

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

    let resultVoyages = voyages;
    if (userRole !== 'Admin' && userRole !== 'Agency' && req.voyageRoleMap) {
       resultVoyages = voyages.map(v => {
          const vJson = v.toJSON();
          vJson.userRoleInVoyage = req.voyageRoleMap[v.id];
          return vJson;
       });
    }

    res.json(resultVoyages);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hải trình:', error);
    res.status(500).json({ message: 'Không thể lấy danh sách hải trình.' });
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
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách thuyền viên' });
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
          attributes: ['id', 'itemName', 'quantity', 'weight', 'isLoaded', 'isDischarged', 'holdId', 'allocations']
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
             isLoaded: item.isLoaded,
             isDischarged: item.isDischarged,
             holdId: null,
             allocations: item.allocations || []
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
           isLoaded: false,
           isDischarged: false,
           holdId: null,
           allocations: []
         });
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hàng hóa:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách hàng hóa' });
  }
});

// Lấy danh sách thiết bị của một chuyến đi
router.get('/:id/equipments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const equipments = await Equipment.findAll({
      where: { voyageId: id }
    });
    res.json(equipments);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thiết bị:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách thiết bị' });
  }
});


router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const rawUserRole = req.user.role || '';
    let userRole = rawUserRole.replace(/\s+/g, '').toLowerCase();
    const profileId = req.user.profileId;

    const voyage = await Voyage.findByPk(id);
    if (!voyage) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến đi' });
    }

    const previousVoyage = {
      status: voyage.status,
      departureDate: voyage.departureDate,
      arrivalDate: voyage.arrivalDate,
      isCrewSufficient: voyage.isCrewSufficient,
      isCargoLoaded: voyage.isCargoLoaded,
      issueReason: voyage.issueReason,
      routeStatus: voyage.routeStatus
    };

    // Check authorization
    if (userRole !== 'admin' && userRole !== 'agency') {
      const isAssigned = await VoyageCrew.findOne({
        where: { voyageId: id, crewId: profileId }
      });
      if (!isAssigned) {
        return res.status(403).json({ message: 'Bạn không được phân công vào chuyến đi này' });
      }
      
      const voyageRole = isAssigned.role || '';
      const isCaptain = voyageRole.toLowerCase().includes('captain') || voyageRole.toLowerCase().includes('master') || voyageRole.toLowerCase().includes('thuyền trưởng');
      const isChiefOfficer = voyageRole.toLowerCase().includes('chief officer') || voyageRole.toLowerCase().includes('đại phó');

      if (!isCaptain && !isChiefOfficer) {
        return res.status(403).json({ message: 'Bạn không có quyền cập nhật chuyến đi này' });
      }

      if (isChiefOfficer) userRole = 'chiefofficer';
      else if (isCaptain) userRole = 'master';
    }

    const { status, departureDate, arrivalDate, isCargoLoaded, issueReason, attendanceList, cargoList, routeWaypoints, routeStatus } = req.body;

    if (userRole === 'admin') {
      const lockedForAdminStatuses = [
        'Loading', 'Loaded', 'Underway', 'Arrived', 'Discharge', 
        'Discharged', 'Homeward Bounding', 'At Anchor', 'Completed'
      ];
      
      if (lockedForAdminStatuses.includes(voyage.status) && status && status !== voyage.status) {
         return res.status(403).json({ message: 'Quản trị viên không được phép thay đổi trạng thái khi tàu đã bắt đầu làm hàng hoặc đang hoạt động!' });
      }

      if (status && status !== voyage.status && !['Planning', 'Cancelled'].includes(status)) {
         return res.status(403).json({ message: 'Quản trị viên chỉ được phép chuyển trạng thái thành đang lên kế hoạch hoặc đã hủy!' });
      }
    }

    if (status === 'Cancelled' && voyage.status !== 'Planning' && voyage.status !== 'Cancelled') {
      return res.status(400).json({ message: 'Không thể hủy hải trình khi đã bắt đầu làm hàng hoặc di chuyển!' });
    }

    const nextStatus = status || voyage.status;
    let nextIsCrewSufficient = voyage.isCrewSufficient;

    const nextDepDate = departureDate || voyage.departureDate;
    const nextArrDate = arrivalDate || voyage.arrivalDate;
    if (nextDepDate && nextArrDate && nextArrDate <= nextDepDate) {
       return res.status(400).json({ message: 'Ngày đến dự kiến phải sau ngày khởi hành.' });
    }

    if (status) voyage.status = status;
    
    const lockedDepDateStatuses = [
      'Underway', 'Arrived', 'Discharge', 
      'Discharged', 'Homeward Bounding', 'At Anchor', 'Completed'
    ];
    if (departureDate && departureDate !== voyage.departureDate) {
      if (lockedDepDateStatuses.includes(voyage.status)) {
        return res.status(400).json({ message: 'Không thể sửa đổi ngày khởi hành khi tàu đã hoặc đang trong chuyến đi.' });
      }
      voyage.departureDate = departureDate;
    }
    
    const lockedArrDateStatuses = [
      'Arrived', 'Discharge', 'Discharged', 
      'Homeward Bounding', 'Completed'
    ];
    if (arrivalDate && arrivalDate !== voyage.arrivalDate) {
      if (lockedArrDateStatuses.includes(voyage.status)) {
        return res.status(400).json({ message: 'Không thể sửa đổi ngày đến khi tàu đã cập bến.' });
      }
      voyage.arrivalDate = arrivalDate;
    }

    if (isCargoLoaded !== undefined) voyage.isCargoLoaded = isCargoLoaded;
    if (issueReason !== undefined) voyage.issueReason = issueReason;
    if (routeWaypoints !== undefined) {
      if (['Approved', 'Pending'].includes(voyage.routeStatus)) {
        return res.status(403).json({ message: 'Lộ trình đã được gửi duyệt hoặc phê duyệt, không thể chỉnh sửa!' });
      }
      const lockedStatuses = ['Underway', 'Arrived', 'Completed', 'Discharge', 'Discharged', 'Homeward Bounding'];
      if (lockedStatuses.includes(voyage.status)) {
        return res.status(403).json({ message: 'Hải trình đang chạy hoặc đã hoàn thành, không thể chỉnh sửa lộ trình!' });
      }
      if (userRole === 'chiefofficer' && voyage.status !== 'Loaded') {
        return res.status(403).json({ message: 'Đại phó chỉ được chỉnh sửa lộ trình khi tàu đã làm hàng xong!' });
      }
      voyage.routeWaypoints = routeWaypoints;
    }
    
    let routeStatusChangedToPending = false;
    if (routeStatus !== undefined && routeStatus !== voyage.routeStatus) {
      if (routeStatus === 'Pending') {
        if (userRole === 'chiefofficer' && voyage.status !== 'Loaded') {
           return res.status(403).json({ message: 'Đại phó chỉ được gửi duyệt lộ trình khi tàu đã làm hàng xong!' });
        }
        routeStatusChangedToPending = true;
      }
      voyage.routeStatus = routeStatus;
    }

    const isShipStaff = userRole === 'chiefofficer' || userRole === 'master';

    // Process attendanceList if provided and allowed
    // Điểm danh phải đi qua POST /:id/attendances để luôn có loại, ngày và người ghi nhận.
    if (isShipStaff && attendanceList && Array.isArray(attendanceList) && req.body.attendanceType) {
      let allPresent = attendanceList.length > 0;
      const attendanceChanges = [];
      
      for (const item of attendanceList) {
        if (!item.isPresent) allPresent = false;
        const nextAttendanceStatus = item.isPresent ? 'Present' : 'Absent';
        
        const existingAttendance = await Attendance.findOne({ where: { voyageId: id, crewId: item.crewId } });
        if (existingAttendance) {
          if (existingAttendance.status !== nextAttendanceStatus) {
             existingAttendance.status = nextAttendanceStatus;
             existingAttendance.recordedAt = new Date();
             await existingAttendance.save();
             attendanceChanges.push({
               crewId: item.crewId,
               isPresent: item.isPresent,
               recordedAt: existingAttendance.recordedAt
             });
          }
        } else {
          const newAttendance = await Attendance.create({
            voyageId: id,
            crewId: item.crewId,
            status: nextAttendanceStatus,
            recordedAt: new Date()
          });
          attendanceChanges.push({
            crewId: item.crewId,
            isPresent: item.isPresent,
            recordedAt: newAttendance.recordedAt
          });
        }
      }
      nextIsCrewSufficient = allPresent;
      voyage.isCrewSufficient = allPresent;

      await notifyAttendanceUpdated({
        voyage,
        attendanceChanges,
        attendanceType: null,
        actorUserId: req.user.id
      });
    } else {
      if (req.body.isCrewSufficient !== undefined) {
         nextIsCrewSufficient = req.body.isCrewSufficient;
         voyage.isCrewSufficient = req.body.isCrewSufficient;
      }
    }

    // Business Logic Validation: Cannot transition to Underway if captain hasn't taken attendance or crew is not sufficient
    if (nextStatus === 'Underway') {
      // Assuming isCrewSufficient being false means attendance is missing or crew is absent
      if (!nextIsCrewSufficient) {
        return res.status(400).json({ message: 'Thuyền trưởng chưa điểm danh hoặc nhân sự chưa đủ, không thể chuyển sang trạng thái đang di chuyển!' });
      }
      if (voyage.routeStatus !== 'Approved' && routeStatus !== 'Approved') {
        return res.status(400).json({ message: 'Lộ trình chưa được phê duyệt, không thể chuyển sang trạng thái đang di chuyển!' });
      }
      // Check if all cargo is loaded in DB
      const cargosInVoyage = await Cargo.findAll({
        where: { voyageId: id },
        include: [{ model: CargoItem }]
      });

      let allLoaded = true;
      if (cargosInVoyage.length > 0) {
        for (const cargo of cargosInVoyage) {
          if (cargo.CargoItems && cargo.CargoItems.length > 0) {
            for (const item of cargo.CargoItems) {
              if (!item.isLoaded) {
                allLoaded = false;
                break;
              }
            }
          }
          if (!allLoaded) break;
        }
      }

      if (!allLoaded) {
        return res.status(400).json({ message: 'Chưa bốc xếp hàng hóa xong, không thể chuyển sang trạng thái đang di chuyển!' });
      } else {
        voyage.isCargoLoaded = true; // Auto-update to true if actually loaded
      }
    }

    if (nextStatus === 'Discharged') {
      const cargosInVoyage = await Cargo.findAll({
        where: { voyageId: id },
        include: [{ model: CargoItem }]
      });

      let allDischarged = true;
      for (const cargo of cargosInVoyage) {
        if (cargo.CargoItems && cargo.CargoItems.length > 0) {
          for (const item of cargo.CargoItems) {
            if (!item.isDischarged) {
              allDischarged = false;
              break;
            }
          }
        }
      }

      if (!allDischarged) {
        return res.status(400).json({ message: 'Chưa dỡ hết hàng hóa, không thể chuyển sang trạng thái đã dỡ hàng xong!' });
      }
    }

    if (nextStatus === 'Homeward Bounding') {
      const requiredCrewCount = await VoyageCrew.count({ where: { voyageId: id } });
      const postDischargeAttendanceCount = await Attendance.count({ 
        where: { voyageId: id, attendanceType: 'PostDischarge' } 
      });

      if (postDischargeAttendanceCount === 0 || postDischargeAttendanceCount < requiredCrewCount) {
        return res.status(400).json({ message: 'Chưa hoàn thành điểm danh "Kết thúc chuyến đi" cho toàn bộ thuyền viên, không thể chuyển sang trạng thái đang quay về!' });
      }
    }

    // Process cargoList if provided and allowed
    if (isShipStaff && cargoList && Array.isArray(cargoList)) {
      if (cargoList.length > 0) {
        let allCargoLoaded = true;
        for (const item of cargoList) {
          if (!item.isLoaded) allCargoLoaded = false;
          
           if (item.itemId) {
             const cargoItem = await CargoItem.findByPk(item.itemId);
             if (cargoItem) {
               const wasLoaded = Boolean(cargoItem.isLoaded);
               // 1. Revert old allocations from hold currentUsage
               if (cargoItem.isLoaded && !cargoItem.isDischarged) {
                 for (const a of (cargoItem.allocations || [])) {
                   if (a.holdId) {
                     const h = await CargoHold.findByPk(a.holdId);
                     if (h) {
                       h.currentUsage -= Number(a.weight || 0);
                       if (h.currentUsage < 0) h.currentUsage = 0;
                       await h.save();
                     }
                   }
                 }
               }

               // 2. Apply new allocations
               if (item.isLoaded && !cargoItem.isDischarged) {
                 for (const a of (item.allocations || [])) {
                   if (a.holdId) {
                     const h = await CargoHold.findByPk(a.holdId);
                     if (h) {
                       h.currentUsage += Number(a.weight || 0);
                       await h.save();
                     }
                   }
                 }
               }

               cargoItem.isLoaded = item.isLoaded;
               cargoItem.holdId = null;
                cargoItem.allocations = item.allocations || [];
                await cargoItem.save();

                if (!wasLoaded && item.isLoaded) {
                  await CargoOperation.create({
                    voyageId: voyage.id,
                    cargoId: cargoItem.cargoId,
                    cargoItemId: cargoItem.id,
                    operationType: 'LOAD',
                    plannedQuantity: cargoItem.quantity,
                    actualQuantity: item.actualQuantity !== undefined ? item.actualQuantity : cargoItem.quantity,
                    plannedWeight: cargoItem.weight,
                    actualWeight: item.actualWeight !== undefined ? item.actualWeight : cargoItem.weight,
                    unit: item.unit || 'ton',
                    port: item.port || voyage.departurePort,
                    startedAt: item.startedAt || null,
                    completedAt: item.completedAt || new Date(),
                    status: 'Completed',
                    confirmedBy: req.user.profileId,
                    note: item.note || null
                  });
                }
              }
          }
        }
        voyage.isCargoLoaded = allCargoLoaded;

        // --- Bắt đầu Đồng bộ Cargo.status và CargoAllocation ---
        const cargosInVoyage = await Cargo.findAll({
          where: { voyageId: voyage.id },
          include: [{ model: CargoItem }]
        });

        for (const cargo of cargosInVoyage) {
           let allLoaded = true;
           let anyLoaded = false;
           let allDischarged = true;
           let anyDischarged = false;
           const holdAllocations = {}; 
           
           if (cargo.CargoItems && cargo.CargoItems.length > 0) {
              cargo.CargoItems.forEach(item => {
                 if (!item.isLoaded) allLoaded = false;
                 if (item.isLoaded) anyLoaded = true;

                 if (!item.isDischarged) allDischarged = false;
                 if (item.isDischarged) anyDischarged = true;
                 
                 if (item.isLoaded && item.allocations && item.allocations.length > 0) {
                    item.allocations.forEach(a => {
                       if (a.holdId) {
                          if (!holdAllocations[a.holdId]) holdAllocations[a.holdId] = 0;
                          holdAllocations[a.holdId] += Number(a.weight || 0);
                       }
                    });
                 }
              });
           } else {
              allLoaded = false;
              allDischarged = false;
           }

           // Cập nhật trạng thái lô hàng
           if (allDischarged && anyDischarged) cargo.status = 'Đã giao thành công';
           else if (anyDischarged) cargo.status = 'Đang dỡ hàng';
           else if (allLoaded && anyLoaded) cargo.status = 'Đã lên tàu';
           else if (anyLoaded) cargo.status = 'Đang xếp hàng';
           else cargo.status = 'Đã ở cảng';
           
           await cargo.save();

           // Đồng bộ bảng CargoAllocation
           await CargoAllocation.destroy({ where: { cargoId: cargo.id } });
           
           for (const holdId of Object.keys(holdAllocations)) {
              await CargoAllocation.create({
                 cargoId: cargo.id,
                 cargoHoldId: holdId,
                 allocatedWeight: holdAllocations[holdId],
                 status: 'Allocated'
              });
           }
        }
        // --- Kết thúc Đồng bộ ---

      }
    } else if (req.body.isCargoLoaded !== undefined) {
      voyage.isCargoLoaded = req.body.isCargoLoaded;
    }

    await voyage.save();

    if (nextStatus === 'Completed' || nextStatus === 'Cancelled') {
      if (voyage.shipId) {
        await Ship.update({ status: SHIP_STATUS.OPERATIONAL }, { where: { id: voyage.shipId } });
      }
    } else if (previousVoyage.status !== nextStatus) {
      if (voyage.shipId) {
        await Ship.update({ status: 'Đang làm việc' }, { where: { id: voyage.shipId } });
      }
    }

    // Hủy hải trình -> giải phóng lô hàng
    if (nextStatus === 'Cancelled' && previousVoyage.status !== 'Cancelled') {
      await Cargo.update({ voyageId: null, status: 'Đã ở cảng' }, { where: { voyageId: id } });
    }

    if (routeStatusChangedToPending) {
       const captainAssignment = await VoyageCrew.findOne({ where: { voyageId: voyage.id, role: 'Captain (CAPT)' } });
       if (captainAssignment) {
          const captainProfile = await CrewProfile.findByPk(captainAssignment.crewId);
          if (captainProfile) {
             const captainUser = await User.findByPk(captainProfile.userId);
             if (captainUser && captainUser.username) {
                const applicantName = req.user.username || 'Đại phó';
                // If sendRouteApprovalEmail is defined (need to check if it's imported properly, assuming it is or skipping if not)
                if (typeof sendRouteApprovalEmail === 'function') {
                  try {
                    await sendRouteApprovalEmail(captainUser.username, voyage.id, voyage.departurePort, voyage.destinationPort, applicantName);
                  } catch (e) {
                    console.error('Lỗi gửi email cho thuyền trưởng:', e);
                  }
                }
             }
          }
       }
    }

    const voyageChanges = {};
    for (const field of Object.keys(previousVoyage)) {
      const beforeValue = previousVoyage[field];
      const afterValue = voyage[field];
      if (String(beforeValue ?? '') !== String(afterValue ?? '')) {
        voyageChanges[field] = { from: beforeValue, to: afterValue };
      }
    }

    await notifyVoyageUpdated({
      voyage,
      changes: voyageChanges,
      actorUserId: req.user.id
    });

    res.json({ message: 'Cập nhật chuyến đi thành công', voyage });
  } catch (error) {
    console.error('Lỗi khi cập nhật chuyến đi:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật chuyến đi' });
  }
});

// Lấy danh sách điểm danh chi tiết theo ngày và loại điểm danh
router.get('/:id/attendances', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type } = req.query; // date (YYYY-MM-DD), type (PreDeparture, Daily, PostDischarge)

    const voyage = await Voyage.findByPk(id);
    if (!voyage) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến đi' });
    }

    // Lấy danh sách thuyền viên của chuyến đi
    const viewerRole = String(req.user.role || '').replace(/\s+/g, '').toLowerCase();
    if (!['admin', 'agency'].includes(viewerRole)) {
      const assignment = await VoyageCrew.findOne({ where: { voyageId: id, crewId: req.user.profileId } });
      if (!assignment) {
        return res.status(403).json({ message: 'Bạn không được phân công vào hải trình này' });
      }
    }

    const crewList = await VoyageCrew.findAll({
      where: { voyageId: id },
      include: [{ model: CrewProfile, attributes: ['id', 'fullName', 'position', 'department'] }]
    });

    let whereClause = { voyageId: id };
    if (type) whereClause.attendanceType = type;

    const attendances = await Attendance.findAll({
      where: whereClause,
      include: [{ model: CrewProfile, as: 'Recorder', attributes: ['id', 'fullName', 'position'] }]
    });

    // Nếu lọc theo ngày (chỉ cho loại Daily)
    let filteredAttendances = attendances;
    if (type === 'Daily' && date) {
      filteredAttendances = attendances.filter(a => {
        if (a.attendanceDate) return a.attendanceDate === date;
        if (!a.recordedAt) return false;
        const attDate = new Date(a.recordedAt).toISOString().split('T')[0];
        return attDate === date;
      });
    } else if (type === 'PreDeparture' || type === 'PostDischarge') {
      // Đối với 2 loại này, thường chỉ có 1 lần điểm danh cho mỗi thuyền viên
      filteredAttendances = attendances.filter(a => a.attendanceType === type);
    }

    const result = crewList.map(vc => {
      const crewProfile = vc.CrewProfile || {};
      const att = filteredAttendances.find(a => a.crewId === vc.crewId);
      return {
        crewId: vc.crewId,
        fullName: crewProfile.fullName,
        position: vc.role || crewProfile.position,
        isPresent: att ? (att.status === 'Present') : false,
        attendanceType: att ? att.attendanceType : type || null,
        recordedAt: att ? att.recordedAt : null,
        attendanceDate: att ? att.attendanceDate : null,
        note: att ? att.note : null,
        recordedBy: att && att.Recorder ? {
          id: att.Recorder.id,
          fullName: att.Recorder.fullName,
          position: att.Recorder.position
        } : null
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách điểm danh:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách điểm danh' });
  }
});

// Cập nhật điểm danh chi tiết
router.post('/:id/attendances', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, date, attendanceList } = req.body;
    
    const userRole = (req.user.role || '').replace(/\s+/g, '').toLowerCase();
    const allowedRoles = ['admin', 'master', 'chiefofficer', 'deckofficer'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện điểm danh' });
    }

    const voyage = await Voyage.findByPk(id);
    if (!voyage) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến đi' });
    }

    if (userRole !== 'admin') {
      const assignment = await VoyageCrew.findOne({ where: { voyageId: id, crewId: req.user.profileId } });
      if (!assignment) {
        return res.status(403).json({ message: 'Bạn không được phân công vào hải trình này' });
      }
    }

    if (!['PreDeparture', 'Daily', 'PostDischarge'].includes(type)) {
      return res.status(400).json({ message: 'Loại điểm danh không hợp lệ' });
    }
    if (type === 'Daily' && !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      return res.status(400).json({ message: 'Ngày điểm danh hằng ngày phải theo định dạng YYYY-MM-DD' });
    }

    if (!attendanceList || !Array.isArray(attendanceList)) {
      return res.status(400).json({ message: 'Danh sách điểm danh không hợp lệ' });
    }

    // Với Daily, dùng date được gửi lên (thường là ngày hiện tại). 
    // Với PreDeparture/PostDischarge, không cần quan tâm date.
    
    const attendanceChanges = [];

    for (const item of attendanceList) {
      const crewAssignment = await VoyageCrew.findOne({ where: { voyageId: id, crewId: item.crewId } });
      if (!crewAssignment) {
        return res.status(400).json({ message: `Thuyền viên có mã số ${item.crewId} không thuộc hải trình này` });
      }
      const attendanceDate = type === 'Daily'
        ? date
        : (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().split('T')[0]);
      let whereClause = { voyageId: id, crewId: item.crewId, attendanceType: type };
      
      const existingAttendances = await Attendance.findAll({ where: whereClause });
      let targetAtt = null;

      if (type === 'Daily') {
        // Tìm attendance của ngày đó
        targetAtt = existingAttendances.find(a => {
           if (a.attendanceDate) return a.attendanceDate === date;
           if (!a.recordedAt) return false;
           return new Date(a.recordedAt).toISOString().split('T')[0] === date;
        });
      } else {
        // PreDeparture, PostDischarge thường chỉ có 1
        targetAtt = existingAttendances[0];
      }

      if (targetAtt) {
        const nextAttendanceStatus = item.isPresent ? 'Present' : 'Absent';
        const statusChanged = targetAtt.status !== nextAttendanceStatus;
        targetAtt.status = nextAttendanceStatus;
        targetAtt.recordedAt = new Date();
        targetAtt.attendanceDate = attendanceDate;
        targetAtt.recordedBy = req.user.profileId;
        targetAtt.note = item.note || null;
        await targetAtt.save();
        if (statusChanged) {
          attendanceChanges.push({
            crewId: item.crewId,
            isPresent: item.isPresent,
            recordedAt: targetAtt.recordedAt
          });
        }
      } else {
        // Tạo mới
        // Nếu Daily, cố gắng set recordedAt đúng ngày (nhưng giờ hiện tại)
        let recordDate = new Date();
        if (type === 'Daily' && date) {
           const [year, month, day] = date.split('-');
           recordDate = new Date(year, month - 1, day, recordDate.getHours(), recordDate.getMinutes(), recordDate.getSeconds());
        }
        
        const newAttendance = await Attendance.create({
          voyageId: id,
          crewId: item.crewId,
          attendanceType: type,
          status: item.isPresent ? 'Present' : 'Absent',
          attendanceDate,
          recordedAt: recordDate,
          recordedBy: req.user.profileId,
          note: item.note || null
        });
        attendanceChanges.push({
          crewId: item.crewId,
          isPresent: item.isPresent,
          recordedAt: newAttendance.recordedAt
        });
      }
    }

    // Nếu điểm danh PreDeparture hoặc PostDischarge, có thể ảnh hưởng đến isCrewSufficient của Voyage
    if (type === 'PreDeparture') {
       let allPresent = attendanceList.every(item => item.isPresent);
       voyage.isCrewSufficient = allPresent;
       await voyage.save();
    }

    await notifyAttendanceUpdated({
      voyage,
      attendanceChanges,
      attendanceType: type,
      actorUserId: req.user.id
    });
    res.json({ message: 'Lưu điểm danh thành công' });
  } catch (error) {
    console.error('Lỗi khi lưu điểm danh:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lưu điểm danh' });
  }
});

// PATCH /api/voyages/equipments/:equipmentId/status — Cập nhật trạng thái thiết bị (chỉ EngineOfficer)
router.patch('/equipments/:equipmentId/status', authMiddleware, async (req, res) => {
  if (req.user?.role !== 'EngineOfficer') {
    return res.status(403).json({ message: 'Chỉ Sĩ quan máy mới được đổi trạng thái thiết bị' });
  }

  const { status } = req.body;
  const statusAliases = {
    Operational: 'Hoạt động',
    'Hoạt động': 'Hoạt động',
    Broken: 'Hỏng',
    Hỏng: 'Hỏng',
    Lost: 'Mất',
    Mất: 'Mất',
  };
  const normalizedStatus = statusAliases[status];
  if (!normalizedStatus) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: Hoạt động, Hỏng, Mất' });
  }

  try {
    const equipment = await Equipment.findByPk(req.params.equipmentId);
    if (!equipment) return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
    await equipment.update({ status: normalizedStatus });
    res.json({ message: 'Cập nhật trạng thái thiết bị thành công', equipment });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái thiết bị:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật trạng thái vật tư' });
  }
});

// PATCH /api/voyages/equipments/:equipmentId/broken-count — Ghi nhận số vật tư y tế đã dùng thêm
router.patch('/equipments/:equipmentId/broken-count', authMiddleware, async (req, res) => {
  const { brokenCount } = req.body;
  const additionalUsedCount = Number(brokenCount);
  if (!Number.isInteger(additionalUsedCount) || additionalUsedCount <= 0) {
    return res.status(400).json({ message: 'Số lượng sử dụng thêm phải là số nguyên dương' });
  }
  try {
    const equipment = await Equipment.findByPk(req.params.equipmentId);
    if (!equipment) return res.status(404).json({ message: 'Không tìm thấy thiết bị' });

    const assignment = equipment.voyageId && req.user.profileId
      ? await VoyageCrew.findOne({ where: { voyageId: equipment.voyageId, crewId: req.user.profileId } })
      : null;
    const effectiveRole = assignment
      ? canonicalVoyageRole(assignment.role)
      : (equipment.voyageId ? '' : canonicalVoyageRole(req.user?.role));
    if (!['EngineOfficer', 'Master', 'ChiefOfficer'].includes(effectiveRole)) {
      return res.status(403).json({ message: 'Chỉ Máy trưởng, Thuyền trưởng hoặc Đại phó mới được cập nhật vật tư y tế' });
    }

    const currentUsedCount = Number(equipment.brokenCount) || 0;
    const nextUsedCount = currentUsedCount + additionalUsedCount;
    if (nextUsedCount > equipment.quantity) {
      const remaining = Math.max(0, equipment.quantity - currentUsedCount);
      return res.status(400).json({ message: `Chỉ còn ${remaining} vật tư có thể ghi nhận đã sử dụng` });
    }
    await equipment.update({ brokenCount: nextUsedCount });
    res.json({ message: 'Ghi nhận số vật tư đã dùng thành công', equipment });
  } catch (error) {
    console.error('Lỗi cập nhật số lượng vật tư đã dùng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật số lượng vật tư đã dùng' });
  }
});

// Dỡ hàng (Discharge)
router.put('/:id/cargo/:itemId/discharge', authMiddleware, async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { isDischarged, actualQuantity, actualWeight, unit, port, startedAt, completedAt, note } = req.body;

    const voyage = await Voyage.findByPk(id);
    if (!voyage) return res.status(404).json({ message: 'Không tìm thấy chuyến đi' });

    const userRole = String(req.user.role || '').replace(/\s+/g, '').toLowerCase();
    if (!['master', 'chiefofficer'].includes(userRole)) {
      return res.status(403).json({ message: 'Chỉ Thuyền trưởng hoặc Đại phó được cập nhật dỡ hàng' });
    }
    const assignment = await VoyageCrew.findOne({ where: { voyageId: id, crewId: req.user.profileId } });
    if (!assignment) {
      return res.status(403).json({ message: 'Bạn không được phân công vào hải trình này' });
    }

    const cargoItem = await CargoItem.findOne({
      where: { id: itemId },
      include: [{ model: Cargo, where: { voyageId: id }, attributes: ['id'] }]
    });
    if (!cargoItem) return res.status(404).json({ message: 'Không tìm thấy kiện hàng' });

    // Trừ tải trọng khỏi hầm hàng nếu hàng bị dỡ
    if (isDischarged && !cargoItem.isDischarged && cargoItem.isLoaded) {
      for (const a of (cargoItem.allocations || [])) {
        if (a.holdId) {
          const h = await CargoHold.findByPk(a.holdId);
          if (h) {
            h.currentUsage -= Number(a.weight || 0);
            if (h.currentUsage < 0) h.currentUsage = 0;
            await h.save();
          }
        }
      }
    } else if (!isDischarged && cargoItem.isDischarged && cargoItem.isLoaded) {
      // Nếu undo dỡ hàng (ít khi xảy ra, nhưng an toàn)
      for (const a of (cargoItem.allocations || [])) {
        if (a.holdId) {
          const h = await CargoHold.findByPk(a.holdId);
          if (h) {
            h.currentUsage += Number(a.weight || 0);
            await h.save();
          }
        }
      }
    }

    const wasDischarged = Boolean(cargoItem.isDischarged);
    cargoItem.isDischarged = isDischarged;
    await cargoItem.save();

    if (!wasDischarged && isDischarged) {
      await CargoOperation.create({
        voyageId: voyage.id,
        cargoId: cargoItem.cargoId,
        cargoItemId: cargoItem.id,
        operationType: 'UNLOAD',
        plannedQuantity: cargoItem.quantity,
        actualQuantity: actualQuantity !== undefined ? actualQuantity : cargoItem.quantity,
        plannedWeight: cargoItem.weight,
        actualWeight: actualWeight !== undefined ? actualWeight : cargoItem.weight,
        unit: unit || 'ton',
        port: port || voyage.destinationPort,
        startedAt: startedAt || null,
        completedAt: completedAt || new Date(),
        status: 'Completed',
        confirmedBy: req.user.profileId,
        note: note || null
      });
    }

    // Check parent cargo and update its status
    const parentCargo = await Cargo.findByPk(cargoItem.cargoId, {
      include: [{ model: CargoItem }]
    });
    
    if (parentCargo && parentCargo.CargoItems) {
      let allDischarged = true;
      let anyDischarged = false;
      parentCargo.CargoItems.forEach(item => {
        if (!item.isDischarged) allDischarged = false;
        if (item.isDischarged) anyDischarged = true;
      });

      if (allDischarged) {
        parentCargo.status = 'Đã giao thành công';
      } else if (anyDischarged) {
        parentCargo.status = 'Đang dỡ hàng';
      } else {
        parentCargo.status = 'Đã lên tàu';
      }
      await parentCargo.save();
    }

    res.json({ message: 'Cập nhật trạng thái dỡ hàng thành công', cargoItem });
  } catch (error) {
    console.error('Lỗi khi dỡ hàng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi dỡ hàng' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const voyage = await Voyage.findByPk(id, {
      include: [
        {
          model: Ship,
          attributes: ["id", "shipName", "imoNumber", "flag", "status"],
        },
      ],
    });
    if (!voyage) return res.status(404).json({ message: 'Không tìm thấy chuyến đi' });
    res.json(voyage);
  } catch (error) {
    console.error('Lỗi khi lấy thông tin chuyến đi:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi gửi thông báo hải trình' });
  }
});

module.exports = router;
