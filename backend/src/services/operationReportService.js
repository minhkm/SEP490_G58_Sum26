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

  const [operations, attendances, voyageCrews, cargos] = await Promise.all([
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
    VoyageCrew.findAll({
      where: { voyageId: voyage.id },
      include: [{ model: CrewProfile, attributes: ["id", "fullName", "position", "department"] }],
      order: [["crewId", "ASC"]],
    }),
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

  const dailyAttendances = attendanceRows.filter((row) => row.attendanceType === "Daily" && row.attendanceDate);
  let matrixFrom = period.fromDate;
  let matrixTo = period.toDate;
  if (!matrixFrom && dailyAttendances.length) matrixFrom = dailyAttendances[0].attendanceDate;
  if (!matrixTo && dailyAttendances.length) matrixTo = dailyAttendances[dailyAttendances.length - 1].attendanceDate;

  const attendanceDates = [];
  if (matrixFrom && matrixTo) {
    const cursor = parseDate(matrixFrom);
    const end = parseDate(matrixTo);
    // Giới hạn an toàn; hải trình dài hơn một năm chỉ hiện các ngày đã có điểm danh.
    if (cursor && end && Math.floor((end - cursor) / 86400000) <= 366) {
      while (cursor <= end) {
        attendanceDates.push(isoDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }
  if (attendanceDates.length === 0) {
    attendanceDates.push(...[...new Set(dailyAttendances.map((row) => row.attendanceDate))].sort());
  }

  const dailyByCrewAndDate = new Map(
    dailyAttendances.map((row) => [`${row.crewId}|${row.attendanceDate}`, row])
  );
  const attendanceMatrix = voyageCrews.map((assignment) => {
    const profile = assignment.CrewProfile || {};
    const days = {};
    const absenceNotes = [];
    const recorders = [];
    let present = 0;
    let absent = 0;
    attendanceDates.forEach((date) => {
      const attendance = dailyByCrewAndDate.get(`${assignment.crewId}|${date}`);
      if (!attendance) {
        days[date] = "";
      } else if (attendance.status === "Present") {
        days[date] = "✓";
        present += 1;
      } else {
        days[date] = "X";
        absent += 1;
      }
      if (attendance) {
        if (attendance.recordedBy && attendance.recordedBy !== "N/A") {
          recorders.push(`${date}: ${attendance.recordedBy}`);
        }
        if (attendance.status !== "Present" && attendance.note) {
          absenceNotes.push(`${date}: ${attendance.note}`);
        }
      }
    });
    return {
      crewId: assignment.crewId,
      fullName: profile.fullName || "N/A",
      position: assignment.role || profile.position || "N/A",
      department: profile.department || "N/A",
      days,
      present,
      absent,
      unmarked: Math.max(attendanceDates.length - present - absent, 0),
      attendanceRate: present + absent ? Math.round((present / (present + absent)) * 10000) / 100 : 0,
      absenceNotes: absenceNotes.join("; "),
      recorders: [...new Set(recorders)].join("; "),
    };
  });

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
    totalCrew: voyageCrews.length,
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
    attendanceMatrix: { dates: attendanceDates, rows: attendanceMatrix },
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
    attendanceMatrix: attendanceSnapshot.matrix || { dates: [], rows: [] },
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

  // Bảng chấm công ngang ngay trong CHI_TIET_DIEM_DANH: mỗi người một dòng, mỗi ngày một cột.
  const attendance = workbook.addWorksheet("CHI_TIET_DIEM_DANH", { properties: { tabColor: { argb: "FF70AD47" } } });
  const matrixDates = data.attendanceMatrix?.dates || [];
  const attendanceColumns = [
    { header: "STT", key: "index", width: 7 },
    { header: "Mã TV", key: "crewId", width: 10 },
    { header: "Họ tên", key: "fullName", width: 25 },
    { header: "Chức vụ", key: "position", width: 22 },
    { header: "Bộ phận", key: "department", width: 14 },
    ...matrixDates.map((date, index) => ({
      header: date.split("-").reverse().slice(0, 2).join("/"),
      key: `day_${index}`,
      width: 9,
    })),
    { header: "Tổng đi", key: "present", width: 11 },
    { header: "Tổng vắng", key: "absent", width: 12 },
    { header: "Chưa chấm", key: "unmarked", width: 12 },
    { header: "Chuyên cần (%)", key: "attendanceRate", width: 16 },
    { header: "Lý do/Ghi chú vắng", key: "absenceNotes", width: 35 },
    { header: "Người điểm danh", key: "recorders", width: 35 },
  ];
  attendance.columns = attendanceColumns;
  attendance.views = [{ state: "frozen", xSplit: 5, ySplit: 1 }];
  styleHeader(attendance.getRow(1));
  attendance.getRow(1).height = 35;
  (data.attendanceMatrix?.rows || []).forEach((row, rowIndex) => {
    const excelRow = {
      index: rowIndex + 1,
      crewId: row.crewId,
      fullName: row.fullName,
      position: row.position,
      department: row.department,
      present: row.present,
      absent: row.absent,
      unmarked: row.unmarked,
      attendanceRate: row.attendanceRate,
      absenceNotes: row.absenceNotes || "",
      recorders: row.recorders || "",
    };
    matrixDates.forEach((date, index) => { excelRow[`day_${index}`] = row.days?.[date] || ""; });
    const addedRow = attendance.addRow(excelRow);
    matrixDates.forEach((date, index) => {
      const cell = addedRow.getCell(6 + index);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { bold: true, size: 14, color: { argb: cell.value === "✓" ? "FF008000" : cell.value === "X" ? "FFFF0000" : "FF808080" } };
      if (cell.value === "✓") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2F0D9" } };
      if (cell.value === "X") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } };
    });
  });
  attendance.autoFilter = { from: "A1", to: `${attendance.getColumn(attendanceColumns.length).letter}1` };
  attendance.addRow([]);
  const attendanceLegend = attendance.addRow(["Chú thích", "✓ = Có mặt", "X = Vắng", "Trống = Chưa điểm danh"]);
  attendanceLegend.font = { italic: true, color: { argb: "FF595959" } };

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
