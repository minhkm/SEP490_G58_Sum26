const { Op } = require('sequelize');
const { 
  Voyage, VoyageCrew, Ship,
  Shift, ShiftLog, DeckLog,
  CrewProfile 
} = require('../models');

// ============================================================
// 1. Lấy danh sách Hải trình mà MÌNH đang tham gia
// ============================================================
const getMyVoyages = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Chưa đăng nhập' });

    // Bước 1: Tìm CrewProfile
    const crew = await CrewProfile.findOne({ where: { userId } });
    if (!crew) return res.status(403).json({ message: 'Không tìm thấy hồ sơ thuyền viên' });

    // Bước 2: Tìm các voyageId mà crew tham gia
    const myVoyageCrews = await VoyageCrew.findAll({
      where: { crewId: crew.id },
      attributes: ['voyageId']
    });

    if (!myVoyageCrews.length) {
      return res.status(404).json({ message: 'Bạn chưa được phân công hải trình nào' });
    }

    const myVoyageIds = myVoyageCrews.map(vc => vc.voyageId);

    // Bước 3: Tìm tất cả hải trình trong danh sách đó
    const myVoyages = await Voyage.findAll({
      where: { 
        id: { [Op.in]: myVoyageIds }
      },
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
// 2. Lấy danh sách Ca trực của người dùng hiện tại
// ============================================================
const getShiftsForCurrentUser = async (req, res) => {
  try {
    const { voyageId } = req.params;
    const crewId = req.user?.profileId; // Lấy từ JWT token

    if (!crewId) {
      return res.status(401).json({ message: 'Không xác định được thông tin người dùng' });
    }

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

    // Kiểm tra xem shift có tồn tại không
    const shift = await Shift.findByPk(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Không tìm thấy ca trực' });
    }

    // Tạo ShiftLog (Nhật ký ca trực loại Deck)
    const shiftLog = await ShiftLog.create({
      shiftId: shiftId,
      logType: 'Deck',
      content: note, // Lưu trực tiếp vào content
      createdAt: new Date()
    });

    // Tạo DeckLog
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
// 4. Lấy lịch sử trực boong theo Ca trực
// ============================================================
const getDeckLogsByShift = async (req, res) => {
  try {
    const { shiftId } = req.params;

    const shiftLogs = await ShiftLog.findAll({
      where: { shiftId, logType: 'Deck' },
      include: [{ model: DeckLog }],
      order: [['createdAt', 'DESC']]
    });

    res.json(shiftLogs);
  } catch (error) {
    console.error('Lỗi lấy lịch sử:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = {
  getMyVoyages,
  getShiftsForCurrentUser,
  createDeckLog,
  getDeckLogsByShift
};
