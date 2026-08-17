const { Op } = require('sequelize');
const { 
  Voyage, VoyageCrew, Ship,
  Shift, ShiftLog, DeckLog, DeckLogEntry,
  CrewProfile, LogEditHistory, LogImage
} = require('../models');
const { isDeckLogRole } = require('../utils/voyageRole');

const DECK_NUMERIC_RULES = {
  courseTrue: { min: 0, max: 360 },
  courseGyro: { min: 0, max: 360 },
  courseSteer: { min: 0, max: 360 },
  gyroError: {},
  courseMagnetic: { min: 0, max: 360 },
  speed: { min: 0 },
  rpm: { min: 0 },
  windForce: { min: 0, max: 12, integer: true },
  barometer: { min: 0 },
  seaState: { min: 0, max: 9, integer: true },
  visibility: { min: 0, max: 9, integer: true },
  airTemp: {},
  seaTemp: {},
};
const WIND_DIRECTIONS = new Set(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'C']);
const WEATHER_CODES = new Set(['bc', 'br', 'c', 'f', 'g', 'h', 'o', 'p', 'q', 'r', 's']);

const parseDateFilter = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;

  const [year, month, day] = String(value).split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) return null;

  return parsed;
};

const validateDeckEntries = (entries, shift) => {
  if (!Array.isArray(entries)) return 'Danh sách dữ liệu boong không hợp lệ';

  const seenHours = new Set();
  let allowedHours = null;
  const startAt = new Date(shift?.startTime);
  const endAt = new Date(shift?.endTime);
  if (Number.isFinite(startAt.getTime()) && Number.isFinite(endAt.getTime())) {
    const startHour = startAt.getHours();
    const endHour = endAt.getHours() === 0 ? 24 : endAt.getHours();
    allowedHours = new Set();
    for (let hour = startHour; hour < endHour; hour += 1) allowedHours.add(hour);
  }

  for (const entry of entries) {
    const hour = Number(entry?.hour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 24) return 'Giờ ghi nhật ký không hợp lệ';
    if (seenHours.has(hour)) return 'Không được nhập trùng giờ trong cùng nhật ký';
    if (allowedHours && !allowedHours.has(hour)) return 'Giờ ghi không thuộc ca trực đã chọn';
    seenHours.add(hour);

    if (allowedHours) {
      const entryAt = new Date(startAt);
      if (hour === 24) {
        entryAt.setDate(entryAt.getDate() + 1);
        entryAt.setHours(0, 0, 0, 0);
      } else {
        entryAt.setHours(hour, 0, 0, 0);
      }
      if (entryAt.getTime() > Date.now()) return 'Không thể ghi dữ liệu cho giờ trong tương lai';
    }

    for (const [field, rule] of Object.entries(DECK_NUMERIC_RULES)) {
      const rawValue = entry[field];
      if (rawValue === null || rawValue === undefined || rawValue === '') continue;
      if (typeof rawValue === 'string' && rawValue.trim() === '') return `Giá trị ${field} không hợp lệ`;
      const value = Number(rawValue);
      if (!Number.isFinite(value)) return `Giá trị ${field} không hợp lệ`;
      if (rule.integer && !Number.isInteger(value)) return `Giá trị ${field} phải là số nguyên`;
      if (rule.min !== undefined && value < rule.min) return `Giá trị ${field} nhỏ hơn giới hạn cho phép`;
      if (rule.max !== undefined && value > rule.max) return `Giá trị ${field} vượt quá giới hạn cho phép`;
    }

    if (entry.windDirection && !WIND_DIRECTIONS.has(entry.windDirection)) return 'Hướng gió không hợp lệ';
    if (entry.weather && !WEATHER_CODES.has(entry.weather)) return 'Mã thời tiết không hợp lệ';
  }

  return null;
};

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
      attributes: ['voyageId', 'role']
    });

    const deckAssignments = myVoyageCrews.filter((assignment) => isDeckLogRole(assignment.role));

    if (!deckAssignments.length) {
      return res.status(404).json({ message: 'Bạn chưa được phân công làm Thủy thủ trong hải trình nào' });
    }

    const myVoyageIds = deckAssignments.map(vc => vc.voyageId);

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
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy hải trình nhật ký boong' });
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

    const assignment = await VoyageCrew.findOne({
      where: { voyageId, crewId },
      attributes: ['role'],
    });
    if (!assignment || !isDeckLogRole(assignment.role)) {
      return res.status(403).json({ message: 'Bạn không được phân công làm Thủy thủ trong hải trình này' });
    }

    const where = { voyageId, crewId };

    if (date) {
      const parsedDate = parseDateFilter(date);
      if (!parsedDate) {
        return res.status(400).json({
          message: 'Ngày lọc không hợp lệ. Vui lòng nhập theo định dạng YYYY-MM-DD.',
        });
      }

      const dayStart = new Date(parsedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(parsedDate);
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
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy ca trực boong' });
  }
};

// ============================================================
// 3. Tạo Nhật ký trực boong (Deck Log) — entries theo giờ
// ============================================================
const createDeckLog = async (req, res) => {
  try {
    const { shiftId, note, entries } = req.body;

    if (!shiftId) {
      return res.status(400).json({ message: 'Thiếu thông tin ca trực' });
    }

    if ((!entries || entries.length === 0) && (!note || note.trim() === '')) {
      return res.status(400).json({ message: 'Vui lòng nhập ít nhất 1 dòng dữ liệu hoặc ghi chú' });
    }

    const shift = req.authorizedShift || await Shift.findByPk(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Không tìm thấy ca trực' });
    }

    const entryError = validateDeckEntries(entries || [], shift);
    if (entryError) return res.status(400).json({ message: entryError });

    const shiftLog = await ShiftLog.create({
      shiftId: shiftId,
      logType: 'Deck',
      content: note || '',
      createdAt: new Date()
    });

    const deckLog = await DeckLog.create({
      shiftLogId: shiftLog.id,
      note: note || ''
    });

    // Tạo các dòng dữ liệu theo giờ
    if (entries && entries.length > 0) {
      const entryRecords = entries.map(e => ({
        deckLogId: deckLog.id,
        hour: e.hour,
        courseTrue: e.courseTrue ?? null,
        courseGyro: e.courseGyro ?? null,
        courseSteer: e.courseSteer ?? null,
        gyroError: e.gyroError ?? null,
        courseMagnetic: e.courseMagnetic ?? null,
        speed: e.speed ?? null,
        rpm: e.rpm ?? null,
        windDirection: e.windDirection ?? null,
        windForce: e.windForce ?? null,
        weather: e.weather ?? null,
        barometer: e.barometer ?? null,
        seaState: e.seaState ?? null,
        visibility: e.visibility ?? null,
        airTemp: e.airTemp ?? null,
        seaTemp: e.seaTemp ?? null,
      }));
      await DeckLogEntry.bulkCreate(entryRecords);
    }

    res.status(201).json({ 
      message: 'Ghi nhận nhật ký boong thành công', 
      deckLog,
      shiftLog
    });
  } catch (error) {
    console.error('Lỗi tạo nhật ký boong:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo nhật ký boong' });
  }
};

// ============================================================
// 4. Cập nhật nhật ký boong (chỉnh sửa) — yêu cầu lý do
// ============================================================
const updateDeckLog = async (req, res) => {
  try {
    const { shiftLogId } = req.params;
    const { note, entries, editReason } = req.body;
    const crewId = req.user?.profileId;

    if (!editReason || editReason.trim() === '') {
      return res.status(400).json({ message: 'Vui lòng cung cấp lý do chỉnh sửa' });
    }
    if (entries !== undefined && !Array.isArray(entries)) {
      return res.status(400).json({ message: 'Danh sách dữ liệu boong không hợp lệ' });
    }

    const shiftLog = await ShiftLog.findByPk(shiftLogId, {
      include: [{ model: DeckLog, include: [{ model: DeckLogEntry }] }]
    });

    if (!shiftLog || !shiftLog.DeckLog) {
      return res.status(404).json({ message: 'Không tìm thấy nhật ký' });
    }

    if (Array.isArray(entries)) {
      const entryError = validateDeckEntries(entries, req.authorizedShift);
      if (entryError) return res.status(400).json({ message: entryError });

      const effectiveNote = note !== undefined ? note : shiftLog.DeckLog.note;
      if (entries.length === 0 && (!effectiveNote || effectiveNote.trim() === '')) {
        return res.status(400).json({ message: 'Nhật ký phải có ít nhất một dòng dữ liệu hoặc ghi chú' });
      }
    }

    const createdAt = new Date(shiftLog.createdAt).getTime();
    const editWindowMs = 24 * 60 * 60 * 1000;
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > editWindowMs) {
      return res.status(403).json({ message: 'Nhật ký đã quá 24 giờ và không thể chỉnh sửa' });
    }

    // Lưu snapshot bản cũ vào LogEditHistory
    await LogEditHistory.create({
      logType: 'Deck',
      shiftLogId: shiftLog.id,
      previousContent: JSON.stringify({
        note: shiftLog.DeckLog.note,
        content: shiftLog.content,
        entries: shiftLog.DeckLog.DeckLogEntries?.map(e => ({
          hour: e.hour,
          courseTrue: e.courseTrue, courseGyro: e.courseGyro,
          courseSteer: e.courseSteer, gyroError: e.gyroError,
          courseMagnetic: e.courseMagnetic,
          speed: e.speed, rpm: e.rpm,
          windDirection: e.windDirection, windForce: e.windForce,
          weather: e.weather, barometer: e.barometer,
          seaState: e.seaState, visibility: e.visibility,
          airTemp: e.airTemp, seaTemp: e.seaTemp
        }))
      }),
      editReason: editReason,
      editedBy: crewId,
      editedAt: new Date()
    });

    // Cập nhật note
    if (note !== undefined) {
      await shiftLog.DeckLog.update({ note });
      await shiftLog.update({ content: note });
    }

    // Cập nhật entries
    if (Array.isArray(entries)) {
      await DeckLogEntry.destroy({ where: { deckLogId: shiftLog.DeckLog.id } });
      if (entries.length > 0) {
        const entryRecords = entries.map(e => ({
          deckLogId: shiftLog.DeckLog.id,
          hour: e.hour,
          courseTrue: e.courseTrue ?? null,
          courseGyro: e.courseGyro ?? null,
          courseSteer: e.courseSteer ?? null,
          gyroError: e.gyroError ?? null,
          courseMagnetic: e.courseMagnetic ?? null,
          speed: e.speed ?? null,
          rpm: e.rpm ?? null,
          windDirection: e.windDirection ?? null,
          windForce: e.windForce ?? null,
          weather: e.weather ?? null,
          barometer: e.barometer ?? null,
          seaState: e.seaState ?? null,
          visibility: e.visibility ?? null,
          airTemp: e.airTemp ?? null,
          seaTemp: e.seaTemp ?? null,
        }));
        await DeckLogEntry.bulkCreate(entryRecords);
      }
    }

    res.json({ message: 'Cập nhật nhật ký thành công' });
  } catch (error) {
    console.error('Lỗi cập nhật nhật ký boong:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật nhật ký boong' });
  }
};

// ============================================================
// 5. Lấy lịch sử trực boong theo Ca trực (bao gồm entries + ảnh + edit history)
// ============================================================
const getDeckLogsByShift = async (req, res) => {
  try {
    const { shiftId } = req.params;

    const shiftLogs = await ShiftLog.findAll({
      where: { shiftId, logType: 'Deck' },
      include: [
        { model: DeckLog, include: [{ model: DeckLogEntry }] },
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
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy lịch sử nhật ký boong' });
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
        imageUrl: file.path, // Cloudinary URL
        caption: '',
        uploadedBy: crewId
      }))
    );

    res.status(201).json({ message: 'Tải ảnh lên thành công', images });
  } catch (error) {
    console.error('Lỗi tải ảnh lên:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tải ảnh nhật ký boong lên' });
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
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy lịch sử chỉnh sửa nhật ký boong' });
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
