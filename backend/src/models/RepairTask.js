const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const RepairTask = sequelize.define("RepairTask", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  engineId: { type: DataTypes.INTEGER, allowNull: false },
  shipId: { type: DataTypes.INTEGER, allowNull: false },
  reportedBy: { type: DataTypes.INTEGER, allowNull: false }, // crewId of Engine Officer
  assignedTo: { type: DataTypes.INTEGER, allowNull: true },  // crewId of Maintenance Crew
  description: { type: DataTypes.TEXT },
  priority: { type: DataTypes.STRING, defaultValue: "Medium" }, // High, Medium, Low
  status: { 
    type: DataTypes.STRING, 
    defaultValue: "Reported" 
    // Reported -> Assigned -> InProgress -> Completed -> Verified -> Reviewed
  },
  repairNote: { type: DataTypes.TEXT, allowNull: true },     // Maintenance crew ghi chú sửa chữa
  verifyNote: { type: DataTypes.TEXT, allowNull: true },     // Engine Officer ghi chú xác nhận
  reviewNote: { type: DataTypes.TEXT, allowNull: true },     // Master ghi chú duyệt
  reportedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  assignedAt: { type: DataTypes.DATE, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  verifiedAt: { type: DataTypes.DATE, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "RepairTask", timestamps: false });

module.exports = RepairTask;
