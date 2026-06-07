const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Report = sequelize.define("Report", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: false }, // crewId
  reportType: { type: DataTypes.STRING }, // Engine, Deck, Administrative
  title: { type: DataTypes.STRING },
  content: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: "Open" }, // Open, InProgress, Resolved, Rejected
}, { tableName: "Report", timestamps: false });

module.exports = Report;