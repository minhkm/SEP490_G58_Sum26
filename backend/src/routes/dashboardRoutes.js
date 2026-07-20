const express = require('express');
const { Ship, CrewProfile, Voyage, User, VoyageCrew, Cargo, CargoItem, Equipment } = require('../models');
const { Op } = require('sequelize');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Lấy dữ liệu cho Agency Dashboard
router.get('/agency', async (req, res) => {
  try {
    const totalVessels = await Ship.count();
    const totalCrews = await CrewProfile.count();
    
    // Nếu bảng Voyage có trường status, ví dụ 'In Progress', tạm đếm những chuyến đang có
    // Nếu chưa có, tạm đếm tất cả
    const voyagesInProgress = await Voyage.count({ 
      where: { status: 'In Progress' } 
    }).catch(() => Voyage.count()); // Dự phòng lỗi nếu ko có status 'In Progress'
    
    // Pending approvals (giả lập là 0 trước)
    const pendingApprovals = 0;

    // Lấy 4 tàu mới cập nhật nhất
    const recentVessels = await Ship.findAll({
      limit: 4,
      order: [['id', 'DESC']],
      attributes: ['id', 'shipName', 'imoNumber', 'status', 'flag']
    });

    res.json({
      totalVessels,
      totalCrews,
      voyagesInProgress,
      pendingApprovals,
      recentVessels
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Agency Dashboard:', error);
    res.status(500).json({ message: 'Lỗi server khi tải dữ liệu tổng quan.', error: error.message, stack: error.stack });
  }
});

// Lấy dữ liệu cho Master Dashboard
router.get('/master', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.profileId) {
      return res.status(400).json({ message: 'Không tìm thấy profile của người dùng.' });
    }

    const { voyageId: queryVoyageId } = req.query;

    let voyageCondition = { status: { [Op.notIn]: ['Completed', 'Cancelled'] } };
    if (queryVoyageId) {
      voyageCondition = { id: queryVoyageId };
    }

    // 1. Tìm VoyageCrew của user đang login trong các voyage chưa hoàn thành (hoặc theo voyageId cụ thể)
    const userCrew = await VoyageCrew.findOne({
      where: { crewId: req.user.profileId },
      include: [{
        model: Voyage,
        where: voyageCondition
      }]
    });

    if (!userCrew) {
      return res.json(null); // Không có hải trình active
    }

    const voyageId = userCrew.Voyage.id;

    // 2. Lấy toàn bộ thông tin chi tiết của hải trình
    const activeVoyage = await Voyage.findByPk(voyageId, {
      include: [
        { model: Ship, attributes: ['id', 'shipName', 'imoNumber'] },
        { 
          model: Cargo, 
          include: [{ model: CargoItem }] 
        },
        { model: VoyageCrew }, // Để đếm nhân sự ca trực (tổng thuyền viên tham gia chuyến đi)
        { model: Equipment } // Để tính tình trạng thiết bị
      ]
    });

    if (!activeVoyage) {
      return res.json(null);
    }

    // 3. Tính toán một số thông số thống kê
    let totalWeight = 0;
    let totalVolume = 0;
    const cargos = activeVoyage.Cargos || [];
    
    cargos.forEach(cargo => {
      const items = cargo.CargoItems || [];
      items.forEach(item => {
        totalWeight += (item.weight || 0);
        totalVolume += (item.volume || 0);
      });
    });

    // Tính trạng thiết bị (Ví dụ: số thiết bị "Hoạt động" / tổng số)
    const equipments = activeVoyage.Equipment || [];
    const operationalEquipments = equipments.filter(eq => eq.status === 'Hoạt động' || eq.status === 'Operational').length;
    const equipmentStatus = equipments.length > 0 ? `${operationalEquipments}/${equipments.length} Tốt` : 'Không có dữ liệu';

    // Số nhân sự
    const totalCrewCount = (activeVoyage.VoyageCrews || []).length;

    // Chuẩn bị response payload
    const dashboardData = {
      voyage: activeVoyage,
      stats: {
        totalWeight,
        totalVolume,
        equipmentStatus,
        totalCrewCount
      }
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Master Dashboard:', error);
    res.status(500).json({ message: 'Lỗi server.', error: error.message });
  }
});

module.exports = router;
