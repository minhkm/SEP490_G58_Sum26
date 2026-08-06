const express = require('express');
const { Op } = require('sequelize');
const { Shift, Voyage, VoyageCrew, CrewProfile, Ship, Report } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  canonicalVoyageRole,
  isLogRoleForDuty,
  isShiftOfficerRole,
  voyageRoleDepartment,
} = require('../utils/voyageRole');

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

// Map role -> bộ phận (dự phòng nếu CrewProfile.department trống)
const ROLE_DEPARTMENT = { DeckOfficer: 'Deck', EngineOfficer: 'Engine' };
const departmentLabel = (department) => department === 'Engine' ? 'máy' : 'boong';

// Số ca trực tối đa một thủy thủ được nhận trong 1 ngày
const MAX_SHIFTS_PER_DAY = 2;

// Cửa sổ bàn giao/nhận ca: sớm nhất 5 phút trước giờ ca; muộn hơn 30 phút đầu ca -> đánh dấu muộn
const HANDOVER_EARLY_MIN = 5;
const HANDOVER_LATE_MIN = 30;
// Đặt SHIFT_HANDOVER_ENFORCE=false trong .env để tắt kiểm tra cửa sổ giờ khi dev/test.
const HANDOVER_ENFORCE_WINDOW = process.env.SHIFT_HANDOVER_ENFORCE !== 'false';

// Múi giờ nghiệp vụ, KHỚP với `timezone` Sequelize dùng khi ghi DB (+07:00). Dựng mốc thời gian
// gắn cố định offset +07:00 để không phụ thuộc timezone của tiến trình Node — tránh lệch giờ khi
// server chạy ở UTC (khiến new Date(y,m,d,h) theo giờ local bị Sequelize ghi lệch sang slot khác).
const VN_TZ = '+07:00';
function vnDate(dateStr, hour = 0) {
  const hh = String(hour).padStart(2, '0');
  return new Date(`${dateStr}T${hh}:00:00${VN_TZ}`);
}

// Mốc đầu/cuối ngày cho chuỗi 'YYYY-MM-DD' (theo giờ VN +07:00)
function dayBounds(dateStr) {
  const dayStart = vnDate(dateStr, 0);
  return { dayStart, dayEnd: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) };
}

// Tính startTime/endTime từ ngày (YYYY-MM-DD) + slot index. Mỗi ca cố định 4 tiếng
// (slot 20–24 tự cuộn sang 00:00 hôm sau).
function slotTimes(dateStr, slotIndex) {
  const s = SHIFT_SLOTS.find(x => x.slot === Number(slotIndex));
  if (!s) return null;
  const start = vnDate(dateStr, s.startHour);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  return { start, end };
}

// Tìm hải trình đang hoạt động (chưa Completed/Cancelled) mà người dùng đang tham gia
async function resolveContext(req) {
  const profile = await CrewProfile.findOne({ where: { userId: req.user.id } });
  if (!profile) return { error: 'Chưa có hồ sơ thuyền viên.' };

  const membership = await VoyageCrew.findOne({
    where: { crewId: profile.id },
    include: [{ model: Voyage, where: { status: { [Op.notIn]: ['Completed', 'Cancelled'] } }, include: [Ship] }],
  });
  if (!membership || !membership.Voyage) {
    return { error: 'Hiện không có hải trình nào đang diễn ra cho bạn.', profile };
  }

  const effectiveRole = canonicalVoyageRole(membership.role) || canonicalVoyageRole(req.user.role);
  const effectiveDepartment = voyageRoleDepartment(membership.role)
    || profile.department
    || ROLE_DEPARTMENT[effectiveRole]
    || null;

  return {
    profile,
    membership,
    effectiveRole,
    effectiveDepartment,
    voyage: membership.Voyage,
    ship: membership.Voyage.Ship,
  };
}

// ================================================================
// GET /api/shifts/current-voyage — context cho cả 2 màn hình
// ================================================================
router.get('/current-voyage', authMiddleware, async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });

    const { profile, voyage, ship, effectiveRole, effectiveDepartment } = ctx;
    const myDepartment = effectiveDepartment;

    // Danh sách thuyền viên thuộc hải trình này (để sĩ quan gán ca)
    const memberships = await VoyageCrew.findAll({
      where: { voyageId: voyage.id },
      include: [{ model: CrewProfile }],
    });
    const crewPool = memberships
      .filter(m => m.CrewProfile)
      .map(m => ({
        id: m.CrewProfile.id,
        fullName: m.CrewProfile.fullName,
        department: voyageRoleDepartment(m.role) || m.CrewProfile.department,
        position: m.CrewProfile.position,
        role: m.role,
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
        role: effectiveRole,
      },
      canCreate: isShiftOfficerRole(effectiveRole),
      slots: SHIFT_SLOTS,
      crewPool,
      // Cấp dưới cùng bộ phận mà sĩ quan này được phép gán ca
      assignableCrew: crewPool.filter(
        c => c.department === myDepartment && isLogRoleForDuty(c.role, myDepartment) && c.id !== profile.id
      ),
    });
  } catch (err) {
    console.error('Lỗi lấy hải trình hiện tại:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy hải trình hiện tại.' });
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
      const { dayStart, dayEnd } = dayBounds(req.query.date);
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
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách ca trực.' });
  }
});

// ================================================================
// POST /api/shifts/bulk — tạo nhiều ca cho 1 ngày
// body: { date: 'YYYY-MM-DD', entries: [{ slot, crewId, position }] }
// ================================================================
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });
    if (!isShiftOfficerRole(ctx.effectiveRole)) {
      return res.status(403).json({ message: 'Chỉ sĩ quan boong hoặc Máy trưởng của hải trình được tạo ca trực.' });
    }
    const { profile, voyage, effectiveDepartment: myDept } = ctx;

    const { date, entries } = req.body;
    if (!date || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'Thiếu ngày hoặc danh sách ca trực.' });
    }

    // Lấy sẵn crew thuộc hải trình + đúng bộ phận + là cấp dưới được gán
    const memberships = await VoyageCrew.findAll({
      where: { voyageId: voyage.id },
      include: [{ model: CrewProfile }],
    });
    const allowedCrew = new Map(); // crewId -> CrewProfile
    memberships.forEach(m => {
      const cp = m.CrewProfile;
      const assignedDepartment = voyageRoleDepartment(m.role) || cp?.department;
      if (cp && assignedDepartment === myDept && isLogRoleForDuty(m.role, myDept) && cp.id !== profile.id) {
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
      if (!times) return res.status(400).json({ message: `Ca có mã số ${e.slot} không hợp lệ.` });
      if (!e.crewId) continue; // bỏ qua slot chưa gán người

      // Chỉ cho tạo ca ở thời gian chưa tới
      if (times.start <= new Date()) {
        return res.status(400).json({ message: `Không thể tạo ca đã qua giờ (${SHIFT_SLOTS[e.slot].label}).` });
      }

      const crew = allowedCrew.get(Number(e.crewId));
      if (!crew) {
        return res.status(400).json({ message: `Chỉ được gán thủy thủ hoặc thợ máy cấp dưới cùng bộ phận ${departmentLabel(myDept)}.` });
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
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo ca trực.' });
  }
});

// ================================================================
// PUT /api/shifts/:id — sửa ca (chỉ ca chưa diễn ra, đúng bộ phận)
// body: { crewId, position }
// ================================================================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });
    if (!isShiftOfficerRole(ctx.effectiveRole)) {
      return res.status(403).json({ message: 'Chỉ sĩ quan boong hoặc Máy trưởng của hải trình được sửa ca trực.' });
    }
    const { profile, voyage, effectiveDepartment: myDept } = ctx;

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
      include: [{ model: CrewProfile }],
    });
    const targetDepartment = member ? (voyageRoleDepartment(member.role) || member.CrewProfile?.department) : null;
    if (!member || !member.CrewProfile || targetDepartment !== myDept
        || !isLogRoleForDuty(member.role, myDept) || member.CrewProfile.id === profile.id) {
      return res.status(400).json({ message: `Chỉ được gán thủy thủ hoặc thợ máy cấp dưới cùng bộ phận ${departmentLabel(myDept)}.` });
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
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật ca trực.' });
  }
});

// ================================================================
// DELETE /api/shifts/:id — hủy ca chưa diễn ra
// ================================================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });
    if (!isShiftOfficerRole(ctx.effectiveRole)) {
      return res.status(403).json({ message: 'Chỉ sĩ quan boong hoặc Máy trưởng của hải trình được hủy ca trực.' });
    }
    const { voyage, effectiveDepartment: myDept } = ctx;

    const shift = await Shift.findOne({
      where: { id: req.params.id, voyageId: voyage.id },
      include: [CrewProfile],
    });
    if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca trực.' });

    if (shift.CrewProfile && shift.CrewProfile.department !== myDept) {
      return res.status(403).json({ message: `Không thể hủy ca ngoài bộ phận ${departmentLabel(myDept)}.` });
    }
    if (new Date(shift.startTime) <= new Date()) {
      return res.status(400).json({ message: 'Không thể hủy ca đã bắt đầu hoặc đã kết thúc.' });
    }

    await shift.destroy();
    res.json({ message: 'Đã hủy ca trực.' });
  } catch (err) {
    console.error('Lỗi hủy ca trực:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi hủy ca trực.' });
  }
});

// ================================================================
// POST /api/shifts/:id/handover — người đang trực (ca A) bàn giao cho ca kế tiếp
// body: { note }
// ================================================================
router.post('/:id/handover', authMiddleware, async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });
    const { profile, voyage } = ctx;

    const shiftA = await Shift.findOne({ where: { id: req.params.id, voyageId: voyage.id } });
    if (!shiftA) return res.status(404).json({ message: 'Không tìm thấy ca trực.' });
    if (shiftA.crewId !== profile.id) {
      return res.status(403).json({ message: 'Chỉ người trực ca này mới được bàn giao.' });
    }

    // Ca kế tiếp: cùng vị trí, bắt đầu đúng lúc ca A kết thúc
    const shiftB = await Shift.findOne({
      where: { voyageId: voyage.id, position: shiftA.position, startTime: shiftA.endTime, status: { [Op.ne]: 'Cancelled' } },
    });
    if (!shiftB) return res.status(400).json({ message: 'Chưa có ca kế tiếp cùng vị trí để bàn giao.' });
    if (shiftB.handedOverAt) return res.status(400).json({ message: 'Ca này đã được bàn giao.' });

    const now = new Date();
    const start = new Date(shiftB.startTime).getTime();
    // Bỏ qua ràng buộc giờ khi: env tắt enforce, HOẶC request test (dev, không phải production) → test được ca tương lai
    const bypassWindow = !HANDOVER_ENFORCE_WINDOW || (req.body.test === true && process.env.NODE_ENV !== 'production');
    if (!bypassWindow && now.getTime() < start - HANDOVER_EARLY_MIN * 60000) {
      return res.status(400).json({ message: `Chưa tới giờ bàn giao (được bấm từ ${HANDOVER_EARLY_MIN} phút trước ca).` });
    }
    let late = now.getTime() > start + HANDOVER_LATE_MIN * 60000;
    if (bypassWindow && req.body.late) late = true; // ép muộn khi test

    await shiftB.update({
      handedOverAt: now,
      handoverNote: (req.body.note || '').trim() || null,
      handoverLate: shiftB.handoverLate || late,
    });
    res.json({ message: late ? 'Đã bàn giao (muộn).' : 'Đã bàn giao ca.', late });
  } catch (err) {
    console.error('Lỗi bàn giao ca:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi bàn giao ca trực.' });
  }
});

// ================================================================
// POST /api/shifts/:id/receive — người vào ca (ca B) xác nhận nhận ca
// ================================================================
router.post('/:id/receive', authMiddleware, async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(404).json({ message: ctx.error });
    const { profile, voyage } = ctx;

    const shiftB = await Shift.findOne({ where: { id: req.params.id, voyageId: voyage.id } });
    if (!shiftB) return res.status(404).json({ message: 'Không tìm thấy ca trực.' });
    if (shiftB.crewId !== profile.id) {
      return res.status(403).json({ message: 'Chỉ người vào ca này mới được nhận ca.' });
    }
    if (!shiftB.handedOverAt) return res.status(400).json({ message: 'Ca trước chưa bàn giao, chưa thể nhận.' });
    if (shiftB.receivedAt) return res.status(400).json({ message: 'Bạn đã nhận ca này rồi.' });

    const now = new Date();
    const start = new Date(shiftB.startTime).getTime();
    // Bỏ qua ràng buộc giờ khi: env tắt enforce, HOẶC request test (dev, không phải production) → test được ca tương lai
    const bypassWindow = !HANDOVER_ENFORCE_WINDOW || (req.body.test === true && process.env.NODE_ENV !== 'production');
    if (!bypassWindow && now.getTime() < start - HANDOVER_EARLY_MIN * 60000) {
      return res.status(400).json({ message: `Chưa tới giờ nhận ca (được bấm từ ${HANDOVER_EARLY_MIN} phút trước ca).` });
    }
    let late = now.getTime() > start + HANDOVER_LATE_MIN * 60000;
    if (bypassWindow && req.body.late) late = true; // ép muộn khi test

    await shiftB.update({ receivedAt: now, handoverLate: shiftB.handoverLate || late });
    res.json({ message: late ? 'Đã nhận ca (muộn).' : 'Đã nhận ca.', late });
  } catch (err) {
    console.error('Lỗi nhận ca:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi nhận ca trực.' });
  }
});

module.exports = router;
