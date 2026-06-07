const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Attendance = sequelize.define("Attendance", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  crewId: { type: DataTypes.INTEGER, allowNull: false },
  attendanceType: { type: DataTypes.STRING }, // PreDeparture, PostDischarge
  status: { type: DataTypes.STRING },
  recordedAt: { type: DataTypes.DATE },
}, { tableName: "Attendance", timestamps: false });

module.exports = Attendance;