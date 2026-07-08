/**
 * Service đóng băng (snapshot) số liệu ca trực tại thời điểm tạo báo cáo.
 * Snapshot được lưu dạng JSON vào Report.shiftSnapshot — sau đó log gốc có sửa
 * cũng KHÔNG ảnh hưởng đến snapshot đã lưu.
 */
const {
  Shift, ShiftLog, CrewProfile, Voyage,
  EngineLog, EngineLogValue, EngineParameter, Engine,
  DeckLog, DeckLogEntry,
} = require("../models");

/**
 * Tính trạng thái ngưỡng cho một thông số máy (mirror EngineLogPage.jsx:149-156).
 * @returns {'ok'|'warning'|'danger'}
 */
function thresholdStatus(value, minValue, maxValue) {
  if (maxValue != null && value > maxValue) return "danger";
  if (maxValue != null && value > maxValue * 0.9) return "warning";
  if (minValue != null && value < minValue) return "danger";
  if (minValue != null && value < minValue * 1.1) return "warning";
  return "ok";
}

/**
 * Xây snapshot cho một ca trực: thông tin ca + nhật ký đóng băng.
 * @param {number} shiftId
 * @returns {Promise<Object>} JSON snapshot
 */
async function buildShiftSnapshot(shiftId) {
  const shift = await Shift.findByPk(shiftId, {
    include: [
      { model: CrewProfile, attributes: ["id", "fullName", "department", "position"] },
      { model: Voyage, attributes: ["id", "shipId", "departurePort", "destinationPort"] },
    ],
  });

  if (!shift) return null;

  const shiftInfo = {
    id: shift.id,
    startTime: shift.startTime,
    endTime: shift.endTime,
    position: shift.position,
    status: shift.status,
    crew: shift.CrewProfile
      ? { id: shift.CrewProfile.id, fullName: shift.CrewProfile.fullName, department: shift.CrewProfile.department, position: shift.CrewProfile.position }
      : null,
    voyage: shift.Voyage
      ? { id: shift.Voyage.id, shipId: shift.Voyage.shipId, departurePort: shift.Voyage.departurePort, destinationPort: shift.Voyage.destinationPort }
      : null,
  };

  // Tìm ShiftLog của ca này
  const shiftLogs = await ShiftLog.findAll({ where: { shiftId } });

  if (!shiftLogs.length) {
    return { shift: shiftInfo, engine: [], deck: null, logType: "None" };
  }

  const shiftLogIds = shiftLogs.map((sl) => sl.id);

  // ----- Engine logs -----
  const engineLogs = await EngineLog.findAll({
    where: { shiftLogId: shiftLogIds },
    include: [
      { model: Engine, attributes: ["id", "engineName", "engineType"] },
      {
        model: EngineLogValue,
        include: [{ model: EngineParameter, attributes: ["id", "name", "minValue", "maxValue"] }],
      },
    ],
  });

  const engineSnapshot = engineLogs.map((el) => ({
    engineId: el.engineId,
    engineName: el.Engine?.engineName || null,
    engineType: el.Engine?.engineType || null,
    note: el.note,
    parameters: (el.EngineLogValues || []).map((v) => {
      const param = v.EngineParameter || {};
      return {
        parameterId: param.id,
        name: param.name,
        value: v.value,
        minValue: param.minValue,
        maxValue: param.maxValue,
        status: thresholdStatus(v.value, param.minValue, param.maxValue),
      };
    }),
  }));

  // ----- Deck logs -----
  const deckLogs = await DeckLog.findAll({
    where: { shiftLogId: shiftLogIds },
    include: [{ model: DeckLogEntry }],
  });

  const deckSnapshot = deckLogs.length
    ? {
        note: deckLogs[0].note,
        entries: deckLogs.flatMap((dl) =>
          (dl.DeckLogEntries || []).map((e) => ({
            hour: e.hour,
            courseTrue: e.courseTrue,
            courseGyro: e.courseGyro,
            courseSteer: e.courseSteer,
            gyroError: e.gyroError,
            courseMagnetic: e.courseMagnetic,
            speed: e.speed,
            rpm: e.rpm,
            windDirection: e.windDirection,
            windForce: e.windForce,
            weather: e.weather,
            barometer: e.barometer,
            seaState: e.seaState,
            visibility: e.visibility,
            airTemp: e.airTemp,
            seaTemp: e.seaTemp,
          }))
        ).sort((a, b) => a.hour - b.hour),
      }
    : null;

  // Xác định logType ưu tiên
  let logType = "None";
  if (engineLogs.length) logType = "Engine";
  else if (deckLogs.length) logType = "Deck";

  return { shift: shiftInfo, engine: engineSnapshot, deck: deckSnapshot, logType };
}

module.exports = { buildShiftSnapshot, thresholdStatus };
