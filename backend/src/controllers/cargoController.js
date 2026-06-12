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
