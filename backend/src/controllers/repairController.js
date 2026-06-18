const { 
  Engine, Ship, Voyage, RepairTask, CrewProfile
} = require('../models');
const { Op } = require('sequelize');

// ============================================================
// 1. E/O (Trưởng máy) bắt đầu sửa máy
//    - Máy chính hỏng → dừng tàu (Voyage = Suspended)
//    - Máy đèn hỏng → chuyển máy dự phòng
// ============================================================
const startRepair = async (req, res) => {
  try {
    const { engineId, issue, standbyEngineId } = req.body;
    const userId = req.user?.id;

    const crew = await CrewProfile.findOne({ where: { userId } });
    if (!crew) return res.status(403).json({ message: 'Không tìm thấy hồ sơ thuyền viên' });

    const engine = await Engine.findByPk(engineId, { include: [Ship] });
    if (!engine) return res.status(404).json({ message: 'Không tìm thấy máy' });

    const isMain = engine.engineType === 'Diesel 2-kỳ' || engine.engineType === 'Main Engine';

    // Set Engine = Failed
    await engine.update({ status: 'Failed' });

    // Máy chính → dừng tàu
    let voyageSuspended = false;
    if (isMain) {
      const voyage = await Voyage.findOne({
        where: { shipId: engine.shipId, status: { [Op.in]: ['InProgress', 'Planning'] } }
      });
      if (voyage) {
        await voyage.update({ status: 'Suspended', issueReason: `Máy chính hỏng: ${issue}` });
        voyageSuspended = true;
      }
    }

    // Máy đèn → chuyển dự phòng
    let standbyActivated = null;
    if (!isMain && standbyEngineId) {
      const standby = await Engine.findByPk(standbyEngineId);
      if (standby) {
        await standby.update({ status: 'Running' });
        standbyActivated = standby.engineName;
      }
    }

    // Tạo record
    const task = await RepairTask.create({
      engineId,
      shipId: engine.shipId,
      reportedBy: crew.id,
      description: issue || 'Máy gặp sự cố',
      priority: isMain ? 'High' : 'Medium',
      status: 'Repairing',
      reportedAt: new Date()
    });

    res.status(201).json({ 
      message: isMain 
        ? '⚠️ Máy chính hỏng — Tàu đã dừng. Đang sửa chữa...' 
        : `Đang sửa chữa${standbyActivated ? ` — Đã chuyển sang ${standbyActivated}` : ''}`,
      task, isMain, voyageSuspended, standbyActivated
    });
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 2. E/O sửa xong → viết báo cáo
//    Ghi: vấn đề gì, sửa thế nào, thông số sau sửa
// ============================================================
const submitReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { repairNote, engineStatus } = req.body;

    const task = await RepairTask.findByPk(id, { include: [Engine] });
    if (!task) return res.status(404).json({ message: 'Không tìm thấy' });

    // Cập nhật report
    await task.update({
      status: 'Completed',
      repairNote: repairNote || '',
      completedAt: new Date()
    });

    // Set Engine status
    const newStatus = engineStatus || 'Operational';
    await task.Engine.update({ status: newStatus });

    res.json({ message: 'Đã gửi báo cáo sửa chữa cho thuyền trưởng', task });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 3. Thuyền trưởng duyệt báo cáo → tiếp tục hải trình
// ============================================================
const masterReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const task = await RepairTask.findByPk(id, { include: [Engine] });
    if (!task) return res.status(404).json({ message: 'Không tìm thấy' });

    await task.update({
      status: 'Reviewed',
      reviewNote: reviewNote || '',
      reviewedAt: new Date()
    });

    // Máy chính sửa xong → resume voyage
    const isMain = task.Engine.engineType === 'Diesel 2-kỳ' || task.Engine.engineType === 'Main Engine';
    let voyageResumed = false;
    if (isMain) {
      const voyage = await Voyage.findOne({
        where: { shipId: task.shipId, status: 'Suspended' }
      });
      if (voyage) {
        await voyage.update({ status: 'InProgress', issueReason: null });
        voyageResumed = true;
      }
    }

    res.json({ 
      message: voyageResumed 
        ? '✅ Đã duyệt — Tàu tiếp tục hải trình' 
        : '✅ Đã duyệt báo cáo sửa chữa',
      task, voyageResumed 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 4. Lấy danh sách
// ============================================================
const getRepairTasks = async (req, res) => {
  try {
    const { status, shipId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (shipId) where.shipId = shipId;

    const tasks = await RepairTask.findAll({
      where,
      include: [
        { model: Engine, attributes: ['id', 'engineName', 'engineType', 'status'] },
        { model: Ship, attributes: ['id', 'shipName'] },
        { model: CrewProfile, as: 'Reporter', attributes: ['id', 'fullName', 'position'] },
      ],
      order: [['reportedAt', 'DESC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 5. Lấy máy đèn dự phòng
// ============================================================
const getStandbyGenerators = async (req, res) => {
  try {
    const { shipId, excludeEngineId } = req.query;
    const generators = await Engine.findAll({
      where: {
        shipId,
        id: { [Op.ne]: excludeEngineId || 0 },
        engineType: { [Op.notIn]: ['Diesel 2-kỳ', 'Main Engine'] },
        status: { [Op.in]: ['Operational', 'Standby'] }
      }
    });
    res.json(generators);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = {
  startRepair,
  submitReport,
  masterReview,
  getRepairTasks,
  getStandbyGenerators,
};
