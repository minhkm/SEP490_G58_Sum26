const ExcelJS = require("exceljs");
const {
  Voyage, Ship, Shift, CrewProfile,
  ShiftLog, DeckLog, DeckLogEntry,
  EngineLog, EngineLogValue, EngineParameter, Engine,
} = require("../models");

// 15 cột thông số hàng hải của nhật ký boong (khớp DeckLogEntry)
const DECK_FIELDS = [
  ["courseTrue", "HĐ Thật"], ["courseGyro", "LBCQ"], ["courseSteer", "LB Lái"],
  ["gyroError", "SS LBCQ"], ["courseMagnetic", "LB Từ"], ["speed", "Tốc độ"],
  ["rpm", "RPM"], ["windDirection", "H.Gió"], ["windForce", "S.Gió(Bf)"],
  ["weather", "T.Tiết"], ["barometer", "Khí áp"], ["seaState", "Biển"],
  ["visibility", "Tầm nhìn"], ["airTemp", "T°KK"], ["seaTemp", "T°Biển"],
];

const dpart = (v) => (v ? String(v).slice(0, 10) : "");
const tpart = (v) => (v ? String(v).slice(11, 16) : "");

// ── Dựng dữ liệu báo cáo trực boong của 1 hải trình ──
async function buildDeckReport(voyageId) {
  const voyage = await Voyage.findByPk(voyageId, {
    include: [{ model: Ship, attributes: ["id", "shipName", "imoNumber"] }],
  });
  if (!voyage) return null;

  const shifts = await Shift.findAll({
    where: { voyageId: voyage.id },
    include: [
      { model: CrewProfile, attributes: ["fullName", "department", "position"] },
      { model: ShiftLog, required: false, include: [{ model: DeckLog, include: [DeckLogEntry] }] },
    ],
    order: [["startTime", "ASC"]],
  });

  const deckShifts = shifts
    .filter((s) => s.CrewProfile && s.CrewProfile.department === "Deck")
    .map((s) => {
      const entries = [];
      (s.ShiftLogs || []).filter((l) => l.DeckLog).forEach((l) =>
        (l.DeckLog.DeckLogEntries || []).forEach((e) => entries.push({ entry: e, note: l.DeckLog.note })));
      entries.sort((a, b) => a.entry.hour - b.entry.hour);
      return {
        date: dpart(s.startTime),
        slot: `${tpart(s.startTime)}–${tpart(s.endTime)}`,
        position: s.position || "",
        crew: s.CrewProfile.fullName || "",
        status: s.status,
        note: entries.length ? (entries[0].note || "") : "",
        entries: entries.map((it) => {
          const row = { hour: it.entry.hour };
          DECK_FIELDS.forEach(([k]) => { row[k] = it.entry[k] ?? ""; });
          return row;
        }),
      };
    });

  return {
    general: {
      voyageId: voyage.id,
      shipName: voyage.Ship ? voyage.Ship.shipName : "N/A",
      imoNumber: voyage.Ship ? voyage.Ship.imoNumber : "N/A",
      departurePort: voyage.departurePort,
      destinationPort: voyage.destinationPort,
      departureDate: voyage.departureDate,
      arrivalDate: voyage.arrivalDate,
      voyageStatus: voyage.status,
      generatedAt: new Date(),
    },
    shifts: deckShifts,
  };
}

const titleFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAF7" } };

function thinBorder(cell) {
  cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
}

// ── Dựng workbook Excel từ data ──
async function createDeckWorkbook(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CargoOps";
  wb.created = new Date();

  // Sheet tổng quan
  const overview = wb.addWorksheet("TONG_QUAN", { properties: { tabColor: { argb: "FF1F4E78" } } });
  overview.columns = [{ width: 26 }, { width: 46 }];
  overview.mergeCells("A1:B1");
  overview.getCell("A1").value = "BÁO CÁO NHẬT KÝ TRỰC CA — BỘ PHẬN BOONG";
  overview.getCell("A1").font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
  overview.getCell("A1").fill = titleFill;
  overview.getCell("A1").alignment = { horizontal: "center" };
  [
    ["Mã hải trình", data.general.voyageId], ["Tên tàu", data.general.shipName],
    ["Số IMO", data.general.imoNumber], ["Cảng đi", data.general.departurePort],
    ["Cảng đến", data.general.destinationPort], ["Ngày khởi hành", data.general.departureDate],
    ["Ngày đến", data.general.arrivalDate], ["Trạng thái hải trình", data.general.voyageStatus],
    ["Thời gian xuất", new Date().toLocaleString("vi-VN")],
  ].forEach((r) => overview.addRow(r));
  overview.addRow([]);
  overview.addRow(["Người lập (sĩ quan boong)", ""]);
  overview.addRow(["Thuyền trưởng xác nhận", ""]);

  // Sheet chi tiết ca trực
  const ws = wb.addWorksheet("NHAT_KY_TRUC_BOONG", { properties: { tabColor: { argb: "FF70AD47" } } });
  const header = ["Ngày", "Khung giờ", "Vị trí", "Người trực", "Giờ", ...DECK_FIELDS.map((f) => f[1]), "Ghi chú ca"];
  const hRow = ws.addRow(header);
  hRow.height = 28;
  hRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = titleFill;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    thinBorder(cell);
  });

  data.shifts.forEach((s) => {
    if (s.entries.length === 0) {
      const r = ws.addRow([s.date, s.slot, s.position, s.crew, "(chưa ghi nhật ký)"]);
      r.eachCell((c) => thinBorder(c));
      return;
    }
    s.entries.forEach((e, idx) => {
      const row = [
        idx === 0 ? s.date : "",
        idx === 0 ? s.slot : "",
        idx === 0 ? s.position : "",
        idx === 0 ? s.crew : "",
        e.hour,
        ...DECK_FIELDS.map((f) => e[f[0]]),
        idx === 0 ? s.note : "",
      ];
      const r = ws.addRow(row);
      r.eachCell((c) => { thinBorder(c); c.alignment = { vertical: "middle" }; });
    });
  });

  ws.columns.forEach((c, i) => { c.width = i < 4 ? 14 : (i === header.length - 1 ? 32 : 8); });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return wb;
}

// ── Dựng dữ liệu báo cáo trực máy của 1 hải trình ──
async function buildEngineReport(voyageId) {
  const voyage = await Voyage.findByPk(voyageId, {
    include: [{ model: Ship, attributes: ["id", "shipName", "imoNumber"] }],
  });
  if (!voyage) return null;

  const shifts = await Shift.findAll({
    where: { voyageId: voyage.id },
    include: [
      { model: CrewProfile, attributes: ["fullName", "department", "position"] },
      {
        model: ShiftLog, required: false, include: [
          { model: EngineLog, include: [{ model: EngineLogValue, include: [EngineParameter] }, Engine] },
        ],
      },
    ],
    order: [["startTime", "ASC"]],
  });

  const engineShifts = shifts
    .filter((s) => s.CrewProfile && s.CrewProfile.department === "Engine")
    .map((s) => {
      const logs = [];
      (s.ShiftLogs || []).filter((l) => l.EngineLog).forEach((l) => {
        const el = l.EngineLog;
        logs.push({
          engineName: el.Engine ? el.Engine.engineName : "",
          note: el.note || "",
          values: (el.EngineLogValues || []).map((v) => ({
            param: v.EngineParameter ? v.EngineParameter.name : "",
            value: v.value,
            maxValue: v.EngineParameter && v.EngineParameter.maxValue != null ? v.EngineParameter.maxValue : "",
          })),
        });
      });
      return {
        date: dpart(s.startTime),
        slot: `${tpart(s.startTime)}–${tpart(s.endTime)}`,
        crew: s.CrewProfile.fullName || "",
        status: s.status,
        logs,
      };
    });

  return {
    general: {
      voyageId: voyage.id,
      shipName: voyage.Ship ? voyage.Ship.shipName : "N/A",
      imoNumber: voyage.Ship ? voyage.Ship.imoNumber : "N/A",
      departurePort: voyage.departurePort,
      destinationPort: voyage.destinationPort,
      departureDate: voyage.departureDate,
      arrivalDate: voyage.arrivalDate,
      voyageStatus: voyage.status,
      generatedAt: new Date(),
    },
    shifts: engineShifts,
  };
}

// ── Dựng workbook Excel báo cáo trực máy ──
async function createEngineWorkbook(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CargoOps";
  wb.created = new Date();

  const overview = wb.addWorksheet("TONG_QUAN", { properties: { tabColor: { argb: "FF1F4E78" } } });
  overview.columns = [{ width: 26 }, { width: 46 }];
  overview.mergeCells("A1:B1");
  overview.getCell("A1").value = "BÁO CÁO NHẬT KÝ TRỰC CA — BỘ PHẬN MÁY";
  overview.getCell("A1").font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
  overview.getCell("A1").fill = titleFill;
  overview.getCell("A1").alignment = { horizontal: "center" };
  [
    ["Mã hải trình", data.general.voyageId], ["Tên tàu", data.general.shipName],
    ["Số IMO", data.general.imoNumber], ["Cảng đi", data.general.departurePort],
    ["Cảng đến", data.general.destinationPort], ["Ngày khởi hành", data.general.departureDate],
    ["Ngày đến", data.general.arrivalDate], ["Trạng thái hải trình", data.general.voyageStatus],
    ["Thời gian xuất", new Date().toLocaleString("vi-VN")],
  ].forEach((r) => overview.addRow(r));
  overview.addRow([]);
  overview.addRow(["Người lập (Máy trưởng)", ""]);
  overview.addRow(["Thuyền trưởng xác nhận", ""]);

  const ws = wb.addWorksheet("NHAT_KY_TRUC_MAY", { properties: { tabColor: { argb: "FFC55A11" } } });
  const header = ["Ngày", "Khung giờ", "Người trực", "Máy", "Thông số", "Giá trị", "Ngưỡng Max", "Ghi chú ca"];
  const hRow = ws.addRow(header);
  hRow.height = 28;
  hRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = titleFill;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    thinBorder(cell);
  });

  data.shifts.forEach((s) => {
    if (s.logs.length === 0) {
      const r = ws.addRow([s.date, s.slot, s.crew, "(chưa ghi nhật ký)"]);
      r.eachCell((c) => thinBorder(c));
      return;
    }
    let first = true;
    s.logs.forEach((log) => {
      if (log.values.length === 0) {
        const r = ws.addRow([first ? s.date : "", first ? s.slot : "", first ? s.crew : "", log.engineName, "(không có thông số)"]);
        r.eachCell((c) => thinBorder(c));
        first = false;
        return;
      }
      log.values.forEach((v, idx) => {
        const row = [
          first && idx === 0 ? s.date : "",
          first && idx === 0 ? s.slot : "",
          first && idx === 0 ? s.crew : "",
          idx === 0 ? log.engineName : "",
          v.param, v.value, v.maxValue,
          first && idx === 0 ? log.note : "",
        ];
        const r = ws.addRow(row);
        r.eachCell((c) => { thinBorder(c); c.alignment = { vertical: "middle" }; });
      });
      first = false;
    });
  });

  ws.columns.forEach((c, i) => { c.width = [14, 14, 18, 16, 28, 10, 12, 30][i] || 12; });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return wb;
}

module.exports = { buildDeckReport, createDeckWorkbook, buildEngineReport, createEngineWorkbook };
