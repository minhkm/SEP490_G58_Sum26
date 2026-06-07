const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const EngineLog = sequelize.define("EngineLog", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shiftLogId: { type: DataTypes.INTEGER, allowNull: false },
  note: { type: DataTypes.TEXT },
}, { tableName: "EngineLog", timestamps: false });

module.exports = EngineLog;