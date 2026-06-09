const { Cargo, Voyage, CargoAllocation, CargoHold, Ship, CargoItem } = require("../models");

exports.getAllCargos = async (req, res) => {
  try {
    // Fetch all cargos with related data
    const cargos = await Cargo.findAll({
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

    // Fetch all cargo holds to calculate total remaining capacity globally
    const allHolds = await CargoHold.findAll();
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
