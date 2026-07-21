const { Op } = require('sequelize');
const { 
  Voyage, VoyageCrew, Ship, Engine, EngineParameter, 
  Shift, ShiftLog, EngineLog, EngineLogValue, 
  CrewProfile, LogEditHistory, LogImage, Equipment, ShiftLogEquipment
} = require('../models');

// ============================================================
// 1. Lấy danh sách Hải trình mà MÌNH đang tham gia
// ============================================================
const getMyVoyages = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Chưa đăng nhập' });

    const crew = await CrewProfile.findOne({ where: { userId } });
    if (!crew) return res.status(403).json({ message: 'Không tìm thấy hồ sơ thuyền viên' });

    const myVoyageCrews = await VoyageCrew.findAll({
      where: { crewId: crew.id },
      attributes: ['voyageId']
    });

    if (!myVoyageCrews.length) {
      return res.status(404).json({ message: 'Bạn chưa được phân công hải trình nào' });
    }

    const myVoyageIds = myVoyageCrews.map(vc => vc.voyageId);

    const myVoyages = await Voyage.findAll({
      where: { id: { [Op.in]: myVoyageIds } },
      include: [
        { model: Ship, include: [{ model: Engine, include: [EngineParameter] }] }
      ],
      order: [['departureDate', 'DESC']]
    });

    if (!myVoyages.length) {
      return res.status(404).json({ message: 'Bạn không có hải trình nào' });
    }

    res.json(myVoyages);
  } catch (error) {
    console.error('Lỗi lấy hải trình:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 2. Lấy Ca trực — hỗ trợ filter theo ngày (?date=2026-06-15)
// ============================================================
const getShiftsForCurrentUser = async (req, res) => {
  try {
    const { voyageId } = req.params;
    const { date } = req.query; // optional: YYYY-MM-DD
    const crewId = req.user?.profileId;

    if (!crewId) {
      return res.status(401).json({ message: 'Không xác định được thông tin người dùng' });
    }

    const where = { voyageId, crewId };

    // Nếu có filter theo ngày → chỉ lấy ca trực trong ngày đó
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.startTime = { [Op.between]: [dayStart, dayEnd] };
    }

    const shifts = await Shift.findAll({
      where,
      include: [
        { model: CrewProfile, attributes: ['id', 'fullName', 'position', 'department'] }
      ],
      order: [['startTime', 'DESC']]
    });

    res.json(shifts);
  } catch (error) {
    console.error('Lỗi lấy ca trực:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 3. Tạo Nhật ký kiểm tra Máy (Engine Log)
// ============================================================
const createEngineLog = async (req, res) => {
  try {
    const { shiftId, engineId, note, values, equipmentIds } = req.body;

    if (!shiftId || !engineId) {
      return res.status(400).json({ message: 'Thiếu thông tin ca trực hoặc máy cần kiểm tra' });
    }

    // Bước 1: Tạo ShiftLog
    const shiftLog = await ShiftLog.create({
      shiftId: shiftId,
      logType: 'Engine',
      content: note || 'Kiểm tra máy định kỳ',
      createdAt: new Date()
    });

    // Bước 2: Tạo EngineLog
    const engineLog = await EngineLog.create({
      shiftLogId: shiftLog.id,
      engineId: engineId,
      note: note || ''
    });

    // Bước 3: Tạo các EngineLogValue
    if (values && values.length > 0) {
      const logValues = values.map(v => ({
        engineLogId: engineLog.id,
        parameterId: v.parameterId,
        value: v.value
      }));
      await EngineLogValue.bulkCreate(logValues);
    }

    // Bước 4: Tạo liên kết thiết bị sử dụng
    if (equipmentIds && equipmentIds.length > 0) {
      const mappings = equipmentIds.map(eqId => ({
        shiftLogId: shiftLog.id,
        equipmentId: Number(eqId)
      }));
      await ShiftLogEquipment.bulkCreate(mappings);
    }

    res.status(201).json({ 
      message: 'Ghi nhận kiểm tra máy thành công', 
      engineLog,
      shiftLog
    });
  } catch (error) {
    console.error('Lỗi tạo nhật ký máy:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 4. Cập nhật nhật ký máy (chỉnh sửa) — yêu cầu lý do
// ============================================================
const updateEngineLog = async (req, res) => {
  try {
    const { shiftLogId } = req.params;
    const { note, values, editReason, equipmentIds } = req.body;
    const crewId = req.user?.profileId;

    if (!editReason || editReason.trim() === '') {
      return res.status(400).json({ message: 'Vui lòng cung cấp lý do chỉnh sửa' });
    }

    // Tìm ShiftLog + EngineLog hiện tại
    const shiftLog = await ShiftLog.findByPk(shiftLogId, {
      include: [{
        model: EngineLog,
        include: [{ model: EngineLogValue, include: [EngineParameter] }]
      }]
    });

    if (!shiftLog || !shiftLog.EngineLog) {
      return res.status(404).json({ message: 'Không tìm thấy nhật ký' });
    }

    // Lấy danh sách thiết bị cũ để lưu lịch sử
    const oldEquips = await ShiftLogEquipment.findAll({ where: { shiftLogId } });
    const oldEquipIds = oldEquips.map(oe => oe.equipmentId);

    // Lưu snapshot bản cũ vào LogEditHistory
    await LogEditHistory.create({
      logType: 'Engine',
      shiftLogId: shiftLog.id,
      previousContent: JSON.stringify({
        note: shiftLog.EngineLog.note,
        content: shiftLog.content,
        equipmentIds: oldEquipIds,
        values: shiftLog.EngineLog.EngineLogValues?.map(v => ({
          parameterId: v.parameterId,
          parameterName: v.EngineParameter?.name,
          value: v.value
        }))
      }),
      editReason: editReason,
      editedBy: crewId,
      editedAt: new Date()
    });

    // Cập nhật EngineLog
    if (note !== undefined) {
      await shiftLog.EngineLog.update({ note });
      await shiftLog.update({ content: note });
    }

    // Cập nhật EngineLogValues
    if (values && values.length > 0) {
      await EngineLogValue.destroy({ where: { engineLogId: shiftLog.EngineLog.id } });
      const logValues = values.map(v => ({
        engineLogId: shiftLog.EngineLog.id,
        parameterId: v.parameterId,
        value: v.value
      }));
      await EngineLogValue.bulkCreate(logValues);
    }

    // Cập nhật danh sách thiết bị
    if (equipmentIds !== undefined) {
      await ShiftLogEquipment.destroy({ where: { shiftLogId } });
      if (equipmentIds && equipmentIds.length > 0) {
        const mappings = equipmentIds.map(eqId => ({
          shiftLogId: Number(shiftLogId),
          equipmentId: Number(eqId)
        }));
        await ShiftLogEquipment.bulkCreate(mappings);
      }
    }

    res.json({ message: 'Cập nhật nhật ký thành công' });
  } catch (error) {
    console.error('Lỗi cập nhật nhật ký máy:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 5. Xem lịch sử kiểm tra máy theo Ca trực (bao gồm ảnh)
// ============================================================
const getEngineLogsByShift = async (req, res) => {
  try {
    const { shiftId } = req.params;

    const shiftLogs = await ShiftLog.findAll({
      where: { shiftId, logType: 'Engine' },
      include: [
        {
          model: EngineLog,
          include: [
            { model: Engine, attributes: ['engineName', 'engineType'] },
            { 
              model: EngineLogValue, 
              include: [{ model: EngineParameter, attributes: ['name', 'minValue', 'maxValue'] }]
            }
          ]
        },
        { model: LogImage, attributes: ['id', 'imageUrl', 'caption', 'createdAt'] },
        { model: Equipment, attributes: ['id', 'equipmentName', 'equipmentType', 'location', 'status'], as: 'Equipments' },
        { model: LogEditHistory, attributes: ['id', 'editReason', 'editedAt', 'previousContent'],
          include: [{ model: CrewProfile, attributes: ['fullName'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(shiftLogs);
  } catch (error) {
    console.error('Lỗi lấy lịch sử:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 6. Xem toàn bộ lịch sử theo Hải trình
// ============================================================
const getEngineLogsByVoyage = async (req, res) => {
  try {
    const { voyageId } = req.params;

    const shifts = await Shift.findAll({
      where: { voyageId },
      include: [
        { model: CrewProfile, attributes: ['fullName', 'position'] },
        { 
          model: ShiftLog,
          where: { logType: 'Engine' },
          required: false,
          include: [{
            model: EngineLog,
            include: [
              { model: Engine, attributes: ['engineName', 'engineType'] },
              { 
                model: EngineLogValue, 
                include: [{ model: EngineParameter, attributes: ['name', 'minValue', 'maxValue'] }]
              }
            ]
          }]
        }
      ],
      order: [['startTime', 'DESC']]
    });

    res.json(shifts);
  } catch (error) {
    console.error('Lỗi lấy lịch sử theo hải trình:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 7. Upload ảnh cho nhật ký
// ============================================================
const uploadLogImages = async (req, res) => {
  try {
    const { shiftLogId } = req.params;
    const crewId = req.user?.profileId;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Không có ảnh nào được tải lên' });
    }

    const shiftLog = await ShiftLog.findByPk(shiftLogId);
    if (!shiftLog) {
      return res.status(404).json({ message: 'Không tìm thấy nhật ký' });
    }

    const images = await Promise.all(
      req.files.map(file => LogImage.create({
        logType: 'Engine',
        shiftLogId: parseInt(shiftLogId),
        imageUrl: `/uploads/logs/${file.filename}`,
        caption: '',
        uploadedBy: crewId
      }))
    );

    res.status(201).json({ message: 'Upload ảnh thành công', images });
  } catch (error) {
    console.error('Lỗi upload ảnh:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 8. Xem lịch sử chỉnh sửa
// ============================================================
const getEditHistory = async (req, res) => {
  try {
    const { shiftLogId } = req.params;

    const history = await LogEditHistory.findAll({
      where: { shiftLogId },
      include: [{ model: CrewProfile, attributes: ['fullName', 'position'] }],
      order: [['editedAt', 'DESC']]
    });

    res.json(history);
  } catch (error) {
    console.error('Lỗi lấy lịch sử chỉnh sửa:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = {
  getMyVoyages,
  getShiftsForCurrentUser,
  createEngineLog,
  updateEngineLog,
  getEngineLogsByShift,
  getEngineLogsByVoyage,
  uploadLogImages,
  getEditHistory
};
