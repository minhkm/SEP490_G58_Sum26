const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const DeckLog = sequelize.define("DeckLog", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shiftLogId: { type: DataTypes.INTEGER, allowNull: false },
  note: { type: DataTypes.TEXT },
}, { tableName: "DeckLog", timestamps: false });

module.exports = DeckLog;