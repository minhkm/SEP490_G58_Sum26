const { Cargo, Voyage, CargoAllocation, CargoHold, Ship, CargoItem, VoyageCrew } = require("../models");

exports.getAllCargos = async (req, res) => {
  try {
    const userRole = req.user.role;
    let whereClause = {};
    let shipIds = [];

    if (userRole !== 'Admin' && userRole !== 'Agency') {
      const profileId = req.user.profileId;
      if (!profileId) {
         return res.json({ success: true, stats: { totalWeight: 0, inTransit: 0, remainingCapacity: 0, remainingCapacityPercent: 0, delayed: 0 }, data: [] });
      }

      const userVoyages = await VoyageCrew.findAll({
        where: { crewId: profileId },
        attributes: ['voyageId']
      });
      const voyageIds = userVoyages.map(vc => vc.voyageId);
      whereClause = { voyageId: voyageIds };

      const voyagesInfo = await Voyage.findAll({ where: { id: voyageIds }, attributes: ['shipId'] });
      shipIds = voyagesInfo.map(v => v.shipId);
    }

    // Fetch all cargos with related data
    const cargos = await Cargo.findAll({
      where: whereClause,
      include: [
        {
          model: Voyage,
          include: [{ model: Ship }]
        },
        {
          model: CargoAllocation,
          include: [{ model: CargoHold }]
        },
        {
          model: CargoItem
        }
      ],
      order: [["id", "DESC"]]
    });

    // Calculate Stats
    let totalWeight = 0;
    let inTransit = 0;
    let delayed = 0;

    cargos.forEach(c => {
      totalWeight += (c.totalWeight || 0);
      if (c.status !== "Đã giao" && c.status !== "Delivered") inTransit++;
      if (c.status === "Chậm trễ" || c.status === "Delayed") delayed++;
    });

    // Fetch cargo holds to calculate total remaining capacity globally (or specific to ships)
    let holdWhereClause = {};
    if (shipIds.length > 0) {
      holdWhereClause = { shipId: shipIds };
    } else if (userRole !== 'Admin' && userRole !== 'Agency') {
      // Nếu không phải admin và cũng ko có shipIds (do chưa gán tàu), cho maxCap = 0
      holdWhereClause = { id: -1 }; 
    }

    const allHolds = await CargoHold.findAll({ where: holdWhereClause });
    let maxCap = 0;
    let currentUsage = 0;
    allHolds.forEach(h => {
      maxCap += (h.maxCapacity || 0);
      currentUsage += (h.currentUsage || 0);
    });

    let remainingCapacity = maxCap - currentUsage;
    if (remainingCapacity < 0) remainingCapacity = 0;
    let remainingCapacityPercent = maxCap > 0 ? Math.round((remainingCapacity / maxCap) * 100) : 0;

    res.json({
      success: true,
      stats: {
        totalWeight,
        inTransit,
        remainingCapacity,
        remainingCapacityPercent,
        delayed
      },
      data: cargos
    });
  } catch (error) {
    console.error("Error fetching cargos:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy dữ liệu hàng hóa" });
  }
};

exports.getCargoById = async (req, res) => {
  try {
    const cargo = await Cargo.findByPk(req.params.id, {
      include: [
        {
          model: Voyage,
          include: [{ model: Ship }]
        },
        {
          model: CargoAllocation,
          include: [{ model: CargoHold }]
        },
        {
          model: CargoItem
        }
      ]
    });

    if (!cargo) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lô hàng" });
    }

    res.json({ success: true, data: cargo });
  } catch (error) {
    console.error("Error fetching cargo detail:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy chi tiết lô hàng" });
  }
};

exports.createCargo = async (req, res) => {
  try {
    const { voyageId, cargoName, cargoType, totalWeight, totalVolume, status } = req.body;

    const newCargo = await Cargo.create({
      voyageId: voyageId || null,
      cargoName,
      cargoType,
      totalWeight,
      totalVolume,
      status: status || "Đã ở cảng"
    });

    // Tự động tạo 1 CargoItem mặc định bằng toàn bộ khối lượng lô hàng
    await CargoItem.create({
      cargoId: newCargo.id,
      itemName: cargoName,
      quantity: 1,
      weight: totalWeight,
      volume: totalVolume,
      isLoaded: false
    });

    res.json({ success: true, message: "Thêm lô hàng thành công", data: newCargo });
  } catch (error) {
    console.error("Error creating cargo:", error);
    res.status(500).json({ success: false, message: "Lỗi thêm lô hàng" });
  }
};

exports.updateCargo = async (req, res) => {
  try {
    const cargoId = req.params.id;
    const { voyageId, cargoName, cargoType, totalWeight, totalVolume, status } = req.body;

    const cargo = await Cargo.findByPk(cargoId);
    if (!cargo) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lô hàng" });
    }

    await cargo.update({
      voyageId: voyageId || cargo.voyageId,
      cargoName: cargoName || cargo.cargoName,
      cargoType: cargoType || cargo.cargoType,
      totalWeight: totalWeight !== undefined ? totalWeight : cargo.totalWeight,
      totalVolume: totalVolume !== undefined ? totalVolume : cargo.totalVolume,
      status: status || cargo.status
    });

    res.json({ success: true, message: "Cập nhật lô hàng thành công", data: cargo });
  } catch (error) {
    console.error("Error updating cargo:", error);
    res.status(500).json({ success: false, message: "Lỗi cập nhật lô hàng" });
  }
};

exports.deleteCargo = async (req, res) => {
  try {
    const cargoId = req.params.id;

    const cargo = await Cargo.findByPk(cargoId);
    if (!cargo) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lô hàng" });
    }

    // Delete related allocations and items first to avoid foreign key constraints
    await CargoAllocation.destroy({ where: { cargoId: cargoId } });
    await CargoItem.destroy({ where: { cargoId: cargoId } });

    await cargo.destroy();

    res.json({ success: true, message: "Xoá lô hàng thành công" });
  } catch (error) {
    console.error("Error deleting cargo:", error);
    res.status(500).json({ success: false, message: "Lỗi xoá lô hàng" });
  }
};
