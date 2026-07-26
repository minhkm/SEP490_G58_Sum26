const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const SewageLog = sequelize.define("SewageLog", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  requestedBy: { type: DataTypes.INTEGER, allowNull: false },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: "Pending" }, // Pending, Approved, Rejected
  dischargeType: { type: DataTypes.STRING, allowNull: false }, // Treated_STP, Comminuted, Untreated
  distanceFromLand: { type: DataTypes.FLOAT, allowNull: false },
  shipSpeed: { type: DataTypes.FLOAT, allowNull: false },
  volume: { type: DataTypes.FLOAT, allowNull: false },
  plannedDischargeDate: { type: DataTypes.DATE, allowNull: false },
  startPosition: { type: DataTypes.STRING, allowNull: false },
  endPosition: { type: DataTypes.STRING, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  images: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  requestDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: "SewageLog",
  timestamps: false,
});

module.exports = SewageLog;
