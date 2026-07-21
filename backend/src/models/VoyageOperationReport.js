const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const VoyageOperationReport = sequelize.define("VoyageOperationReport", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  shipId: { type: DataTypes.INTEGER, allowNull: false },
  scope: { type: DataTypes.STRING, defaultValue: "Voyage" },
  periodType: { type: DataTypes.STRING, allowNull: false },
  fromDate: { type: DataTypes.DATEONLY, allowNull: true },
  toDate: { type: DataTypes.DATEONLY, allowNull: true },
  cargoSnapshot: { type: DataTypes.JSON, allowNull: false },
  attendanceSnapshot: { type: DataTypes.JSON, allowNull: false },
  summarySnapshot: { type: DataTypes.JSON, allowNull: false },
  generalSnapshot: { type: DataTypes.JSON, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "Finalized" },
  preparedBy: { type: DataTypes.INTEGER, allowNull: false },
  finalizedAt: { type: DataTypes.DATE, allowNull: false },
  acknowledgedBy: { type: DataTypes.INTEGER, allowNull: true },
  acknowledgedAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "VoyageOperationReport", timestamps: true });

module.exports = VoyageOperationReport;
