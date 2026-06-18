const { 
  Engine, Ship, Voyage, RepairTask, CrewProfile, VoyageCrew
} = require('../models');
const { Op } = require('sequelize');

// ============================================================
// 1. Engine Officer tạo Repair Task
//    - Dựa trên nhật ký ca trực / thông số vượt ngưỡng
//    - Máy chính hỏng → PHẢI dừng tàu (Voyage = Suspended)
//    - Máy đèn hỏng → Chuyển sang máy đèn dự phòng
// ============================================================
const createRepairTask = async (req, res) => {
  try {
    const { engineId, description, priority, assignedTo, standbyEngineId } = req.body;
    const userId = req.user?.id;

    const crew = await CrewProfile.findOne({ where: { userId } });
    if (!crew) return res.status(403).json({ message: 'Không tìm thấy hồ sơ thuyền viên' });

    const engine = await Engine.findByPk(engineId, { include: [Ship] });
    if (!engine) return res.status(404).json({ message: 'Không tìm thấy máy' });

    // Xác định loại máy
    const isMainEngine = engine.engineType === 'Diesel 2-kỳ' || engine.engineType === 'Main Engine';

    // Set Engine = Failed
    await engine.update({ status: 'Failed' });

    // === MÁY CHÍNH HỎNG → Bắt buộc dừng tàu ===
    let voyageSuspended = false;
    if (isMainEngine) {
      const activeVoyage = await Voyage.findOne({
        where: { shipId: engine.shipId, status: { [Op.in]: ['InProgress', 'Planning'] } }
      });
      if (activeVoyage) {
        await activeVoyage.update({ 
          status: 'Suspended', 
          issueReason: `Máy chính hỏng: ${description}` 
        });
        voyageSuspended = true;
      }
    }

    // === MÁY ĐÈN HỎNG → Chuyển sang máy đèn dự phòng ===
    let standbyActivated = null;
    if (!isMainEngine && standbyEngineId) {
      const standbyEngine = await Engine.findByPk(standbyEngineId);
      if (standbyEngine) {
        await standbyEngine.update({ status: 'Running' });
        standbyActivated = standbyEngine.engineName;
      }
    }

    // Tạo RepairTask
    const task = await RepairTask.create({
      engineId,
      shipId: engine.shipId,
      reportedBy: crew.id,
      assignedTo: assignedTo || null,
      description: description || 'Máy gặp sự cố',
      priority: priority || (isMainEngine ? 'High' : 'Medium'),
      status: assignedTo ? 'Assigned' : 'Reported',
      reportedAt: new Date(),
      assignedAt: assignedTo ? new Date() : null
    });

    res.status(201).json({ 
      message: isMainEngine 
        ? '⚠️ Máy chính hỏng — Tàu đã dừng để sửa chữa' 
        : `Đã tạo lệnh sửa chữa máy đèn${standbyActivated ? ` — Đã chuyển sang ${standbyActivated}` : ''}`,
      task,
      isMainEngine,
      voyageSuspended,
      standbyActivated
    });
  } catch (error) {
    console.error('Lỗi tạo repair task:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 2. Lấy danh sách repair tasks
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
        { model: CrewProfile, as: 'Assignee', attributes: ['id', 'fullName', 'position'] }
      ],
      order: [['reportedAt', 'DESC']]
    });

    res.json(tasks);
  } catch (error) {
    console.error('Lỗi lấy danh sách repair tasks:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 3. Engine Officer giao việc sửa cho thợ máy
// ============================================================
const assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const task = await RepairTask.findByPk(id);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });

    await task.update({
      assignedTo,
      status: 'Assigned',
      assignedAt: new Date()
    });

    res.json({ message: 'Đã giao việc sửa chữa', task });
  } catch (error) {
    console.error('Lỗi giao việc:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 4. Thợ máy bắt đầu sửa
// ============================================================
const startRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await RepairTask.findByPk(id);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });

    await task.update({ status: 'InProgress' });
    res.json({ message: 'Đã bắt đầu sửa chữa', task });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 5. Thợ máy sửa xong → Gửi báo cáo sửa chữa (Repair Log)
// ============================================================
const submitRepairLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { repairNote } = req.body;

    const task = await RepairTask.findByPk(id);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });

    await task.update({
      status: 'Completed',
      repairNote: repairNote || '',
      completedAt: new Date()
    });

    res.json({ message: 'Đã gửi báo cáo sửa chữa', task });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 6. Engine Officer kiểm tra + ghi nhận báo cáo (Record Repair Log)
//    → Set Engine.status = Operational / Standby
//    → Máy chính sửa xong → Resume Voyage
// ============================================================
const verifyAndRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { verifyNote, engineStatus } = req.body;

    const task = await RepairTask.findByPk(id, { include: [Engine] });
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });

    // Ghi nhận kết quả
    await task.update({
      status: 'Verified',
      verifyNote: verifyNote || '',
      verifiedAt: new Date()
    });

    // Cập nhật trạng thái máy
    const newStatus = engineStatus || 'Operational';
    await task.Engine.update({ status: newStatus });

    // Máy chính sửa xong → Resume Voyage
    const isMainEngine = task.Engine.engineType === 'Diesel 2-kỳ' || task.Engine.engineType === 'Main Engine';
    let voyageResumed = false;
    if (isMainEngine && newStatus === 'Operational') {
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
        ? '✅ Máy chính đã sửa xong — Tàu tiếp tục hành trình' 
        : '✅ Đã ghi nhận kết quả sửa chữa',
      task, voyageResumed 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 7. Thuyền trưởng (Master) duyệt báo cáo cuối cùng
// ============================================================
const masterReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const task = await RepairTask.findByPk(id);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });

    await task.update({
      status: 'Reviewed',
      reviewNote: reviewNote || '',
      reviewedAt: new Date()
    });

    res.json({ message: 'Thuyền trưởng đã duyệt báo cáo', task });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 8. Lấy danh sách thợ máy có thể giao việc
// ============================================================
const getAvailableCrew = async (req, res) => {
  try {
    const { shipId } = req.query;
    
    const crews = await CrewProfile.findAll({
      include: [{
        model: VoyageCrew,
        required: true,
        include: [{ 
          model: Voyage, 
          where: { shipId, status: { [Op.in]: ['InProgress', 'Suspended'] } } 
        }]
      }],
      where: {
        department: 'Engine'
      }
    });

    res.json(crews);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 9. Lấy danh sách máy đèn dự phòng (còn hoạt động)
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
  createRepairTask,
  getRepairTasks,
  assignTask,
  startRepair,
  submitRepairLog,
  verifyAndRecord,
  masterReview,
  getAvailableCrew,
  getStandbyGenerators,
};
