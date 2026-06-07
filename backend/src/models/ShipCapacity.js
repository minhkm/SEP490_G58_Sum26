const { DataTypes } = require("sequelize");
const sequelize = require("../configs/database");

const ShipCapacity = sequelize.define("ShipCapacity", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipId: { type: DataTypes.INTEGER, allowNull: false },
  maxCargoWeight: { type: DataTypes.FLOAT },
  maxCargoVolume: { type: DataTypes.FLOAT },
  maxCrew: { type: DataTypes.INTEGER },
}, { tableName: "ShipCapacity", timestamps: false });

module.exports = ShipCapacity;