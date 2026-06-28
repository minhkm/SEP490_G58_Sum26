const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const LogImage = sequelize.define("LogImage", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  logType: { type: DataTypes.STRING, allowNull: false }, // 'Engine' | 'Deck'
  shiftLogId: { type: DataTypes.INTEGER, allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  caption: { type: DataTypes.STRING },
  uploadedBy: { type: DataTypes.INTEGER, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "LogImage", timestamps: false });

module.exports = LogImage;
