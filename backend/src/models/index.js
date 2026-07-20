const sequelize = require("../configs/database");

// --- Import tất cả models ---
const User = require("./User");
const CrewProfile = require("./CrewProfile");
const CrewCertificate = require("./CrewCertificate");
const Ship = require("./Ship");
const ShipDocument = require("./ShipDocument");
const ShipCapacity = require("./ShipCapacity");
const Engine = require("./Engine");
const Equipment = require("./Equipment");
const RepairLog = require("./RepairLog");
const CargoHold = require("./CargoHold");
const CargoAllocation = require("./CargoAllocation");
const Voyage = require("./Voyage");
const VoyageCrew = require("./VoyageCrew");
const Cargo = require("./Cargo");
const CargoItem = require("./CargoItem");
const CargoType = require("./CargoType");
const Attendance = require("./Attendance");
const CargoOperation = require("./CargoOperation");
const VoyageOperationReport = require("./VoyageOperationReport");
const Shift = require("./Shift");
const ShiftLog = require("./ShiftLog");
const Report = require("./Report");
const ReportReply = require("./ReportReply");
const EngineParameter = require("./EngineParameter");
const DeckLog = require("./DeckLog");
const EngineLog = require("./EngineLog");
const EngineLogValue = require("./EngineLogValue");
const LogEditHistory = require("./LogEditHistory");
const LogImage = require("./LogImage");
const DeckLogEntry = require("./DeckLogEntry");
const Notification = require("./Notification");

// ============ QUAN HỆ ============

// User 1-1 CrewProfile
User.hasOne(CrewProfile, { foreignKey: { name: "userId", allowNull: false, unique: true }, onDelete: 'CASCADE' });
CrewProfile.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Notification, { foreignKey: "recipientUserId", as: "Notifications", onDelete: "CASCADE" });
Notification.belongsTo(User, { foreignKey: "recipientUserId", as: "Recipient" });

User.hasMany(Notification, { foreignKey: "actorUserId", as: "CreatedNotifications" });
Notification.belongsTo(User, { foreignKey: "actorUserId", as: "Actor" });

// CrewProfile 1-N CrewCertificate
CrewProfile.hasMany(CrewCertificate, { foreignKey: "crewId", onDelete: 'CASCADE' });
CrewCertificate.belongsTo(CrewProfile, { foreignKey: "crewId" });

// Ship 1-N các bảng con
Ship.hasMany(ShipDocument, { foreignKey: "shipId" });
ShipDocument.belongsTo(Ship, { foreignKey: "shipId" });

Ship.hasOne(ShipCapacity, { foreignKey: { name: "shipId", allowNull: false, unique: true } });
ShipCapacity.belongsTo(Ship, { foreignKey: "shipId" });

Ship.hasMany(Engine, { foreignKey: "shipId" });
Engine.belongsTo(Ship, { foreignKey: "shipId" });

Voyage.hasMany(Equipment, { foreignKey: "voyageId" });
Equipment.belongsTo(Voyage, { foreignKey: "voyageId" });

Ship.hasMany(CargoHold, { foreignKey: "shipId" });
CargoHold.belongsTo(Ship, { foreignKey: "shipId" });

Ship.hasMany(Voyage, { foreignKey: "shipId" });
Voyage.belongsTo(Ship, { foreignKey: "shipId" });

// Engine / Equipment 1-N RepairLog
Equipment.hasMany(RepairLog, { foreignKey: "equipmentId" });
RepairLog.belongsTo(Equipment, { foreignKey: "equipmentId" });

Engine.hasMany(RepairLog, { foreignKey: "engineId" });
RepairLog.belongsTo(Engine, { foreignKey: "engineId" });

CrewProfile.hasMany(RepairLog, { foreignKey: "repairedBy" });
RepairLog.belongsTo(CrewProfile, { foreignKey: "repairedBy" });

// Engine 1-N EngineParameter
Engine.hasMany(EngineParameter, { foreignKey: "engineId" });
EngineParameter.belongsTo(Engine, { foreignKey: "engineId" });

// ShiftLog 1-1 DeckLog
ShiftLog.hasOne(DeckLog, { foreignKey: "shiftLogId" });
DeckLog.belongsTo(ShiftLog, { foreignKey: "shiftLogId" });

// DeckLog 1-N DeckLogEntry
DeckLog.hasMany(DeckLogEntry, { foreignKey: "deckLogId" });
DeckLogEntry.belongsTo(DeckLog, { foreignKey: "deckLogId" });

// ShiftLog 1-1 EngineLog
ShiftLog.hasOne(EngineLog, { foreignKey: "shiftLogId" });
EngineLog.belongsTo(ShiftLog, { foreignKey: "shiftLogId" });

// EngineLog 1-N EngineLogValue
EngineLog.hasMany(EngineLogValue, { foreignKey: "engineLogId" });
EngineLogValue.belongsTo(EngineLog, { foreignKey: "engineLogId" });

// Engine 1-N EngineLog
Engine.hasMany(EngineLog, { foreignKey: "engineId" });
EngineLog.belongsTo(Engine, { foreignKey: "engineId" });

// EngineParameter 1-N EngineLogValue
EngineParameter.hasMany(EngineLogValue, { foreignKey: "parameterId" });
EngineLogValue.belongsTo(EngineParameter, { foreignKey: "parameterId" });

// Voyage 1-N các bảng con
Voyage.hasMany(VoyageCrew, { foreignKey: "voyageId" });
VoyageCrew.belongsTo(Voyage, { foreignKey: "voyageId" });

Voyage.hasMany(Notification, { foreignKey: "voyageId" });
Notification.belongsTo(Voyage, { foreignKey: "voyageId" });

// voyageId nullable: lô hàng có thể "Đã ở cảng" chưa gán hải trình.
// Xoá hải trình -> cargo trở về trạng thái chưa gán (SET NULL) thay vì bị xoá.
Voyage.hasMany(Cargo, { foreignKey: "voyageId", onDelete: "SET NULL", onUpdate: "CASCADE" });
Cargo.belongsTo(Voyage, { foreignKey: "voyageId", onDelete: "SET NULL", onUpdate: "CASCADE" });

Voyage.hasMany(Attendance, { foreignKey: "voyageId" });
Attendance.belongsTo(Voyage, { foreignKey: "voyageId" });

Voyage.hasMany(Shift, { foreignKey: "voyageId" });
Shift.belongsTo(Voyage, { foreignKey: "voyageId" });

// CrewProfile liên kết qua các bảng vận hành (crewId)
CrewProfile.hasMany(VoyageCrew, { foreignKey: "crewId" });
VoyageCrew.belongsTo(CrewProfile, { foreignKey: "crewId" });

CrewProfile.hasMany(Attendance, { foreignKey: "crewId" });
Attendance.belongsTo(CrewProfile, { foreignKey: "crewId" });

CrewProfile.hasMany(Attendance, { foreignKey: "recordedBy", as: "RecordedAttendances" });
Attendance.belongsTo(CrewProfile, { foreignKey: "recordedBy", as: "Recorder" });

CrewProfile.hasMany(Shift, { foreignKey: "crewId" });
Shift.belongsTo(CrewProfile, { foreignKey: "crewId" });

// Cargo 1-N CargoItem & CargoAllocation
Cargo.hasMany(CargoItem, { foreignKey: "cargoId" });
CargoItem.belongsTo(Cargo, { foreignKey: "cargoId" });

Cargo.hasMany(CargoAllocation, { foreignKey: "cargoId" });
CargoAllocation.belongsTo(Cargo, { foreignKey: "cargoId" });

// CargoHold 1-N CargoAllocation
CargoHold.hasMany(CargoAllocation, { foreignKey: "cargoHoldId" });
CargoAllocation.belongsTo(CargoHold, { foreignKey: "cargoHoldId" });

Voyage.hasMany(CargoOperation, { foreignKey: "voyageId" });
CargoOperation.belongsTo(Voyage, { foreignKey: "voyageId" });
Cargo.hasMany(CargoOperation, { foreignKey: "cargoId" });
CargoOperation.belongsTo(Cargo, { foreignKey: "cargoId" });
CargoItem.hasMany(CargoOperation, { foreignKey: "cargoItemId" });
CargoOperation.belongsTo(CargoItem, { foreignKey: "cargoItemId" });
CrewProfile.hasMany(CargoOperation, { foreignKey: "confirmedBy", as: "ConfirmedCargoOperations" });
CargoOperation.belongsTo(CrewProfile, { foreignKey: "confirmedBy", as: "Confirmer" });

Voyage.hasMany(VoyageOperationReport, { foreignKey: "voyageId" });
VoyageOperationReport.belongsTo(Voyage, { foreignKey: "voyageId" });
Ship.hasMany(VoyageOperationReport, { foreignKey: "shipId" });
VoyageOperationReport.belongsTo(Ship, { foreignKey: "shipId" });
CrewProfile.hasMany(VoyageOperationReport, { foreignKey: "preparedBy", as: "PreparedOperationReports" });
VoyageOperationReport.belongsTo(CrewProfile, { foreignKey: "preparedBy", as: "Preparer" });
CrewProfile.hasMany(VoyageOperationReport, { foreignKey: "acknowledgedBy", as: "AcknowledgedOperationReports" });
VoyageOperationReport.belongsTo(CrewProfile, { foreignKey: "acknowledgedBy", as: "Acknowledger" });

// Shift 1-N ShiftLog
Shift.hasMany(ShiftLog, { foreignKey: "shiftId" });
ShiftLog.belongsTo(Shift, { foreignKey: "shiftId" });

// ShiftLog 1-N LogImage
ShiftLog.hasMany(LogImage, { foreignKey: "shiftLogId" });
LogImage.belongsTo(ShiftLog, { foreignKey: "shiftLogId" });

// ShiftLog 1-N LogEditHistory
ShiftLog.hasMany(LogEditHistory, { foreignKey: "shiftLogId" });
LogEditHistory.belongsTo(ShiftLog, { foreignKey: "shiftLogId" });

// CrewProfile -> LogEditHistory
CrewProfile.hasMany(LogEditHistory, { foreignKey: "editedBy" });
LogEditHistory.belongsTo(CrewProfile, { foreignKey: "editedBy" });

// Report
CrewProfile.hasMany(Report, { foreignKey: "createdBy" });
Report.belongsTo(CrewProfile, { foreignKey: "createdBy" });

Report.hasMany(ReportReply, { foreignKey: "reportId" });
ReportReply.belongsTo(Report, { foreignKey: "reportId" });

CrewProfile.hasMany(ReportReply, { foreignKey: "repliedBy" });
ReportReply.belongsTo(CrewProfile, { foreignKey: "repliedBy" });

// Report — ngữ cảnh tàu/hải trình + người đang giữ lượt xử lý (currentHandlerId)
Ship.hasMany(Report, { foreignKey: "shipId" });
Report.belongsTo(Ship, { foreignKey: "shipId" });

Voyage.hasMany(Report, { foreignKey: "voyageId" });
Report.belongsTo(Voyage, { foreignKey: "voyageId" });

CrewProfile.hasMany(Report, { foreignKey: "currentHandlerId", as: "HandlingReports" });
Report.belongsTo(CrewProfile, { foreignKey: "currentHandlerId", as: "Handler" });

// Report — liên kết ca trực (FT-10 vòng 2): báo cáo tạo từ chi tiết ca trực
Shift.hasMany(Report, { foreignKey: "shiftId", onDelete: "SET NULL", onUpdate: "CASCADE" });
Report.belongsTo(Shift, { foreignKey: "shiftId" });

// ============ EXPORT ============
module.exports = {
  sequelize,
  User, CrewProfile, CrewCertificate,
  Ship, ShipDocument, ShipCapacity,
  Engine, Equipment, RepairLog,
  CargoHold, CargoAllocation,
  Voyage, VoyageCrew,
  Cargo, CargoItem, CargoType, CargoOperation,
  Attendance, VoyageOperationReport,
  Shift, ShiftLog,
  Report, ReportReply,
  EngineParameter,
  DeckLog,
  EngineLog,
  EngineLogValue,
  LogEditHistory,
  LogImage,
  DeckLogEntry,
  Notification,
};
