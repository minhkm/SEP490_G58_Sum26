const ExcelJS = require("exceljs");
const { Op } = require("sequelize");
const {
  Voyage, Ship, Cargo, CargoItem, CargoOperation,
  Attendance, VoyageCrew, CrewProfile,
} = require("../models");

const PERIOD_TYPES = new Set(["day", "week", "month", "voyage"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value) {
  if (!DATE_RE.test(value || "")) return null;
  const [y, m, d] = value.split("-").map(Number);
  const result = new Date(y, m - 1, d);
  return result.getFullYear() === y && result.getMonth() === m - 1 && result.getDate() === d
    ? result
    : null;
}

function resolvePeriod(periodType, date, voyage) {
  const type = String(periodType || "voyage").toLowerCase();
  if (!PERIOD_TYPES.has(type)) throw new Error("periodType phải là day, week, month hoặc voyage.");

  if (type === "voyage") {
    return {
      periodType: type,
      fromDate: voyage.departureDate || null,
      toDate: voyage.arrivalDate || null,
      filterByDate: false,
    };
  }

  const base = parseDate(date);
  if (!base) throw new Error("date phải có định dạng YYYY-MM-DD.");
  let from = new Date(base);
  let to = new Date(base);

  if (type === "week") {
    const mondayOffset = (base.getDay() + 6) % 7;
    from.setDate(base.getDate() - mondayOffset);
    to = new Date(from);
    to.setDate(from.getDate() + 6);
  } else if (type === "month") {
    from = new Date(base.getFullYear(), base.getMonth(), 1);
    to = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  }

  return { periodType: type, fromDate: isoDate(from), toDate: isoDate(to), filterByDate: true };
}

function asNumber(value) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

async function buildOperationReport(voyageId, options = {}) {
  const voyage = await Voyage.findByPk(voyageId, {
    include: [{ model: Ship, attributes: ["id", "shipName", "imoNumber"] }],
  });
  if (!voyage) return null;

  const period = resolvePeriod(options.periodType, options.date, voyage);
  const dateRange = period.filterByDate
    ? { [Op.between]: [`${period.fromDate} 00:00:00`, `${period.toDate} 23:59:59`] }
    : null;

  const operationWhere = { voyageId: voyage.id };
  if (dateRange) operationWhere.completedAt = dateRange;

  const attendanceWhere = {
    voyageId: voyage.id,
    attendanceType: { [Op.in]: ["PreDeparture", "Daily", "PostDischarge"] },
  };
  if (period.filterByDate) {
    attendanceWhere[Op.or] = [
      { attendanceDate: { [Op.between]: [period.fromDate, period.toDate] } },
      { attendanceDate: null, recordedAt: dateRange },
    ];
  }

  const [operations, attendances, totalCrew, cargos] = await Promise.all([
    CargoOperation.findAll({
      where: operationWhere,
      include: [
        { model: Cargo, attributes: ["id", "cargoName", "cargoType"] },
        { model: CargoItem, attributes: ["id", "itemName", "quantity", "weight", "allocations"] },
        { model: CrewProfile, as: "Confirmer", attributes: ["id", "fullName"] },
      ],
      order: [["completedAt", "ASC"], ["id", "ASC"]],
    }),
    Attendance.findAll({
      where: attendanceWhere,
      include: [
        { model: CrewProfile, attributes: ["id", "fullName", "position", "department"] },
        { model: CrewProfile, as: "Recorder", attributes: ["id", "fullName"] },
      ],
      order: [["attendanceDate", "ASC"], ["recordedAt", "ASC"], ["id", "ASC"]],
    }),
    VoyageCrew.count({ where: { voyageId: voyage.id } }),
    Cargo.findAll({
      where: { voyageId: voyage.id },
      include: [{ model: CargoItem }],
      order: [["id", "ASC"]],
    }),
  ]);

  let cargoRows = operations.map((operation) => {
    const item = operation.CargoItem || {};
    const cargo = operation.Cargo || {};
    const allocations = Array.isArray(item.allocations) ? item.allocations : [];
    const holds = allocations.map((a) => a.holdId).filter(Boolean).join(", ");
    return {
      operationId: operation.id,
      cargoId: operation.cargoId,
      cargoItemId: operation.cargoItemId,
      cargoName: cargo.cargoName || item.itemName || "N/A",
      cargoType: cargo.cargoType || "N/A",
      itemName: item.itemName || cargo.cargoName || "N/A",
      operationType: operation.operationType,
      hold: holds || "N/A",
      plannedQuantity: asNumber(operation.plannedQuantity),
      actualQuantity: asNumber(operation.actualQuantity),
      plannedWeight: asNumber(operation.plannedWeight),
      actualWeight: asNumber(operation.actualWeight),
      difference: asNumber(operation.actualWeight) - asNumber(operation.plannedWeight),
      unit: operation.unit || "ton",
      port: operation.port || "N/A",
      startedAt: operation.startedAt,
      completedAt: operation.completedAt,
      status: operation.status,
      confirmedBy: operation.Confirmer ? operation.Confirmer.fullName : "N/A",
      note: operation.note || "",
    };
  });

  // Dữ liệu cũ chưa có CargoOperation: vẫn cho xuất toàn chuyến từ trạng thái hiện tại.
  if (!period.filterByDate && cargoRows.length === 0) {
    cargoRows = cargos.flatMap((cargo) => (cargo.CargoItems || []).map((item) => ({
      operationId: null,
      cargoId: cargo.id,
      cargoItemId: item.id,
      cargoName: cargo.cargoName || item.itemName || "N/A",
      cargoType: cargo.cargoType || "N/A",
      itemName: item.itemName || cargo.cargoName || "N/A",
      operationType: item.isDischarged ? "UNLOAD" : (item.isLoaded ? "LOAD" : "PENDING"),
      hold: "N/A",
      plannedQuantity: asNumber(item.quantity),
      actualQuantity: asNumber(item.quantity),
      plannedWeight: asNumber(item.weight),
      actualWeight: asNumber(item.weight),
      difference: 0,
      unit: "ton",
      port: "N/A",
      startedAt: null,
      completedAt: null,
      status: item.isDischarged || item.isLoaded ? "Completed" : "Pending",
      confirmedBy: "N/A",
      note: "Dữ liệu trạng thái cũ, chưa có lịch sử thao tác",
    })));
  }

  const attendanceRows = attendances.map((attendance) => ({
    id: attendance.id,
    attendanceDate: attendance.attendanceDate || (attendance.recordedAt ? isoDate(new Date(attendance.recordedAt)) : null),
    recordedAt: attendance.recordedAt,
    attendanceType: attendance.attendanceType || "Unspecified",
    crewId: attendance.crewId,
    fullName: attendance.CrewProfile ? attendance.CrewProfile.fullName : "N/A",
    position: attendance.CrewProfile ? attendance.CrewProfile.position : "N/A",
    department: attendance.CrewProfile ? attendance.CrewProfile.department : "N/A",
    status: attendance.status,
    note: attendance.note || "",
    recordedBy: attendance.Recorder ? attendance.Recorder.fullName : "N/A",
  }));

  const attendanceGroups = new Map();
  attendanceRows.forEach((row) => {
    const key = `${row.attendanceDate || "N/A"}|${row.attendanceType}`;
    if (!attendanceGroups.has(key)) {
      attendanceGroups.set(key, {
        attendanceDate: row.attendanceDate,
        attendanceType: row.attendanceType,
        total: 0,
        present: 0,
        absent: 0,
        recordedBy: row.recordedBy,
      });
    }
    const group = attendanceGroups.get(key);
    group.total += 1;
    if (row.status === "Present") group.present += 1;
    else group.absent += 1;
  });
  const attendanceSummary = [...attendanceGroups.values()].map((group) => ({
    ...group,
    attendanceRate: group.total ? Math.round((group.present / group.total) * 10000) / 100 : 0,
  }));

  const loadRows = cargoRows.filter((row) => row.operationType === "LOAD");
  const unloadRows = cargoRows.filter((row) => row.operationType === "UNLOAD");
  const presentCount = attendanceRows.filter((row) => row.status === "Present").length;
  const absentCount = attendanceRows.length - presentCount;
  const summary = {
    totalCargoLots: new Set(cargoRows.map((row) => row.cargoId)).size,
    plannedLoadWeight: loadRows.reduce((sum, row) => sum + row.plannedWeight, 0),
    actualLoadWeight: loadRows.reduce((sum, row) => sum + row.actualWeight, 0),
    plannedUnloadWeight: unloadRows.reduce((sum, row) => sum + row.plannedWeight, 0),
    actualUnloadWeight: unloadRows.reduce((sum, row) => sum + row.actualWeight, 0),
    loadDifference: loadRows.reduce((sum, row) => sum + row.difference, 0),
    unloadDifference: unloadRows.reduce((sum, row) => sum + row.difference, 0),
    totalCrew,
    attendanceSessions: attendanceSummary.length,
    presentCount,
    absentCount,
  };

  return {
    general: {
      voyageId: voyage.id,
      shipId: voyage.shipId,
      shipName: voyage.Ship ? voyage.Ship.shipName : "N/A",
      imoNumber: voyage.Ship ? voyage.Ship.imoNumber : "N/A",
      departurePort: voyage.departurePort,
      destinationPort: voyage.destinationPort,
      departureDate: voyage.departureDate,
      arrivalDate: voyage.arrivalDate,
      voyageStatus: voyage.status,
      periodType: period.periodType,
      fromDate: period.fromDate,
      toDate: period.toDate,
      generatedAt: new Date(),
    },
    summary,
    cargo: cargoRows,
    attendance: attendanceRows,
    attendanceSummary,
  };
}

function fromSnapshot(report) {
  const attendanceSnapshot = report.attendanceSnapshot || {};
  return {
    general: { ...(report.generalSnapshot || {}), reportId: report.id, reportStatus: report.status },
    summary: report.summarySnapshot || {},
    cargo: report.cargoSnapshot || [],
    attendance: attendanceSnapshot.rows || [],
    attendanceSummary: attendanceSnapshot.summary || [],
  };
}

const titleFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAF7" } };

function styleHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = titleFill;
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

function setupTableSheet(sheet, columns) {
  sheet.columns = columns;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${sheet.getColumn(columns.length).letter}1` };
  styleHeader(sheet.getRow(1));
  sheet.getRow(1).height = 30;
  sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
}

function operationLabel(value) {
  return ({ LOAD: "Bốc hàng", UNLOAD: "Dỡ hàng", PENDING: "Chưa thực hiện" })[value] || value;
}

function attendanceTypeLabel(value) {
  return ({ PreDeparture: "Trước khởi hành", Daily: "Hằng ngày", PostDischarge: "Sau dỡ hàng", Unspecified: "Chưa phân loại" })[value] || value;
}

async function createWorkbook(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CargoOps";
  workbook.created = new Date();

  const overview = workbook.addWorksheet("TONG_QUAN", { properties: { tabColor: { argb: "FF1F4E78" } } });
  overview.columns = [{ width: 32 }, { width: 45 }];
  overview.mergeCells("A1:B1");
  overview.getCell("A1").value = "BÁO CÁO BỐC DỠ HÀNG VÀ ĐIỂM DANH";
  overview.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  overview.getCell("A1").fill = titleFill;
  overview.getCell("A1").alignment = { horizontal: "center" };
  const info = [
    ["Mã hải trình", data.general.voyageId], ["Tên tàu", data.general.shipName],
    ["Số IMO", data.general.imoNumber], ["Cảng đi", data.general.departurePort],
    ["Cảng đến", data.general.destinationPort], ["Ngày khởi hành", data.general.departureDate],
    ["Ngày đến", data.general.arrivalDate], ["Trạng thái hải trình", data.general.voyageStatus],
    ["Phạm vi", data.general.periodType], ["Từ ngày", data.general.fromDate], ["Đến ngày", data.general.toDate],
    ["Người lập", data.general.preparedBy || "Bản xem trước"], ["Thời gian xuất", new Date()],
  ];
  info.forEach((item) => overview.addRow(item));
  overview.addRow([]);
  const summaryHeader = overview.addRow(["CHỈ SỐ TỔNG HỢP", "GIÁ TRỊ"]);
  summaryHeader.fill = headerFill;
  summaryHeader.font = { bold: true };
  [
    ["Tổng số lô hàng", data.summary.totalCargoLots],
    ["Khối lượng bốc kế hoạch", data.summary.plannedLoadWeight],
    ["Khối lượng bốc thực tế", data.summary.actualLoadWeight],
    ["Chênh lệch bốc", data.summary.loadDifference],
    ["Khối lượng dỡ kế hoạch", data.summary.plannedUnloadWeight],
    ["Khối lượng dỡ thực tế", data.summary.actualUnloadWeight],
    ["Chênh lệch dỡ", data.summary.unloadDifference],
    ["Tổng thuyền viên", data.summary.totalCrew],
    ["Số lần điểm danh", data.summary.attendanceSessions],
    ["Tổng lượt có mặt", data.summary.presentCount],
    ["Tổng lượt vắng", data.summary.absentCount],
  ].forEach((item) => overview.addRow(item));
  overview.addRow([]);
  overview.addRow(["Nhận xét chung", ""]);
  overview.addRow(["Người lập báo cáo", ""]);
  overview.addRow(["Thuyền trưởng xác nhận", ""]);

  const cargo = workbook.addWorksheet("CHI_TIET_HANG_HOA");
  setupTableSheet(cargo, [
    { header: "STT", key: "index", width: 7 }, { header: "Mã lô", key: "cargoId", width: 10 },
    { header: "Tên hàng", key: "cargoName", width: 24 }, { header: "Loại hàng", key: "cargoType", width: 18 },
    { header: "Hoạt động", key: "operationType", width: 14 }, { header: "Hầm hàng", key: "hold", width: 14 },
    { header: "KL kế hoạch", key: "plannedWeight", width: 15 }, { header: "KL thực tế", key: "actualWeight", width: 15 },
    { header: "Đơn vị", key: "unit", width: 10 }, { header: "Chênh lệch", key: "difference", width: 14 },
    { header: "Cảng", key: "port", width: 18 }, { header: "Bắt đầu", key: "startedAt", width: 20 },
    { header: "Hoàn thành", key: "completedAt", width: 20 }, { header: "Trạng thái", key: "status", width: 15 },
    { header: "Người xác nhận", key: "confirmedBy", width: 22 }, { header: "Ghi chú", key: "note", width: 35 },
  ]);
  data.cargo.forEach((row, index) => cargo.addRow({ ...row, index: index + 1, operationType: operationLabel(row.operationType) }));

  const attendance = workbook.addWorksheet("CHI_TIET_DIEM_DANH");
  setupTableSheet(attendance, [
    { header: "STT", key: "index", width: 7 }, { header: "Ngày", key: "attendanceDate", width: 14 },
    { header: "Thời gian", key: "recordedAt", width: 20 }, { header: "Loại điểm danh", key: "attendanceType", width: 22 },
    { header: "Mã thuyền viên", key: "crewId", width: 16 }, { header: "Họ tên", key: "fullName", width: 25 },
    { header: "Chức vụ", key: "position", width: 20 }, { header: "Bộ phận", key: "department", width: 14 },
    { header: "Trạng thái", key: "status", width: 14 }, { header: "Lý do/Ghi chú", key: "note", width: 35 },
    { header: "Người điểm danh", key: "recordedBy", width: 24 },
  ]);
  data.attendance.forEach((row, index) => attendance.addRow({
    ...row, index: index + 1, attendanceType: attendanceTypeLabel(row.attendanceType),
    status: row.status === "Present" ? "Có mặt" : "Vắng",
  }));

  const attendanceSummary = workbook.addWorksheet("TONG_HOP_DIEM_DANH");
  setupTableSheet(attendanceSummary, [
    { header: "Ngày", key: "attendanceDate", width: 15 }, { header: "Loại điểm danh", key: "attendanceType", width: 22 },
    { header: "Tổng thuyền viên", key: "total", width: 18 }, { header: "Có mặt", key: "present", width: 12 },
    { header: "Vắng", key: "absent", width: 12 }, { header: "Tỷ lệ có mặt (%)", key: "attendanceRate", width: 20 },
    { header: "Người điểm danh", key: "recordedBy", width: 25 },
  ]);
  data.attendanceSummary.forEach((row) => attendanceSummary.addRow({ ...row, attendanceType: attendanceTypeLabel(row.attendanceType) }));

  [cargo, attendance, attendanceSummary].forEach((sheet) => {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true };
    });
  });
  return workbook;
}

module.exports = { buildOperationReport, createWorkbook, fromSnapshot, resolvePeriod };
