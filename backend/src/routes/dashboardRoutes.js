const express = require('express');
const { Ship, CrewProfile, Voyage, User, VoyageCrew, Cargo, CargoItem, Equipment, VoyageOperationReport } = require('../models');
const { Op } = require('sequelize');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

// Lấy dữ liệu cho bảng điều khiển Admin
const getAdminDashboard = async (req, res) => {
  try {
    const totalVessels = await Ship.count();
    const totalCrews = await CrewProfile.count();
    
    const voyagesInProgress = await Voyage.count({ 
      where: { status: { [Op.notIn]: ['Completed', 'Cancelled'] } } 
    }).catch(() => 0);
    
    const pendingApprovals = 0;

    // Lấy danh sách các hải trình mới nhất / đang hoạt động
    const recentVoyages = await Voyage.findAll({
      limit: 6,
      order: [['id', 'DESC']],
      include: [
        {
          model: Ship,
          attributes: ['id', 'shipName', 'imoNumber', 'status', 'flag']
        },
        {
          model: Cargo,
          attributes: ['id', 'cargoName', 'cargoType', 'totalWeight', 'totalVolume', 'status']
        },
        {
          model: VoyageCrew,
          include: [
            {
              model: CrewProfile,
              attributes: ['id', 'fullName', 'position', 'department']
            }
          ]
        }
      ]
    });

    const activeVoyages = recentVoyages.map((voyage) => {
      const v = voyage.toJSON();
      const cargos = v.Cargos || [];
      const totalWeight = cargos.reduce((sum, c) => sum + (Number(c.totalWeight) || 0), 0);
      const totalVolume = cargos.reduce((sum, c) => sum + (Number(c.totalVolume) || 0), 0);
      const cargoTypes = [...new Set(cargos.map((c) => c.cargoType).filter(Boolean))];
      const cargoList = cargos.map((c) => ({
        id: c.id,
        name: c.cargoName || c.cargoType || 'Lô hàng',
        type: c.cargoType || '',
        weight: Number(c.totalWeight) || 0,
        volume: Number(c.totalVolume) || 0
      }));

      const crews = v.VoyageCrews || [];
      const captainCrew = crews.find((vc) => {
        const role = vc.role || '';
        const pos = vc.CrewProfile?.position || '';
        return role.includes('Master') || role.includes('Captain') || pos.includes('Thuyền trưởng') || pos.includes('Master');
      });
      const captainName = captainCrew?.CrewProfile?.fullName || 'Chưa phân công';

      // Ước tính % tiến độ thời gian hải trình
      let progressPercent = 0;
      if (v.departureDate && v.arrivalDate) {
        const start = new Date(v.departureDate).getTime();
        const end = new Date(v.arrivalDate).getTime();
        const now = new Date().getTime();
        if (now >= end || v.status === 'Completed') {
          progressPercent = 100;
        } else if (now <= start) {
          progressPercent = v.status === 'Underway' ? 10 : 0;
        } else {
          progressPercent = Math.min(95, Math.max(10, Math.round(((now - start) / (end - start)) * 100)));
        }
      } else if (v.status === 'Underway') {
        progressPercent = 50;
      } else if (v.status === 'Completed') {
        progressPercent = 100;
      }

      return {
        id: v.id,
        shipId: v.shipId,
        shipName: v.Ship?.shipName || 'Chưa gán tàu',
        imoNumber: v.Ship?.imoNumber || '',
        departurePort: v.departurePort || '---',
        destinationPort: v.destinationPort || '---',
        departureDate: v.departureDate || null,
        arrivalDate: v.arrivalDate || null,
        status: v.status || 'Draft',
        routeStatus: v.routeStatus || 'Draft',
        totalWeight,
        totalVolume,
        cargoTypes,
        cargoList,
        cargoCount: cargos.length,
        crewCount: crews.length,
        captainName,
        progressPercent
      };
    });

    res.json({
      totalVessels,
      totalCrews,
      voyagesInProgress,
      pendingApprovals,
      activeVoyages
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu bảng điều khiển Admin:', error);
    res.status(500).json({ message: 'Lỗi server khi tải dữ liệu tổng quan.', error: error.message });
  }
};

router.get('/admin', authMiddleware, requireRole('Admin'), getAdminDashboard);

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

    const latestOperationReport = await VoyageOperationReport.findOne({
      where: { voyageId },
      attributes: { exclude: ['cargoSnapshot', 'attendanceSnapshot'] },
      include: [{ model: CrewProfile, as: 'Preparer', attributes: ['id', 'fullName'] }],
      order: [['finalizedAt', 'DESC'], ['id', 'DESC']]
    });

    // Chuẩn bị response payload
    const dashboardData = {
      voyage: activeVoyage,
      stats: {
        totalWeight,
        totalVolume,
        equipmentStatus,
        totalCrewCount
      },
      latestOperationReport
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Master Dashboard:', error);
    res.status(500).json({ message: 'Lỗi server.', error: error.message });
  }
});

module.exports = router;
