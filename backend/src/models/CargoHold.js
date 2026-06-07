const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const CargoHold = sequelize.define("CargoHold", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipId: { type: DataTypes.INTEGER, allowNull: false },
  holdName: { type: DataTypes.STRING },
  maxCapacity: { type: DataTypes.FLOAT },
  currentUsage: { type: DataTypes.FLOAT, defaultValue: 0 },
  status: { type: DataTypes.STRING, defaultValue: "Available" },
}, { tableName: "CargoHold", timestamps: false });

module.exports = CargoHold;