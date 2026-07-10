const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const ReportReply = sequelize.define("ReportReply", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reportId: { type: DataTypes.INTEGER, allowNull: false },
  repliedBy: { type: DataTypes.INTEGER, allowNull: false }, // crewId
  content: { type: DataTypes.TEXT },
  // Dòng thời gian hợp nhất: reply người dùng + sự kiện hệ thống
  kind: { type: DataTypes.STRING, defaultValue: "reply" }, // reply, escalate, status, reject
  metadata: { type: DataTypes.JSON, allowNull: true }, // { fromStatus, toStatus, fromRole, toRole }
  repliedAt: { type: DataTypes.DATE },
}, { tableName: "ReportReply", timestamps: false });

module.exports = ReportReply;
