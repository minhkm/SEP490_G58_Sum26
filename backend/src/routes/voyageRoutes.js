const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sequelize, Voyage, User, CrewProfile, VoyageCrew, Ship, Attendance, Cargo, CargoItem, ShipCapacity, CargoHold, CargoAllocation, Equipment } = require('../models');
const { sendCrewCredentialsEmail, sendRouteApprovalEmail } = require('../services/emailService');
const { notifyCrewAssignedToVoyage, notifyAttendanceUpdated, notifyVoyageUpdated } = require('../services/notificationService');
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
          return res.status(400).json({ message: `Vượt quá tải trọng tàu. (Tối đa: ${shipCap.maxCargoWeight} MT, Hiện tại: ${totalWeight} MT)` });
        }
        if (totalVolume > shipCap.maxCargoVolume) {
          await t.rollback();
          return res.status(400).json({ message: `Vượt quá thể tích tàu. (Tối đa: ${shipCap.maxCargoVolume} CBM, Hiện tại: ${totalVolume} CBM)` });
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

    // Tạo Equipment cho hải trình
    if (equipmentList && equipmentList.length > 0) {
      const validEquipments = equipmentList.filter(e => e.name && e.name.trim() !== '');
      if (validEquipments.length > 0) {
        const eqData = validEquipments.map(e => ({
          voyageId: voyage.id,
          equipmentName: e.name,
          equipmentType: e.type || 'Khác',
          location: e.location || 'Khác',
          status: 'Operational'
        }));
        await Equipment.bulkCreate(eqData, { transaction: t });
      }
    }

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
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách hàng hóa', error: error.message });
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
         return res.status(403).json({ message: 'Admin không được phép thay đổi trạng thái khi tàu đã bắt đầu làm hàng (Loading) hoặc đang hoạt động!' });
      }

      if (status && status !== voyage.status && !['Planning', 'Cancelled'].includes(status)) {
         return res.status(403).json({ message: 'Admin chỉ được phép chuyển trạng thái thành Planning hoặc Cancelled!' });
      }
    }

    if (status === 'Cancelled' && voyage.status !== 'Planning' && voyage.status !== 'Cancelled') {
      return res.status(400).json({ message: 'Không thể hủy hải trình khi đã bắt đầu làm hàng hoặc di chuyển!' });
    }

    const nextStatus = status || voyage.status;
    let nextIsCrewSufficient = voyage.isCrewSufficient;

    if (status) voyage.status = status;
    if (departureDate) voyage.departureDate = departureDate;
    if (arrivalDate) voyage.arrivalDate = arrivalDate;
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
        return res.status(403).json({ message: 'Đại phó chỉ được chỉnh sửa lộ trình khi trạng thái tàu là Loaded!' });
      }
      voyage.routeWaypoints = routeWaypoints;
    }
    
    let routeStatusChangedToPending = false;
    if (routeStatus !== undefined && routeStatus !== voyage.routeStatus) {
      if (routeStatus === 'Pending') {
        if (userRole === 'chiefofficer' && voyage.status !== 'Loaded') {
           return res.status(403).json({ message: 'Đại phó chỉ được gửi duyệt lộ trình khi trạng thái tàu là Loaded!' });
        }
        routeStatusChangedToPending = true;
      }
      voyage.routeStatus = routeStatus;
    }

    const isShipStaff = userRole === 'chiefofficer' || userRole === 'master';

    // Process attendanceList if provided and allowed
    if (isShipStaff && attendanceList && Array.isArray(attendanceList)) {
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
        return res.status(400).json({ message: 'Thuyền trưởng chưa điểm danh hoặc nhân sự chưa đủ, không thể chuyển trạng thái Đang di chuyển (Underway)!' });
      }
      if (voyage.routeStatus !== 'Approved' && routeStatus !== 'Approved') {
        return res.status(400).json({ message: 'Lộ trình chưa được phê duyệt, không thể chuyển trạng thái Đang di chuyển (Underway)!' });
      }
      // Check if cargo is loaded (or being marked as loaded in this request)
      const nextIsCargoLoaded = req.body.isCargoLoaded !== undefined ? req.body.isCargoLoaded : voyage.isCargoLoaded;
      if (!nextIsCargoLoaded) {
        // Also check if they are marking cargo loaded right now
        let allCargoLoaded = true;
        if (cargoList && Array.isArray(cargoList) && cargoList.length > 0) {
           for (const item of cargoList) {
             if (!item.isLoaded) allCargoLoaded = false;
           }
        } else {
           allCargoLoaded = false;
        }
        if (!allCargoLoaded) {
           return res.status(400).json({ message: 'Chưa bốc xếp hàng hóa xong, không thể chuyển trạng thái Đang di chuyển (Underway)!' });
        }
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
        return res.status(400).json({ message: 'Chưa dỡ hết hàng hóa, không thể chuyển trạng thái Đã dỡ hàng xong (Discharged)!' });
      }
    }

    if (nextStatus === 'Homeward Bounding') {
      const requiredCrewCount = await VoyageCrew.count({ where: { voyageId: id } });
      const postDischargeAttendanceCount = await Attendance.count({ 
        where: { voyageId: id, attendanceType: 'PostDischarge' } 
      });

      if (postDischargeAttendanceCount === 0 || postDischargeAttendanceCount < requiredCrewCount) {
        return res.status(400).json({ message: 'Chưa hoàn thành điểm danh "Kết thúc chuyến đi" cho toàn bộ thuyền viên, không thể chuyển trạng thái Đang quay về (Homeward Bounding)!' });
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
    res.status(500).json({ message: 'Lỗi server khi cập nhật chuyến đi', error: error.message });
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
    const crewList = await VoyageCrew.findAll({
      where: { voyageId: id },
      include: [{ model: CrewProfile, attributes: ['id', 'fullName', 'position', 'department'] }]
    });

    let whereClause = { voyageId: id };
    if (type) whereClause.attendanceType = type;

    const attendances = await Attendance.findAll({
      where: whereClause
    });

    // Nếu lọc theo ngày (chỉ cho loại Daily)
    let filteredAttendances = attendances;
    if (type === 'Daily' && date) {
      filteredAttendances = attendances.filter(a => {
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
        recordedAt: att ? att.recordedAt : null
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách điểm danh:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách điểm danh' });
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

    if (!attendanceList || !Array.isArray(attendanceList)) {
      return res.status(400).json({ message: 'Danh sách điểm danh không hợp lệ' });
    }

    // Với Daily, dùng date được gửi lên (thường là ngày hiện tại). 
    // Với PreDeparture/PostDischarge, không cần quan tâm date.
    
    const attendanceChanges = [];

    for (const item of attendanceList) {
      let whereClause = { voyageId: id, crewId: item.crewId, attendanceType: type };
      
      const existingAttendances = await Attendance.findAll({ where: whereClause });
      let targetAtt = null;

      if (type === 'Daily') {
        // Tìm attendance của ngày đó
        targetAtt = existingAttendances.find(a => {
           if (!a.recordedAt) return false;
           return new Date(a.recordedAt).toISOString().split('T')[0] === date;
        });
      } else {
        // PreDeparture, PostDischarge thường chỉ có 1
        targetAtt = existingAttendances[0];
      }

      if (targetAtt) {
        const nextAttendanceStatus = item.isPresent ? 'Present' : 'Absent';
        if (targetAtt.status !== nextAttendanceStatus) {
          targetAtt.status = nextAttendanceStatus;
          targetAtt.recordedAt = new Date();
          await targetAtt.save();
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
          recordedAt: recordDate
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
    res.status(500).json({ message: 'Lỗi server khi lưu điểm danh' });
  }
});

// Dỡ hàng (Discharge)
router.put('/:id/cargo/:itemId/discharge', authMiddleware, async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { isDischarged } = req.body;

    const voyage = await Voyage.findByPk(id);
    if (!voyage) return res.status(404).json({ message: 'Không tìm thấy chuyến đi' });

    const cargoItem = await CargoItem.findByPk(itemId);
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

    cargoItem.isDischarged = isDischarged;
    await cargoItem.save();

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
    res.status(500).json({ message: 'Lỗi server khi dỡ hàng', error: error.message });
  }
});

module.exports = router;
