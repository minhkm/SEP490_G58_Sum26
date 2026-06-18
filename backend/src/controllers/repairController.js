const { 
  Engine, Ship, Voyage, RepairTask, CrewProfile, VoyageCrew
} = require('../models');
const { Op } = require('sequelize');

// ============================================================
// 1. Engine Officer báo lỗi máy
//    → Tạo RepairTask + Set Engine.status = 'Failed'
//    → Nếu Main Engine → Set Voyage.status = 'Suspended'
// ============================================================
const reportFailure = async (req, res) => {
  try {
    const { engineId, description, priority } = req.body;
    const userId = req.user?.id;

    // Lấy crewProfile từ userId
    const crew = await CrewProfile.findOne({ where: { userId } });
    if (!crew) return res.status(403).json({ message: 'Không tìm thấy hồ sơ thuyền viên' });

    // Lấy thông tin engine
    const engine = await Engine.findByPk(engineId, { include: [Ship] });
    if (!engine) return res.status(404).json({ message: 'Không tìm thấy máy' });

    // Tạo RepairTask
    const task = await RepairTask.create({
      engineId,
      shipId: engine.shipId,
      reportedBy: crew.id,
      description: description || 'Máy gặp sự cố',
      priority: priority || 'Medium',
      status: 'Reported',
      reportedAt: new Date()
    });

    // Set Engine status = Failed
    await engine.update({ status: 'Failed' });

    // Nếu Main Engine → Set Voyage = Suspended
    const isMainEngine = engine.engineType === 'Diesel 2-kỳ' || engine.engineType === 'Main Engine';
    if (isMainEngine) {
      const activeVoyage = await Voyage.findOne({
        where: { shipId: engine.shipId, status: { [Op.in]: ['InProgress', 'Planning'] } }
      });
      if (activeVoyage) {
        await activeVoyage.update({ status: 'Suspended', issueReason: `Main Engine failure: ${description}` });
      }
    }

    res.status(201).json({ 
      message: 'Đã báo lỗi máy thành công',
      task,
      engineStatus: 'Failed',
      voyageSuspended: isMainEngine
    });
  } catch (error) {
    console.error('Lỗi báo lỗi máy:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 2. Lấy danh sách repair tasks (filter theo role)
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
        { model: Engine, attributes: ['engineName', 'engineType', 'status'] },
        { model: Ship, attributes: ['shipName'] },
        { model: CrewProfile, as: 'Reporter', attributes: ['fullName', 'position'] },
        { model: CrewProfile, as: 'Assignee', attributes: ['fullName', 'position'] }
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
// 3. Engine Officer giao việc sửa cho Maintenance Crew
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
// 4. Maintenance Crew bắt đầu sửa
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
// 5. Maintenance Crew hoàn thành + nộp báo cáo
// ============================================================
const completeRepair = async (req, res) => {
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

    res.json({ message: 'Đã nộp báo cáo sửa chữa', task });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 6. Engine Officer xác nhận kết quả sửa
//    → Set Engine.status = 'Running' hoặc 'Standby'
//    → Resume Voyage nếu Main Engine
// ============================================================
const verifyRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const { verifyNote, engineStatus } = req.body; // engineStatus: 'Running' or 'Standby'

    const task = await RepairTask.findByPk(id, { include: [Engine] });
    if (!task) return res.status(404).json({ message: 'Không tìm thấy task' });

    await task.update({
      status: 'Verified',
      verifyNote: verifyNote || '',
      verifiedAt: new Date()
    });

    // Set Engine status back
    const newStatus = engineStatus || 'Operational';
    await task.Engine.update({ status: newStatus });

    // Resume Voyage nếu Main Engine
    const isMainEngine = task.Engine.engineType === 'Diesel 2-kỳ' || task.Engine.engineType === 'Main Engine';
    if (isMainEngine) {
      const voyage = await Voyage.findOne({
        where: { shipId: task.shipId, status: 'Suspended' }
      });
      if (voyage) {
        await voyage.update({ status: 'InProgress', issueReason: null });
      }
    }

    res.json({ message: 'Đã xác nhận sửa chữa thành công', task });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 7. Master duyệt báo cáo cuối cùng
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

    res.json({ message: 'Master đã duyệt báo cáo', task });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 8. Lấy danh sách crew có thể giao việc (Maintenance)
// ============================================================
const getAvailableCrew = async (req, res) => {
  try {
    const { shipId } = req.query;
    
    // Lấy crew đang on voyage của tàu này
    const crews = await CrewProfile.findAll({
      include: [{
        model: VoyageCrew,
        include: [{ model: Voyage, where: { shipId, status: { [Op.in]: ['InProgress', 'Suspended'] } } }]
      }],
      where: {
        department: { [Op.in]: ['Engine', 'Deck'] }
      }
    });

    res.json(crews);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = {
  reportFailure,
  getRepairTasks,
  assignTask,
  startRepair,
  completeRepair,
  verifyRepair,
  masterReview,
  getAvailableCrew,
};
