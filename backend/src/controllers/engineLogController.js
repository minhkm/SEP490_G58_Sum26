const { Op } = require('sequelize');
const { 
  Voyage, VoyageCrew, Ship, Engine, EngineParameter, 
  Shift, ShiftLog, EngineLog, EngineLogValue, 
  CrewProfile, LogEditHistory, LogImage
} = require('../models');
const notificationService = require('../services/notificationService');

const isValidEngineValue = (item) => (
  item?.parameterId !== null
  && item?.parameterId !== undefined
  && item?.parameterId !== ''
  && item?.value !== null
  && item?.value !== undefined
  && item?.value !== ''
  && Number.isInteger(Number(item.parameterId))
  && Number.isFinite(Number(item.value))
);
const isOperationalEngineStatus = (status) => ['Operational', 'Active', 'Hoạt động'].includes(status);

async function notifyExceededEngineValues({ shiftId, shiftLogId, engineLogId, engineId, values, actorUserId }) {
  if (!Array.isArray(values) || values.length === 0) return;

  const parameterIds = values.map((item) => item.parameterId).filter(Boolean);
  const [shift, engine, parameters] = await Promise.all([
    Shift.findByPk(shiftId, { attributes: ['voyageId'] }),
    Engine.findByPk(engineId, { attributes: ['id', 'engineName'] }),
    EngineParameter.findAll({
      where: { id: { [Op.in]: parameterIds }, engineId },
      attributes: ['id', 'name', 'maxValue'],
    }),
  ]);

  if (!shift || !engine) return;

  const valueByParameterId = new Map(values.map((item) => [Number(item.parameterId), item.value]));
  const exceededValues = parameters.flatMap((parameter) => {
    const value = Number(valueByParameterId.get(Number(parameter.id)));
    const maxValue = Number(parameter.maxValue);
    if (parameter.maxValue == null || !Number.isFinite(value) || value <= maxValue) return [];
    return [{ parameterId: parameter.id, parameterName: parameter.name, value, maxValue }];
  });

  await notificationService.notifyEngineParameterExceeded({
    voyageId: shift.voyageId,
    engineLogId,
    shiftLogId,
    engine,
    exceededValues,
    actorUserId,
  });
}

async function safeNotifyExceededEngineValues(payload) {
  try {
    await notifyExceededEngineValues(payload);
  } catch (error) {
    console.error('Lỗi gửi cảnh báo thông số máy vượt ngưỡng:', error);
  }
}

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
    const { shiftId, engineId, note, values } = req.body;

    if (!shiftId || !engineId) {
      return res.status(400).json({ message: 'Thiếu thông tin ca trực hoặc máy cần kiểm tra' });
    }

    const engine = await Engine.findByPk(engineId, { attributes: ['id', 'status'] });
    if (!engine) {
      return res.status(404).json({ message: 'Không tìm thấy máy cần kiểm tra' });
    }
    if (!isOperationalEngineStatus(engine.status)) {
      return res.status(400).json({ message: 'Chỉ máy đang hoạt động mới được ghi nhật ký' });
    }
    if (!Array.isArray(values) || values.length < 3) {
      return res.status(400).json({ message: 'Vui lòng nhập ít nhất 3 thông số máy' });
    }
    if (values.some((item) => !isValidEngineValue(item))) {
      return res.status(400).json({ message: 'Thông số máy hoặc giá trị đo không hợp lệ' });
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

    await safeNotifyExceededEngineValues({
      shiftId,
      shiftLogId: shiftLog.id,
      engineLogId: engineLog.id,
      engineId,
      values,
      actorUserId: req.user?.id,
    });

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
    const { note, values, editReason } = req.body;
    const crewId = req.user?.profileId;

    if (!editReason || editReason.trim() === '') {
      return res.status(400).json({ message: 'Vui lòng cung cấp lý do chỉnh sửa' });
    }
    if (values !== undefined && (!Array.isArray(values) || values.length < 3)) {
      return res.status(400).json({ message: 'Vui lòng duy trì ít nhất 3 thông số máy' });
    }
    if (Array.isArray(values) && values.some((item) => !isValidEngineValue(item))) {
      return res.status(400).json({ message: 'Thông số máy hoặc giá trị đo không hợp lệ' });
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

    const createdAt = new Date(shiftLog.createdAt).getTime();
    const editWindowMs = 24 * 60 * 60 * 1000;
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > editWindowMs) {
      return res.status(403).json({ message: 'Nhật ký đã quá 24 giờ và không thể chỉnh sửa' });
    }

    // Lưu snapshot bản cũ vào LogEditHistory
    await LogEditHistory.create({
      logType: 'Engine',
      shiftLogId: shiftLog.id,
      previousContent: JSON.stringify({
        note: shiftLog.EngineLog.note,
        content: shiftLog.content,
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
    if (Array.isArray(values)) {
      await EngineLogValue.destroy({ where: { engineLogId: shiftLog.EngineLog.id } });
      const logValues = values.map(v => ({
        engineLogId: shiftLog.EngineLog.id,
        parameterId: v.parameterId,
        value: v.value
      }));
      await EngineLogValue.bulkCreate(logValues);
    }

    if (Array.isArray(values)) {
      await safeNotifyExceededEngineValues({
        shiftId: shiftLog.shiftId,
        shiftLogId: shiftLog.id,
        engineLogId: shiftLog.EngineLog.id,
        engineId: shiftLog.EngineLog.engineId,
        values,
        actorUserId: req.user?.id,
      });
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
        imageUrl: file.path, // Cloudinary URL
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
