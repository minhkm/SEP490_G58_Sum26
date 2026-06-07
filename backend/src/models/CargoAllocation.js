const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const CargoAllocation = sequelize.define("CargoAllocation", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cargoId: { type: DataTypes.INTEGER, allowNull: false },
  cargoHoldId: { type: DataTypes.INTEGER, allowNull: false },
  allocatedWeight: { type: DataTypes.FLOAT },
  status: { type: DataTypes.STRING, defaultValue: "Allocated" },
}, { tableName: "CargoAllocation", timestamps: false });

module.exports = CargoAllocation;