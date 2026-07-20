const {
  sequelize, Voyage, VoyageCrew, CrewProfile, User,
  VoyageOperationReport, Notification, Ship,
} = require("../models");
const { buildOperationReport, createWorkbook, fromSnapshot } = require("../services/operationReportService");

function normalizedRole(req) {
  return String(req.user.role || "").replace(/\s+/g, "").toLowerCase();
}

async function authorizeVoyage(req, voyageId, allowedRoles, options = {}) {
  const role = normalizedRole(req);
  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, message: "Bạn không có quyền thực hiện thao tác này." };
  }

  const voyage = await Voyage.findByPk(voyageId, { transaction: options.transaction });
  if (!voyage) return { ok: false, status: 404, message: "Không tìm thấy hải trình." };

  if (!["admin", "agency"].includes(role)) {
    if (!req.user.profileId) return { ok: false, status: 403, message: "Tài khoản chưa có hồ sơ thuyền viên." };
    const assignment = await VoyageCrew.findOne({
      where: { voyageId, crewId: req.user.profileId },
      transaction: options.transaction,
    });
    if (!assignment) {
      return { ok: false, status: 403, message: "Bạn không được phân công vào hải trình này." };
    }
  }
  return { ok: true, voyage, role };
}

function reportFilename(data) {
  const type = data.general.periodType || "voyage";
  const range = type === "voyage"
    ? "Full"
    : `${data.general.fromDate || "NA"}_${data.general.toDate || "NA"}`;
  return `Cargo_Attendance_Voyage-${data.general.voyageId}_${type}_${range}.xlsx`;
}

exports.preview = async (req, res) => {
  try {
    const permit = await authorizeVoyage(req, req.params.voyageId, ["admin", "agency", "master", "chiefofficer", "deckofficer"]);
    if (!permit.ok) return res.status(permit.status).json({ message: permit.message });
    const data = await buildOperationReport(req.params.voyageId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    const status = /periodType|YYYY-MM-DD/.test(error.message) ? 400 : 500;
    console.error("Error previewing operation report:", error);
    res.status(status).json({ success: false, message: error.message || "Lỗi tạo bản xem trước báo cáo." });
  }
};

exports.exportExcel = async (req, res) => {
  try {
    const permit = await authorizeVoyage(req, req.params.voyageId, ["admin", "agency", "master", "chiefofficer", "deckofficer"]);
    if (!permit.ok) return res.status(permit.status).json({ message: permit.message });

    let data;
    if (req.query.reportId) {
      const report = await VoyageOperationReport.findOne({
        where: { id: req.query.reportId, voyageId: req.params.voyageId },
      });
      if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo đã chốt." });
      data = fromSnapshot(report);
    } else {
      data = await buildOperationReport(req.params.voyageId, req.query);
    }

    const workbook = await createWorkbook(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = reportFilename(data);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch (error) {
    const status = /periodType|YYYY-MM-DD/.test(error.message) ? 400 : 500;
    console.error("Error exporting operation report:", error);
    res.status(status).json({ success: false, message: error.message || "Lỗi xuất file Excel." });
  }
};

exports.finalize = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const permit = await authorizeVoyage(req, req.params.voyageId, ["chiefofficer"], { transaction });
    if (!permit.ok) {
      await transaction.rollback();
      return res.status(permit.status).json({ message: permit.message });
    }

    const data = await buildOperationReport(req.params.voyageId, req.body || {});
    const preparer = await CrewProfile.findByPk(req.user.profileId, { transaction });
    data.general.preparedBy = preparer ? preparer.fullName : req.user.username || "N/A";
    data.general.finalizedAt = new Date();

    const report = await VoyageOperationReport.create({
      voyageId: permit.voyage.id,
      shipId: permit.voyage.shipId,
      scope: data.general.periodType === "voyage" ? "Voyage" : "Period",
      periodType: data.general.periodType,
      fromDate: data.general.fromDate,
      toDate: data.general.toDate,
      cargoSnapshot: data.cargo,
      attendanceSnapshot: { rows: data.attendance, summary: data.attendanceSummary },
      summarySnapshot: data.summary,
      generalSnapshot: data.general,
      status: "Finalized",
      preparedBy: req.user.profileId,
      finalizedAt: new Date(),
    }, { transaction });

    const masterAssignments = await VoyageCrew.findAll({
      where: { voyageId: permit.voyage.id },
      include: [{
        model: CrewProfile,
        attributes: ["id", "userId"],
        include: [{ model: User, attributes: ["id", "role"] }],
      }],
      transaction,
    });
    const masterUserIds = new Set();
    masterAssignments.forEach((assignment) => {
      const profile = assignment.CrewProfile;
      const assignmentRole = String(assignment.role || "").toLowerCase();
      if (profile && profile.userId && (
        (profile.User && profile.User.role === "Master") || assignmentRole.includes("captain") || assignmentRole.includes("master")
      )) masterUserIds.add(profile.userId);
    });

    if (masterUserIds.size) {
      await Notification.bulkCreate([...masterUserIds].map((recipientUserId) => ({
        recipientUserId,
        actorUserId: req.user.id,
        voyageId: permit.voyage.id,
        type: "OPERATION_REPORT_FINALIZED",
        title: "Có báo cáo bốc dỡ và điểm danh mới",
        message: `Đại phó đã chốt báo cáo hải trình #${permit.voyage.id}.`,
        metadata: { reportId: report.id, periodType: report.periodType, fromDate: report.fromDate, toDate: report.toDate },
      })), { transaction });
    }

    await transaction.commit();
    res.status(201).json({ success: true, message: "Đã chốt và gửi báo cáo cho thuyền trưởng.", data: report });
  } catch (error) {
    await transaction.rollback();
    const status = /periodType|YYYY-MM-DD/.test(error.message) ? 400 : 500;
    console.error("Error finalizing operation report:", error);
    res.status(status).json({ success: false, message: error.message || "Lỗi chốt báo cáo." });
  }
};

exports.list = async (req, res) => {
  try {
    const permit = await authorizeVoyage(req, req.params.voyageId, ["admin", "agency", "master", "chiefofficer", "deckofficer"]);
    if (!permit.ok) return res.status(permit.status).json({ message: permit.message });
    const reports = await VoyageOperationReport.findAll({
      where: { voyageId: req.params.voyageId },
      attributes: { exclude: ["cargoSnapshot", "attendanceSnapshot"] },
      include: [
        { model: CrewProfile, as: "Preparer", attributes: ["id", "fullName"] },
        { model: CrewProfile, as: "Acknowledger", attributes: ["id", "fullName"] },
      ],
      order: [["finalizedAt", "DESC"], ["id", "DESC"]],
    });
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error("Error listing operation reports:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách báo cáo." });
  }
};

exports.getOne = async (req, res) => {
  try {
    const permit = await authorizeVoyage(req, req.params.voyageId, ["admin", "agency", "master", "chiefofficer", "deckofficer"]);
    if (!permit.ok) return res.status(permit.status).json({ message: permit.message });
    const report = await VoyageOperationReport.findOne({
      where: { id: req.params.reportId, voyageId: req.params.voyageId },
      include: [
        { model: CrewProfile, as: "Preparer", attributes: ["id", "fullName"] },
        { model: CrewProfile, as: "Acknowledger", attributes: ["id", "fullName"] },
      ],
    });
    if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo." });
    res.json({ success: true, data: { ...report.toJSON(), preview: fromSnapshot(report) } });
  } catch (error) {
    console.error("Error getting operation report:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy chi tiết báo cáo." });
  }
};

exports.acknowledge = async (req, res) => {
  try {
    const permit = await authorizeVoyage(req, req.params.voyageId, ["master"]);
    if (!permit.ok) return res.status(permit.status).json({ message: permit.message });
    const report = await VoyageOperationReport.findOne({
      where: { id: req.params.reportId, voyageId: req.params.voyageId },
    });
    if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo." });
    await report.update({
      status: "Acknowledged",
      acknowledgedBy: req.user.profileId,
      acknowledgedAt: new Date(),
    });
    res.json({ success: true, message: "Đã xác nhận xem báo cáo.", data: report });
  } catch (error) {
    console.error("Error acknowledging operation report:", error);
    res.status(500).json({ success: false, message: "Lỗi xác nhận báo cáo." });
  }
};

exports.getLatestForMaster = async (voyageId) => VoyageOperationReport.findOne({
  where: { voyageId },
  attributes: { exclude: ["cargoSnapshot", "attendanceSnapshot"] },
  include: [
    { model: CrewProfile, as: "Preparer", attributes: ["id", "fullName"] },
    { model: Ship, attributes: ["id", "shipName", "imoNumber"] },
  ],
  order: [["finalizedAt", "DESC"], ["id", "DESC"]],
});
