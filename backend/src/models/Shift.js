const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Shift = sequelize.define("Shift", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  crewId: { type: DataTypes.INTEGER, allowNull: false },
  startTime: { type: DataTypes.DATE },
  endTime: { type: DataTypes.DATE },
  position: { type: DataTypes.STRING }, // vị trí/nhiệm vụ trong ca (preset theo bộ phận)
  note: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: "Scheduled" }, // Scheduled, InProgress, Completed, Cancelled
}, { tableName: "Shift", timestamps: false });

module.exports = Shift;