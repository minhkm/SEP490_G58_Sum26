const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const ShiftLogEquipment = sequelize.define("ShiftLogEquipment", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shiftLogId: { type: DataTypes.INTEGER, allowNull: false },
  equipmentId: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: "ShiftLogEquipment", timestamps: false });

module.exports = ShiftLogEquipment;
