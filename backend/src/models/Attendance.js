const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const Attendance = sequelize.define("Attendance", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  crewId: { type: DataTypes.INTEGER, allowNull: false },
  attendanceType: { type: DataTypes.STRING }, // PreDeparture, PostDischarge
  status: { type: DataTypes.STRING },
  attendanceDate: { type: DataTypes.DATEONLY, allowNull: true },
  recordedAt: { type: DataTypes.DATE },
  recordedBy: { type: DataTypes.INTEGER, allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: "Attendance", timestamps: false });

module.exports = Attendance;
