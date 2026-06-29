const { Notification, CrewProfile, Ship } = require("../models");

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
  const shipName = ship ? ship.shipName : `tau #${voyage.shipId}`;
  const routeText = `${voyage.departurePort || "N/A"} -> ${voyage.destinationPort || "N/A"}`;

  const payloads = profiles
    .filter((profile) => profile.userId)
    .map((profile) => ({
      recipientUserId: profile.userId,
      actorUserId,
      voyageId: voyage.id,
      type: "VOYAGE_ASSIGNED",
      title: "Ban duoc phan cong vao hai trinh",
      message: `Ban duoc phan cong len ${shipName}, hai trinh ${routeText}.`,
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
      const statusText = change.isPresent ? "co mat" : "vang mat";

      return {
        recipientUserId: profile.userId,
        actorUserId,
        voyageId: voyage.id,
        type: "ATTENDANCE_UPDATED",
        title: "Diem danh tren tau da duoc cap nhat",
        message: `Trang thai diem danh cua ban trong hai trinh #${voyage.id}: ${statusText}.`,
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

module.exports = {
  createNotification,
  notifyCrewAssignedToVoyage,
  notifyAttendanceUpdated,
};
