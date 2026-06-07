const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const ShiftLog = sequelize.define("ShiftLog", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shiftId: { type: DataTypes.INTEGER, allowNull: false },
  logType: { type: DataTypes.STRING }, // Deck, Engine, Handover...
  content: { type: DataTypes.TEXT },
  createdAt: { type: DataTypes.DATE },
}, { tableName: "ShiftLog", timestamps: false });

module.exports = ShiftLog;