const { Op } = require("sequelize");
const { sequelize, Report, ReportReply, CrewProfile, Ship, Voyage, VoyageCrew } = require("../models");
const { getInitialHandlerRole, getNextHandlerRole, canTransition } = require("../configs/reportHierarchy");
const notificationService = require("../services/notificationService");

const ROLE_LABELS = {
  Sailor: "Thủy thủ",
  DeckOfficer: "Sĩ quan boong",
  ChiefOfficer: "Đại phó",
  EngineCrew: "Thợ máy",
  EngineOfficer: "Sĩ quan máy",
  Master: "Thuyền trưởng",
};
const roleLabel = (role) => ROLE_LABELS[role] || role || "cấp phụ trách";

// ---- Helpers ----
function actorOf(req) {
  return { userId: req.user.id, crewId: req.user.profileId, role: req.user.role };
}

const CREATOR_INCLUDE = { model: CrewProfile, attributes: ["id", "fullName", "position", "department"] };
const HANDLER_INCLUDE = { model: CrewProfile, as: "Handler", attributes: ["id", "fullName", "position"] };
const SHIP_INCLUDE = { model: Ship, attributes: ["id", "shipName"] };

// Danh sách shipId mà thuyền viên thuộc biên chế (qua VoyageCrew -> Voyage).
async function resolveCrewShipIds(crewId) {
  if (!crewId) return [];
  const rows = await VoyageCrew.findAll({
    where: { crewId },
    include: [{ model: Voyage, attributes: ["shipId"] }],
  });
  const ids = new Set();
  rows.forEach((r) => {
    if (r.Voyage && r.Voyage.shipId) ids.add(r.Voyage.shipId);
  });
  return [...ids];
}

// Tàu hiện tại của thuyền viên: ưu tiên hải trình đang hoạt động, nếu không lấy gần nhất.
async function resolveCrewShip(crewId) {
  if (!crewId) return { shipId: null, voyageId: null };
  const rows = await VoyageCrew.findAll({
    where: { crewId },
    include: [{ model: Voyage, attributes: ["id", "shipId", "status"] }],
    order: [["id", "DESC"]],
  });
  const voyages = rows.map((r) => r.Voyage).filter(Boolean);
  const active = voyages.find((v) => !["Completed", "Cancelled"].includes(v.status));
  const chosen = active || voyages[0];
  return chosen ? { shipId: chosen.shipId, voyageId: chosen.id } : { shipId: null, voyageId: null };
}

// BR-22: thuyền viên có thuộc biên chế tàu của báo cáo không? (shipId null -> bỏ qua kiểm tra)
async function isCrewOnShip(crewId, shipId) {
  if (!shipId) return true;
  if (!crewId) return false;
  const vc = await VoyageCrew.findOne({
    where: { crewId },
    include: [{ model: Voyage, where: { shipId }, attributes: ["id"] }],
  });
  return !!vc;
}

// BR-22: chỉ người đang giữ lượt (đúng role + đúng tàu + đúng người ghim) mới được thao tác.
async function canActOnReport(actor, report) {
  if (!actor.crewId) return { ok: false, message: "Chỉ thuyền viên trên tàu mới có quyền thao tác." };
  if (report.currentHandlerRole && actor.role !== report.currentHandlerRole) {
    return { ok: false, message: `Chỉ ${roleLabel(report.currentHandlerRole)} (cấp đang giữ báo cáo) mới có quyền thao tác.` };
  }
  if (report.currentHandlerId && report.currentHandlerId !== actor.crewId) {
    return { ok: false, message: "Báo cáo đang được một người khác ở cấp này tiếp nhận xử lý." };
  }
  const onShip = await isCrewOnShip(actor.crewId, report.shipId);
  if (!onShip) return { ok: false, message: "Bạn không thuộc biên chế tàu của báo cáo này." };
  return { ok: true };
}

// Ghi một dòng timeline (reply người dùng hoặc sự kiện hệ thống).
async function appendTimeline(reportId, { crewId, kind, content, metadata }, t) {
  return ReportReply.create(
    {
      reportId,
      repliedBy: crewId,
      kind: kind || "reply",
      content: content || "",
      metadata: metadata || null,
      repliedAt: new Date(),
    },
    { transaction: t }
  );
}

function safeNotify(fn) {
  // Notification là side-effect: không để lỗi notify làm hỏng hành động chính.
  Promise.resolve()
    .then(fn)
    .catch((err) => console.error("[reportController] notify error:", err.message));
}

// ---- Endpoints ----

// GET /api/reports?scope=mine|inbox|ship&category=&status=&priority=
exports.getReports = async (req, res) => {
  try {
    const actor = actorOf(req);
    const scope = req.query.scope || "mine";
    const { category, status, priority } = req.query;

    const where = {};
    if (category) where.reportCategory = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    if (scope === "mine") {
      if (!actor.crewId) return res.json({ success: true, data: [] });
      where.createdBy = actor.crewId;
    } else if (scope === "inbox") {
      if (!actor.crewId) return res.json({ success: true, data: [] });
      const shipIds = await resolveCrewShipIds(actor.crewId);
      if (shipIds.length === 0) return res.json({ success: true, data: [] });
      where.currentHandlerRole = actor.role;
      where.shipId = shipIds;
      where[Op.or] = [{ currentHandlerId: null }, { currentHandlerId: actor.crewId }];
      if (!status) where.status = { [Op.notIn]: ["Closed", "Rejected"] };
    } else if (scope === "ship") {
      const shipIds = await resolveCrewShipIds(actor.crewId);
      if (shipIds.length === 0) return res.json({ success: true, data: [] });
      where.shipId = shipIds;
    }

    const reports = await Report.findAll({
      where,
      include: [CREATOR_INCLUDE, HANDLER_INCLUDE, SHIP_INCLUDE],
      order: [["updatedAt", "DESC"], ["id", "DESC"]],
    });

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách báo cáo" });
  }
};

// GET /api/reports/:id
exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id, {
      include: [CREATOR_INCLUDE, HANDLER_INCLUDE, SHIP_INCLUDE],
    });
    if (!report) return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo" });

    const replies = await ReportReply.findAll({
      where: { reportId: report.id },
      include: [{ model: CrewProfile, attributes: ["id", "fullName", "position"] }],
      order: [["repliedAt", "ASC"], ["id", "ASC"]],
    });

    // Quyền của người đang xem để FE hiển thị đúng nút hành động (BR-21/BR-22 vẫn được enforce ở server).
    const actor = actorOf(req);
    const permit = await canActOnReport(actor, report);
    const isCreator = report.createdBy === actor.crewId;
    const isActive = !["Closed", "Rejected"].includes(report.status);
    const permissions = {
      isHandler: permit.ok,
      isCreator,
      canReply: isActive && (permit.ok || isCreator),
      canEscalate: isActive && permit.ok && !!getNextHandlerRole(report.currentHandlerRole, report.department),
      canResolve: permit.ok && report.status === "InProgress",
      canClose: permit.ok && report.status === "Resolved",
      canReopen: (permit.ok || isCreator) && report.status === "Resolved",
      canReject: permit.ok && ["Open", "InProgress"].includes(report.status),
    };

    res.json({ success: true, data: { ...report.toJSON(), replies, permissions } });
  } catch (error) {
    console.error("Error fetching report detail:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy chi tiết báo cáo" });
  }
};

// POST /api/reports
exports.createReport = async (req, res) => {
  try {
    const actor = actorOf(req);
    if (!actor.crewId) {
      return res.status(403).json({ success: false, message: "Chỉ thuyền viên trên tàu mới được tạo báo cáo." });
    }

    const { reportCategory, reportType, title, content, priority } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tiêu đề và nội dung báo cáo." });
    }

    const category = reportCategory === "Incident" ? "Incident" : "Routine";

    // department: ưu tiên body, nếu không lấy từ hồ sơ người tạo
    let department = req.body.department;
    if (!department) {
      const profile = await CrewProfile.findByPk(actor.crewId, { attributes: ["department"] });
      department = profile ? profile.department : "Deck";
    }

    // Ngữ cảnh tàu để định tuyến officer
    let shipId = req.body.shipId || null;
    let voyageId = req.body.voyageId || null;
    if (!shipId) {
      const ctx = await resolveCrewShip(actor.crewId);
      shipId = ctx.shipId;
      if (!voyageId) voyageId = ctx.voyageId;
    }

    const currentHandlerRole = getInitialHandlerRole(actor.role, department);
    const finalPriority = priority || (category === "Incident" ? "Urgent" : "Normal");

    const report = await Report.create({
      createdBy: actor.crewId,
      reportCategory: category,
      reportType: reportType || (category === "Incident" ? "Breakdown" : "Other"),
      department,
      priority: finalPriority,
      shipId,
      voyageId,
      title,
      content,
      status: "Open",
      currentHandlerRole,
      currentHandlerId: null,
    });

    safeNotify(() => notificationService.notifyReportSubmitted({ report, actorUserId: actor.userId }));

    res.json({ success: true, message: "Tạo báo cáo thành công", data: report });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ success: false, message: "Lỗi tạo báo cáo" });
  }
};

// POST /api/reports/:id/replies
exports.addReply = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const actor = actorOf(req);
    const { content } = req.body;
    if (!content || !content.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Vui lòng nhập nội dung phản hồi." });
    }

    const report = await Report.findByPk(req.params.id, { transaction: t });
    if (!report) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo" });
    }
    if (["Closed", "Rejected"].includes(report.status)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Báo cáo đã kết thúc, không thể phản hồi thêm." });
    }

    const isCreator = report.createdBy === actor.crewId;
    const permit = await canActOnReport(actor, report);
    const isHandler = permit.ok;

    if (!isCreator && !isHandler) {
      await t.rollback();
      return res.status(403).json({ success: false, message: permit.message || "Bạn không có quyền phản hồi báo cáo này." });
    }

    // Handler phản hồi lần đầu trên báo cáo Open -> tiếp nhận: Open -> InProgress + ghim người xử lý
    let metadata = null;
    if (isHandler && report.status === "Open") {
      metadata = { fromStatus: "Open", toStatus: "InProgress" };
      await report.update({ status: "InProgress", currentHandlerId: actor.crewId }, { transaction: t });
    }

    await appendTimeline(report.id, { crewId: actor.crewId, kind: "reply", content, metadata }, t);
    await t.commit();

    safeNotify(() => notificationService.notifyReportReplied({ report, actorUserId: actor.userId }));
    res.json({ success: true, message: "Đã gửi phản hồi", data: report });
  } catch (error) {
    await t.rollback();
    console.error("Error adding reply:", error);
    res.status(500).json({ success: false, message: "Lỗi gửi phản hồi" });
  }
};

// POST /api/reports/:id/escalate
exports.escalateReport = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const actor = actorOf(req);
    const report = await Report.findByPk(req.params.id, { transaction: t });
    if (!report) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo" });
    }
    if (["Closed", "Rejected"].includes(report.status)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Báo cáo đã kết thúc, không thể đẩy cấp." });
    }

    const permit = await canActOnReport(actor, report);
    if (!permit.ok) {
      await t.rollback();
      return res.status(403).json({ success: false, message: permit.message });
    }

    const nextRole = getNextHandlerRole(report.currentHandlerRole, report.department);
    if (!nextRole) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Báo cáo đã ở cấp cao nhất (Thuyền trưởng), không thể đẩy lên nữa." });
    }

    const fromRole = report.currentHandlerRole;
    const fromStatus = report.status;
    await report.update(
      { currentHandlerRole: nextRole, currentHandlerId: null, status: "InProgress" },
      { transaction: t }
    );
    await appendTimeline(
      report.id,
      {
        crewId: actor.crewId,
        kind: "escalate",
        content: req.body.note || `Đẩy lên ${roleLabel(nextRole)} xử lý.`,
        metadata: { fromRole, toRole: nextRole, fromStatus, toStatus: "InProgress" },
      },
      t
    );
    await t.commit();

    safeNotify(() => notificationService.notifyReportEscalated({ report, toRole: nextRole, actorUserId: actor.userId }));
    res.json({ success: true, message: `Đã đẩy báo cáo lên ${roleLabel(nextRole)}`, data: report });
  } catch (error) {
    await t.rollback();
    console.error("Error escalating report:", error);
    res.status(500).json({ success: false, message: "Lỗi đẩy cấp báo cáo" });
  }
};

// Bộ khung chung cho các hành động đổi trạng thái (resolve/close/reopen/reject).
async function performStatusAction(req, res, { toStatus, kind, successMsg, requireNote }) {
  const t = await sequelize.transaction();
  try {
    const actor = actorOf(req);
    const report = await Report.findByPk(req.params.id, { transaction: t });
    if (!report) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo" });
    }

    const isCreator = report.createdBy === actor.crewId;
    const permit = await canActOnReport(actor, report);
    // Reopen cho phép cả người tạo; các hành động khác chỉ người đang giữ lượt (BR-22)
    const allowed = kind === "reopen" ? permit.ok || isCreator : permit.ok;
    if (!allowed) {
      await t.rollback();
      return res.status(403).json({ success: false, message: permit.message || "Bạn không có quyền thực hiện thao tác này." });
    }

    // BR-21: chỉ cho phép chuyển trạng thái hợp lệ
    if (!canTransition(report.status, toStatus)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ trạng thái "${report.status}" sang "${toStatus}".`,
      });
    }

    const note = (req.body.note || req.body.content || "").trim();
    if (requireNote && !note) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Vui lòng nhập lý do." });
    }

    const fromStatus = report.status;
    const patch = { status: toStatus };
    if (toStatus === "Resolved") patch.resolvedAt = new Date();
    if (toStatus === "Closed") patch.closedAt = new Date();
    // Ghim người xử lý khi officer chốt trạng thái
    if (permit.ok && !report.currentHandlerId) patch.currentHandlerId = actor.crewId;
    await report.update(patch, { transaction: t });

    await appendTimeline(
      report.id,
      { crewId: actor.crewId, kind: kind || "status", content: note, metadata: { fromStatus, toStatus } },
      t
    );
    await t.commit();

    safeNotify(() => notificationService.notifyReportStatusChanged({ report, toStatus, actorUserId: actor.userId }));
    res.json({ success: true, message: successMsg, data: report });
  } catch (error) {
    await t.rollback();
    console.error(`Error performing status action (${toStatus}):`, error);
    res.status(500).json({ success: false, message: "Lỗi cập nhật trạng thái báo cáo" });
  }
}

// POST /api/reports/:id/resolve
exports.resolveReport = (req, res) =>
  performStatusAction(req, res, { toStatus: "Resolved", kind: "status", successMsg: "Đã đánh dấu Đã xử lý" });

// POST /api/reports/:id/close
exports.closeReport = (req, res) =>
  performStatusAction(req, res, { toStatus: "Closed", kind: "status", successMsg: "Đã đóng báo cáo" });

// POST /api/reports/:id/reopen
exports.reopenReport = (req, res) =>
  performStatusAction(req, res, { toStatus: "InProgress", kind: "reopen", successMsg: "Đã mở lại báo cáo", requireNote: true });

// POST /api/reports/:id/reject
exports.rejectReport = (req, res) =>
  performStatusAction(req, res, { toStatus: "Rejected", kind: "reject", successMsg: "Đã từ chối báo cáo", requireNote: true });
