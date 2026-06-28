const { Op } = require('sequelize');
const { 
  Voyage, VoyageCrew, Ship,
  Shift, ShiftLog, DeckLog,
  CrewProfile, LogEditHistory, LogImage
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
        { model: Ship, attributes: ['id', 'shipName', 'imoNumber'] }
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
    const { date } = req.query;
    const crewId = req.user?.profileId;

    if (!crewId) {
      return res.status(401).json({ message: 'Không xác định được thông tin người dùng' });
    }

    const where = { voyageId, crewId };

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
// 3. Tạo Nhật ký trực boong (Deck Log)
// ============================================================
const createDeckLog = async (req, res) => {
  try {
    const { shiftId, note } = req.body;

    if (!shiftId) {
      return res.status(400).json({ message: 'Thiếu thông tin ca trực' });
    }

    if (!note || note.trim() === '') {
      return res.status(400).json({ message: 'Ghi chú không được để trống' });
    }

    const shift = await Shift.findByPk(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Không tìm thấy ca trực' });
    }

    const shiftLog = await ShiftLog.create({
      shiftId: shiftId,
      logType: 'Deck',
      content: note,
      createdAt: new Date()
    });

    const deckLog = await DeckLog.create({
      shiftLogId: shiftLog.id,
      note: note
    });

    res.status(201).json({ 
      message: 'Ghi nhận nhật ký boong thành công', 
      deckLog,
      shiftLog
    });
  } catch (error) {
    console.error('Lỗi tạo nhật ký boong:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 4. Cập nhật nhật ký boong (chỉnh sửa) — yêu cầu lý do
// ============================================================
const updateDeckLog = async (req, res) => {
  try {
    const { shiftLogId } = req.params;
    const { note, editReason } = req.body;
    const crewId = req.user?.profileId;

    if (!editReason || editReason.trim() === '') {
      return res.status(400).json({ message: 'Vui lòng cung cấp lý do chỉnh sửa' });
    }

    const shiftLog = await ShiftLog.findByPk(shiftLogId, {
      include: [{ model: DeckLog }]
    });

    if (!shiftLog || !shiftLog.DeckLog) {
      return res.status(404).json({ message: 'Không tìm thấy nhật ký' });
    }

    // Lưu snapshot bản cũ vào LogEditHistory
    await LogEditHistory.create({
      logType: 'Deck',
      shiftLogId: shiftLog.id,
      previousContent: JSON.stringify({
        note: shiftLog.DeckLog.note,
        content: shiftLog.content
      }),
      editReason: editReason,
      editedBy: crewId,
      editedAt: new Date()
    });

    // Cập nhật
    if (note !== undefined) {
      await shiftLog.DeckLog.update({ note });
      await shiftLog.update({ content: note });
    }

    res.json({ message: 'Cập nhật nhật ký thành công' });
  } catch (error) {
    console.error('Lỗi cập nhật nhật ký boong:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ============================================================
// 5. Lấy lịch sử trực boong theo Ca trực (bao gồm ảnh + edit history)
// ============================================================
const getDeckLogsByShift = async (req, res) => {
  try {
    const { shiftId } = req.params;

    const shiftLogs = await ShiftLog.findAll({
      where: { shiftId, logType: 'Deck' },
      include: [
        { model: DeckLog },
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
// 6. Upload ảnh cho nhật ký boong
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
        logType: 'Deck',
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
// 7. Xem lịch sử chỉnh sửa
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
  createDeckLog,
  updateDeckLog,
  getDeckLogsByShift,
  uploadLogImages,
  getEditHistory
};
