const { Notification, CrewProfile, Ship, VoyageCrew, Voyage, User } = require("../models");

async function createNotification(data, options = {}) {
  if (!data || !data.recipientUserId || !data.type || !data.title || !data.message) {
    return null;
  }

  return Notification.create({
    recipientUserId: data.recipientUserId,
    actorUserId: data.actorUserId || null,
    voyageId: data.voyageId || null,
    type: data.type,
    title: data.title,
    message: data.message,
    metadata: data.metadata || null,
  }, options);
}

async function notifyCrewAssignedToVoyage({ voyage, crewList, actorUserId }, options = {}) {
  if (!voyage || !Array.isArray(crewList) || crewList.length === 0) return [];

  const crewIds = crewList.map((crew) => crew.crewId).filter(Boolean);
  if (crewIds.length === 0) return [];

  const [profiles, ship] = await Promise.all([
    CrewProfile.findAll({ where: { id: crewIds }, transaction: options.transaction }),
    Ship.findByPk(voyage.shipId, { transaction: options.transaction }),
  ]);

  const roleByCrewId = new Map(crewList.map((crew) => [Number(crew.crewId), crew.role]));
  const shipName = ship ? ship.shipName : `tàu #${voyage.shipId}`;
  const routeText = `${voyage.departurePort || "N/A"} -> ${voyage.destinationPort || "N/A"}`;

  const payloads = profiles
    .filter((profile) => profile.userId)
    .map((profile) => ({
      recipientUserId: profile.userId,
      actorUserId,
      voyageId: voyage.id,
      type: "VOYAGE_ASSIGNED",
      title: "Bạn được phân công vào hải trình",
      message: `Bạn được phân công lên ${shipName}, hải trình ${routeText}.`,
      metadata: {
        crewId: profile.id,
        role: roleByCrewId.get(Number(profile.id)) || profile.position || null,
        shipId: voyage.shipId,
        departurePort: voyage.departurePort,
        destinationPort: voyage.destinationPort,
        departureDate: voyage.departureDate,
        arrivalDate: voyage.arrivalDate,
      },
    }));

  if (payloads.length === 0) return [];
  return Notification.bulkCreate(payloads, options);
}

async function notifyAttendanceUpdated({ voyage, attendanceChanges, attendanceType, actorUserId }, options = {}) {
  if (!voyage || !Array.isArray(attendanceChanges) || attendanceChanges.length === 0) return [];

  const changedCrewIds = attendanceChanges.map((item) => item.crewId).filter(Boolean);
  if (changedCrewIds.length === 0) return [];

  const profiles = await CrewProfile.findAll({
    where: { id: changedCrewIds },
    transaction: options.transaction,
  });

  const changeByCrewId = new Map(attendanceChanges.map((item) => [Number(item.crewId), item]));
  const payloads = profiles
    .filter((profile) => profile.userId)
    .map((profile) => {
      const change = changeByCrewId.get(Number(profile.id));
      const statusText = change.isPresent ? "có mặt" : "vắng mặt";

      return {
        recipientUserId: profile.userId,
        actorUserId,
        voyageId: voyage.id,
        type: "ATTENDANCE_UPDATED",
        title: "Điểm danh trên tàu đã được cập nhật",
        message: `Trạng thái điểm danh của bạn trong hải trình #${voyage.id}: ${statusText}.`,
        metadata: {
          crewId: profile.id,
          attendanceType: attendanceType || null,
          status: change.isPresent ? "Present" : "Absent",
          recordedAt: change.recordedAt || new Date(),
        },
      };
    });

  if (payloads.length === 0) return [];
  return Notification.bulkCreate(payloads, options);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value);
}

async function notifyVoyageUpdated({ voyage, changes, actorUserId }, options = {}) {
  if (!voyage || !changes || Object.keys(changes).length === 0) return [];

  const voyageCrews = await VoyageCrew.findAll({
    where: { voyageId: voyage.id },
    include: [{ model: CrewProfile, attributes: ["id", "userId", "fullName"] }],
    transaction: options.transaction,
  });

  const profiles = voyageCrews
    .map((voyageCrew) => voyageCrew.CrewProfile)
    .filter((profile) => profile && profile.userId);

  if (profiles.length === 0) return [];

  const ship = await Ship.findByPk(voyage.shipId, { transaction: options.transaction });
  const shipName = ship ? ship.shipName : `tàu #${voyage.shipId}`;
  const routeText = `${voyage.departurePort || "N/A"} -> ${voyage.destinationPort || "N/A"}`;

  const changeLabels = {
    status: "trạng thái",
    departureDate: "ngày khởi hành",
    arrivalDate: "ngày đến",
    isCrewSufficient: "tình trạng thuyền viên",
    isCargoLoaded: "tình trạng hàng hóa",
    issueReason: "lý do/phát sinh",
  };

  const changedText = Object.entries(changes)
    .map(([field, values]) => {
      const label = changeLabels[field] || field;
      return `${label}: ${formatValue(values.from)} -> ${formatValue(values.to)}`;
    })
    .join("; ");

  const payloads = profiles.map((profile) => ({
    recipientUserId: profile.userId,
    actorUserId,
    voyageId: voyage.id,
    type: "VOYAGE_UPDATED",
    title: "Hải trình đã được cập nhật",
    message: `${shipName} (${routeText}) đã cập nhật: ${changedText}.`,
    metadata: {
      crewId: profile.id,
      shipId: voyage.shipId,
      changes,
    },
  }));

  return Notification.bulkCreate(payloads, options);
}

// ============ REPORT (FT-10) ============

const REPORT_ROLE_LABELS = {
  Sailor: "Thủy thủ",
  DeckOfficer: "Sĩ quan boong",
  ChiefOfficer: "Đại phó",
  EngineCrew: "Thợ máy",
  EngineOfficer: "Sĩ quan máy",
  Master: "Thuyền trưởng",
};

function reportRoleLabel(role) {
  return REPORT_ROLE_LABELS[role] || role || "cấp phụ trách";
}

// Lấy userId của một thuyền viên theo crewId.
async function resolveCrewUserId(crewId, options = {}) {
  if (!crewId) return null;
  const profile = await CrewProfile.findByPk(crewId, {
    attributes: ["id", "userId"],
    transaction: options.transaction,
  });
  return profile ? profile.userId : null;
}

// Tìm userId của các thuyền viên có role cụ thể đang thuộc biên chế một tàu (qua VoyageCrew).
async function resolveShipUserIdsByRole(shipId, role, options = {}) {
  if (!shipId || !role) return [];
  const voyages = await Voyage.findAll({
    where: { shipId },
    attributes: ["id"],
    transaction: options.transaction,
  });
  const voyageIds = voyages.map((v) => v.id);
  if (voyageIds.length === 0) return [];

  const voyageCrews = await VoyageCrew.findAll({
    where: { voyageId: voyageIds },
    include: [
      {
        model: CrewProfile,
        attributes: ["id", "userId"],
        include: [{ model: User, attributes: ["id", "role"] }],
      },
    ],
    transaction: options.transaction,
  });

  const userIds = new Set();
  for (const vc of voyageCrews) {
    const profile = vc.CrewProfile;
    if (profile && profile.userId && profile.User && profile.User.role === role) {
      userIds.add(profile.userId);
    }
  }
  return [...userIds];
}

async function bulkNotifyUsers(userIds, payload, options = {}) {
  const recipients = [...new Set((userIds || []).filter(Boolean))];
  if (recipients.length === 0) return [];
  const rows = recipients.map((uid) => ({
    recipientUserId: uid,
    actorUserId: payload.actorUserId || null,
    voyageId: payload.voyageId || null,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    metadata: payload.metadata || null,
  }));
  return Notification.bulkCreate(rows, options);
}

// Báo cáo mới được gửi -> báo cho officer đang giữ lượt (currentHandlerRole) trên tàu.
async function notifyReportSubmitted({ report, actorUserId }, options = {}) {
  if (!report) return [];
  const userIds = await resolveShipUserIdsByRole(report.shipId, report.currentHandlerRole, options);
  return bulkNotifyUsers(
    userIds.filter((uid) => uid !== actorUserId),
    {
      actorUserId,
      voyageId: report.voyageId,
      type: "REPORT_SUBMITTED",
      title: "Có báo cáo mới cần xử lý",
      message: `Báo cáo "${report.title}" đang chờ ${reportRoleLabel(report.currentHandlerRole)} xử lý.`,
      metadata: { reportId: report.id, category: report.reportCategory, priority: report.priority },
    },
    options
  );
}

// Escalate -> báo cho officer cấp trên (toRole) trên tàu.
async function notifyReportEscalated({ report, toRole, actorUserId }, options = {}) {
  if (!report) return [];
  const target = toRole || report.currentHandlerRole;
  const userIds = await resolveShipUserIdsByRole(report.shipId, target, options);
  return bulkNotifyUsers(
    userIds.filter((uid) => uid !== actorUserId),
    {
      actorUserId,
      voyageId: report.voyageId,
      type: "REPORT_ESCALATED",
      title: "Báo cáo được đẩy lên cấp trên",
      message: `Báo cáo "${report.title}" đã được đẩy lên ${reportRoleLabel(target)} xử lý.`,
      metadata: { reportId: report.id, category: report.reportCategory, priority: report.priority },
    },
    options
  );
}

// Có phản hồi mới -> báo cho người tạo + người đang xử lý (trừ người vừa thao tác).
async function notifyReportReplied({ report, actorUserId }, options = {}) {
  if (!report) return [];
  const creatorUserId = await resolveCrewUserId(report.createdBy, options);
  let handlerUserIds = [];
  if (report.currentHandlerId) {
    const uid = await resolveCrewUserId(report.currentHandlerId, options);
    if (uid) handlerUserIds = [uid];
  } else {
    handlerUserIds = await resolveShipUserIdsByRole(report.shipId, report.currentHandlerRole, options);
  }
  const recipients = [creatorUserId, ...handlerUserIds].filter((uid) => uid && uid !== actorUserId);
  return bulkNotifyUsers(
    recipients,
    {
      actorUserId,
      voyageId: report.voyageId,
      type: "REPORT_REPLIED",
      title: "Báo cáo có phản hồi mới",
      message: `Có phản hồi mới trong báo cáo "${report.title}".`,
      metadata: { reportId: report.id },
    },
    options
  );
}

// Trạng thái báo cáo thay đổi -> báo cho người tạo (+ người xử lý được ghim).
async function notifyReportStatusChanged({ report, toStatus, actorUserId }, options = {}) {
  if (!report) return [];
  const creatorUserId = await resolveCrewUserId(report.createdBy, options);
  let handlerUserId = null;
  if (report.currentHandlerId) handlerUserId = await resolveCrewUserId(report.currentHandlerId, options);
  const recipients = [creatorUserId, handlerUserId].filter((uid) => uid && uid !== actorUserId);
  return bulkNotifyUsers(
    recipients,
    {
      actorUserId,
      voyageId: report.voyageId,
      type: "REPORT_STATUS_CHANGED",
      title: "Trạng thái báo cáo thay đổi",
      message: `Báo cáo "${report.title}" chuyển sang trạng thái ${toStatus}.`,
      metadata: { reportId: report.id, status: toStatus },
    },
    options
  );
}

module.exports = {
  createNotification,
  notifyCrewAssignedToVoyage,
  notifyAttendanceUpdated,
  notifyVoyageUpdated,
  notifyReportSubmitted,
  notifyReportEscalated,
  notifyReportReplied,
  notifyReportStatusChanged,
};
