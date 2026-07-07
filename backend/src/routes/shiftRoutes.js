const express = require('express');
const { Op } = require('sequelize');
const { Shift, Voyage, VoyageCrew, CrewProfile, User, Ship, Report } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// ================================================================
// Cấu hình ca cố định: 6 ca x 4 tiếng
// ================================================================
const SHIFT_SLOTS = [
  { slot: 0, startHour: 0,  endHour: 4,  label: '00:00 – 04:00' },
  { slot: 1, startHour: 4,  endHour: 8,  label: '04:00 – 08:00' },
  { slot: 2, startHour: 8,  endHour: 12, label: '08:00 – 12:00' },
  { slot: 3, startHour: 12, endHour: 16, label: '12:00 – 16:00' },
  { slot: 4, startHour: 16, endHour: 20, label: '16:00 – 20:00' },
  { slot: 5, startHour: 20, endHour: 24, label: '20:00 – 24:00' },
];

// Role được phép tạo/sửa ca trực
const OFFICER_ROLES = ['DeckOfficer', 'EngineOfficer'];

// Role được phép NHẬN ca (cấp dưới): thủy thủ boong & thợ máy.
// Loại trừ thuyền trưởng/đại phó/sĩ quan và chính người phân công.
const ASSIGNABLE_ROLES = ['Sailor', 'EngineCrew'];

// Map role -> bộ phận (dự phòng nếu CrewProfile.department trống)
const ROLE_DEPARTMENT = { DeckOfficer: 'Deck', EngineOfficer: 'Engine' };

// Số ca trực tối đa một thủy thủ được nhận trong 1 ngày
const MAX_SHIFTS_PER_DAY = 2;

// Mốc đầu/cuối ngày (theo giờ server) cho chuỗi 'YYYY-MM-DD'
function dayBounds(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { dayStart: new Date(y, m - 1, d, 0, 0, 0), dayEnd: new Date(y, m - 1, d + 1, 0, 0, 0) };
}

// Tính startTime/endTime từ ngày (YYYY-MM-DD) + slot index. Hour 24 tự cuộn sang 00:00 hôm sau.
function slotTimes(dateStr, slotIndex) {
  const s = SHIFT_SLOTS.find(x => x.slot === Number(slotIndex));
  if (!s) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d, s.startHour, 0, 0);
  const end = new Date(y, m - 1, d, s.endHour, 0, 0); // 24 -> 00:00 hôm sau
  return { start, end };
}

// Tìm hải trình InProgress mà người dùng đang tham gia + thông tin liên quan
async function resolveContext(req) {
  const profile = await CrewProfile.findOne({ where: { userId: req.user.id } });
  if (!profile) return { error: 'Chưa có hồ sơ thuyền viên.' };

  const membership = await VoyageCrew.findOne({
    where: { crewId: profile.id },
    include: [{ model: Voyage, where: { status: 'InProgress' }, include: [Ship] }],
  });
  if (!membership || !membership.Voyage) {
    return { error: 'Hiện không có hải trình nào đang diễn ra cho bạn.', profile };
  }

  return { profile, voyage: membership.Voyage, ship: membership.Voyage.Ship };
}

// ================================================================
// GET /api/shifts/current-voyage — context cho cả 2 màn hình
// ================================================================
router.get('/current-voyage', authMiddleware, async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });

    const { profile, voyage, ship } = ctx;
    const myDepartment = profile.department || ROLE_DEPARTMENT[req.user.role] || null;

    // Danh sách thuyền viên thuộc hải trình này (để sĩ quan gán ca)
    const memberships = await VoyageCrew.findAll({
      where: { voyageId: voyage.id },
      include: [{ model: CrewProfile, include: [{ model: User, attributes: ['role'] }] }],
    });
    const crewPool = memberships
      .filter(m => m.CrewProfile)
      .map(m => ({
        id: m.CrewProfile.id,
        fullName: m.CrewProfile.fullName,
        department: m.CrewProfile.department,
        position: m.CrewProfile.position,
        role: m.CrewProfile.User ? m.CrewProfile.User.role : null,
      }));

    res.json({
      voyage: {
        id: voyage.id,
        departurePort: voyage.departurePort,
        destinationPort: voyage.destinationPort,
        departureDate: voyage.departureDate,
        arrivalDate: voyage.arrivalDate,
        status: voyage.status,
      },
      ship: ship ? { id: ship.id, shipName: ship.shipName, imoNumber: ship.imoNumber } : null,
      me: {
        crewId: profile.id,
        fullName: profile.fullName,
        department: myDepartment,
        role: req.user.role,
      },
      canCreate: OFFICER_ROLES.includes(req.user.role),
      slots: SHIFT_SLOTS,
      crewPool,
      // Cấp dưới cùng bộ phận mà sĩ quan này được phép gán ca
      assignableCrew: crewPool.filter(
        c => c.department === myDepartment && ASSIGNABLE_ROLES.includes(c.role) && c.id !== profile.id
      ),
    });
  } catch (err) {
    console.error('Lỗi current-voyage:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ================================================================
// GET /api/shifts — danh sách ca của hải trình hiện tại
// query: ?date=YYYY-MM-DD (tùy chọn, lọc theo ngày)
// ================================================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });

    const where = { voyageId: ctx.voyage.id, status: { [Op.ne]: 'Cancelled' } };
    if (req.query.date) {
      const [y, m, d] = req.query.date.split('-').map(Number);
      const dayStart = new Date(y, m - 1, d, 0, 0, 0);
      const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0);
      where.startTime = { [Op.gte]: dayStart, [Op.lt]: dayEnd };
    }

    const shifts = await Shift.findAll({
      where,
      include: [{ model: CrewProfile, attributes: ['id', 'fullName', 'department', 'position'] }],
      order: [['startTime', 'ASC']],
    });
    res.json(shifts);
  } catch (err) {
    console.error('Lỗi lấy ca trực:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ================================================================
// POST /api/shifts/bulk — tạo nhiều ca cho 1 ngày
// body: { date: 'YYYY-MM-DD', entries: [{ slot, crewId, position }] }
// ================================================================
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    if (!OFFICER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ sĩ quan boong/máy được tạo ca trực.' });
    }
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });
    const { profile, voyage } = ctx;
    const myDept = profile.department || ROLE_DEPARTMENT[req.user.role];

    const { date, entries } = req.body;
    if (!date || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'Thiếu ngày hoặc danh sách ca trực.' });
    }

    // Lấy sẵn crew thuộc hải trình + đúng bộ phận + là cấp dưới được gán
    const memberships = await VoyageCrew.findAll({
      where: { voyageId: voyage.id },
      include: [{ model: CrewProfile, include: [{ model: User, attributes: ['role'] }] }],
    });
    const allowedCrew = new Map(); // crewId -> CrewProfile
    memberships.forEach(m => {
      const cp = m.CrewProfile;
      const role = cp && cp.User ? cp.User.role : null;
      if (cp && cp.department === myDept && ASSIGNABLE_ROLES.includes(role) && cp.id !== profile.id) {
        allowedCrew.set(cp.id, cp);
      }
    });

    // Đếm sẵn số ca đã có trong ngày của từng crew (để giới hạn tối đa 2 ca/ngày)
    const { dayStart, dayEnd } = dayBounds(date);
    const dayShifts = await Shift.findAll({
      where: { voyageId: voyage.id, status: { [Op.ne]: 'Cancelled' }, startTime: { [Op.gte]: dayStart, [Op.lt]: dayEnd } },
    });
    const dayCount = new Map(); // crewId -> số ca trong ngày
    dayShifts.forEach(s => dayCount.set(s.crewId, (dayCount.get(s.crewId) || 0) + 1));

    // Validate & dựng dữ liệu
    const toCreate = [];
    const batchKeys = new Set(); // chống trùng crew+slot trong cùng batch
    for (const e of entries) {
      const times = slotTimes(date, e.slot);
      if (!times) return res.status(400).json({ message: `Ca không hợp lệ (slot ${e.slot}).` });
      if (!e.crewId) continue; // bỏ qua slot chưa gán người

      // Chỉ cho tạo ca ở thời gian chưa tới
      if (times.start <= new Date()) {
        return res.status(400).json({ message: `Không thể tạo ca đã qua giờ (${SHIFT_SLOTS[e.slot].label}).` });
      }

      const crew = allowedCrew.get(Number(e.crewId));
      if (!crew) {
        return res.status(400).json({ message: `Chỉ được gán thủy thủ/thợ máy cấp dưới cùng bộ phận ${myDept}.` });
      }

      const key = `${e.crewId}-${e.slot}`;
      if (batchKeys.has(key)) {
        return res.status(400).json({ message: `${crew.fullName} bị gán trùng trong cùng một ca.` });
      }
      batchKeys.add(key);

      // Chống trùng giờ với ca đã có trong DB
      const overlap = await Shift.findOne({
        where: {
          voyageId: voyage.id,
          crewId: e.crewId,
          status: { [Op.ne]: 'Cancelled' },
          startTime: { [Op.lt]: times.end },
          endTime: { [Op.gt]: times.start },
        },
      });
      if (overlap) {
        return res.status(400).json({ message: `${crew.fullName} đã có ca trùng giờ (${SHIFT_SLOTS[e.slot].label}).` });
      }

      // Giới hạn tối đa 2 ca/ngày cho mỗi thủy thủ (tính cả ca đã có + ca trong batch)
      const cid = Number(e.crewId);
      if ((dayCount.get(cid) || 0) >= MAX_SHIFTS_PER_DAY) {
        return res.status(400).json({ message: `${crew.fullName} đã đủ ${MAX_SHIFTS_PER_DAY} ca trong ngày.` });
      }
      dayCount.set(cid, (dayCount.get(cid) || 0) + 1);

      toCreate.push({
        voyageId: voyage.id,
        crewId: Number(e.crewId),
        startTime: times.start,
        endTime: times.end,
        position: e.position || null,
        status: 'Scheduled',
        _crewName: crew.fullName,
        _label: SHIFT_SLOTS[e.slot].label,
      });
    }

    if (toCreate.length === 0) {
      return res.status(400).json({ message: 'Chưa gán thuyền viên cho ca nào.' });
    }

    const created = await Shift.bulkCreate(
      toCreate.map(({ _crewName, _label, ...row }) => row)
    );

    // TODO Phase 2: sinh Report gửi thuyền trưởng khi tạo lịch trực.

    res.status(201).json({ message: `Đã tạo ${created.length} ca trực.`, count: created.length });
  } catch (err) {
    console.error('Lỗi tạo ca trực:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ================================================================
// PUT /api/shifts/:id — sửa ca (chỉ ca chưa diễn ra, đúng bộ phận)
// body: { crewId, position }
// ================================================================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!OFFICER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ sĩ quan boong/máy được sửa ca trực.' });
    }
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });
    const { profile, voyage } = ctx;
    const myDept = profile.department || ROLE_DEPARTMENT[req.user.role];

    const shift = await Shift.findOne({ where: { id: req.params.id, voyageId: voyage.id } });
    if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca trực.' });

    if (new Date(shift.startTime) <= new Date()) {
      return res.status(400).json({ message: 'Không thể sửa ca đã bắt đầu hoặc đã kết thúc.' });
    }

    const { crewId, position } = req.body;

    // crew mới phải thuộc hải trình + đúng bộ phận + là cấp dưới được gán
    const targetCrewId = crewId ? Number(crewId) : shift.crewId;
    const member = await VoyageCrew.findOne({
      where: { voyageId: voyage.id, crewId: targetCrewId },
      include: [{ model: CrewProfile, include: [{ model: User, attributes: ['role'] }] }],
    });
    const targetRole = member && member.CrewProfile && member.CrewProfile.User ? member.CrewProfile.User.role : null;
    if (!member || !member.CrewProfile || member.CrewProfile.department !== myDept
        || !ASSIGNABLE_ROLES.includes(targetRole) || member.CrewProfile.id === profile.id) {
      return res.status(400).json({ message: `Chỉ được gán thủy thủ/thợ máy cấp dưới cùng bộ phận ${myDept}.` });
    }

    // Chống trùng giờ (loại trừ chính ca này)
    const overlap = await Shift.findOne({
      where: {
        id: { [Op.ne]: shift.id },
        voyageId: voyage.id,
        crewId: targetCrewId,
        status: { [Op.ne]: 'Cancelled' },
        startTime: { [Op.lt]: shift.endTime },
        endTime: { [Op.gt]: shift.startTime },
      },
    });
    if (overlap) {
      return res.status(400).json({ message: `${member.CrewProfile.fullName} đã có ca trùng giờ.` });
    }

    // Giới hạn tối đa 2 ca/ngày (đếm ca khác cùng ngày của người được gán, loại trừ ca này)
    const dStart = new Date(shift.startTime); dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date(dStart); dEnd.setDate(dEnd.getDate() + 1);
    const dayCount = await Shift.count({
      where: {
        id: { [Op.ne]: shift.id },
        voyageId: voyage.id,
        crewId: targetCrewId,
        status: { [Op.ne]: 'Cancelled' },
        startTime: { [Op.gte]: dStart, [Op.lt]: dEnd },
      },
    });
    if (dayCount >= MAX_SHIFTS_PER_DAY) {
      return res.status(400).json({ message: `${member.CrewProfile.fullName} đã đủ ${MAX_SHIFTS_PER_DAY} ca trong ngày.` });
    }

    await shift.update({ crewId: targetCrewId, position: position ?? shift.position });

    // TODO Phase 2: sinh Report gửi thuyền trưởng khi sửa ca.

    res.json({ message: 'Đã cập nhật ca trực.', shift });
  } catch (err) {
    console.error('Lỗi sửa ca trực:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ================================================================
// DELETE /api/shifts/:id — hủy ca chưa diễn ra
// ================================================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!OFFICER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ sĩ quan boong/máy được hủy ca trực.' });
    }
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });
    const { profile, voyage } = ctx;
    const myDept = profile.department || ROLE_DEPARTMENT[req.user.role];

    const shift = await Shift.findOne({
      where: { id: req.params.id, voyageId: voyage.id },
      include: [CrewProfile],
    });
    if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca trực.' });

    if (shift.CrewProfile && shift.CrewProfile.department !== myDept) {
      return res.status(403).json({ message: `Không thể hủy ca ngoài bộ phận ${myDept}.` });
    }
    if (new Date(shift.startTime) <= new Date()) {
      return res.status(400).json({ message: 'Không thể hủy ca đã bắt đầu hoặc đã kết thúc.' });
    }

    await shift.destroy();
    res.json({ message: 'Đã hủy ca trực.' });
  } catch (err) {
    console.error('Lỗi hủy ca trực:', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
