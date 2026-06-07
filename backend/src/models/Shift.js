const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Shift = sequelize.define("Shift", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  crewId: { type: DataTypes.INTEGER, allowNull: false },
  startTime: { type: DataTypes.DATE },
  endTime: { type: DataTypes.DATE },
  status: { type: DataTypes.STRING, defaultValue: "Scheduled" },
}, { tableName: "Shift", timestamps: false });

module.exports = Shift;