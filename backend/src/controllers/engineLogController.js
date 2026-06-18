const { Op } = require('sequelize');
const { 
  Voyage, VoyageCrew, Ship, Engine, EngineParameter, 
  Shift, ShiftLog, EngineLog, EngineLogValue, 
  CrewProfile 
} = require('../models');

// ============================================================
// 1. Lấy Hải trình mà MÌNH đang tham gia (chưa hoàn thành)
//    - Check user có trong VoyageCrew không
//    - Chỉ lấy hải trình InProgress hoặc Suspended
// ============================================================
const getActiveVoyage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Chưa đăng nhập' });

    // Tìm CrewProfile của user
    const crew = await CrewProfile.findOne({ where: { userId } });
    if (!crew) return res.status(403).json({ message: 'Không tìm thấy hồ sơ thuyền viên' });

    // Tìm hải trình mà user đang tham gia (chưa Completed)
    const voyageCrew = await VoyageCrew.findOne({
      where: { crewId: crew.id },
      include: [{
        model: Voyage,
        where: { status: { [Op.in]: ['InProgress', 'Suspended', 'Planning'] } },
        include: [
          { model: Ship, include: [{ model: Engine, include: [EngineParameter] }] }
        ]
      }],
      order: [[Voyage, 'departureDate', 'DESC']]
    });

    if (!voyageCrew || !voyageCrew.Voyage) {
      return res.status(404).json({ message: 'Bạn không có hải trình nào đang hoạt động' });
    }

    res.json(voyageCrew.Voyage);
  } catch (error) {
    console.error('Lỗi lấy hải trình:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 2. Lấy danh sách Ca trực của hải trình đang hoạt động
//    (Chỉ lấy ca của bộ phận Engine)
// ============================================================
const getShiftsForCurrentUser = async (req, res) => {
  try {
    const { voyageId } = req.params;
    const crewId = req.user?.profileId; // Lấy từ JWT token của người đang đăng nhập

    if (!crewId) {
      return res.status(401).json({ message: 'Không xác định được thông tin người dùng' });
    }

    // Chỉ lấy đúng ca trực của người đăng nhập trong hải trình này
    const shifts = await Shift.findAll({
      where: { voyageId, crewId },
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
//    Thợ máy bấm vào 1 cái máy -> Nhập thông số -> Lưu
// ============================================================
const createEngineLog = async (req, res) => {
  try {
    const { shiftId, engineId, note, values } = req.body;
    // values = [{ parameterId: 1, value: 85 }, { parameterId: 2, value: 12 }, ...]

    if (!shiftId || !engineId) {
      return res.status(400).json({ message: 'Thiếu thông tin ca trực hoặc máy cần kiểm tra' });
    }

    // Bước 1: Tạo ShiftLog (Nhật ký ca trực loại Engine)
    const shiftLog = await ShiftLog.create({
      shiftId: shiftId,
      logType: 'Engine',
      content: note || 'Kiểm tra máy định kỳ',
      createdAt: new Date()
    });

    // Bước 2: Tạo EngineLog (gắn với ShiftLog + Engine cụ thể)
    const engineLog = await EngineLog.create({
      shiftLogId: shiftLog.id,
      engineId: engineId,
      note: note || ''
    });

    // Bước 3: Tạo các EngineLogValue (Giá trị đo cho từng thông số)
    if (values && values.length > 0) {
      const logValues = values.map(v => ({
        engineLogId: engineLog.id,
        parameterId: v.parameterId,
        value: v.value
      }));
      await EngineLogValue.bulkCreate(logValues);
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
// 4. Xem lịch sử kiểm tra máy theo Ca trực
// ============================================================
const getEngineLogsByShift = async (req, res) => {
  try {
    const { shiftId } = req.params;

    const shiftLogs = await ShiftLog.findAll({
      where: { shiftId, logType: 'Engine' },
      include: [{
        model: EngineLog,
        include: [
          { model: Engine, attributes: ['engineName', 'engineType'] },
          { 
            model: EngineLogValue, 
            include: [{ model: EngineParameter, attributes: ['name', 'minValue', 'maxValue'] }]
          }
        ]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(shiftLogs);
  } catch (error) {
    console.error('Lỗi lấy lịch sử:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 5. Xem toàn bộ lịch sử kiểm tra máy theo Hải trình
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

module.exports = {
  getActiveVoyage,
  getShiftsForCurrentUser,
  createEngineLog,
  getEngineLogsByShift,
  getEngineLogsByVoyage
};
