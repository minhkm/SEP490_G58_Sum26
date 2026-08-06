const { Op } = require('sequelize');
const {
  Shift,
  ShiftLog,
  Voyage,
  VoyageCrew,
  Engine,
  EngineLog,
  EngineParameter,
} = require('../models');
const { isOperationalEngineStatus } = require('../utils/engine');
const { isLogRoleForDuty } = require('../utils/voyageRole');

const getCrewId = (req) => req.user?.profileId;
const logTypeLabel = (logType) => logType === 'Engine' ? 'máy' : 'boong';

const requireCrewProfile = (req, res) => {
  const crewId = getCrewId(req);
  if (!crewId) {
    res.status(403).json({ message: 'Tài khoản chưa có hồ sơ thuyền viên.' });
    return null;
  }
  return crewId;
};

const requireDutyAssignment = async ({ voyageId, crewId, duty, res }) => {
  if (!duty) return true;

  const assignment = await VoyageCrew.findOne({
    where: { voyageId, crewId },
    attributes: ['voyageId', 'crewId', 'role'],
  });
  if (!assignment || !isLogRoleForDuty(assignment.role, duty)) {
    const logName = duty === 'Engine' ? 'nhật ký máy' : 'nhật ký boong';
    res.status(403).json({
      message: `Bạn không được phân công đúng chức danh để ghi ${logName} trong hải trình này.`,
    });
    return false;
  }

  return assignment;
};

const requireOwnedShift = ({ source = 'body', activeWindow = false, duty } = {}) => async (req, res, next) => {
  try {
    const crewId = requireCrewProfile(req, res);
    if (!crewId) return;

    const shiftId = source === 'params' ? req.params.shiftId : req.body.shiftId;
    if (!shiftId) {
      return res.status(400).json({ message: 'Thiếu thông tin ca trực.' });
    }

    const shift = await Shift.findByPk(shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Không tìm thấy ca trực.' });
    }
    if (Number(shift.crewId) !== Number(crewId)) {
      return res.status(403).json({ message: 'Bạn không được phép thao tác trên ca trực của người khác.' });
    }

    const assignment = await requireDutyAssignment({ voyageId: shift.voyageId, crewId, duty, res });
    if (!assignment) return;
    if (assignment !== true) req.authorizedVoyageAssignment = assignment;

    if (activeWindow) {
      const now = Date.now();
      const startAt = new Date(shift.startTime).getTime();
      const endAt = new Date(shift.endTime).getTime();

      if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) {
        return res.status(400).json({ message: 'Thời gian ca trực không hợp lệ.' });
      }
      if (now < startAt) {
        return res.status(400).json({ message: 'Ca trực chưa bắt đầu, chưa thể ghi nhật ký.' });
      }
      if (now > endAt) {
        return res.status(400).json({ message: 'Ca trực đã kết thúc, không thể tạo nhật ký mới.' });
      }
      if (['Completed', 'Cancelled'].includes(shift.status)) {
        return res.status(400).json({ message: 'Ca trực đã đóng, không thể tạo nhật ký mới.' });
      }

      const voyage = await Voyage.findByPk(shift.voyageId, {
        attributes: ['id', 'shipId', 'status'],
      });
      if (!voyage) {
        return res.status(404).json({ message: 'Không tìm thấy hải trình của ca trực.' });
      }
      if (['Completed', 'Cancelled'].includes(voyage.status)) {
        return res.status(400).json({ message: 'Hải trình đã kết thúc, không thể tạo nhật ký mới.' });
      }
      req.authorizedVoyage = voyage;
    }

    req.authorizedShift = shift;
    next();
  } catch (error) {
    console.error('Lỗi xác minh quyền ca trực:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xác minh ca trực' });
  }
};

const requireOwnedShiftLog = (logType) => async (req, res, next) => {
  try {
    const crewId = requireCrewProfile(req, res);
    if (!crewId) return;

    const shiftLog = await ShiftLog.findByPk(req.params.shiftLogId);
    if (!shiftLog || shiftLog.logType !== logType) {
      return res.status(404).json({ message: `Không tìm thấy nhật ký ${logTypeLabel(logType)}.` });
    }

    const shift = await Shift.findByPk(shiftLog.shiftId);
    if (!shift) {
      return res.status(404).json({ message: 'Không tìm thấy ca trực của nhật ký.' });
    }
    if (Number(shift.crewId) !== Number(crewId)) {
      return res.status(403).json({ message: 'Bạn không được phép thao tác trên nhật ký của người khác.' });
    }

    const assignment = await requireDutyAssignment({ voyageId: shift.voyageId, crewId, duty: logType, res });
    if (!assignment) return;

    req.authorizedShiftLog = shiftLog;
    req.authorizedShift = shift;
    req.authorizedVoyageAssignment = assignment;
    next();
  } catch (error) {
    console.error('Lỗi xác minh quyền nhật ký:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xác minh quyền sở hữu nhật ký' });
  }
};

const requireVoyageAssignment = (duty) => async (req, res, next) => {
  try {
    const crewId = requireCrewProfile(req, res);
    if (!crewId) return;

    const assignment = await VoyageCrew.findOne({
      where: { voyageId: req.params.voyageId, crewId },
      attributes: ['voyageId', 'crewId', 'role'],
    });
    if (!assignment) {
      return res.status(403).json({ message: 'Bạn không được phân công vào hải trình này.' });
    }
    if (duty && !isLogRoleForDuty(assignment.role, duty)) {
      const logName = duty === 'Engine' ? 'nhật ký máy' : 'nhật ký boong';
      return res.status(403).json({ message: `Chức danh trong hải trình không có quyền xem ${logName}.` });
    }

    req.authorizedVoyageAssignment = assignment;
    next();
  } catch (error) {
    console.error('Lỗi xác minh phân công hải trình:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xác minh phân công hải trình' });
  }
};

const validateEngineValues = ({ update = false } = {}) => async (req, res, next) => {
  try {
    const { values } = req.body;
    if (update && values === undefined) return next();

    if (!Array.isArray(values) || values.length < 3) {
      return res.status(400).json({ message: 'Vui lòng nhập ít nhất 3 thông số máy.' });
    }
    if (values.some((item) => (
      item?.parameterId === null
      || item?.parameterId === undefined
      || item?.parameterId === ''
      || item?.value === null
      || item?.value === undefined
      || item?.value === ''
    ))) {
      return res.status(400).json({ message: 'Thông số máy hoặc giá trị đo không hợp lệ.' });
    }

    const normalized = values.map((item) => ({
      parameterId: Number(item?.parameterId),
      value: Number(item?.value),
    }));
    if (normalized.some((item) => !Number.isInteger(item.parameterId) || !Number.isFinite(item.value))) {
      return res.status(400).json({ message: 'Thông số máy hoặc giá trị đo không hợp lệ.' });
    }

    const parameterIds = normalized.map((item) => item.parameterId);
    if (new Set(parameterIds).size !== parameterIds.length) {
      return res.status(400).json({ message: 'Không được nhập trùng một thông số máy.' });
    }

    let engineId = Number(req.body.engineId);
    if (update) {
      const engineLog = await EngineLog.findOne({
        where: { shiftLogId: req.params.shiftLogId },
        attributes: ['id', 'engineId'],
      });
      if (!engineLog) {
        return res.status(404).json({ message: 'Không tìm thấy nhật ký máy.' });
      }
      engineId = Number(engineLog.engineId);
    }

    const engine = await Engine.findByPk(engineId, {
      attributes: ['id', 'shipId', 'status'],
    });
    if (!engine) {
      return res.status(404).json({ message: 'Không tìm thấy máy cần kiểm tra.' });
    }
    if (!update && !isOperationalEngineStatus(engine.status)) {
      return res.status(400).json({ message: 'Chỉ máy đang hoạt động mới được ghi nhật ký.' });
    }

    let voyage = req.authorizedVoyage;
    if (!voyage && req.authorizedShift) {
      voyage = await Voyage.findByPk(req.authorizedShift.voyageId, {
        attributes: ['id', 'shipId', 'status'],
      });
    }
    if (!voyage || Number(engine.shipId) !== Number(voyage.shipId)) {
      return res.status(400).json({ message: 'Máy được chọn không thuộc tàu của hải trình này.' });
    }

    const parameters = await EngineParameter.findAll({
      where: { engineId, id: { [Op.in]: parameterIds } },
      attributes: ['id'],
    });
    if (parameters.length !== parameterIds.length) {
      return res.status(400).json({ message: 'Có thông số không thuộc máy được chọn.' });
    }

    next();
  } catch (error) {
    console.error('Lỗi xác thực dữ liệu nhật ký máy:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi kiểm tra thông số máy' });
  }
};

module.exports = {
  requireOwnedShift,
  requireOwnedShiftLog,
  requireVoyageAssignment,
  validateEngineValues,
};
