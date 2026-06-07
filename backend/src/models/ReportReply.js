const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const ReportReply = sequelize.define("ReportReply", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reportId: { type: DataTypes.INTEGER, allowNull: false },
  repliedBy: { type: DataTypes.INTEGER, allowNull: false }, // crewId
  content: { type: DataTypes.TEXT },
  repliedAt: { type: DataTypes.DATE },
}, { tableName: "ReportReply", timestamps: false });

module.exports = ReportReply;