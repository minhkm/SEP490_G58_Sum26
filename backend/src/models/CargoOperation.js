const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const CargoOperation = sequelize.define("CargoOperation", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voyageId: { type: DataTypes.INTEGER, allowNull: false },
  cargoId: { type: DataTypes.INTEGER, allowNull: false },
  cargoItemId: { type: DataTypes.INTEGER, allowNull: false },
  operationType: { type: DataTypes.ENUM("LOAD", "UNLOAD"), allowNull: false },
  plannedQuantity: { type: DataTypes.FLOAT, allowNull: true },
  actualQuantity: { type: DataTypes.FLOAT, allowNull: true },
  plannedWeight: { type: DataTypes.FLOAT, allowNull: true },
  actualWeight: { type: DataTypes.FLOAT, allowNull: true },
  unit: { type: DataTypes.STRING, defaultValue: "ton" },
  port: { type: DataTypes.STRING, allowNull: true },
  startedAt: { type: DataTypes.DATE, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "Completed" },
  confirmedBy: { type: DataTypes.INTEGER, allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: "CargoOperation", timestamps: true });

module.exports = CargoOperation;
