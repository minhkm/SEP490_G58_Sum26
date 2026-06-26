const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const LogEditHistory = sequelize.define("LogEditHistory", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  logType: { type: DataTypes.STRING, allowNull: false }, // 'Engine' | 'Deck'
  shiftLogId: { type: DataTypes.INTEGER, allowNull: false },
  previousContent: { type: DataTypes.TEXT }, // JSON snapshot of old data
  editReason: { type: DataTypes.TEXT, allowNull: false },
  editedBy: { type: DataTypes.INTEGER, allowNull: false },
  editedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "LogEditHistory", timestamps: false });

module.exports = LogEditHistory;
