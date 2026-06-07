const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const RepairLog = sequelize.define("RepairLog", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  equipmentId: { type: DataTypes.INTEGER, allowNull: true },
  engineId: { type: DataTypes.INTEGER, allowNull: true },
  repairedBy: { type: DataTypes.INTEGER }, // crewId
  description: { type: DataTypes.STRING },
  repairedAt: { type: DataTypes.DATE },
}, { tableName: "RepairLog", timestamps: false });

module.exports = RepairLog;